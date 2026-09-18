use image::imageops::crop_imm;
use image::DynamicImage;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Emitter;
use tauri::{AppHandle, State};
use xcap::Monitor;

pub mod config;
pub mod echo;
pub mod inventory;
pub mod ocr;
pub mod scan_region;
mod stats;
#[cfg(test)]
mod tests;

use crate::ocr::perform_ocr_on_image;
use crate::scan_region::{ScanRegion, ScanRegions};
use crate::stats::parse_stats;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsData {
    pub echo_name: String,
    #[serde(default)]
    pub level: String,
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
    pub inventory_scanning: std::sync::atomic::AtomicBool,
    pub inventory_cancel: std::sync::atomic::AtomicBool,
    pub inventory_preview: Mutex<bool>,
}

#[tauri::command]
fn set_scan_region(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    region: ScanRegion,
) -> Result<(), String> {
    let mut scan_region = state.scan_region.lock().map_err(|e| e.to_string())?;
    *scan_region = Some(region.clone());
    // Keep the overlay outline in sync with region changes
    app_handle
        .emit("scan-region-changed", region)
        .map_err(|e| e.to_string())?;
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
    let result =
        tokio::task::spawn_blocking(move || -> Result<(bool, Option<StatsData>), String> {
            // Capture the primary monitor
            let monitors = Monitor::all().map_err(|e| e.to_string())?;
            let monitor = monitors.first().ok_or("No monitor found")?;

            // Capture the screen
            let screenshot = DynamicImage::ImageRgba8(
                monitor.capture_image().map_err(|e| e.to_string())?,
            );

            // Crop to the specified region
            let cropped =
                crop_imm(&screenshot, region.x, region.y, region.width, region.height).to_image();

            let cropped_dynamic = DynamicImage::ImageRgba8(cropped);

            // Perform OCR with preprocessing
            let text = perform_ocr_on_image(
                &cropped_dynamic,
                &app_handle_clone,
                region.color_filter().as_ref(),
            )?;

            // Check if "Echo Upgrade" is found (case-insensitive)
            let found = text.to_lowercase().contains("echo upgrade");

            // If Echo Upgrade is found, scan the stats regions
            let stats_data = if found {
                if let Some(regions) = scan_regions.as_ref() {
                    Some(scan_stats_data(&screenshot, regions, &app_handle_clone)?)
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
        app_handle.emit("stats-data", None::<StatsData>).ok();
    }

    // Emit event to overlay window
    app_handle
        .emit("ocr-result", found)
        .map_err(|e| e.to_string())?;

    Ok(found)
}

/// OCR all detail regions of an open echo and parse them into StatsData.
fn scan_stats_data(
    screenshot: &image::DynamicImage,
    regions: &ScanRegions,
    app_handle: &AppHandle,
) -> Result<StatsData, String> {
    let stats_config = config::load_stats_config(app_handle)?;

    let ocr = |region: &ScanRegion| -> String {
        let cropped = crop_imm(
            screenshot,
            region.x,
            region.y,
            region.width,
            region.height,
        )
        .to_image();
        perform_ocr_on_image(
            &image::DynamicImage::ImageRgba8(cropped),
            app_handle,
            region.color_filter().as_ref(),
        )
        .unwrap_or_else(|_| String::new())
    };

    // Clean echo name - remove extra whitespace and trim
    let cleaned_echo_name = ocr(&regions.echo_name)
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string();

    // Try to match with known echoes
    let echo_name = if !cleaned_echo_name.is_empty() {
        if let Ok(echoes) = echo::load_echo_data(app_handle) {
            echo::match_echo_name(&cleaned_echo_name, &echoes).unwrap_or(cleaned_echo_name)
        } else {
            cleaned_echo_name
        }
    } else {
        cleaned_echo_name
    };

    // Scan level (e.g. "+25") and clean - remove extra whitespace and trim
    let level = if let Some(level_region) = regions.level.as_ref() {
        ocr(level_region)
            .lines()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .collect::<Vec<_>>()
            .join(" ")
            .trim()
            .to_string()
    } else {
        String::new()
    };

    // Parse and clean the stats with correction
    let main_stats = parse_stats(&ocr(&regions.main_stats), &stats_config, true);
    let sub_stats = parse_stats(&ocr(&regions.sub_stats), &stats_config, false);

    Ok(StatsData {
        echo_name,
        level,
        main_stats,
        sub_stats,
    })
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
        let cropped =
            crop_imm(&screenshot, region.x, region.y, region.width, region.height).to_image();

        let cropped_dynamic = image::DynamicImage::ImageRgba8(cropped);

        // Perform OCR with preprocessing
        perform_ocr_on_image(
            &cropped_dynamic,
            &app_handle,
            region.color_filter().as_ref(),
        )
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    // Stop the inventory scan while the game window is focused
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        use tauri::Manager;
                        let state = app.state::<AppState>();
                        state
                            .inventory_cancel
                            .store(true, std::sync::atomic::Ordering::SeqCst);
                    }
                })
                .build(),
        )
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::GlobalShortcutExt;
                app.global_shortcut().register("CmdOrCtrl+Shift+S")?;
            }
            Ok(())
        })
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
            scan_region_for_text,
            inventory::scan_echo_inventory,
            inventory::scan_current_echo,
            inventory::stop_echo_inventory,
            inventory::test_inventory_scroll,
            inventory::set_inventory_preview,
            inventory::get_inventory_preview,
            inventory::get_inventory_config,
            inventory::get_saved_echoes,
            inventory::clear_saved_echoes,
            inventory::delete_saved_echo,
            inventory::set_echo_equipped_by
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
