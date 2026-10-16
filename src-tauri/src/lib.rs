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
pub mod scan_region;
pub mod sniffer;
#[cfg(test)]
mod tests;

use crate::capture::{capture_game_window, crop_region, CaptureOrigin};
use crate::echo_panel::{EchoPanelScan, ScanMemo};
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

/// Overlay trigger scan: is the "Echo Upgrade" panel open, and is the
/// tuning-success banner up? Used to decide when to identify the echo (see
/// [`press_echo_toggle`]). The cheap echo-menu reads ([`ScanRegions::echoes_text`]
/// and [`ScanRegions::cost_text`]) ride along so the overlay can poll fast
/// while the player is inside the echo menus.
#[tauri::command]
async fn scan_echo_panel(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<EchoPanelScan, String> {
    let regions = {
        let regions = state.scan_regions.lock().map_err(|e| e.to_string())?;
        regions
            .clone()
            .ok_or_else(|| "No scan regions set".to_string())?
    };

    let app_handle_clone = app_handle.clone();
    let (scan, origin) = tokio::task::spawn_blocking(
        move || -> Result<(EchoPanelScan, Option<CaptureOrigin>), String> {
            // Window-only capture: no game window means nothing to scan.
            let (screenshot, origin) = match capture_game_window() {
                Ok(captured) => captured,
                Err(_) => return Ok((EchoPanelScan::default(), None)),
            };
            // The scan itself owns the decision logic; see
            // `echo_panel::scan_from_screenshot`.
            let scan = echo_panel::scan_from_screenshot(&app_handle_clone, &screenshot, &regions)?;
            Ok((scan, Some(origin)))
        },
    )
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    if let Some(origin) = origin {
        if let Err(error) = update_capture_origin(&app_handle, &state, origin) {
            eprintln!("Failed to publish capture origin: {error}");
        }
    }

    Ok(scan)
}

/// Identify the echo on screen and restore its mark state.
///
/// Presses the lock key once; the game answers with an
/// `ItemFuncValueUpdateNotify` carrying the echo's id and new `FuncValue`
/// (`sniffer::extract`). The mark the echo had *before* the press (from the
/// store) decides the restoring press: an echo that was discard-marked gets
/// the discard key, every other echo gets the lock key again. Callers retry on
/// the next scan tick when no update arrives (e.g. the panel closed mid-press).
#[tauri::command]
async fn press_echo_toggle(app: AppHandle) -> Result<(), String> {
    tokio::task::spawn_blocking(move || toggle_echo_mark(&app))
        .await
        .map_err(|e| format!("Task join error: {e}"))?
}

/// Mark the echo on screen for discard (one discard-key press). Used by the
/// Echo Upgrade Assistant once an upgraded echo can no longer reach the
/// configured rating threshold.
#[tauri::command]
fn press_echo_discard() -> Result<(), String> {
    input::press_echo_key(input::EchoMarkKey::Discard)
}

/// How long to wait for the game's mark update after the identifying press.
const TOGGLE_WAIT: std::time::Duration = std::time::Duration::from_millis(800);
/// A mark change arriving this soon after the identifying press is attributed
/// to that press; a later change came from other input (e.g. the player
/// pressing the lock key themselves) and is left untouched.
const TOGGLE_PRESS_WINDOW: std::time::Duration = std::time::Duration::from_millis(350);
/// Pause between the identifying press and the restoring press.
const TOGGLE_RESTORE_DELAY: std::time::Duration = std::time::Duration::from_millis(50);

/// The mark the echo currently has in the store; `None` when it is unknown.
fn stored_func_value(app: &AppHandle, incr_id: i64) -> Option<i32> {
    app.state::<account::AccountState>()
        .store
        .lock()
        .ok()
        .and_then(|store| store.echo(incr_id))
        .map(|echo| echo.func_value)
}

fn toggle_echo_mark(app: &AppHandle) -> Result<(), String> {
    let sniffer = app.state::<sniffer::SnifferState>();
    let generation = sniffer.func_value_generation();

    // One lock press makes the client report the echo. It also toggles the
    // mark, which the restoring press below undoes.
    input::press_echo_key(input::EchoMarkKey::Lock)?;
    let pressed_at = std::time::Instant::now();

    let deadline = pressed_at + TOGGLE_WAIT;
    loop {
        if let Some(change) = sniffer.func_value_change_since(generation) {
            // Only restore a change that this press caused promptly; a change
            // arriving later came from other input (e.g. the player pressing
            // the lock key themselves) and is left untouched.
            if pressed_at.elapsed() > TOGGLE_PRESS_WINDOW {
                return Ok(());
            }

            // The lock press unmarked a discard-marked echo; pressing the lock
            // key again would leave it locked instead of discarded, so restore
            // it with the discard key.
            let key = if change.previous == account::model::Echo::FUNC_VALUE_DISCARD {
                input::EchoMarkKey::Discard
            } else {
                input::EchoMarkKey::Lock
            };

            // Let the game process the identifying press, then check the mark
            // again right before restoring: the player may have toggled it
            // while the press was in flight, and their input must win over
            // the restore.
            std::thread::sleep(TOGGLE_RESTORE_DELAY);
            if stored_func_value(app, change.incr_id) != Some(change.current) {
                return Ok(());
            }
            return input::press_echo_key(key);
        }
        if std::time::Instant::now() >= deadline {
            return Err("no echo mark update after the lock press".to_string());
        }
        std::thread::sleep(std::time::Duration::from_millis(15));
    }
}

/// OCR one arbitrary region of the game window; used by the settings debug
/// scan. Errors (no game window, minimized, blank) surface to the caller.
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

/// Show or hide the overlay's menu-detection debug panel. The choice is
/// persisted by the settings window in `settings.json`; this command only
/// relays live changes to the overlay, which reads the stored value on start.
#[tauri::command]
fn set_show_menu_debug(app_handle: tauri::AppHandle, show: bool) -> Result<(), String> {
    app_handle
        .emit("show-menu-debug-changed", show)
        .map_err(|e| e.to_string())
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
            sniffer::start(app.handle());
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
            set_show_menu_debug,
            scan_region_for_text,
            get_capture_origin,
            scan_echo_panel,
            press_echo_toggle,
            press_echo_discard,
            account::account_get_snapshot,
            account::account_add_manual_echo,
            account::account_remove_manual_echo,
            account::account_set_equipped_override,
            account::account_clear_echo_override,
            sniffer::sniffer_get_status,
            sniffer::sniffer_import_pcap,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
