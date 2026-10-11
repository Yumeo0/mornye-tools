//! Synthetic input for the OCR overlay.
//!
//! The overlay only OCRs the echo *name*; to learn which echo is on screen it
//! presses the game's lock key twice. Locking (and immediately re-locking) the
//! echo makes the client send an `ItemLockRequest` carrying the echo's
//! instance id, which the sniffer picks up (`sniffer::extract`).
//!
//! The key is delivered with `PostMessage` straight to the game window
//! (`WM_KEYDOWN`/`WM_KEYUP`), so it works while the game is not focused and can
//! never leak into another application.

/// Press the echo lock key twice (lock, then re-lock) in the game window.
pub fn press_echo_lock_key() -> Result<(), String> {
    #[cfg(windows)]
    {
        win32::press_echo_lock_key()
    }

    #[cfg(not(windows))]
    {
        Err("synthetic key presses are only implemented on Windows".to_string())
    }
}

#[cfg(windows)]
mod win32 {
    use core::ffi::c_void;
    use std::thread::sleep;
    use std::time::Duration;

    use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
    use windows::Win32::UI::Input::KeyboardAndMouse::{MapVirtualKeyW, MAPVK_VK_TO_VSC};
    use windows::Win32::UI::WindowsAndMessaging::{PostMessageW, WM_KEYDOWN, WM_KEYUP};

    /// Virtual key code of "C", the echo lock toggle.
    const ECHO_LOCK_KEY: u32 = 0x43;
    /// Gap between the lock and re-lock presses.
    const PRESS_GAP: Duration = Duration::from_millis(90);

    pub(super) fn press_echo_lock_key() -> Result<(), String> {
        let hwnd = crate::capture::game_window_handle().ok_or("game window not found")?;
        let scan = unsafe { MapVirtualKeyW(ECHO_LOCK_KEY, MAPVK_VK_TO_VSC) } as u16;
        if scan == 0 {
            return Err("cannot resolve the lock key".to_string());
        }

        // Lock, then re-lock, so the echo ends up in the state it started in.
        post_key(hwnd, scan)?;
        sleep(PRESS_GAP);
        post_key(hwnd, scan)?;
        Ok(())
    }

    /// Post one key press (down + up) to the game window. Window messages do
    /// not require the target window to be focused, and unlike `SendInput`
    /// they cannot end up in another application.
    fn post_key(hwnd_raw: isize, scan: u16) -> Result<(), String> {
        let hwnd = HWND(hwnd_raw as *mut c_void);
        let vk = ECHO_LOCK_KEY as usize;
        let down = LPARAM(((scan as isize) << 16) | 1);
        let up = LPARAM(((scan as isize) << 16) | 1 | (1isize << 30) | (1isize << 31));
        unsafe {
            PostMessageW(Some(hwnd), WM_KEYDOWN, WPARAM(vk), down).map_err(|e| e.to_string())?;
            PostMessageW(Some(hwnd), WM_KEYUP, WPARAM(vk), up).map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}
