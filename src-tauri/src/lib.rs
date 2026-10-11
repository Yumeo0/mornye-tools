use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;
use tauri::{AppHandle, State};

pub mod account;
pub mod capture;
pub mod config;
pub mod echo;
pub mod input;
pub mod ocr;
pub mod scan_region;
pub mod sniffer;
mod stats;
#[cfg(test)]
mod tests;

use crate::capture::{capture_game_window, crop_region, CaptureOrigin};
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

/// Result of the overlay trigger scan: whether the echo upgrade panel is open
/// and which echo name it shows.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EchoNameScan {
    pub panel_open: bool,
    pub name: String,
}

#[derive(Default)]
pub struct AppState {
    pub scan_region: Mutex<Option<ScanRegion>>,
    pub scan_regions: Mutex<Option<ScanRegions>>,
    pub last_scan_result: Mutex<Option<bool>>,
    pub last_stats_data: Mutex<Option<StatsData>>,
    pub show_scan_region: Mutex<bool>,
    /// Where the last captured game window sat on screen, so the overlay can
    /// draw the scan-region outline relative to the window.
    pub capture_origin: Mutex<Option<CaptureOrigin>>,
}

/// Publish the game window origin when it changes; the overlay listens for
/// this to redraw the scan-region outline when the window moves.
fn update_capture_origin(
    app_handle: &AppHandle,
    state: &AppState,
    origin: CaptureOrigin,
) -> Result<(), String> {
    let mut current = state.capture_origin.lock().map_err(|e| e.to_string())?;
    if *current == Some(origin) {
        return Ok(());
    }
    *current = Some(origin);

    app_handle
        .emit("capture-origin-changed", origin)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_capture_origin(state: State<AppState>) -> Result<Option<CaptureOrigin>, String> {
    let origin = state.capture_origin.lock().map_err(|e| e.to_string())?;
    Ok(*origin)
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
    let result = tokio::task::spawn_blocking(
        move || -> Result<(bool, Option<StatsData>, Option<CaptureOrigin>), String> {
            // Window-only capture: when the game window is unavailable there
            // is nothing to OCR, so the scan reports "not found" instead of
            // falling back to the desktop.
            let (screenshot, origin) = match capture_game_window() {
                Ok(captured) => captured,
                Err(error) => {
                    eprintln!("OCR scan skipped: {error}");
                    return Ok((false, None, None));
                }
            };

            // Crop to the specified region (relative to the game window)
            let cropped = match crop_region(&screenshot, &region) {
                Ok(cropped) => cropped,
                Err(error) => {
                    eprintln!("OCR scan skipped: {error}");
                    return Ok((false, None, None));
                }
            };

            // Perform OCR with preprocessing
            let text =
                perform_ocr_on_image(&cropped, &app_handle_clone, region.color_filter().as_ref())?;

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

            Ok((found, stats_data, Some(origin)))
        },
    )
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    let (found, stats_data, origin) = result;

    // Store the result
    {
        let mut last_result = state.last_scan_result.lock().map_err(|e| e.to_string())?;
        *last_result = Some(found);
    }

    // Remember where the captured window sits so the overlay can place the
    // scan-region outline relative to it.
    if let Some(origin) = origin {
        if let Err(error) = update_capture_origin(&app_handle, &state, origin) {
            eprintln!("Failed to publish capture origin: {error}");
        }
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

/// Clean OCR output from the echo name region and snap it to the catalog name
/// when possible, so change detection compares stable names.
fn resolve_echo_name(app_handle: &AppHandle, raw: &str) -> String {
    let cleaned = raw
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string();
    if cleaned.is_empty() {
        return cleaned;
    }

    match echo::load_echo_data(app_handle) {
        Ok(echoes) => echo::match_echo_name(&cleaned, &echoes).unwrap_or(cleaned),
        Err(_) => cleaned,
    }
}

/// Overlay trigger scan: is the echo upgrade panel open, and which echo name
/// is shown? Used to decide when to re-lock the echo (see [`press_echo_lock`]).
/// The stats-only OCR fallback stays in [`scan_for_text`].
#[tauri::command]
async fn scan_echo_name(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<EchoNameScan, String> {
    let regions = {
        let regions = state.scan_regions.lock().map_err(|e| e.to_string())?;
        regions
            .clone()
            .ok_or_else(|| "No scan regions set".to_string())?
    };

    let app_handle_clone = app_handle.clone();
    let (panel_open, name, origin) = tokio::task::spawn_blocking(
        move || -> Result<(bool, String, Option<CaptureOrigin>), String> {
            // Window-only capture: no game window means nothing to scan.
            let (screenshot, origin) = match capture_game_window() {
                Ok(captured) => captured,
                Err(_) => return Ok((false, String::new(), None)),
            };

            let title = crop_region(&screenshot, &regions.echo_upgrade)
                .and_then(|crop| {
                    perform_ocr_on_image(
                        &crop,
                        &app_handle_clone,
                        regions.echo_upgrade.color_filter().as_ref(),
                    )
                })
                .unwrap_or_default();
            if !title.to_lowercase().contains("echo upgrade") {
                return Ok((false, String::new(), Some(origin)));
            }

            let raw = crop_region(&screenshot, &regions.echo_name)
                .and_then(|crop| {
                    perform_ocr_on_image(
                        &crop,
                        &app_handle_clone,
                        regions.echo_name.color_filter().as_ref(),
                    )
                })
                .unwrap_or_default();

            Ok((
                true,
                resolve_echo_name(&app_handle_clone, &raw),
                Some(origin),
            ))
        },
    )
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    if let Some(origin) = origin {
        if let Err(error) = update_capture_origin(&app_handle, &state, origin) {
            eprintln!("Failed to publish capture origin: {error}");
        }
    }

    Ok(EchoNameScan { panel_open, name })
}

/// Press the game's echo lock key twice, so the client emits an
/// `ItemLockRequest` carrying the displayed echo's id.
#[tauri::command]
fn press_echo_lock() -> Result<(), String> {
    input::press_echo_lock_key()
}

/// OCR all detail regions of an open echo and parse them into StatsData.
fn scan_stats_data(
    screenshot: &image::DynamicImage,
    regions: &ScanRegions,
    app_handle: &AppHandle,
) -> Result<StatsData, String> {
    let stats_config = config::load_stats_config(app_handle)?;

    let ocr = |region: &ScanRegion| -> String {
        let cropped = match crop_region(screenshot, region) {
            Ok(cropped) => cropped,
            Err(error) => {
                eprintln!("Stats region skipped: {error}");
                return String::new();
            }
        };
        perform_ocr_on_image(&cropped, app_handle, region.color_filter().as_ref())
            .unwrap_or_else(|_| String::new())
    };

    let echo_name = resolve_echo_name(app_handle, &ocr(&regions.echo_name));

    // Scan level (e.g. "+25") - keep only digits and sanitize, since OCR
    // frequently misreads the leading "+" as a "4" (e.g. "+25" -> "425")
    let level = if let Some(level_region) = regions.level.as_ref() {
        let digits: String = ocr(level_region)
            .chars()
            .filter(|c| c.is_ascii_digit())
            .collect();
        if digits.is_empty() {
            String::new()
        } else {
            format!("+{}", stats::sanitize_level_digits(&digits))
        }
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
    state: State<'_, AppState>,
    region: ScanRegion,
) -> Result<String, String> {
    // Run the heavy OCR work on a blocking thread pool. Running it inline on the
    // IPC handler thread (main thread) overflows the stack.
    let app_handle_clone = app_handle.clone();
    let (text, origin) =
        tauri::async_runtime::spawn_blocking(move || -> Result<(String, CaptureOrigin), String> {
            // Window-only capture; errors (no game window, minimized, blank)
            // surface to the caller so the debug scan shows a clear message.
            let (screenshot, origin) = capture_game_window()?;

            // Crop to the specified region (relative to the game window)
            let cropped = crop_region(&screenshot, &region)?;

            // Perform OCR with preprocessing
            let text =
                perform_ocr_on_image(&cropped, &app_handle_clone, region.color_filter().as_ref())?;

            Ok((text, origin))
        })
        .await
        .map_err(|e| format!("Task join error: {}", e))??;

    if let Err(error) = update_capture_origin(&app_handle, &state, origin) {
        eprintln!("Failed to publish capture origin: {error}");
    }

    Ok(text)
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
    // MCP bridge for AI automation (debug builds only)
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build());
    #[cfg(debug_assertions)]
    let builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    builder
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir).ok();

            app.manage(account::AccountState::new(data_dir.clone()));
            let sniffer_state = sniffer::SnifferState::new(app.handle(), data_dir);
            app.manage(sniffer_state);
            sniffer::start(app.handle());
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
            get_capture_origin,
            scan_echo_name,
            press_echo_lock,
            account::account_get_snapshot,
            account::account_get_echoes,
            account::account_set_equipped_override,
            account::account_clear_echo_override,
            sniffer::sniffer_get_status,
            sniffer::sniffer_pause,
            sniffer::sniffer_resume,
            sniffer::sniffer_set_session_key,
            sniffer::sniffer_clear_session_key,
            sniffer::sniffer_import_pcap,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
