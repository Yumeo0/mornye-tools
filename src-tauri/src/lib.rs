use tauri::Emitter;
use image::imageops::crop_imm;
use image::{DynamicImage, GrayImage};
use imageproc::contrast::{threshold, ThresholdType};
use rusty_tesseract::{image_to_string, Args, Image};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::process::Command;
use tauri::State;
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

#[derive(Default)]
pub struct AppState {
    pub scan_region: Mutex<Option<ScanRegion>>,
    pub scan_regions: Mutex<Option<ScanRegions>>,
    pub last_scan_result: Mutex<Option<bool>>,
    pub last_stats_data: Mutex<Option<StatsData>>,
    pub show_scan_region: Mutex<bool>,
}

fn preprocess_image(img: &DynamicImage) -> GrayImage {
    // Convert to grayscale
    let gray = img.to_luma8();
    
    // Apply thresholding to make text more distinct
    // This helps with white text on darker backgrounds
    threshold(&gray, 128, ThresholdType::Binary)
}

fn perform_ocr_on_image(img: &DynamicImage) -> Result<String, String> {
    // Preprocess the image
    let processed = preprocess_image(img);
    
    // Convert back to DynamicImage
    let processed_dynamic = DynamicImage::ImageLuma8(processed);
    
    // Convert to rusty_tesseract Image type
    let tesseract_image = Image::from_dynamic_image(&processed_dynamic)
        .map_err(|e| format!("Image conversion error: {}", e))?;
    
    // Perform OCR with optimized settings
    let args = Args {
        lang: "eng".to_string(),
        dpi: Some(300), // Higher DPI for better accuracy
        psm: Some(6),   // Assume uniform block of text
        oem: Some(3),   // Default OCR Engine Mode
        config_variables: Default::default(),
    };
    
    image_to_string(&tesseract_image, &args).map_err(|e| format!("OCR error: {}", e))
}

fn parse_stats(text: &str, stat_type: &str) -> String {
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
        stats.push(format!("{} {}%", normalized, value));
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
            stats.push(format!("{} {}", normalized, value));
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
fn scan_for_text(
    state: State<AppState>,
    app_handle: tauri::AppHandle,
) -> Result<bool, String> {
    // Get the scan region
    let region: ScanRegion = {
        let scan_region = state.scan_region.lock().map_err(|e| e.to_string())?;
        scan_region
            .clone()
            .ok_or_else(|| "No scan region set".to_string())?
    };

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
    let text = perform_ocr_on_image(&cropped_dynamic)?;

    // Check if "Echo Upgrade" is found (case-insensitive)
    let found = text.to_lowercase().contains("echo upgrade");

    // Store the result
    {
        let mut last_result = state.last_scan_result.lock().map_err(|e| e.to_string())?;
        *last_result = Some(found);
    }

    // If Echo Upgrade is found, scan the stats regions
    if found {
        let scan_regions = state.scan_regions.lock().map_err(|e| e.to_string())?;
        if let Some(regions) = scan_regions.as_ref() {
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
            let main_text = perform_ocr_on_image(&main_dynamic)
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
            let sub_text = perform_ocr_on_image(&sub_dynamic)
                .unwrap_or_else(|_| String::new());

            // Parse and clean the stats
            let parsed_main = parse_stats(&main_text, "MAIN STAT");
            let parsed_sub = parse_stats(&sub_text, "SUB STATS");

            // Store stats data
            let stats_data = StatsData {
                main_stats: parsed_main,
                sub_stats: parsed_sub,
            };
            
            let mut last_stats = state.last_stats_data.lock().map_err(|e| e.to_string())?;
            *last_stats = Some(stats_data.clone());

            // Emit stats event to overlay
            app_handle
                .emit("stats-data", stats_data)
                .map_err(|e| e.to_string())?;
        }
    } else {
        // Clear stats if Echo Upgrade not found
        let mut last_stats = state.last_stats_data.lock().map_err(|e| e.to_string())?;
        *last_stats = None;
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
fn scan_region_for_text(region: ScanRegion) -> Result<String, String> {
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

    // Convert to rusty_tesseract Image type
    let tesseract_image = Image::from_dynamic_image(&image::DynamicImage::ImageRgba8(cropped))
        .map_err(|e| format!("Image conversion error: {}", e))?;

    // Perform OCR
    let args = Args {
        lang: "eng".to_string(),
        dpi: Some(150),
        psm: Some(6),
        oem: Some(3),
        config_variables: Default::default(),
    };

    let text = image_to_string(&tesseract_image, &args).map_err(|e| format!("OCR error: {}", e))?;

    Ok(text)
}

#[tauri::command]
fn check_tesseract_installed() -> Result<bool, String> {
    // Try to run tesseract --version to check if it's installed
    match Command::new("tesseract").arg("--version").output() {
        Ok(output) => Ok(output.status.success()),
        Err(_) => Ok(false),
    }
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
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            set_scan_region,
            get_scan_region,
            set_scan_regions,
            get_scan_regions,
            scan_for_text,
            get_last_scan_result,
            get_last_stats_data,
            check_tesseract_installed,
            set_show_scan_region,
            get_show_scan_region,
            scan_region_for_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
