use serde::Serialize;
use std::sync::Mutex;
use tauri::Emitter;
use tauri::Manager;
use tauri::{AppHandle, State};

pub mod account;
pub mod capture;
pub mod config;
pub mod input;
pub mod ocr;
pub mod scan_region;
pub mod sniffer;
#[cfg(test)]
mod tests;

use crate::capture::{capture_game_window, crop_region, CaptureOrigin};
use crate::ocr::perform_ocr_on_image;
use crate::scan_region::{ScanRegion, ScanRegions};

/// Result of the overlay trigger scan: whether the "Echo Upgrade" panel is
/// open and whether the tuning-success banner is up. The panel opening is the
/// overlay's re-fetch signal; the echo name is deliberately not read here
/// because it can be covered while browsing upgrade fodder. The raw title and
/// banner reads ride along as evidence for the menu-detection debug panel.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EchoPanelScan {
    pub panel_open: bool,
    /// True while the "Tuning Successful" banner is up (or still animating in
    /// after an upgrade packet); the panel stays open and the overlay skips
    /// key presses until it clears.
    pub tuning_successful: bool,
    /// True while the banner wait after an echo update packet is still
    /// running; the banner region is not read yet then.
    pub waiting_for_banner: bool,
    /// Raw OCR of the panel-title region (trimmed).
    pub title_text: String,
    /// Raw OCR of the tuning-banner region, when it was read this scan
    /// (empty while the title is visible or the banner wait is running).
    pub banner_text: String,
    /// True while the menu sort icon is visible in its configured region; the
    /// overlay then waits (no key presses) until that screen closes.
    pub sort_icon_visible: bool,
    /// Similarity of the sort-icon region against its template (0..=1), for
    /// the menu-detection debug panel; `None` when the region or the template
    /// is unavailable.
    pub sort_icon_score: Option<f32>,
    /// True while the high-rarity confirmation dialog text is visible in its
    /// configured region; the overlay then waits (no key presses) until the
    /// dialog closes, like for the sort-icon screen.
    pub high_rarity_notice_visible: bool,
    /// Raw OCR of the high-rarity notice region, when it was read this scan;
    /// debug evidence for the menu-detection panel.
    pub high_rarity_notice_text: String,
}

#[derive(Default)]
pub struct AppState {
    pub scan_region: Mutex<Option<ScanRegion>>,
    pub scan_regions: Mutex<Option<ScanRegions>>,
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

/// Case-insensitive phrase check for OCR output, normalised over line breaks
/// (the OCR often splits a phrase across lines).
fn contains_phrase(text: &str, phrase: &str) -> bool {
    let normalized = text
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase();
    normalized.contains(phrase)
}

/// Minimum similarity (0..=1) between the sort-icon region and its template
/// for the icon to count as visible.
const SORT_ICON_MATCH_THRESHOLD: f32 = 0.9;

/// Best similarity of a captured region against the sort-icon template over a
/// few placements: the configured region can be a few pixels larger than the
/// icon, so the template slides inside it and the best placement wins.
fn sort_icon_similarity_best(region: &image::DynamicImage, template: &image::DynamicImage) -> f32 {
    use image::GenericImageView;

    let (region_w, region_h) = region.dimensions();
    let (template_w, template_h) = template.dimensions();
    if template_w == 0 || template_h == 0 || region_w < template_w || region_h < template_h {
        return sort_icon_similarity(region, template);
    }

    // Every integer offset up to a small cap: the icon can sit anywhere in a
    // slightly larger region, and a one-pixel miss would blur the bright
    // details the match depends on.
    let offsets = |max: u32| -> Vec<u32> { (0..=max.min(8)).collect() };

    let mut best: f32 = 0.0;
    for dx in offsets(region_w - template_w) {
        for dy in offsets(region_h - template_h) {
            let placed = region.crop_imm(dx, dy, template_w, template_h);
            best = best.max(sort_icon_similarity(&placed, template));
        }
    }
    best
}

/// Similarity of a captured region against the sort-icon template, in 0..=1.
/// Both images are reduced to a small grid; only pixels the template marks as
/// opaque count (its transparent corners are the game's own background), and
/// the comparison is weighted by the template's brightness so the icon's
/// bright details decide the match while its dark body also resembles most
/// backgrounds.
fn sort_icon_similarity(region: &image::DynamicImage, template: &image::DynamicImage) -> f32 {
    use image::imageops::FilterType;

    const GRID: u32 = 24;

    let region_small = region.resize_exact(GRID, GRID, FilterType::Triangle).to_rgba8();
    let template_small = template.resize_exact(GRID, GRID, FilterType::Triangle).to_rgba8();

    let luma = |px: &image::Rgba<u8>| {
        0.299 * f32::from(px[0]) + 0.587 * f32::from(px[1]) + 0.114 * f32::from(px[2])
    };

    let mut weighted_diff = 0.0f32;
    let mut weight_sum = 0.0f32;
    for (region_px, template_px) in region_small.pixels().zip(template_small.pixels()) {
        if template_px[3] < 128 {
            continue;
        }
        let template_luma = luma(template_px);
        let weight = template_luma.max(24.0);
        weighted_diff += weight * (luma(region_px) - template_luma).abs();
        weight_sum += weight;
    }

    if weight_sum == 0.0 {
        return 0.0;
    }
    1.0 - (weighted_diff / weight_sum) / 255.0
}

/// After an echo stat update the "Tuning Successful" banner animates in; the
/// scan waits this long before reading its region.
const BANNER_ANIMATION_WAIT: std::time::Duration = std::time::Duration::from_millis(1500);

/// Overlay trigger scan: is the "Echo Upgrade" panel open, and is the
/// tuning-success banner up? Used to decide when to identify the echo (see
/// [`press_echo_toggle`]).
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
                Err(_) => {
                    return Ok((
                        EchoPanelScan {
                            panel_open: false,
                            tuning_successful: false,
                            waiting_for_banner: false,
                            title_text: String::new(),
                            banner_text: String::new(),
                            sort_icon_visible: false,
                            sort_icon_score: None,
                            high_rarity_notice_visible: false,
                            high_rarity_notice_text: String::new(),
                        },
                        None,
                    ))
                }
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
            let title_visible = contains_phrase(&title, "echo upgrade");

            // The "Tuning Successful" text animates in after an upgrade, so
            // right after an echo update packet hold the panel open without
            // reading its region yet; the title OCR above keeps running.
            let waiting_for_banner = app_handle_clone
                .state::<sniffer::SnifferState>()
                .echo_update_recent(BANNER_ANIMATION_WAIT);

            // The tuning-success banner covers the panel title while it is up,
            // so a visible title means the panel is showing normally. Reading
            // the banner region tells "panel open, title hidden" apart from a
            // closed panel, so the overlay card stays and no key press fires.
            // The read is kept for the menu-detection debug panel.
            let banner_text = if title_visible || waiting_for_banner {
                String::new()
            } else {
                regions
                    .tuning_successful
                    .as_ref()
                    .and_then(|region| {
                        crop_region(&screenshot, region)
                            .and_then(|crop| {
                                perform_ocr_on_image(
                                    &crop,
                                    &app_handle_clone,
                                    region.color_filter().as_ref(),
                                )
                            })
                            .ok()
                    })
                    .unwrap_or_default()
            };
            let tuning_successful = if title_visible {
                false
            } else if waiting_for_banner {
                true
            } else {
                contains_phrase(&banner_text, "tuning successful")
            };

            // The sort icon marks list screens (upgrade fodder selection,
            // echo bags) where the mark keys do nothing useful - or worse,
            // act on whatever happens to be selected. Template-match it so
            // the overlay can wait the screen out; the score rides along for
            // the menu-detection debug panel.
            let (sort_icon_visible, sort_icon_score) = match regions.sort_icon.as_ref() {
                Some(region) => match (
                    crop_region(&screenshot, region),
                    config::load_binary_resource(&app_handle_clone, "public/sort_icon.png"),
                ) {
                    (Ok(crop), Ok(bytes)) => match image::load_from_memory(&bytes) {
                        Ok(template) => {
                            let score = sort_icon_similarity_best(&crop, &template);
                            (score >= SORT_ICON_MATCH_THRESHOLD, Some(score))
                        }
                        Err(_) => (false, None),
                    },
                    _ => (false, None),
                },
                None => (false, None),
            };

            // Upgrading with high-rarity or already-upgraded echoes in the
            // fodder pops a confirmation dialog ("Includes High Rarity and
            // Upgrade materials. Do you wish to continue upgrade?") that
            // swallows the mark keys, so the overlay waits it out like the
            // sort-icon screen. Either dialog line counts: the OCR may only
            // read one of them cleanly.
            let high_rarity_notice_text = regions
                .high_rarity_notice
                .as_ref()
                .and_then(|region| {
                    crop_region(&screenshot, region)
                        .and_then(|crop| {
                            perform_ocr_on_image(
                                &crop,
                                &app_handle_clone,
                                region.color_filter().as_ref(),
                            )
                        })
                        .ok()
                })
                .unwrap_or_default();
            let high_rarity_notice_text = high_rarity_notice_text.trim().to_string();
            let high_rarity_notice_visible =
                contains_phrase(&high_rarity_notice_text, "high rarity")
                    || contains_phrase(&high_rarity_notice_text, "continue upgrade");

            Ok((
                EchoPanelScan {
                    panel_open: title_visible || tuning_successful,
                    tuning_successful,
                    waiting_for_banner,
                    title_text: title.trim().to_string(),
                    banner_text: banner_text.trim().to_string(),
                    sort_icon_visible,
                    sort_icon_score,
                    high_rarity_notice_visible,
                    high_rarity_notice_text,
                },
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
            account::account_get_echoes,
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
