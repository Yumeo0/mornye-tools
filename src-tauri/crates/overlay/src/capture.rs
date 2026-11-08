//! OCR capture source: the Wuthering Waves game window.
//!
//! The OCR path is window-only. Regions from `ocr.json` are relative to the
//! top-left corner of the game window's *client area* (its render surface), so
//! the window can sit anywhere on any monitor with any decorations and the
//! OCR always reads the game area rather than the desktop at large. When the
//! game window is unavailable the scan reports "not found" instead of falling
//! back to the desktop.
//!
//! On Windows the client area is captured with Windows Graphics Capture
//! (the `windows-capture` crate), which reads the window's own surface - other
//! windows covering the game do not end up in the capture. Elsewhere xcap's
//! window capture is used as-is.

use image::imageops::crop_imm;
use image::{DynamicImage, GenericImageView, RgbaImage};
use xcap::Window;

use crate::scan_region::ScanRegion;

/// Top-left corner of the captured game window in physical screen pixels.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct CaptureOrigin {
    pub x: i32,
    pub y: i32,
}

/// Find the game client window.
///
/// Prefers a window owned by the game client process
/// (`Client-Win64-Shipping.exe`) from the same process list the sniffer uses,
/// and falls back to a title/application-name match when the process list is
/// unreadable.
pub fn find_game_window() -> Option<Window> {
    let windows = Window::all().ok()?;

    let client_pids: Vec<u32> = crate::sniffer::live::game_processes()
        .into_iter()
        .filter(|process| process.is_client)
        .map(|process| process.pid)
        .collect();

    if !client_pids.is_empty() {
        let mut candidates: Vec<Window> = windows
            .iter()
            .filter(|window| {
                window
                    .pid()
                    .map(|pid| client_pids.contains(&pid))
                    .unwrap_or(false)
            })
            .cloned()
            .collect();
        // A minimized window cannot be captured; prefer a visible one.
        candidates.sort_by_key(|window| window.is_minimized().unwrap_or(false));
        if let Some(window) = candidates.into_iter().next() {
            return Some(window);
        }
    }

    // Fallback when process enumeration failed or the client exe was renamed:
    // match the window by its application name or title.
    let matches_name = |value: &str| {
        let value = value.to_lowercase();
        value.contains("wuthering waves") || value.contains("client-win64-shipping")
    };
    windows
        .iter()
        .find(|window| matches_name(&window.app_name().unwrap_or_default()))
        .or_else(|| {
            windows
                .iter()
                .find(|window| matches_name(&window.title().unwrap_or_default()))
        })
        .cloned()
}

/// Capture the game window's client area. Returns the frame plus the client
/// area origin on screen. Fails when the game window is not found, is
/// minimized, or the capture comes back blank (e.g. an exclusive-fullscreen
/// window DWM cannot mirror) - the OCR input is always the client area of the
/// game window, never the desktop at large.
pub fn capture_game_window() -> Result<(DynamicImage, CaptureOrigin), String> {
    #[cfg(windows)]
    {
        win32::capture_game_window()
    }

    #[cfg(not(windows))]
    {
        let window = find_game_window().ok_or("game window not found")?;
        if window.is_minimized().unwrap_or(false) {
            return Err("game window is minimized".to_string());
        }

        let origin = CaptureOrigin {
            x: window.x().map_err(|error| error.to_string())?,
            y: window.y().map_err(|error| error.to_string())?,
        };
        let frame = window.capture_image().map_err(|error| error.to_string())?;
        if is_blank(&frame) {
            return Err("game window capture is blank".to_string());
        }

        Ok((DynamicImage::ImageRgba8(frame), origin))
    }
}

/// Handle of the running game window, if any (Windows only).
#[cfg(windows)]
pub fn game_window_handle() -> Option<isize> {
    win32::find_game_hwnd().map(|hwnd| hwnd.0 as isize)
}

/// Sample a grid of pixels. All-black frames are how failed GPU/window
/// captures usually present.
pub(crate) fn is_blank(frame: &RgbaImage) -> bool {
    let (width, height) = frame.dimensions();
    if width == 0 || height == 0 {
        return true;
    }

    for row in 1..16u32 {
        for column in 1..16u32 {
            let pixel = frame.get_pixel(width * column / 16, height * row / 16);
            if pixel[0] > 8 || pixel[1] > 8 || pixel[2] > 8 {
                return false;
            }
        }
    }

    true
}

/// Crop a scan region out of a captured game window. Region coordinates are
/// relative to the window's top-left corner; a region that does not fit the
/// window is an error rather than a clipped, half-garbage crop.
pub fn crop_region(frame: &DynamicImage, region: &ScanRegion) -> Result<DynamicImage, String> {
    let (width, height) = frame.dimensions();
    let fits = u64::from(region.x) + u64::from(region.width) <= u64::from(width)
        && u64::from(region.y) + u64::from(region.height) <= u64::from(height);
    if !fits {
        return Err(format!(
            "scan region {}x{}+{}+{} does not fit the game window ({}x{})",
            region.width, region.height, region.x, region.y, width, height
        ));
    }

    Ok(DynamicImage::ImageRgba8(
        crop_imm(frame, region.x, region.y, region.width, region.height).to_image(),
    ))
}

#[cfg(windows)]
mod win32 {
    use std::sync::mpsc::{channel, Sender};
    use std::time::Duration;

    use image::imageops::crop_imm;
    use image::{DynamicImage, RgbaImage};
    use windows::Win32::Foundation::{HWND, LPARAM, POINT, RECT};
    use windows::Win32::Graphics::Gdi::ClientToScreen;
    use windows::Win32::System::Threading::GetCurrentProcessId;
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetClientRect, GetWindowRect, GetWindowTextLengthW, GetWindowTextW,
        GetWindowThreadProcessId, IsIconic, IsWindowVisible,
    };
    use windows_capture::capture::{Context, GraphicsCaptureApiHandler};
    use windows_capture::frame::Frame;
    use windows_capture::graphics_capture_api::InternalCaptureControl;
    use windows_capture::settings::{
        ColorFormat, CursorCaptureSettings, DirtyRegionSettings, DrawBorderSettings,
        MinimumUpdateIntervalSettings, SecondaryWindowSettings, Settings,
    };
    use windows_capture::window::Window as CaptureWindow;

    use super::{is_blank, CaptureOrigin};

    pub(super) fn capture_game_window() -> Result<(DynamicImage, CaptureOrigin), String> {
        let hwnd = find_game_hwnd().ok_or("game window not found")?;
        if unsafe { IsIconic(hwnd) }.as_bool() {
            return Err("game window is minimized".to_string());
        }

        // The client area is the game's render surface; scan regions are
        // authored against it.
        let mut client_rect = RECT::default();
        unsafe { GetClientRect(hwnd, &mut client_rect) }.map_err(|error| error.to_string())?;
        let client_width = (client_rect.right - client_rect.left) as u32;
        let client_height = (client_rect.bottom - client_rect.top) as u32;
        if client_width == 0 || client_height == 0 {
            return Err("game window has no client area".to_string());
        }

        let mut client_origin = POINT::default();
        if !unsafe { ClientToScreen(hwnd, &mut client_origin) }.as_bool() {
            return Err("ClientToScreen failed".to_string());
        }

        let captured = capture_window_frame(hwnd)?;
        let frame = select_client_area(captured, hwnd, client_width, client_height, client_origin)?;
        if is_blank(&frame) {
            return Err("game window capture is blank".to_string());
        }

        Ok((
            DynamicImage::ImageRgba8(frame),
            CaptureOrigin {
                x: client_origin.x,
                y: client_origin.y,
            },
        ))
    }

    /// Capture one frame of the window with Windows Graphics Capture.
    fn capture_window_frame(hwnd: HWND) -> Result<RgbaImage, String> {
        let window = CaptureWindow::from_raw_hwnd(hwnd.0);
        let (sender, receiver) = channel();

        let settings = Settings::new(
            window,
            CursorCaptureSettings::WithoutCursor,
            // Do not draw the capture border around the game.
            DrawBorderSettings::WithoutBorder,
            SecondaryWindowSettings::Default,
            MinimumUpdateIntervalSettings::Default,
            DirtyRegionSettings::Default,
            ColorFormat::Rgba8,
            sender,
        );

        let control = OneFrame::start_free_threaded(settings)
            .map_err(|error| format!("failed to start window capture: {error}"))?;
        let frame = receiver
            .recv_timeout(Duration::from_secs(5))
            .map_err(|_| "timed out waiting for a window frame".to_string())?;
        drop(control);

        RgbaImage::from_raw(frame.width, frame.height, frame.pixels)
            .ok_or_else(|| "captured frame has an invalid size".to_string())
    }

    /// Keep only the client area if the capture came back with the window
    /// frame (title bar and borders) attached.
    fn select_client_area(
        image: RgbaImage,
        hwnd: HWND,
        width: u32,
        height: u32,
        origin: POINT,
    ) -> Result<RgbaImage, String> {
        // Window capture is expected to already be the client area; allow a
        // couple of pixels of border slack instead of mis-cropping by them.
        let close = image.width().abs_diff(width) <= 4 && image.height().abs_diff(height) <= 4;
        if close {
            return Ok(image);
        }

        let mut window_rect = RECT::default();
        unsafe { GetWindowRect(hwnd, &mut window_rect) }.map_err(|error| error.to_string())?;
        let offset_x = (origin.x - window_rect.left).max(0) as u32;
        let offset_y = (origin.y - window_rect.top).max(0) as u32;
        let fits = u64::from(offset_x) + u64::from(width) <= u64::from(image.width())
            && u64::from(offset_y) + u64::from(height) <= u64::from(image.height());
        if !fits {
            return Err(format!(
                "captured {}x{} frame does not contain the {}x{} client area",
                image.width(),
                image.height(),
                width,
                height
            ));
        }

        Ok(crop_imm(&image, offset_x, offset_y, width, height).to_image())
    }

    /// A single captured frame, sent from the capture callback.
    struct CapturedFrame {
        width: u32,
        height: u32,
        pixels: Vec<u8>,
    }

    /// Graphics-capture handler that grabs one frame and stops the session.
    struct OneFrame {
        sender: Option<Sender<CapturedFrame>>,
    }

    impl GraphicsCaptureApiHandler for OneFrame {
        type Flags = Sender<CapturedFrame>;
        type Error = Box<dyn std::error::Error + Send + Sync>;

        fn new(ctx: Context<Self::Flags>) -> Result<Self, Self::Error> {
            Ok(Self {
                sender: Some(ctx.flags),
            })
        }

        fn on_frame_arrived(
            &mut self,
            frame: &mut Frame,
            control: InternalCaptureControl,
        ) -> Result<(), Self::Error> {
            if let Some(sender) = self.sender.take() {
                // Window captures include the title bar; scan regions are
                // relative to the client area.
                let buffer = frame.buffer_without_title_bar()?;
                let width = buffer.width();
                let height = buffer.height();
                let mut scratch = Vec::new();
                let pixels = buffer.as_nopadding_buffer(&mut scratch).to_vec();
                let _ = sender.send(CapturedFrame {
                    width,
                    height,
                    pixels,
                });
            }

            control.stop();
            Ok(())
        }
    }

    /// Find the game client's top-level window handle using the same process
    /// list the sniffer uses, falling back to a window title match.
    pub(super) fn find_game_hwnd() -> Option<HWND> {
        let client_pids: Vec<u32> = crate::sniffer::live::game_processes()
            .into_iter()
            .filter(|process| process.is_client)
            .map(|process| process.pid)
            .collect();

        let mut hwnds: Vec<HWND> = Vec::new();
        unsafe {
            EnumWindows(
                Some(collect_windows),
                LPARAM(&mut hwnds as *mut Vec<HWND> as isize),
            )
            .ok()?;
        }

        let own_pid = unsafe { GetCurrentProcessId() };
        let matches_game = |hwnd: HWND| -> bool {
            let pid = unsafe { GetWindowThreadProcessId(hwnd, None) };
            if pid == own_pid {
                return false;
            }
            if client_pids.contains(&pid) {
                return true;
            }
            let title = window_title(hwnd).to_lowercase();
            title.contains("wuthering waves") || title.contains("client-win64-shipping")
        };

        let mut candidates: Vec<HWND> = hwnds
            .into_iter()
            .filter(|&hwnd| matches_game(hwnd))
            .collect();
        // A minimized or hidden window cannot be captured; prefer a visible,
        // non-minimized one.
        candidates.sort_by_key(|&hwnd| unsafe {
            (IsIconic(hwnd).as_bool(), !IsWindowVisible(hwnd).as_bool())
        });
        candidates.into_iter().next()
    }

    unsafe extern "system" fn collect_windows(hwnd: HWND, lparam: LPARAM) -> windows::core::BOOL {
        let hwnds = unsafe { &mut *(lparam.0 as *mut Vec<HWND>) };
        hwnds.push(hwnd);
        true.into()
    }

    fn window_title(hwnd: HWND) -> String {
        let length = unsafe { GetWindowTextLengthW(hwnd) };
        if length <= 0 {
            return String::new();
        }
        let mut buffer = vec![0u16; length as usize + 1];
        let copied = unsafe { GetWindowTextW(hwnd, &mut buffer) };
        String::from_utf16_lossy(&buffer[..copied.max(0) as usize])
    }
}
