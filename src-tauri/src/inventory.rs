use crate::config::{load_json_resource, load_stats_config};
use crate::echo::{load_echo_data, match_echo_name, Echo};
use crate::ocr::perform_ocr_on_image;
use crate::scan_region::ScanRegion;
use crate::stats::{parse_stats, StatsConfig};
use crate::AppState;
use enigo::{Button, Coordinate, Direction, Enigo, Mouse, Settings};
use image::DynamicImage;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::collections::HashSet;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::thread::sleep;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use xcap::Monitor;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryConfig {
    pub counter: ScanRegion,
    pub name: ScanRegion,
    pub level: ScanRegion,
    #[serde(rename = "mainStats")]
    pub main_stats: ScanRegion,
    #[serde(rename = "subStats")]
    pub sub_stats: ScanRegion,
    #[serde(rename = "equippedBy")]
    pub equipped_by: ScanRegion,
    pub grid: GridConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GridConfig {
    /// Top-left corner of the first grid cell
    #[serde(rename = "startX")]
    pub start_x: i32,
    #[serde(rename = "startY")]
    pub start_y: i32,
    #[serde(rename = "columnSpacing")]
    pub column_spacing: i32,
    #[serde(rename = "rowSpacing")]
    pub row_spacing: i32,
    /// Grid cell size, used for the region preview
    #[serde(rename = "cellWidth")]
    pub cell_width: i32,
    #[serde(rename = "cellHeight")]
    pub cell_height: i32,
    pub columns: usize,
    pub rows: usize,
    #[serde(rename = "clickWaitMs")]
    pub click_wait_ms: u64,
    #[serde(rename = "scrollWaitMs")]
    pub scroll_wait_ms: u64,
}

impl GridConfig {
    /// Advance the grid to the next page: move to the center of the last grid
    /// element and perform two drags - one full page, then a fine tune of
    /// three rows. The cursor is moved back to the grid before each drag,
    /// because a drag that reaches the screen top leaves the cursor pinned
    /// there and a second drag from that position cannot move.
    fn drag_scroll(&self, enigo: &mut Enigo) -> Result<(), String> {
        let (start_x, start_y) = self.last_cell_center();

        enigo
            .move_mouse(start_x, start_y, Coordinate::Abs)
            .map_err(|e| format!("Failed to move mouse: {e}"))?;
        
        sleep(Duration::from_millis(300));

        enigo
            .button(Button::Left, Direction::Press)
            .map_err(|e| format!("Failed to press mouse: {e}"))?;

        sleep(Duration::from_millis(300));

        const STEPS: i32 = 40;
        for i in 0..STEPS {
            let y = start_y - ((start_y as f32 / STEPS as f32) * (i as f32 + 1.0)).round() as i32;
            let _ = enigo.move_mouse(start_x, y, Coordinate::Abs);
            sleep(Duration::from_millis(16));
        }

        sleep(Duration::from_millis(500));

        enigo
            .button(Button::Left, Direction::Release)
            .map_err(|e| format!("Failed to release mouse: {e}"))?;

        Ok(())
    }

    /// Center of the last grid cell (bottom-right of the visible grid).
    fn last_cell_center(&self) -> (i32, i32) {
        let x = self.start_x
            + ((self.columns - 1) as i32) * self.column_spacing
            + self.cell_width / 2;
        let y = self.start_y
            + ((self.rows - 1) as i32) * self.row_spacing
            + self.cell_height / 2;
        (x, y)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct InventoryEcho {
    pub echo_name: String,
    pub level: String,
    pub main_stats: String,
    pub sub_stats: String,
    #[serde(rename = "equippedBy")]
    pub equipped_by: String,
}

#[derive(Debug, Clone, Serialize)]
struct InventoryProgress {
    scanned: usize,
    echo: InventoryEcho,
}

#[derive(Debug, Clone, Serialize)]
struct InventoryDone {
    scanned: usize,
    cancelled: bool,
    error: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct InventoryConfigFile {
    pub resolutions: HashMap<String, InventoryConfig>,
}

/// Path of the file where scanned echoes are persisted (app data dir).
fn echo_store_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data dir: {e}"))?;
    Ok(dir.join("echoes.json"))
}

/// Load previously scanned echoes. Missing or invalid files yield an empty list.
pub(crate) fn load_saved_echoes(app_handle: &AppHandle) -> Vec<InventoryEcho> {
    echo_store_path(app_handle)
        .ok()
        .and_then(|path| std::fs::read_to_string(path).ok())
        .and_then(|content| serde_json::from_str(&content).ok())
        .unwrap_or_default()
}

/// Persist an echo, skipping exact duplicates and keeping the newest first.
fn append_saved_echo(app_handle: &AppHandle, echo: &InventoryEcho) -> Result<(), String> {
    let path = echo_store_path(app_handle)?;
    let mut echoes = load_saved_echoes(app_handle);
    if !echoes.contains(echo) {
        echoes.insert(0, echo.clone());
    }
    let content = serde_json::to_string_pretty(&echoes).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())
}

fn load_inventory_config(app_handle: &AppHandle) -> Result<InventoryConfig, String> {
    let file: InventoryConfigFile = load_json_resource(app_handle, "inventory.json")?;

    // Prefer the config matching the primary monitor's resolution
    if let Ok(monitors) = Monitor::all() {
        if let Some(monitor) = monitors.first() {
            if let (Ok(width), Ok(height)) = (monitor.width(), monitor.height()) {
                let key = format!("{width}x{height}");
                if let Some(config) = file.resolutions.get(&key) {
                    return Ok(config.clone());
                }
            }
        }
    }

    file.resolutions
        .into_values()
        .next()
        .ok_or_else(|| "No inventory config found".to_string())
}

fn capture_screen() -> Result<DynamicImage, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let monitor = monitors.first().ok_or("No monitor found")?;
    Ok(DynamicImage::ImageRgba8(
        monitor.capture_image().map_err(|e| e.to_string())?,
    ))
}

fn ocr_region(
    screenshot: &DynamicImage,
    region: &ScanRegion,
    app_handle: &AppHandle,
) -> Result<String, String> {
    let cropped =
        image::imageops::crop_imm(screenshot, region.x, region.y, region.width, region.height)
            .to_image();
    perform_ocr_on_image(
        &DynamicImage::ImageRgba8(cropped),
        app_handle,
        region.color_filter().as_ref(),
    )
}

fn clean_text(text: &str) -> String {
    text.lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string()
}

/// Hash a downscaled version of the grid area to detect whether the page
/// actually scrolled.
fn grid_hash(screenshot: &DynamicImage, grid: &GridConfig) -> u64 {
    let x = grid.start_x.max(0) as u32;
    let y = grid.start_y.max(0) as u32;
    let width =
        ((grid.columns as i32 - 1) * grid.column_spacing + grid.cell_width) as u32;
    let height =
        ((grid.rows as i32 - 1) * grid.row_spacing + grid.cell_height) as u32;

    let cropped = image::imageops::crop_imm(screenshot, x, y, width, height).to_image();
    let thumbnail =
        image::imageops::resize(&cropped, 64, 64, image::imageops::FilterType::CatmullRom);
    let gray = image::imageops::grayscale(&thumbnail);

    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    for pixel in gray.pixels() {
        pixel.0[0].hash(&mut hasher);
    }
    hasher.finish()
}

fn click(enigo: &mut Enigo, x: i32, y: i32) -> Result<(), String> {
    enigo
        .move_mouse(x, y, Coordinate::Abs)
        .map_err(|e| format!("Failed to move mouse: {e}"))?;
    sleep(Duration::from_millis(60));
    enigo
        .button(Button::Left, Direction::Click)
        .map_err(|e| format!("Failed to click: {e}"))?;
    Ok(())
}

fn emit_done(app_handle: &AppHandle, scanned: usize, cancelled: bool, error: Option<String>) {
    let _ = app_handle.emit(
        "inventory-done",
        InventoryDone {
            scanned,
            cancelled,
            error,
        },
    );
}

/// What to scan: the whole echo grid, or only echoes that have been upgraded
/// (scanning stops at the first level 0 echo).
#[derive(Debug, Clone, Copy, PartialEq)]
enum ScanMode {
    All,
    LeveledOnly,
}

impl ScanMode {
    fn parse(mode: &str) -> Result<Self, String> {
        match mode {
            "all" => Ok(Self::All),
            "leveled" => Ok(Self::LeveledOnly),
            _ => Err(format!("Unknown scan mode: {mode}")),
        }
    }
}

/// OCR the echo detail panel currently shown on screen. Returns `None` if no
/// echo name is visible (e.g. an empty grid cell).
fn scan_echo_detail(
    screenshot: &DynamicImage,
    config: &InventoryConfig,
    stats_config: &StatsConfig,
    echoes: &[Echo],
    app_handle: &AppHandle,
) -> Result<Option<InventoryEcho>, String> {
    let echo_name = clean_text(&ocr_region(screenshot, &config.name, app_handle)?);
    if echo_name.is_empty() {
        return Ok(None);
    }
    // Correct OCR artifacts by matching against the known echo names, same as
    // the echo detail OCR pipeline
    let echo_name = match_echo_name(&echo_name, echoes).unwrap_or(echo_name);

    let level_raw = ocr_region(screenshot, &config.level, app_handle)?;
    let level_digits: String = level_raw.chars().filter(|c| c.is_ascii_digit()).collect();
    let level = if level_digits.is_empty() {
        String::new()
    } else {
        format!("+{level_digits}")
    };

    let main_text = ocr_region(screenshot, &config.main_stats, app_handle)?;
    let sub_text = ocr_region(screenshot, &config.sub_stats, app_handle)?;
    let equipped_by = clean_text(&ocr_region(screenshot, &config.equipped_by, app_handle)?);

    Ok(Some(InventoryEcho {
        echo_name,
        level,
        main_stats: parse_stats(&main_text, stats_config, true),
        sub_stats: parse_stats(&sub_text, stats_config, false),
        equipped_by,
    }))
}

fn run_inventory_scan(app_handle: &AppHandle, mode: ScanMode) {
    let state = app_handle.state::<AppState>();
    state.inventory_cancel.store(false, Ordering::SeqCst);

    let result = run_scan(app_handle, &state, mode);

    state.inventory_scanning.store(false, Ordering::SeqCst);
    match result {
        Ok((scanned, cancelled)) => emit_done(app_handle, scanned, cancelled, None),
        Err(error) => {
            emit_done(app_handle, 0, false, Some(error.clone()));
            eprintln!("Inventory scan failed: {error}");
        }
    }
}

fn run_scan(
    app_handle: &AppHandle,
    state: &tauri::State<AppState>,
    mode: ScanMode,
) -> Result<(usize, bool), String> {
    let config = load_inventory_config(app_handle)?;
    let stats_config = load_stats_config(app_handle)?;
    let echoes = load_echo_data(app_handle).unwrap_or_default();

    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| format!("Failed to initialize mouse control: {e}"))?;
    let mut seen: HashSet<String> = HashSet::new();
    let mut last_hash: Option<u64> = None;
    let mut scanned = 0usize;

    // Verify the Echo Management page is open
    let screenshot = capture_screen()?;
    let counter = ocr_region(&screenshot, &config.counter, app_handle)?;
    if !counter.contains("Echoes") {
        return Err(
            "Echo Management page not detected. Please open the echo inventory in-game first."
                .to_string(),
        );
    }

    loop {
        if state.inventory_cancel.load(Ordering::SeqCst) {
            return Ok((scanned, true));
        }

        for row in 0..config.grid.rows {
            for column in 0..config.grid.columns {
                if state.inventory_cancel.load(Ordering::SeqCst) {
                    return Ok((scanned, true));
                }
                let x = config.grid.start_x
                    + (column as i32) * config.grid.column_spacing
                    + config.grid.cell_width / 2;
                let y = config.grid.start_y
                    + (row as i32) * config.grid.row_spacing
                    + config.grid.cell_height / 2;
                click(&mut enigo, x, y)?;
                sleep(Duration::from_millis(config.grid.click_wait_ms));

                let screenshot = capture_screen()?;
                let echo =
                    match scan_echo_detail(&screenshot, &config, &stats_config, &echoes, app_handle)?
                    {
                        Some(echo) => echo,
                        None => continue,
                    };

                // Leveled-only mode: the inventory is sorted so upgraded echoes
                // come first; stop at the first level 0 echo
                if mode == ScanMode::LeveledOnly {
                    let level_num: u32 = echo
                        .level
                        .trim_start_matches('+')
                        .parse()
                        .unwrap_or(0);
                    if level_num == 0 {
                        return Ok((scanned, false));
                    }
                }

                let key = format!(
                    "{}|{}|{}|{}|{}",
                    echo.echo_name, echo.level, echo.main_stats, echo.sub_stats, echo.equipped_by
                );
                if seen.insert(key) {
                    scanned += 1;
                    // Persist the echo so scans accumulate across sessions
                    if let Err(e) = append_saved_echo(app_handle, &echo) {
                        eprintln!("Failed to save echo: {e}");
                    }
                    let _ = app_handle.emit(
                        "inventory-progress",
                        InventoryProgress {
                            scanned,
                            echo,
                        },
                    );
                }
            }
        }

        // Advance to the next page of the grid; the cursor is still over the
        // grid from the last click
        config.grid.drag_scroll(&mut enigo)?;
        sleep(Duration::from_millis(config.grid.scroll_wait_ms));

        let screenshot = capture_screen()?;
        let hash = grid_hash(&screenshot, &config.grid);
        if last_hash == Some(hash) {
            // Page did not move anymore, we reached the end
            break;
        }
        last_hash = Some(hash);
    }

    Ok((scanned, false))
}

#[tauri::command]
pub async fn scan_echo_inventory(
    app_handle: tauri::AppHandle,
    mode: String,
) -> Result<(), String> {
    let mode = ScanMode::parse(&mode)?;
    {
        let state = app_handle.state::<AppState>();
        if state
            .inventory_scanning
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            return Err("An inventory scan is already running".to_string());
        }
    }

    tauri::async_runtime::spawn_blocking(move || {
        run_inventory_scan(&app_handle, mode);
    });

    Ok(())
}

/// OCR the echo that is currently open on the detail page and save it.
#[tauri::command]
pub async fn scan_current_echo(app_handle: tauri::AppHandle) -> Result<InventoryEcho, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let config = load_inventory_config(&app_handle)?;
        let stats_config = load_stats_config(&app_handle)?;
        let echoes = load_echo_data(&app_handle).unwrap_or_default();

        let screenshot = capture_screen()?;
        let echo =
            scan_echo_detail(&screenshot, &config, &stats_config, &echoes, &app_handle)?
                .ok_or("No echo selected. Open an echo's detail page first.")?;

        append_saved_echo(&app_handle, &echo)?;
        let _ = app_handle.emit(
            "inventory-progress",
            InventoryProgress { scanned: 1, echo: echo.clone() },
        );
        Ok(echo)
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

#[tauri::command]
pub fn stop_echo_inventory(app_handle: AppHandle) -> Result<(), String> {
    let state = app_handle.state::<AppState>();
    state.inventory_cancel.store(true, Ordering::SeqCst);
    Ok(())
}

/// Moves the mouse to the center of the last grid element and drags up by one
/// full page (rows * item height + rows * row spacing) so the drag can be
/// calibrated. Returns a version marker so the UI can verify it is talking to
/// the current backend.
#[tauri::command]
pub fn test_inventory_scroll(app_handle: AppHandle) -> Result<String, String> {
    let config = load_inventory_config(&app_handle)?;
    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| format!("Failed to initialize mouse control: {e}"))?;
    config.grid.drag_scroll(&mut enigo)?;
    let (x, y) = config.grid.last_cell_center();
    Ok(format!(
        "drag-v2 (started at {x},{y})"
    ))
}

#[tauri::command]
pub fn set_inventory_preview(app_handle: AppHandle, show: bool) -> Result<(), String> {
    let state = app_handle.state::<AppState>();
    *state.inventory_preview.lock().map_err(|e| e.to_string())? = show;
    app_handle
        .emit("inventory-preview-changed", show)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_inventory_preview(app_handle: AppHandle) -> Result<bool, String> {
    let state = app_handle.state::<AppState>();
    let preview = *state.inventory_preview.lock().map_err(|e| e.to_string())?;
    Ok(preview)
}

#[tauri::command]
pub fn get_saved_echoes(app_handle: AppHandle) -> Result<Vec<InventoryEcho>, String> {
    Ok(load_saved_echoes(&app_handle))
}

#[tauri::command]
pub fn clear_saved_echoes(app_handle: AppHandle) -> Result<(), String> {
    let path = echo_store_path(&app_handle)?;
    std::fs::write(path, "[]").map_err(|e| e.to_string())
}

/// Delete one saved echo, matched by exact content (a single duplicate if any).
#[tauri::command]
pub fn delete_saved_echo(app_handle: AppHandle, echo: InventoryEcho) -> Result<(), String> {
    let path = echo_store_path(&app_handle)?;
    let mut echoes = load_saved_echoes(&app_handle);
    if let Some(position) = echoes.iter().position(|e| *e == echo) {
        echoes.remove(position);
    }
    let content = serde_json::to_string_pretty(&echoes).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())
}

/// Change which character an echo is equipped by, matched by exact content.
#[tauri::command]
pub fn set_echo_equipped_by(
    app_handle: AppHandle,
    echo: InventoryEcho,
    equipped_by: String,
) -> Result<(), String> {
    let path = echo_store_path(&app_handle)?;
    let mut echoes = load_saved_echoes(&app_handle);
    let mut updated = false;
    for saved in echoes.iter_mut() {
        if *saved == echo {
            saved.equipped_by = equipped_by.clone();
            updated = true;
        }
    }
    if !updated {
        return Err("Echo not found".to_string());
    }
    let content = serde_json::to_string_pretty(&echoes).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_inventory_config(app_handle: AppHandle) -> Result<InventoryConfig, String> {
    load_inventory_config(&app_handle)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::echo::Echo;
    use crate::stats::StatsConfig;
    use crate::tests::test_ocr;
    use image::GenericImageView;
    use std::path::PathBuf;

    #[test]
    fn ocr_inventory_screenshot() {
        let screenshot_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("samples/inventory_screenshot.png");
        if !screenshot_path.exists() {
            eprintln!("skipping: inventory screenshot not found");
            return;
        }

        let img = image::open(&screenshot_path).unwrap();
        let (w, h) = img.dimensions();
        assert_eq!(
            (w, h),
            (2560, 1440),
            "inventory screenshot is expected at 2560x1440"
        );

        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("src/configs/inventory.json");
        let content = std::fs::read_to_string(&path).unwrap();
        let file: InventoryConfigFile = serde_json::from_str(&content).unwrap();
        let config = file.resolutions.get("2560x1440").unwrap();

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

        let regions: Vec<(&str, ScanRegion)> = vec![
            ("counter", config.counter.clone()),
            ("name", config.name.clone()),
            ("level", config.level.clone()),
            ("mainStats", config.main_stats.clone()),
            ("subStats", config.sub_stats.clone()),
            ("equippedBy", config.equipped_by.clone()),
        ];

        let mut texts: Vec<(String, String)> = Vec::new();
        for (label, region) in &regions {
            let crop = image::imageops::crop_imm(&img, region.x, region.y, region.width, region.height)
                .to_image();
            let filter = region.color_filter();
            assert!(
                filter.is_some(),
                "{label} must have a textColor configured"
            );
            let text = test_ocr(&DynamicImage::ImageRgba8(crop), filter.as_ref());
            let cleaned = clean_text(&text);
            println!("[{label}] {}", cleaned.replace('\n', " | "));
            assert!(!cleaned.is_empty(), "{label} OCR text must not be empty");
            texts.push((label.to_string(), cleaned));
        }

        let results: std::collections::HashMap<String, String> =
            texts.iter().cloned().collect();

        assert!(
            results["counter"].contains("Echoes"),
            "counter region should contain 'Echoes', got: {}",
            results["counter"]
        );

        let level_digits: String = results["level"].chars().filter(|c| c.is_ascii_digit()).collect();
        assert!(
            !level_digits.is_empty(),
            "level region should contain digits, got: {}",
            results["level"]
        );

        let main_parsed = parse_stats(&results["mainStats"], &stats_config, true);
        println!("MAIN PARSED:\n{main_parsed}");
        assert!(!main_parsed.is_empty(), "main stats must parse to something");

        let sub_parsed = parse_stats(&results["subStats"], &stats_config, false);
        println!("SUB PARSED:\n{sub_parsed}");
        assert!(!sub_parsed.is_empty(), "sub stats must parse to something");
    }

    #[test]
    fn echo_name_matching_corrects_ocr_artifacts() {
        let echoes = vec![
            Echo {
                echo_name: "Fallacy of No Return".to_string(),
                echo_id: 1,
                echo_sets: Vec::new(),
            },
            Echo {
                echo_name: "Nightmare: Hecate".to_string(),
                echo_id: 2,
                echo_sets: Vec::new(),
            },
        ];

        assert_eq!(
            match_echo_name("Fallacy of No Return |", &echoes),
            Some("Fallacy of No Return".to_string())
        );
        assert_eq!(
            match_echo_name("Nightmare: Hecate", &echoes),
            Some("Nightmare: Hecate".to_string())
        );
        assert_eq!(match_echo_name("Unknown Echo |", &echoes), None);
        assert_eq!(match_echo_name("   ", &echoes), None);
    }

    #[test]
    fn parse_inventory_config_file() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("src/configs/inventory.json");
        let content = std::fs::read_to_string(&path).unwrap();
        let file: InventoryConfigFile = serde_json::from_str(&content).unwrap();
        let config = file.resolutions.get("2560x1440").unwrap();
        assert_eq!(config.grid.columns, 6);
        assert_eq!(config.grid.rows, 4);
        assert!(config.main_stats.width > 0);
    }
}
