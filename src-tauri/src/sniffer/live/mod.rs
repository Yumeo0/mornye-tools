//! Live capture: find the Wuthering Waves process, resolve its UDP sockets, and
//! read raw frames straight into memory.
//!
//! Windows uses Npcap's `wpcap.dll` loaded at runtime (no build-time SDK);
//! Linux uses an `AF_PACKET` socket. Ported from `wuwa-protos/app`.

use std::collections::HashSet;
use std::sync::Arc;

use parking_lot::Mutex;
use serde::Serialize;
use tauri::AppHandle;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
pub use linux::{capture_available, game_processes, is_elevated, open_error, open_socket, process_alive, run, udp_ports};

#[cfg(windows)]
mod windows;
#[cfg(windows)]
pub use windows::{capture_available, game_processes, is_elevated, open_error, open_socket, process_alive, run, udp_ports};

#[cfg(not(any(target_os = "linux", windows)))]
compile_error!("live capture is implemented for Linux and Windows only");

#[derive(Serialize, Clone)]
pub struct ProcInfo {
    pub pid: u32,
    pub name: String,
    /// True for the actual game client (`Client-Win64-Shipping.exe`).
    pub is_client: bool,
    /// UDP local ports currently owned by the process.
    pub ports: Vec<u16>,
}

#[derive(Serialize, Clone)]
pub struct LiveInfo {
    pub pid: u32,
    pub ports: Vec<u16>,
}

/// Userspace pre-filter: only the game's own ports or the known server ranges;
/// everything else is dropped before the sniffer.
pub(crate) fn keep_frame(ports: &Mutex<HashSet<u16>>, frame: &[u8]) -> bool {
    match udp_ports_of(frame) {
        Some((src, dst)) => {
            let set = ports.lock();
            set.contains(&src)
                || set.contains(&dst)
                || in_default_ranges(src)
                || in_default_ranges(dst)
        }
        None => false,
    }
}

/// Port ranges the game's servers use for the KCP/UDP transport.
pub const PORT_RANGES: &[(u16, u16)] = &[(13100, 13200), (23100, 23200)];

pub fn in_default_ranges(port: u16) -> bool {
    PORT_RANGES.iter().any(|&(a, b)| port >= a && port <= b)
}

/// Extract `(src_port, dst_port)` from an Ethernet/raw-IP IPv4 UDP frame.
pub fn udp_ports_of(frame: &[u8]) -> Option<(u16, u16)> {
    let ip = if frame.len() > 14 && frame[12] == 0x08 && frame[13] == 0x00 {
        14
    } else if matches!(frame.first().map(|b| b >> 4), Some(4)) {
        0
    } else {
        return None;
    };
    let hdr = frame.get(ip..)?;
    if hdr.len() < 20 || hdr[9] != 17 {
        return None;
    }
    let ihl = (hdr[0] & 0x0f) as usize * 4;
    let udp = hdr.get(ihl..)?;
    if udp.len() < 4 {
        return None;
    }
    Some((
        u16::from_be_bytes([udp[0], udp[1]]),
        u16::from_be_bytes([udp[2], udp[3]]),
    ))
}

/// Feed one raw frame through the sniffer and extract account deltas.
pub(crate) fn handle_frame(app: &AppHandle, sniffer: &mut spectrum::Sniffer, frame: &[u8]) {
    crate::sniffer::process_frame(app, sniffer, frame.to_vec());
}

/// Resolve the client process to capture, preferring the real client with ports.
pub fn pick_process(procs: &[ProcInfo]) -> Option<&ProcInfo> {
    procs
        .iter()
        .find(|p| p.is_client && !p.ports.is_empty())
        .or_else(|| procs.iter().find(|p| !p.ports.is_empty()))
        .or_else(|| procs.iter().find(|p| p.is_client))
        .or_else(|| procs.first())
}

/// Convert `udp_ports` into the shared port set used by the capture loop.
pub fn port_set(ports: &[u16]) -> Arc<Mutex<HashSet<u16>>> {
    Arc::new(Mutex::new(ports.iter().copied().collect()))
}
