//! Synthetic input for the OCR overlay.
//!
//! The overlay only OCRs the echo *name*; to learn which echo is on screen it
//! presses a mark key on the game window. The game answers with an
//! `ItemFuncValueUpdateNotify` carrying the echo's instance id, which the
//! sniffer picks up (`sniffer::extract`). A key press toggles the echo's mark,
//! so the caller restores it right after - the lock key for an echo that was
//! locked or unmarked, the discard key for a discard-marked one - leaving the
//! echo in the state it started in.
//!
//! The key is delivered with `PostMessage` straight to the game window
//! (`WM_KEYDOWN`/`WM_KEYUP`), so it works while the game is not focused and can
//! never leak into another application.

/// Which mark key to press on the game window.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EchoMarkKey {
    /// "C": toggles the lock mark (`FuncValue` 0 <-> 1).
    Lock,
    /// "Z": toggles the discard mark (`FuncValue` 2 <-> 0).
    Discard,
}

/// Press one mark key in the game window (down + up).
pub fn press_echo_key(key: EchoMarkKey) -> Result<(), String> {
    #[cfg(windows)]
    {
        win32::press_echo_key(key)
    }

    #[cfg(not(windows))]
    {
        let _ = key;
        Err("synthetic key presses are only implemented on Windows".to_string())
    }
}

#[cfg(windows)]
mod win32 {
    use core::ffi::c_void;

    use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
    use windows::Win32::UI::Input::KeyboardAndMouse::{MapVirtualKeyW, MAPVK_VK_TO_VSC};
    use windows::Win32::UI::WindowsAndMessaging::{PostMessageW, WM_KEYDOWN, WM_KEYUP};

    use super::EchoMarkKey;

    impl EchoMarkKey {
        /// Virtual key code of the game's mark toggle.
        fn virtual_key(self) -> u32 {
            match self {
                EchoMarkKey::Lock => 0x43,    // "C"
                EchoMarkKey::Discard => 0x5A, // "Z"
            }
        }
    }

    pub(super) fn press_echo_key(key: EchoMarkKey) -> Result<(), String> {
        let hwnd = crate::capture::game_window_handle().ok_or("game window not found")?;
        let vk = key.virtual_key();
        let scan = unsafe { MapVirtualKeyW(vk, MAPVK_VK_TO_VSC) } as u16;
        if scan == 0 {
            return Err("cannot resolve the mark key".to_string());
        }
        post_key(hwnd, vk, scan)
    }

    /// Post one key press (down + up) to the game window. Window messages do
    /// not require the target window to be focused, and unlike `SendInput`
    /// they cannot end up in another application.
    fn post_key(hwnd_raw: isize, vk: u32, scan: u16) -> Result<(), String> {
        let hwnd = HWND(hwnd_raw as *mut c_void);
        let down = LPARAM(((scan as isize) << 16) | 1);
        let up = LPARAM(((scan as isize) << 16) | 1 | (1isize << 30) | (1isize << 31));
        unsafe {
            PostMessageW(Some(hwnd), WM_KEYDOWN, WPARAM(vk as usize), down)
                .map_err(|e| e.to_string())?;
            PostMessageW(Some(hwnd), WM_KEYUP, WPARAM(vk as usize), up)
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}
