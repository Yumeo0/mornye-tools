use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;
use tauri::{AppHandle, State};

pub mod account;
pub mod capture;
pub mod config;
pub mod echo_panel;
pub mod input;
pub mod ocr;
pub mod overlay;
pub mod scan_region;
pub mod sniffer;
#[cfg(test)]
mod tests;

use crate::capture::{capture_game_window, crop_region, CaptureOrigin};
use crate::echo_panel::ScanMemo;
use crate::ocr::perform_ocr_on_image;
use crate::scan_region::{ScanRegion, ScanRegions};

#[derive(Default)]
pub struct AppState {
    pub scan_region: Mutex<Option<ScanRegion>>,
    pub scan_regions: Mutex<Option<ScanRegions>>,
    pub show_scan_region: Mutex<bool>,
    /// Where the last captured game window sat on screen, so the overlay can
    /// draw the scan-region outline relative to the window.
    pub capture_origin: Mutex<Option<CaptureOrigin>>,
    /// Cross-tick scan memo; see [`ScanMemo`].
    pub scan_memo: Mutex<ScanMemo>,
}

/// Publish the game window origin when it changes; the overlay listens for
/// this to redraw the scan-region outline when the window moves.
pub(crate) fn update_capture_origin(
    app_handle: &AppHandle,
    origin: CaptureOrigin,
) -> Result<(), String> {
    let state = app_handle.state::<AppState>();
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
fn set_scan_regions(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    regions: ScanRegions,
) -> Result<(), String> {
    let mut scan_regions = state.scan_regions.lock().map_err(|e| e.to_string())?;
    *scan_regions = Some(regions.clone());
    drop(scan_regions);
    // The overlay anchors its augmentation layer to the panel geometry;
    // keep it in sync across resolution changes.
    app_handle
        .emit("scan-regions-changed", regions)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_scan_regions(state: State<AppState>) -> Result<Option<ScanRegions>, String> {
    let scan_regions = state.scan_regions.lock().map_err(|e| e.to_string())?;
    Ok(scan_regions.clone())
}

/// OCR one arbitrary region of the game window; used by the settings debug
/// scan. Errors (no game window, minimized, blank) surface to the caller.
#[tauri::command]
async fn scan_region_for_text(
    app_handle: tauri::AppHandle,
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

    if let Err(error) = update_capture_origin(&app_handle, origin) {
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
            app.manage(overlay::OverlayState::default());
            sniffer::start(app.handle());
            overlay::start(app.handle());
            Ok(())
        })
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            set_scan_region,
            get_scan_region,
            set_scan_regions,
            get_scan_regions,
            set_show_scan_region,
            get_show_scan_region,
            overlay::set_show_menu_debug,
            overlay::assistant_queue_discard,
            overlay::assistant_cancel_discard,
            scan_region_for_text,
            get_capture_origin,
            account::account_get_snapshot,
            account::account_add_manual_echo,
            account::account_remove_manual_echo,
            account::account_set_equipped_override,
            sniffer::sniffer_get_status,
            sniffer::sniffer_import_pcap,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
