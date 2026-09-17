use tauri::Emitter;
use image::imageops::crop_imm;
use image::{DynamicImage, GrayImage, ImageFormat};
use imageproc::contrast::{threshold, ThresholdType};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Mutex;
use std::io::Cursor;
use std::path::PathBuf;
use std::collections::HashMap;
use std::fs;
use tauri::{AppHandle, Manager, State};
use xberg::{extract, ExtractInput, ExtractionConfig, OcrConfig, TesseractConfig};
use xcap::Monitor;
use regex::Regex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRegion {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    /// Optional text color (hex like "#ced5d8") to filter for before OCR.
    #[serde(default)]
    pub text_color: Option<String>,
    /// Max Euclidean RGB distance from text_color for a pixel to count as text.
    #[serde(default)]
    pub tolerance: Option<u16>,
}

impl ScanRegion {
    fn color_filter(&self) -> Option<ColorFilter> {
        let rgb = parse_hex_color(self.text_color.as_deref()?)?;
        Some(ColorFilter {
            rgb,
            tolerance: self.tolerance.unwrap_or(DEFAULT_COLOR_TOLERANCE),
        })
    }
}

#[derive(Debug, Clone, Copy)]
pub struct ColorFilter {
    rgb: (u8, u8, u8),
    tolerance: u16,
}

pub const DEFAULT_COLOR_TOLERANCE: u16 = 60;

fn parse_hex_color(color: &str) -> Option<(u8, u8, u8)> {
    let hex = color.trim().trim_start_matches('#');
    if hex.len() != 6 {
        return None;
    }
    let value = u32::from_str_radix(hex, 16).ok()?;
    Some(((value >> 16) as u8, (value >> 8) as u8, value as u8))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRegions {
    pub echo_upgrade: ScanRegion,
    pub echo_name: ScanRegion,
    #[serde(default)]
    pub level: Option<ScanRegion>,
    pub main_stats: ScanRegion,
    pub sub_stats: ScanRegion,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsData {
    pub echo_name: String,
    #[serde(default)]
    pub level: String,
    pub main_stats: String,
    pub sub_stats: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterInfo {
    pub character_id: u32,
    pub character_name: String,
    pub icon_pile: String,
    pub stats: CharacterStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterStats {
    #[serde(rename = "4cost")]
    pub cost_4: Vec<Vec<String>>,
    #[serde(rename = "3cost")]
    pub cost_3: Vec<Vec<String>>,
    #[serde(rename = "1cost")]
    pub cost_1: Vec<Vec<String>>,
    pub subs: Vec<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EchoSet {
    pub id: u32,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Echo {
    pub echo_name: String,
    pub echo_id: u32,
    pub echo_sets: Vec<EchoSet>,
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
            let config: StatsConfig = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse stats.json: {}", e))?;
            
            return Ok(config);
        }
    }
    
    // Try bundled resource path (for production)
    if let Ok(resource_path) = app_handle.path().resource_dir() {
        let config_path = resource_path.join("src/configs/stats.json");
        if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)
                .map_err(|e| format!("Failed to read stats.json: {}", e))?;
            let config: StatsConfig = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse stats.json: {}", e))?;
            
            return Ok(config);
        }
    }
    
    Err("Stats config file not found".to_string())
}

fn load_echo_data(app_handle: &AppHandle) -> Result<Vec<Echo>, String> {
    // Try development path first
    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        let config_path = PathBuf::from(manifest_dir)
            .parent()
            .ok_or("Failed to get parent directory")?
            .join("src/configs/echo_data.json");
        
        if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)
                .map_err(|e| format!("Failed to read echo_data.json: {}", e))?;
            let echoes: Vec<Echo> = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse echo_data.json: {}", e))?;
            
            return Ok(echoes);
        }
    }
    
    // Try bundled resource path (for production)
    if let Ok(resource_path) = app_handle.path().resource_dir() {
        let config_path = resource_path.join("src/configs/echo_data.json");
        if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)
                .map_err(|e| format!("Failed to read echo_data.json: {}", e))?;
            let echoes: Vec<Echo> = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse echo_data.json: {}", e))?;
            
            return Ok(echoes);
        }
    }
    
    Err("Echo data file not found".to_string())
}

fn match_echo_name(ocr_text: &str, echoes: &[Echo]) -> Option<String> {
    if ocr_text.trim().is_empty() {
        return None;
    }
    
    let ocr_lower = ocr_text.to_lowercase();
    
    // First, try exact matches
    for echo in echoes {
        if echo.echo_name.to_lowercase() == ocr_lower {
            return Some(echo.echo_name.clone());
        }
    }
    
    // Then, try partial matches (OCR text contains echo name or vice versa)
    let mut candidates = Vec::new();
    for echo in echoes {
        let echo_lower = echo.echo_name.to_lowercase();
        if echo_lower.contains(&ocr_lower) || ocr_lower.contains(&echo_lower) {
            candidates.push(echo);
        }
    }
    
    if !candidates.is_empty() {
        // Prefer exact matches first, then by length (longer names are more specific)
        candidates.sort_by(|a, b| {
            let a_exact = a.echo_name.to_lowercase() == ocr_lower;
            let b_exact = b.echo_name.to_lowercase() == ocr_lower;
            if a_exact && !b_exact {
                std::cmp::Ordering::Less
            } else if !a_exact && b_exact {
                std::cmp::Ordering::Greater
            } else {
                b.echo_name.len().cmp(&a.echo_name.len())
            }
        });
        return Some(candidates[0].echo_name.clone());
    }
    
    None
}

fn normalize_stat_name(name: &str) -> String {
    name.replace(".", "")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

// Map OCR-detected stat names to canonical names from stats.json
fn map_to_canonical_stat_name(stat_name: &str) -> String {
    let normalized = normalize_stat_name(stat_name).to_lowercase();
    
    match normalized.as_str() {
        // HP stats
        s if s.contains("hp") && s.contains("%") => "HP%".to_string(),
        s if s.contains("hp") => "HP".to_string(),
        
        // ATK stats
        s if s.contains("atk") && s.contains("%") => "ATK%".to_string(),
        s if s.contains("atk") => "ATK".to_string(),
        
        // DEF stats
        s if s.contains("def") && s.contains("%") => "DEF%".to_string(),
        s if s.contains("def") => "DEF".to_string(),
        
        // Crit stats
        s if s.contains("crit") && (s.contains("rate") || s.contains("rat")) => "Crit. Rate".to_string(),
        s if s.contains("crit") && s.contains("dmg") => "Crit. DMG".to_string(),
        
        // Healing
        s if s.contains("healing") => "Healing Bonus".to_string(),
        
        // Element DMG
        s if s.contains("aero") => "Aero DMG Bonus".to_string(),
        s if s.contains("glacio") => "Glacio DMG Bonus".to_string(),
        s if s.contains("fusion") => "Fusion DMG Bonus".to_string(),
        s if s.contains("electro") => "Electro DMG Bonus".to_string(),
        s if s.contains("havoc") => "Havoc DMG Bonus".to_string(),
        s if s.contains("spectro") => "Spectro DMG Bonus".to_string(),
        
        // Energy Regen
        s if s.contains("energy") => "Energy Regen".to_string(),
        
        // Attack type bonuses
        s if s.contains("basic") && s.contains("attack") => "Basic Attack DMG Bonus".to_string(),
        s if s.contains("heavy") && s.contains("attack") => "Heavy Attack DMG Bonus".to_string(),
        s if s.contains("resonance") && s.contains("skill") => "Resonance Skill DMG Bonus".to_string(),
        s if s.contains("resonance") && s.contains("liberation") => "Resonance Liberation DMG Bonus".to_string(),
        
        // Fallback - return the original normalized name
        _ => stat_name.to_string(),
    }
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
    // First map to canonical name
    let canonical_name = map_to_canonical_stat_name(stat_name);
    
    // Get the appropriate stat map (keys are already normalized)
    let stat_map = if is_main_stat {
        &stats_config.main
    } else {
        &stats_config.sub
    };
    
    // Try to find the stat range using canonical name
    let range = stat_map.get(&canonical_name);
    
    if let Some(range) = range {
        if let Some(corrected) = try_fix_decimal(value_str, range.min, range.max) {
            return corrected;
        }
    }
    
    // Return original if no correction found
    value_str.to_string()
}

fn correct_ocr_errors(text: &str) -> String {
    text.replace("AIK", "ATK")
        .replace("oe", "%")
        .replace("—", "")
        .replace("'", "")
        .replace("\"", "")
}

fn color_filter_image(img: &DynamicImage, filter: &ColorFilter) -> GrayImage {
    let rgb = img.to_rgb8();
    let (width, height) = rgb.dimensions();
    let mut out: GrayImage = image::ImageBuffer::new(width, height);
    let tol_sq = (filter.tolerance as u32) * (filter.tolerance as u32);

    for (x, y, pixel) in rgb.enumerate_pixels() {
        let dr = pixel[0] as i32 - filter.rgb.0 as i32;
        let dg = pixel[1] as i32 - filter.rgb.1 as i32;
        let db = pixel[2] as i32 - filter.rgb.2 as i32;
        let dist_sq = (dr * dr + dg * dg + db * db) as u32;
        let is_text = dist_sq <= tol_sq;
        out.put_pixel(x, y, image::Luma([if is_text { 255 } else { 0 }]));
    }

    out
}

fn preprocess_image(img: &DynamicImage, filter: Option<&ColorFilter>) -> GrayImage {
    if let Some(filter) = filter {
        // Keep only pixels close to the configured text color (white) and
        // make everything else black, so only the text remains for OCR.
        return color_filter_image(img, filter);
    }

    // Fallback: convert to grayscale
    let gray = img.to_luma8();

    // Apply thresholding to make text more distinct
    // This helps with white text on darker backgrounds
    threshold(&gray, 128, ThresholdType::Binary)
}

fn build_ocr_config(app_handle: &AppHandle) -> Result<ExtractionConfig, String> {
    let tessdata_dir = get_tessdata_dir(app_handle)?;

    Ok(ExtractionConfig {
        ocr: Some(OcrConfig {
            backend: "tesseract".to_string(),
            language: vec!["eng".to_string()],
            tessdata_path: Some(tessdata_dir),
            tesseract_config: Some(TesseractConfig {
                psm: Some(6),
                output_format: "text".to_string(),
                // Table detection rebuilds the content as paragraphs + table and
                // duplicates every line for columnar game-UI text.
                enable_table_detection: false,
                ..Default::default()
            }),
            ..Default::default()
        }),
        ..Default::default()
    })
}

fn perform_ocr_on_image(
    img: &DynamicImage,
    app_handle: &AppHandle,
    filter: Option<&ColorFilter>,
) -> Result<String, String> {
    // Preprocess the image
    let processed = preprocess_image(img, filter);

    // Convert back to DynamicImage
    let processed_dynamic = DynamicImage::ImageLuma8(processed);

    // Encode the preprocessed image as PNG for xberg
    let mut png_buffer = Cursor::new(Vec::new());
    processed_dynamic
        .write_to(&mut png_buffer, ImageFormat::Png)
        .map_err(|e| format!("Failed to encode image: {}", e))?;

    let input = ExtractInput::from_bytes(png_buffer.into_inner(), "image/png", None::<String>);
    let config = build_ocr_config(app_handle)?;

    let output = tauri::async_runtime::block_on(extract(input, &config))
        .map_err(|e| format!("OCR error: {}", e))?;

    let document = output
        .results
        .first()
        .ok_or_else(|| "OCR returned no results".to_string())?;

    Ok(document.content.clone())
}

fn parse_stats(text: &str, stat_type: &str, stats_config: &StatsConfig, is_main_stat: bool) -> String {
    println!("=== {} RAW TEXT ===", stat_type);
    println!("{}", text);
    println!("{}", "=".repeat(26 + stat_type.len()));
    
    // Clean up the text - keep only letters, numbers, spaces, periods, percent signs, and plus signs
    let cleaned: String = text
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '.' || *c == '%' || *c == '+')
        .collect();
    
    // Correct common OCR errors
    let corrected = correct_ocr_errors(&cleaned);
    
    println!("=== {} CORRECTED ===", stat_type);
    println!("{}", corrected);
    println!("{}", "=".repeat(25 + stat_type.len()));
    
    // Try to parse individual stat lines - flexible pattern to handle various OCR artifacts
    // First try to match percentages (more reliable), then fall back to flat values
    let percent_re = Regex::new(r"(?i)(HP|ATK|DEF|Energy\s*Regen|Crit\.?\s*Rate|Crit\.?\s*DMG|Healing\s*Bonus|Glacio\s*DMG|Fusion\s*DMG|Electro\s*DMG|Aero\s*DMG|Spectro\s*DMG|Havoc\s*DMG|Basic\s*Attack\s*DMG|Heavy\s*Attack\s*DMG|Resonance\s*Skill\s*DMG|Resonance\s*Liberation\s*DMG|Resonance\s*Skill|Resonance\s*Liberation).*?(\d+(?:\.\d+)?)\s*%").unwrap();
    let flat_re = Regex::new(r"(?i)(HP|ATK|DEF|Energy\s*Regen|Crit\.?\s*Rate|Crit\.?\s*DMG|Healing\s*Bonus|Glacio\s*DMG|Fusion\s*DMG|Electro\s*DMG|Aero\s*DMG|Spectro\s*DMG|Havoc\s*DMG|Basic\s*Attack\s*DMG|Heavy\s*Attack\s*DMG|Resonance\s*Skill\s*DMG|Resonance\s*Liberation\s*DMG|Resonance\s*Skill|Resonance\s*Liberation)[\s.]*(?:Bonus)?[\sa-z.]*?(\d+(?:\.\d+)?)").unwrap();
    
    // Collect all matches with their positions
    let mut all_matches = Vec::new();
    
    // First, find all percentage matches
    for captures in percent_re.captures_iter(&corrected) {
        let stat_name: &str = captures.get(1).map_or("", |m| m.as_str());
        let value: &str = captures.get(2).map_or("", |m| m.as_str());
        let match_start = captures.get(0).map_or(0, |m| m.start());
        
        // For percentage stats, append % to the stat name for proper lookup
        let stat_name_with_percent = format!("{}%", stat_name);
        
        // Map to canonical stat name (use the version with %)
        let canonical_name = map_to_canonical_stat_name(&stat_name_with_percent);
        
        // Correct the value if needed (use the version with % for proper range lookup)
        let corrected_value = correct_stat_value(&stat_name_with_percent, value, stats_config, is_main_stat);
        
        all_matches.push((match_start, format!("{} {}%", canonical_name, corrected_value)));
    }
    
    // Then find flat value matches
    for captures in flat_re.captures_iter(&corrected) {
        let stat_name: &str = captures.get(1).map_or("", |m| m.as_str());
        let value: &str = captures.get(2).map_or("", |m| m.as_str());
        let match_start = captures.get(0).map_or(0, |m| m.start());
        
        // Check if this overlaps with any percentage match
        let overlaps = all_matches.iter().any(|(pos, _)| {
            let percent_match = percent_re.captures_iter(&corrected)
                .find(|cap| cap.get(0).map_or(false, |m| m.start() == *pos))
                .and_then(|cap| cap.get(0));
            if let Some(percent_match) = percent_match {
                let percent_start = percent_match.start();
                let percent_end = percent_match.end();
                let flat_start = match_start;
                let flat_end = captures.get(0).map_or(match_start, |m| m.end());
                (flat_start >= percent_start && flat_start < percent_end) || 
                (flat_end > percent_start && flat_end <= percent_end)
            } else {
                false
            }
        });
        
        if !overlaps {
            // Map to canonical stat name
            let canonical_name = map_to_canonical_stat_name(stat_name);
            
            // Correct the value if needed
            let corrected_value = correct_stat_value(stat_name, value, stats_config, is_main_stat);
            
            all_matches.push((match_start, format!("{} {}", canonical_name, corrected_value)));
        }
    }
    
    // Sort by position to preserve order
    all_matches.sort_by_key(|(pos, _)| *pos);
    
    let stats: Vec<String> = all_matches.into_iter().map(|(_, stat)| stat).collect();
    
    if !stats.is_empty() {
        let result = stats.join("\n");
        println!("=== {} PARSED ===", stat_type);
        println!("{}", result);
        println!("{}", "=".repeat(22 + stat_type.len()));
        return result;
    }
    
    // Fallback: Split by lines and filter meaningful content
    let lines: Vec<String> = corrected
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
    
    println!("=== {} PARSED (FALLBACK) ===", stat_type);
    println!("{}", result);
    println!("{}", "=".repeat(32 + stat_type.len()));
    
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
        let text = perform_ocr_on_image(&cropped_dynamic, &app_handle_clone, region.color_filter().as_ref())?;
        println!("DEBUG: OCR text: {}", text);

        // Check if "Echo Upgrade" is found (case-insensitive)
        let found = text.to_lowercase().contains("echo upgrade");

        // If Echo Upgrade is found, scan the stats regions
        let stats_data = if found {
            if let Some(regions) = scan_regions.as_ref() {
                // Load stats config
                let stats_config = load_stats_config(&app_handle_clone)?;
                
                // Scan echo name
                let name_cropped = crop_imm(
                    &screenshot,
                    regions.echo_name.x,
                    regions.echo_name.y,
                    regions.echo_name.width,
                    regions.echo_name.height,
                )
                .to_image();
                let name_dynamic = image::DynamicImage::ImageRgba8(name_cropped);
                let name_text = perform_ocr_on_image(&name_dynamic, &app_handle_clone, regions.echo_name.color_filter().as_ref())
                    .unwrap_or_else(|_| String::new());
                
                // Clean echo name - remove extra whitespace and trim
                let cleaned_echo_name = name_text.lines()
                    .map(|line| line.trim())
                    .filter(|line| !line.is_empty())
                    .collect::<Vec<_>>()
                    .join(" ")
                    .trim()
                    .to_string();
                
                // Try to match with known echoes
                let echo_name = if !cleaned_echo_name.is_empty() {
                    if let Ok(echoes) = load_echo_data(&app_handle_clone) {
                        let matched = match_echo_name(&cleaned_echo_name, &echoes);
                        println!("DEBUG: Cleaned echo name: '{}', Matched: {:?}", cleaned_echo_name, matched);
                        matched.unwrap_or(cleaned_echo_name)
                    } else {
                        println!("DEBUG: Failed to load echo data");
                        cleaned_echo_name
                    }
                } else {
                    println!("DEBUG: Empty echo name");
                    cleaned_echo_name
                };
                
                // Scan level (e.g. "+25")
                let level_text = if let Some(level_region) = regions.level.as_ref() {
                    let level_cropped = crop_imm(
                        &screenshot,
                        level_region.x,
                        level_region.y,
                        level_region.width,
                        level_region.height,
                    )
                    .to_image();
                    let level_dynamic = image::DynamicImage::ImageRgba8(level_cropped);
                    perform_ocr_on_image(
                        &level_dynamic,
                        &app_handle_clone,
                        level_region.color_filter().as_ref(),
                    )
                    .unwrap_or_else(|_| String::new())
                } else {
                    String::new()
                };

                // Clean level text - remove extra whitespace and trim
                let cleaned_level = level_text
                    .lines()
                    .map(|line| line.trim())
                    .filter(|line| !line.is_empty())
                    .collect::<Vec<_>>()
                    .join(" ")
                    .trim()
                    .to_string();

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
                let main_text = perform_ocr_on_image(&main_dynamic, &app_handle_clone, regions.main_stats.color_filter().as_ref())
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
                let sub_text = perform_ocr_on_image(&sub_dynamic, &app_handle_clone, regions.sub_stats.color_filter().as_ref())
                    .unwrap_or_else(|_| String::new());

                // Parse and clean the stats with correction
                let parsed_main = parse_stats(&main_text, "MAIN STAT", &stats_config, true);
                let parsed_sub = parse_stats(&sub_text, "SUB STATS", &stats_config, false);

                Some(StatsData {
                    echo_name,
                    level: cleaned_level,
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
async fn scan_region_for_text(
    app_handle: tauri::AppHandle,
    region: ScanRegion,
) -> Result<String, String> {
    // Run the heavy OCR work on a blocking thread pool. Running it inline on the
    // IPC handler thread (main thread) overflows the stack.
    tauri::async_runtime::spawn_blocking(move || {
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
        perform_ocr_on_image(&cropped_dynamic, &app_handle, region.color_filter().as_ref())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
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

#[tauri::command]
fn get_relevant_characters(
    app_handle: tauri::AppHandle,
    echo_set_ids: Vec<u32>,
) -> Result<Vec<CharacterInfo>, String> {
    // Load character data
    let character_data_path = if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        PathBuf::from(manifest_dir)
            .parent()
            .ok_or("Failed to get parent directory")?
            .join("src/configs/character_data.json")
    } else if let Ok(resource_path) = app_handle.path().resource_dir() {
        resource_path.join("src/configs/character_data.json")
    } else {
        return Err("Could not find character data".to_string());
    };

    let character_data_str = fs::read_to_string(character_data_path)
        .map_err(|e| format!("Failed to read character data: {}", e))?;
    let character_data: Vec<Value> = serde_json::from_str(&character_data_str)
        .map_err(|e| format!("Failed to parse character data: {}", e))?;

    // Load character rules from plugin store directory
    let mut relevant_characters = Vec::new();

    for character in character_data {
        let character_id = character.get("character_id")
            .and_then(|v| v.as_u64())
            .ok_or("Invalid character_id")? as u32;
        
        let character_name = character.get("character_name")
            .and_then(|v| v.as_str())
            .ok_or("Invalid character_name")?
            .to_string();
        
        let icon_pile = character.get("icon_pile")
            .and_then(|v| v.as_str())
            .ok_or("Invalid icon_pile")?
            .to_string();

        // Try to load character config
        let config_path = if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
            PathBuf::from(manifest_dir)
                .parent()
                .ok_or("Failed to get parent directory")?
                .join(format!("src/configs/characters/{}.json", character_id))
        } else if let Ok(resource_path) = app_handle.path().resource_dir() {
            resource_path.join(format!("src/configs/characters/{}.json", character_id))
        } else {
            continue;
        };

        if config_path.exists() {
            if let Ok(config_str) = fs::read_to_string(&config_path) {
                if let Ok(config) = serde_json::from_str::<Value>(&config_str) {
                    // Check if character has any matching echo sets
                    if let Some(sets) = config.get("sets").and_then(|v| v.as_array()) {
                        let has_matching_set = sets.iter()
                            .filter_map(|v| v.as_u64())
                            .any(|set_id| echo_set_ids.contains(&(set_id as u32)));

                        if has_matching_set {
                            // Parse stats
                            if let Some(stats_obj) = config.get("stats") {
                                let cost_4 = stats_obj.get("4cost")
                                    .and_then(|v| v.as_array())
                                    .map(|arr| arr.iter()
                                        .filter_map(|v| v.as_array())
                                        .map(|inner| inner.iter()
                                            .filter_map(|s| s.as_str().map(|s| s.to_string()))
                                            .collect())
                                        .collect())
                                    .unwrap_or_default();

                                let cost_3 = stats_obj.get("3cost")
                                    .and_then(|v| v.as_array())
                                    .map(|arr| arr.iter()
                                        .filter_map(|v| v.as_array())
                                        .map(|inner| inner.iter()
                                            .filter_map(|s| s.as_str().map(|s| s.to_string()))
                                            .collect())
                                        .collect())
                                    .unwrap_or_default();

                                let cost_1 = stats_obj.get("1cost")
                                    .and_then(|v| v.as_array())
                                    .map(|arr| arr.iter()
                                        .filter_map(|v| v.as_array())
                                        .map(|inner| inner.iter()
                                            .filter_map(|s| s.as_str().map(|s| s.to_string()))
                                            .collect())
                                        .collect())
                                    .unwrap_or_default();

                                let subs = stats_obj.get("subs")
                                    .and_then(|v| v.as_array())
                                    .map(|arr| arr.iter()
                                        .filter_map(|v| v.as_array())
                                        .map(|inner| inner.iter()
                                            .filter_map(|s| s.as_str().map(|s| s.to_string()))
                                            .collect())
                                        .collect())
                                    .unwrap_or_default();

                                relevant_characters.push(CharacterInfo {
                                    character_id,
                                    character_name,
                                    icon_pile,
                                    stats: CharacterStats {
                                        cost_4,
                                        cost_3,
                                        cost_1,
                                        subs,
                                    },
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(relevant_characters)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(AppState::default())
        .setup(|_app| {
            Ok(())
        })
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
            scan_region_for_text,
            get_relevant_characters
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_ocr(img: &DynamicImage, filter: Option<&ColorFilter>) -> String {
        let processed = preprocess_image(img, filter);
        let processed_dynamic = DynamicImage::ImageLuma8(processed);

        let mut png_buffer = Cursor::new(Vec::new());
        processed_dynamic
            .write_to(&mut png_buffer, ImageFormat::Png)
            .unwrap();

        let input = ExtractInput::from_bytes(png_buffer.into_inner(), "image/png", None::<String>);
        let tessdata = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tessdata");
        let config = ExtractionConfig {
            ocr: Some(OcrConfig {
                backend: "tesseract".to_string(),
                language: vec!["eng".to_string()],
                tessdata_path: Some(tessdata),
                tesseract_config: Some(TesseractConfig {
                    psm: Some(6),
                    output_format: "text".to_string(),
                    enable_table_detection: false,
                    ..Default::default()
                }),
                ..Default::default()
            }),
            ..Default::default()
        };

        let output = tauri::async_runtime::block_on(extract(input, &config)).unwrap();
        output.results.first().unwrap().content.clone()
    }

    #[test]
    fn scan_screenshot() {
        let screenshot_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("Screenshot 2026-09-17 224637.png");
        if !screenshot_path.exists() {
            eprintln!("skipping: screenshot not found");
            return;
        }

        let img = image::open(&screenshot_path).unwrap();

        let stats_config: StatsConfig = serde_json::from_str(
            &std::fs::read_to_string(
                PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                    .parent()
                    .unwrap()
                    .join("src/configs/stats.json"),
            )
            .unwrap(),
        )
        .unwrap();

        // Regions + text colors from src/configs/ocr.json (2560x1440)
        let ocr_json: Value = serde_json::from_str(
            &std::fs::read_to_string(
                PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                    .parent()
                    .unwrap()
                    .join("src/configs/ocr.json"),
            )
            .unwrap(),
        )
        .unwrap();
        let res2560 = &ocr_json["resolutions"]["2560x1440"];
        let main_stats: ScanRegion =
            serde_json::from_value(res2560["mainStats"].clone()).unwrap();
        let sub_stats: ScanRegion = serde_json::from_value(res2560["subStats"].clone()).unwrap();
        let level: ScanRegion = serde_json::from_value(res2560["level"].clone()).unwrap();

        let level_cropped = crop_imm(&img, level.x, level.y, level.width, level.height).to_image();
        let level_text = test_ocr(&DynamicImage::ImageRgba8(level_cropped), level.color_filter().as_ref());
        println!("LEVEL OCR TEXT:\n{}\n---", level_text);

        let main_cropped = crop_imm(&img, main_stats.x, main_stats.y, main_stats.width, main_stats.height).to_image();
        let main_text = test_ocr(&DynamicImage::ImageRgba8(main_cropped), main_stats.color_filter().as_ref());
        println!("MAIN OCR TEXT:\n{}\n---", main_text);
        let parsed_main = parse_stats(&main_text, "MAIN STAT", &stats_config, true);
        println!("MAIN PARSED:\n{}\n===", parsed_main);

        let sub_cropped = crop_imm(&img, sub_stats.x, sub_stats.y, sub_stats.width, sub_stats.height).to_image();
        let sub_text = test_ocr(&DynamicImage::ImageRgba8(sub_cropped), sub_stats.color_filter().as_ref());
        println!("SUB OCR TEXT:\n{}\n---", sub_text);
        let parsed_sub = parse_stats(&sub_text, "SUB STATS", &stats_config, false);
        println!("SUB PARSED:\n{}\n===", parsed_sub);
    }

    #[test]
    fn scan_live_region_like_sync_command() {
        // Mimic scan_region_for_text: capture screen, crop, OCR
        let monitors = Monitor::all().unwrap();
        let monitor = monitors.first().unwrap();
        let screenshot = monitor.capture_image().unwrap();
        println!("Captured: {}x{}", screenshot.width(), screenshot.height());

        let region = ScanRegion { x: 130, y: 65, width: 270, height: 60, text_color: None, tolerance: None };
        let cropped = crop_imm(&screenshot, region.x, region.y, region.width, region.height).to_image();
        let text = test_ocr(&DynamicImage::ImageRgba8(cropped), region.color_filter().as_ref());
        println!("LIVE OCR TEXT:\n{}\n===", text);
    }
}
