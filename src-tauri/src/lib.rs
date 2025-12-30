use tauri::Emitter;
use image::imageops::crop_imm;
use image::{DynamicImage, GrayImage};
use imageproc::contrast::{threshold, ThresholdType};
use kreuzberg_tesseract::TesseractAPI;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::path::PathBuf;
use std::collections::HashMap;
use tauri::{AppHandle, Manager, State};
use xcap::Monitor;
use regex::Regex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRegion {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRegions {
    pub echo_upgrade: ScanRegion,
    pub main_stats: ScanRegion,
    pub sub_stats: ScanRegion,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsData {
    pub main_stats: String,
    pub sub_stats: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StatRange {
    pub min: f64,
    pub max: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StatsConfig {
    pub main: HashMap<String, StatRange>,
    pub sub: HashMap<String, StatRange>,
}

#[derive(Default)]
pub struct AppState {
    pub scan_region: Mutex<Option<ScanRegion>>,
    pub scan_regions: Mutex<Option<ScanRegions>>,
    pub last_scan_result: Mutex<Option<bool>>,
    pub last_stats_data: Mutex<Option<StatsData>>,
    pub show_scan_region: Mutex<bool>,
}

fn get_tessdata_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    // First, try development path (src-tauri/tessdata) relative to cargo manifest dir
    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        let dev_tessdata = PathBuf::from(manifest_dir).join("tessdata");
        if dev_tessdata.exists() {
            return Ok(dev_tessdata);
        }
    }
    
    // Try to get bundled tessdata path (for production builds)
    if let Ok(resource_path) = app_handle.path().resource_dir() {
        let tessdata_path = resource_path.join("tessdata");
        if tessdata_path.exists() {
            return Ok(tessdata_path);
        }
    }
    
    // Fallback to TESSDATA_PREFIX environment variable
    if let Ok(dir) = std::env::var("TESSDATA_PREFIX") {
        return Ok(PathBuf::from(dir));
    }
    
    Err("Tessdata directory not found. Please ensure tessdata is in src-tauri/tessdata for development or bundled with the app for production.".to_string())
}

fn load_stats_config(app_handle: &AppHandle) -> Result<StatsConfig, String> {
    // Try development path first
    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        let config_path = PathBuf::from(manifest_dir)
            .parent()
            .ok_or("Failed to get parent directory")?
            .join("src/configs/stats.json");
        
        if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)
                .map_err(|e| format!("Failed to read stats.json: {}", e))?;
            let mut config: StatsConfig = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse stats.json: {}", e))?;
            
            // Normalize all keys in the config
            config.main = config.main.into_iter()
                .map(|(k, v)| (normalize_stat_name(&k), v))
                .collect();
            config.sub = config.sub.into_iter()
                .map(|(k, v)| (normalize_stat_name(&k), v))
                .collect();
            
            return Ok(config);
        }
    }
    
    // Try bundled resource path (for production)
    if let Ok(resource_path) = app_handle.path().resource_dir() {
        let config_path = resource_path.join("src/configs/stats.json");
        if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)
                .map_err(|e| format!("Failed to read stats.json: {}", e))?;
            let mut config: StatsConfig = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse stats.json: {}", e))?;
            
            // Normalize all keys in the config
            config.main = config.main.into_iter()
                .map(|(k, v)| (normalize_stat_name(&k), v))
                .collect();
            config.sub = config.sub.into_iter()
                .map(|(k, v)| (normalize_stat_name(&k), v))
                .collect();
            
            return Ok(config);
        }
    }
    
    Err("Stats config file not found".to_string())
}

fn normalize_stat_name(name: &str) -> String {
    name.replace(".", "")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn try_fix_decimal(value_str: &str, min: f64, max: f64) -> Option<String> {
    // Remove any existing decimal points for processing
    let digits: String = value_str.chars().filter(|c| c.is_numeric()).collect();
    
    if digits.is_empty() {
        return None;
    }
    
    // Try the original number first
    if let Ok(val) = value_str.parse::<f64>() {
        if val >= min && val <= max {
            return Some(value_str.to_string());
        }
    }
    
    // Try adding decimal point from right to left
    for i in 1..=digits.len() {
        let (left, right) = digits.split_at(digits.len() - i);
        let candidate = if left.is_empty() {
            format!("0.{}", right)
        } else {
            format!("{}.{}", left, right)
        };
        
        if let Ok(val) = candidate.parse::<f64>() {
            if val >= min && val <= max {
                return Some(candidate);
            }
        }
    }
    
    None
}

fn correct_stat_value(stat_name: &str, value_str: &str, stats_config: &StatsConfig, is_main_stat: bool) -> String {
    let normalized_name = normalize_stat_name(stat_name);
    
    // Get the appropriate stat map (keys are already normalized)
    let stat_map = if is_main_stat {
        &stats_config.main
    } else {
        &stats_config.sub
    };
    
    // Try to find the stat range with various name variations
    let range = stat_map.get(&normalized_name)
        .or_else(|| {
            // Try with "Bonus" suffix for element DMG stats
            stat_map.get(&format!("{} Bonus", normalized_name))
        })
        .or_else(|| {
            // Try without "Bonus" suffix
            let without_bonus = normalized_name.replace(" Bonus", "");
            stat_map.get(&without_bonus)
        })
        .or_else(|| {
            // Try with "DMG Bonus" suffix for element names
            if !normalized_name.contains("DMG") && !normalized_name.contains("Bonus") {
                stat_map.get(&format!("{} DMG Bonus", normalized_name))
            } else {
                None
            }
        });
    
    if let Some(range) = range {
        if let Some(corrected) = try_fix_decimal(value_str, range.min, range.max) {
            return corrected;
        }
    }
    
    // Return original if no correction found
    value_str.to_string()
}


fn preprocess_image(img: &DynamicImage) -> GrayImage {
    // Convert to grayscale
    let gray = img.to_luma8();
    
    // Apply thresholding to make text more distinct
    // This helps with white text on darker backgrounds
    threshold(&gray, 128, ThresholdType::Binary)
}

fn perform_ocr_on_image(img: &DynamicImage, app_handle: &AppHandle) -> Result<String, String> {
    // Preprocess the image
    let processed = preprocess_image(img);
    
    // Convert back to DynamicImage
    let processed_dynamic = DynamicImage::ImageLuma8(processed);
    
    // Initialize Tesseract API
    let api = TesseractAPI::new();
    
    let tessdata_dir = get_tessdata_dir(app_handle)?;
    api.init(tessdata_dir.to_str().unwrap(), "eng")
        .map_err(|e| format!("Failed to initialize Tesseract: {}", e))?;
    
    // Set page segmentation mode to uniform block of text
    api.set_variable("tessedit_pageseg_mode", "6")
        .map_err(|e| format!("Failed to set PSM: {}", e))?;
    
    // Convert image to RGB format for Tesseract
    let rgb_img = processed_dynamic.to_rgb8();
    let (width, height) = rgb_img.dimensions();
    let image_data = rgb_img.into_raw();
    
    // Set the image data
    api.set_image(
        &image_data,
        width as i32,
        height as i32,
        3, // bytes per pixel (RGB)
        (3 * width) as i32, // bytes per line
    )
    .map_err(|e| format!("Failed to set image: {}", e))?;
    
    // Get the recognized text
    api.get_utf8_text()
        .map_err(|e| format!("OCR error: {}", e))
}

fn parse_stats(text: &str, _stat_type: &str, stats_config: &StatsConfig, is_main_stat: bool) -> String {
    //println!("=== {} RAW TEXT ===", stat_type);
    //println!("{}", text);
    //println!("{}", "=".repeat(26 + stat_type.len()));
    
    // Clean up the text - keep only letters, numbers, spaces, periods, percent signs, and plus signs
    let cleaned: String = text
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '.' || *c == '%' || *c == '+')
        .collect();
    
    //println!("=== {} CLEANED ===", stat_type);
    //println!("{}", cleaned);
    //println!("{}", "=".repeat(23 + stat_type.len()));
    
    // Try to parse individual stat lines - flexible pattern to handle various OCR artifacts
    // First try to match percentages (more reliable), then fall back to flat values
    let percent_re = Regex::new(r"(?i)(HP|ATK|DEF|Energy\s*Regen|Crit\.?\s*Rate|Crit\.?\s*DMG|Healing\s*Bonus|Glacio\s*DMG|Fusion\s*DMG|Electro\s*DMG|Aero\s*DMG|Spectro\s*DMG|Havoc\s*DMG|Basic\s*Attack\s*DMG|Heavy\s*Attack\s*DMG|Resonance\s*Skill\s*DMG|Resonance\s*Liberation\s*DMG|Resonance\s*Skill|Resonance\s*Liberation).*?(\d+(?:\.\d+)?)\s*%").unwrap();
    let flat_re = Regex::new(r"(?i)(HP|ATK|DEF|Energy\s*Regen|Crit\.?\s*Rate|Crit\.?\s*DMG|Healing\s*Bonus|Glacio\s*DMG|Fusion\s*DMG|Electro\s*DMG|Aero\s*DMG|Spectro\s*DMG|Havoc\s*DMG|Basic\s*Attack\s*DMG|Heavy\s*Attack\s*DMG|Resonance\s*Skill\s*DMG|Resonance\s*Liberation\s*DMG|Resonance\s*Skill|Resonance\s*Liberation)[\s.]*(?:Bonus)?[\sa-z.]*?(\d+(?:\.\d+)?)").unwrap();
    
    let mut stats = Vec::new();
    let mut matched_positions = Vec::new();
    
    // First, find all percentage matches
    for captures in percent_re.captures_iter(&cleaned) {
        let stat_name: &str = captures.get(1).map_or("", |m| m.as_str());
        let value: &str = captures.get(2).map_or("", |m| m.as_str());
        let match_start = captures.get(0).map_or(0, |m| m.start());
        
        // Normalize stat name
        let normalized = stat_name.replace(".", "").split_whitespace().collect::<Vec<_>>().join(" ");
        
        // Correct the value if needed
        let corrected_value = correct_stat_value(stat_name, value, stats_config, is_main_stat);
        
        stats.push(format!("{} {}%", normalized, corrected_value));
        matched_positions.push((match_start, captures.get(0).map_or(0, |m| m.end())));
    }
    
    // Then find flat value matches that don't overlap with percentage matches
    for captures in flat_re.captures_iter(&cleaned) {
        let match_start = captures.get(0).map_or(0, |m| m.start());
        let match_end = captures.get(0).map_or(0, |m| m.end());
        
        // Skip if this overlaps with a percentage match
        let overlaps = matched_positions.iter().any(|(start, end)| {
            (match_start >= *start && match_start < *end) || 
            (match_end > *start && match_end <= *end)
        });
        
        if !overlaps {
            let stat_name: &str = captures.get(1).map_or("", |m| m.as_str());
            let value: &str = captures.get(2).map_or("", |m| m.as_str());
            
            // Normalize stat name
            let normalized = stat_name.replace(".", "").split_whitespace().collect::<Vec<_>>().join(" ");
            
            // Correct the value if needed
            let corrected_value = correct_stat_value(stat_name, value, stats_config, is_main_stat);
            
            stats.push(format!("{} {}", normalized, corrected_value));
        }
    }
    
    if !stats.is_empty() {
        let result = stats.join("\n");
        //println!("=== {} PARSED ===", stat_type);
        //println!("{}", result);
        //println!("{}", "=".repeat(22 + stat_type.len()));
        return result;
    }
    
    // Fallback: Split by lines and filter meaningful content
    let lines: Vec<String> = cleaned
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| {
            // Keep lines that contain meaningful content
            let l = line.to_lowercase();
            !line.is_empty() && 
            (l.contains("upgrade") || l.contains("activate") || 
             l.contains("hp") || l.contains("atk") || l.contains("def") || 
             l.contains("crit") || l.contains("dmg") || l.contains("energy") ||
             l.contains("+"))
        })
        .collect();
    
    let result = lines.join("\n");
    
    //println!("=== {} PARSED (FALLBACK) ===", stat_type);
    //println!("{}", result);
    //println!("{}", "=".repeat(32 + stat_type.len()));
    
    result
}

#[tauri::command]
fn set_scan_region(state: State<AppState>, region: ScanRegion) -> Result<(), String> {
    let mut scan_region = state.scan_region.lock().map_err(|e| e.to_string())?;
    *scan_region = Some(region);
    Ok(())
}

#[tauri::command]
fn get_scan_region(state: State<AppState>) -> Result<Option<ScanRegion>, String> {
    let scan_region = state.scan_region.lock().map_err(|e| e.to_string())?;
    Ok(scan_region.clone())
}

#[tauri::command]
fn set_scan_regions(state: State<AppState>, regions: ScanRegions) -> Result<(), String> {
    let mut scan_regions = state.scan_regions.lock().map_err(|e| e.to_string())?;
    *scan_regions = Some(regions);
    Ok(())
}

#[tauri::command]
fn get_scan_regions(state: State<AppState>) -> Result<Option<ScanRegions>, String> {
    let scan_regions = state.scan_regions.lock().map_err(|e| e.to_string())?;
    Ok(scan_regions.clone())
}

#[tauri::command]
async fn scan_for_text(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<bool, String> {
    // Get the scan region
    let region: ScanRegion = {
        let scan_region = state.scan_region.lock().map_err(|e| e.to_string())?;
        scan_region
            .clone()
            .ok_or_else(|| "No scan region set".to_string())?
    };

    let scan_regions = {
        let regions = state.scan_regions.lock().map_err(|e| e.to_string())?;
        regions.clone()
    };

    // Clone app_handle for the blocking task
    let app_handle_clone = app_handle.clone();

    // Run the heavy OCR work on a blocking thread pool
    let result = tokio::task::spawn_blocking(move || -> Result<(bool, Option<StatsData>), String> {
        // Capture the primary monitor
        let monitors = Monitor::all().map_err(|e| e.to_string())?;
        let monitor = monitors.first().ok_or("No monitor found")?;

        // Capture the screen
        let screenshot = monitor.capture_image().map_err(|e| e.to_string())?;

        // Crop to the specified region
        let cropped = crop_imm(
            &screenshot,
            region.x,
            region.y,
            region.width,
            region.height,
        )
        .to_image();

        let cropped_dynamic = image::DynamicImage::ImageRgba8(cropped);
        
        // Perform OCR with preprocessing
        let text = perform_ocr_on_image(&cropped_dynamic, &app_handle_clone)?;

        // Check if "Echo Upgrade" is found (case-insensitive)
        let found = text.to_lowercase().contains("echo upgrade");

        // If Echo Upgrade is found, scan the stats regions
        let stats_data = if found {
            if let Some(regions) = scan_regions.as_ref() {
                // Load stats config
                let stats_config = load_stats_config(&app_handle_clone)?;
                
                // Scan main stats
                let main_cropped = crop_imm(
                    &screenshot,
                    regions.main_stats.x,
                    regions.main_stats.y,
                    regions.main_stats.width,
                    regions.main_stats.height,
                )
                .to_image();
                let main_dynamic = image::DynamicImage::ImageRgba8(main_cropped);
                let main_text = perform_ocr_on_image(&main_dynamic, &app_handle_clone)
                    .unwrap_or_else(|_| String::new());

                // Scan sub stats
                let sub_cropped = crop_imm(
                    &screenshot,
                    regions.sub_stats.x,
                    regions.sub_stats.y,
                    regions.sub_stats.width,
                    regions.sub_stats.height,
                )
                .to_image();
                let sub_dynamic = image::DynamicImage::ImageRgba8(sub_cropped);
                let sub_text = perform_ocr_on_image(&sub_dynamic, &app_handle_clone)
                    .unwrap_or_else(|_| String::new());

                // Parse and clean the stats with correction
                let parsed_main = parse_stats(&main_text, "MAIN STAT", &stats_config, true);
                let parsed_sub = parse_stats(&sub_text, "SUB STATS", &stats_config, false);

                Some(StatsData {
                    main_stats: parsed_main,
                    sub_stats: parsed_sub,
                })
            } else {
                None
            }
        } else {
            None
        };

        Ok((found, stats_data))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    let (found, stats_data) = result;

    // Store the result
    {
        let mut last_result = state.last_scan_result.lock().map_err(|e| e.to_string())?;
        *last_result = Some(found);
    }

    // Store and emit stats data
    {
        let mut last_stats = state.last_stats_data.lock().map_err(|e| e.to_string())?;
        *last_stats = stats_data.clone();
    }

    if let Some(data) = stats_data {
        app_handle
            .emit("stats-data", data)
            .map_err(|e| e.to_string())?;
    } else {
        app_handle
            .emit("stats-data", None::<StatsData>)
            .ok();
    }

    // Emit event to overlay window
    app_handle
        .emit("ocr-result", found)
        .map_err(|e| e.to_string())?;

    Ok(found)
}

#[tauri::command]
fn get_last_scan_result(state: State<AppState>) -> Result<Option<bool>, String> {
    let last_result = state.last_scan_result.lock().map_err(|e| e.to_string())?;
    Ok(*last_result)
}

#[tauri::command]
fn get_last_stats_data(state: State<AppState>) -> Result<Option<StatsData>, String> {
    let last_stats = state.last_stats_data.lock().map_err(|e| e.to_string())?;
    Ok(last_stats.clone())
}

#[tauri::command]
fn scan_region_for_text(app_handle: tauri::AppHandle, region: ScanRegion) -> Result<String, String> {
    // Capture the primary monitor
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let monitor = monitors.first().ok_or("No monitor found")?;

    // Capture the screen
    let screenshot = monitor.capture_image().map_err(|e| e.to_string())?;

    // Crop to the specified region
    let cropped = crop_imm(
        &screenshot,
        region.x,
        region.y,
        region.width,
        region.height,
    )
    .to_image();

    let cropped_dynamic = image::DynamicImage::ImageRgba8(cropped);
    
    // Initialize Tesseract API
    let api = TesseractAPI::new();
    
    let tessdata_dir = get_tessdata_dir(&app_handle)?;
    api.init(tessdata_dir.to_str().unwrap(), "eng")
        .map_err(|e| format!("Failed to initialize Tesseract: {}", e))?;
    
    // Set page segmentation mode
    api.set_variable("tessedit_pageseg_mode", "6")
        .map_err(|e| format!("Failed to set PSM: {}", e))?;
    
    // Convert image to RGB format
    let rgb_img = cropped_dynamic.to_rgb8();
    let (width, height) = rgb_img.dimensions();
    let image_data = rgb_img.into_raw();
    
    // Set the image data
    api.set_image(
        &image_data,
        width as i32,
        height as i32,
        3,
        (3 * width) as i32,
    )
    .map_err(|e| format!("Failed to set image: {}", e))?;
    
    // Get the recognized text
    api.get_utf8_text()
        .map_err(|e| format!("OCR error: {}", e))
}

#[tauri::command]
fn set_show_scan_region(
    state: State<AppState>,
    app_handle: tauri::AppHandle,
    show: bool,
) -> Result<(), String> {
    let mut show_scan_region = state.show_scan_region.lock().map_err(|e| e.to_string())?;
    *show_scan_region = show;
    
    // Emit event to overlay window
    app_handle
        .emit("show-scan-region-changed", show)
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn get_show_scan_region(state: State<AppState>) -> Result<bool, String> {
    let show_scan_region = state.show_scan_region.lock().map_err(|e| e.to_string())?;
    Ok(*show_scan_region)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            set_scan_region,
            get_scan_region,
            set_scan_regions,
            get_scan_regions,
            scan_for_text,
            get_last_scan_result,
            get_last_stats_data,
            set_show_scan_region,
            get_show_scan_region,
            scan_region_for_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
