//! Window capture, OCR and the in-game overlay supervisor.

pub mod capture;
pub mod commands;
pub mod echo_panel;
pub mod input;
pub mod ocr;
pub mod overlay;
pub mod scan_region;
#[cfg(test)]
mod tests;

use mornye_sync::{account, config, sniffer};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

use crate::capture::CaptureOrigin;
use crate::echo_panel::ScanMemo;
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
