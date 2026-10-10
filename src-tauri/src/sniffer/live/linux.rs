//! Linux live capture straight into memory: find the Wuthering Waves process,
//! resolve its UDP sockets, and read raw frames with an `AF_PACKET` socket.

use std::collections::HashSet;
use std::io;
use std::os::fd::{AsRawFd, FromRawFd, OwnedFd};
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use tauri::{AppHandle, Manager};

use super::ProcInfo;
use crate::sniffer::SnifferState;

/// Find running Wuthering Waves client/launcher processes.
pub fn game_processes() -> Vec<ProcInfo> {
    let mut out = Vec::new();
    let Ok(entries) = std::fs::read_dir("/proc") else {
        return out;
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let Some(pid) = name.to_string_lossy().parse::<u32>().ok() else {
            continue;
        };
        let cmdline = std::fs::read(format!("/proc/{pid}/cmdline")).unwrap_or_default();
        let argv0 = cmdline.split(|b| *b == 0).next().unwrap_or(&[]);
        let argv0 = String::from_utf8_lossy(argv0);
        let comm = std::fs::read_to_string(format!("/proc/{pid}/comm")).unwrap_or_default();
        let comm = comm.trim();

        let exe_name = if argv0.is_empty() {
            comm.to_string()
        } else {
            argv0
                .rsplit(['/', '\\'])
                .next()
                .unwrap_or(argv0.as_ref())
                .to_string()
        };

        let is_client = exe_name.contains("Client-Win64-Shipping")
            || comm.starts_with("Client-Win64-Sh");
        let is_launcher = exe_name.eq_ignore_ascii_case("Wuthering Waves.exe")
            || comm == "Wuthering Waves";
        if !(is_client || is_launcher) {
            continue;
        }

        out.push(ProcInfo {
            pid,
            name: exe_name,
            is_client,
            ports: udp_ports(pid),
        });
    }
    out.sort_by(|a, b| {
        b.is_client
            .cmp(&a.is_client)
            .then(b.ports.len().cmp(&a.ports.len()))
            .then(a.pid.cmp(&b.pid))
    });
    out
}

/// Resolve the UDP local ports owned by `pid` (via /proc/<pid>/fd socket inodes).
pub fn udp_ports(pid: u32) -> Vec<u16> {
    let mut inodes = HashSet::new();
    if let Ok(entries) = std::fs::read_dir(format!("/proc/{pid}/fd")) {
        for entry in entries.flatten() {
            if let Ok(link) = std::fs::read_link(entry.path()) {
                let s = link.to_string_lossy();
                if let Some(rest) = s.strip_prefix("socket:[") {
                    if let Some(inode) = rest.strip_suffix(']') {
                        inodes.insert(inode.to_string());
                    }
                }
            }
        }
    }
    let mut ports = Vec::new();
    for file in [
        format!("/proc/{pid}/net/udp"),
        format!("/proc/{pid}/net/udp6"),
    ] {
        let Ok(text) = std::fs::read_to_string(&file) else {
            continue;
        };
        for line in text.lines().skip(1) {
            let cols: Vec<&str> = line.split_whitespace().collect();
            if cols.len() < 10 || !inodes.contains(cols[9]) {
                continue;
            }
            if let Some(port_hex) = cols[1].rsplit(':').next() {
                if let Ok(port) = u16::from_str_radix(port_hex, 16) {
                    ports.push(port);
                }
            }
        }
    }
    ports.sort_unstable();
    ports.dedup();
    ports
}

pub fn process_alive(pid: u32) -> bool {
    std::path::Path::new(&format!("/proc/{pid}")).exists()
}

pub fn open_socket() -> io::Result<OwnedFd> {
    unsafe {
        let proto = (libc::ETH_P_ALL as u16).to_be() as i32;
        let fd = libc::socket(libc::AF_PACKET, libc::SOCK_RAW | libc::SOCK_CLOEXEC, proto);
        if fd < 0 {
            return Err(io::Error::last_os_error());
        }
        let owned = OwnedFd::from_raw_fd(fd);

        let mut addr: libc::sockaddr_ll = std::mem::zeroed();
        addr.sll_family = libc::AF_PACKET as u16;
        addr.sll_protocol = (libc::ETH_P_ALL as u16).to_be();
        addr.sll_ifindex = 0;
        libc::bind(
            fd,
            &addr as *const libc::sockaddr_ll as *const libc::sockaddr,
            std::mem::size_of::<libc::sockaddr_ll>() as u32,
        );

        let tv = libc::timeval {
            tv_sec: 0,
            tv_usec: 250_000,
        };
        libc::setsockopt(
            fd,
            libc::SOL_SOCKET,
            libc::SO_RCVTIMEO,
            &tv as *const libc::timeval as *const libc::c_void,
            std::mem::size_of::<libc::timeval>() as u32,
        );

        let bufsize: i32 = 8 * 1024 * 1024;
        libc::setsockopt(
            fd,
            libc::SOL_SOCKET,
            libc::SO_RCVBUF,
            &bufsize as *const i32 as *const libc::c_void,
            std::mem::size_of::<i32>() as u32,
        );

        Ok(owned)
    }
}

/// Human-readable hint for a failed `open_socket` (missing capabilities).
pub fn open_error(e: io::Error) -> String {
    let bin = std::env::current_exe()
        .map(|p| p.display().to_string())
        .unwrap_or_else(|_| "<mornye-tools>".into());
    format!(
        "cannot open raw socket ({e}).\n\n\
         Grant the capability to this binary (run once after building):\n\
         sudo setcap cap_net_raw,cap_net_admin+eip {bin}\n\n\
         or run it with sudo."
    )
}

/// Npcap is Windows-only; on Linux this reports whether raw capture is usable.
pub fn npcap_available() -> bool {
    open_socket().is_ok()
}

/// Whether the process runs as root (or has CAP_NET_RAW).
pub fn is_elevated() -> bool {
    unsafe { libc::geteuid() == 0 }
}

/// Capture loop. `ports` is kept up to date with the process's live UDP sockets.
pub fn run(
    app: AppHandle,
    pid: u32,
    ports: Arc<Mutex<HashSet<u16>>>,
    pem: String,
    session_key: Option<[u8; 32]>,
    fd: OwnedFd,
) -> io::Result<()> {
    let mut sniffer = spectrum::Sniffer::with_session_key(pem, session_key);
    let mut buf = vec![0u8; 65_536];
    let mut last_refresh = Instant::now();
    let mut last_seen = Instant::now();
    app.state::<SnifferState>()
        .capturing
        .store(true, std::sync::atomic::Ordering::SeqCst);

    while !super::should_stop(&app) {
        if last_refresh.elapsed() > Duration::from_secs(2) {
            *ports.lock() = udp_ports(pid).into_iter().collect();
            if process_alive(pid) {
                last_seen = Instant::now();
            }
            last_refresh = Instant::now();
            if last_seen.elapsed() > Duration::from_secs(60) {
                break;
            }
        }

        let n = unsafe {
            libc::recv(
                fd.as_raw_fd(),
                buf.as_mut_ptr() as *mut libc::c_void,
                buf.len(),
                0,
            )
        };
        if n <= 0 {
            continue;
        }
        let frame = &buf[..n as usize];
        if !super::keep_frame(&ports, frame) {
            continue;
        }
        super::handle_frame(&app, &mut sniffer, frame);
    }

    app.state::<SnifferState>()
        .capturing
        .store(false, std::sync::atomic::Ordering::SeqCst);
    Ok(())
}
