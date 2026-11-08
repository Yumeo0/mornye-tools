//! Live capture on Windows: find the Wuthering Waves process, resolve its UDP
//! sockets via `GetExtendedUdpTable`, and read IPv4 frames with a raw socket in
//! `SIO_RCVALL` mode. No capture file and no Npcap involved.
//!
//! This is a direct port of the proven `wuwa-protos/app` implementation, which
//! decodes both directions of the game's traffic. Administrator privileges are
//! required (the raw socket open fails with `WSAEACCES` otherwise).
//!
//! Raw sockets deliver bare IPv4 datagrams (no link layer), so a synthetic
//! Ethernet header is prepended before a frame enters the shared pipeline; the
//! rest of the app - including pcap save/load and `spectrum` - then sees the
//! same Ethernet frames it would get on Linux.

use std::collections::HashSet;
use std::ffi::c_void;
use std::io;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use tauri::{AppHandle, Manager};

use windows_sys::Win32::Foundation::{
    CloseHandle, ERROR_INSUFFICIENT_BUFFER, INVALID_HANDLE_VALUE, NO_ERROR,
};
use windows_sys::Win32::NetworkManagement::IpHelper::{
    GetExtendedUdpTable, GetIpAddrTable, MIB_IPADDRTABLE, MIB_UDP6TABLE_OWNER_PID,
    MIB_UDPTABLE_OWNER_PID, UDP_TABLE_OWNER_PID,
};
use windows_sys::Win32::Networking::WinSock::{
    bind, closesocket, recv, select, setsockopt, socket, WSACleanup, WSAGetLastError, WSAIoctl,
    WSAStartup, AF_INET, AF_INET6, FD_SET, INVALID_SOCKET, IN_ADDR, IN_ADDR_0, IPPROTO_IP,
    RCVALL_ON, SIO_RCVALL, SOCKADDR, SOCKADDR_IN, SOCKET, SOCKET_ERROR, SOCK_RAW, SOL_SOCKET,
    SO_RCVBUF, SO_RCVTIMEO, TIMEVAL, WSADATA,
};
use windows_sys::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use windows_sys::Win32::UI::Shell::IsUserAnAdmin;

use super::ProcInfo;
use crate::sniffer::SnifferState;

/// Synthetic Ethernet header prepended to bare IPv4 datagrams captured through
/// `SIO_RCVALL`: dummy MACs and the IPv4 EtherType.
const SYNTH_ETH: [u8; 14] = [
    0x02, 0x00, 0x00, 0x00, 0x00, 0x01, // dst MAC (synthetic)
    0x02, 0x00, 0x00, 0x00, 0x00, 0x02, // src MAC (synthetic)
    0x08, 0x00, // EtherType: IPv4
];

fn wsa_err() -> io::Error {
    io::Error::from_raw_os_error(unsafe { WSAGetLastError() })
}

/// Raw capture sockets (one per non-loopback IPv4 interface), owning the
/// WinSock session so it is cleaned up when capture stops.
pub struct CaptureSocket {
    sockets: Vec<SOCKET>,
}

impl Drop for CaptureSocket {
    fn drop(&mut self) {
        unsafe {
            for s in &self.sockets {
                closesocket(*s);
            }
            WSACleanup();
        }
    }
}

/// Find running Wuthering Waves client/launcher processes.
pub fn game_processes() -> Vec<ProcInfo> {
    let mut out = Vec::new();
    unsafe {
        let snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snap == INVALID_HANDLE_VALUE {
            return out;
        }
        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
        let mut ok = Process32FirstW(snap, &mut entry) != 0;
        while ok {
            let end = entry
                .szExeFile
                .iter()
                .position(|&c| c == 0)
                .unwrap_or(entry.szExeFile.len());
            let exe_name = String::from_utf16_lossy(&entry.szExeFile[..end]);
            let lower = exe_name.to_ascii_lowercase();
            let is_client = lower.contains("client-win64-shipping");
            let is_launcher = lower == "wuthering waves.exe";
            if is_client || is_launcher {
                out.push(ProcInfo {
                    pid: entry.th32ProcessID,
                    name: exe_name,
                    is_client,
                    ports: udp_ports(entry.th32ProcessID),
                });
            }
            ok = Process32NextW(snap, &mut entry) != 0;
        }
        CloseHandle(snap);
    }
    // Real client first, then processes actually holding UDP sockets.
    out.sort_by(|a, b| {
        b.is_client
            .cmp(&a.is_client)
            .then(b.ports.len().cmp(&a.ports.len()))
            .then(a.pid.cmp(&b.pid))
    });
    out
}

/// Resolve the UDP local ports owned by `pid` (IPv4 + IPv6 endpoint tables).
pub fn udp_ports(pid: u32) -> Vec<u16> {
    let mut ports: Vec<u16> = udp_rows(AF_INET as u32)
        .into_iter()
        .filter(|&(_, owner)| owner == pid)
        .map(|(port, _)| port)
        .collect();
    ports.extend(
        udp_rows(AF_INET6 as u32)
            .into_iter()
            .filter(|&(_, owner)| owner == pid)
            .map(|(port, _)| port),
    );
    ports.sort_unstable();
    ports.dedup();
    ports
}

/// Run a WinAPI table query that grows its buffer on
/// `ERROR_INSUFFICIENT_BUFFER`; `query` returns the error code and reports the
/// required byte count through its `size` argument.
fn with_growing_buffer(
    mut words: Vec<u32>,
    mut query: impl FnMut(&mut Vec<u32>, &mut u32) -> u32,
) -> Result<Vec<u32>, u32> {
    loop {
        let mut size = (words.len() * 4) as u32;
        let ret = query(&mut words, &mut size);
        if ret == NO_ERROR {
            return Ok(words);
        }
        if ret != ERROR_INSUFFICIENT_BUFFER {
            return Err(ret);
        }
        let need = (size as usize).div_ceil(4).max(words.len());
        words.resize(need, 0);
    }
}

/// `(local port, owning pid)` for every UDP endpoint of the given family.
/// Best-effort: returns an empty list when the table cannot be queried.
fn udp_rows(af: u32) -> Vec<(u16, u32)> {
    let words = match with_growing_buffer(vec![0; 8 * 1024], |words, size| unsafe {
        GetExtendedUdpTable(
            words.as_mut_ptr() as *mut c_void,
            size,
            0,
            af,
            UDP_TABLE_OWNER_PID,
            0,
        )
    }) {
        Ok(words) => words,
        Err(_) => return Vec::new(),
    };

    let mut out = Vec::new();
    unsafe {
        // Base pointer is aligned (Vec<u32>) and the table structs only use u32s.
        if af == AF_INET as u32 {
            let table = words.as_ptr() as *const MIB_UDPTABLE_OWNER_PID;
            let n = (*table).dwNumEntries as usize;
            for r in std::slice::from_raw_parts((*table).table.as_ptr(), n) {
                out.push((u16::from_be(r.dwLocalPort as u16), r.dwOwningPid));
            }
        } else {
            let table = words.as_ptr() as *const MIB_UDP6TABLE_OWNER_PID;
            let n = (*table).dwNumEntries as usize;
            for r in std::slice::from_raw_parts((*table).table.as_ptr(), n) {
                out.push((u16::from_be(r.dwLocalPort as u16), r.dwOwningPid));
            }
        }
    }
    out
}

/// Non-loopback IPv4 addresses, one per interface (by interface index).
fn ipv4_ifaces() -> io::Result<Vec<u32>> {
    let words = with_growing_buffer(vec![0; 16 * 1024], |words, size| unsafe {
        GetIpAddrTable(words.as_mut_ptr() as *mut MIB_IPADDRTABLE, size, 0)
    })
    .map_err(|ret| io::Error::from_raw_os_error(ret as i32))?;

    let mut seen = HashSet::new();
    let mut out = Vec::new();
    unsafe {
        let table = words.as_ptr() as *const MIB_IPADDRTABLE;
        let n = (*table).dwNumEntries as usize;
        for r in std::slice::from_raw_parts((*table).table.as_ptr(), n) {
            if r.dwAddr == 0 || r.dwAddr & 0xff == 127 {
                continue;
            }
            if seen.insert(r.dwIndex) {
                out.push(r.dwAddr);
            }
        }
    }
    Ok(out)
}

/// Open a `SIO_RCVALL` raw socket on every non-loopback IPv4 interface.
/// Requires Administrator privileges; without them the first `socket()` call
/// fails with `WSAEACCES` (10013) and that error is returned.
pub fn open_socket() -> io::Result<CaptureSocket> {
    unsafe {
        let mut wsa: WSADATA = std::mem::zeroed();
        if WSAStartup(0x0202, &mut wsa) != 0 {
            return Err(wsa_err());
        }
    }
    let result = open_all();
    if result.is_err() {
        unsafe { WSACleanup() };
    }
    result
}

fn open_all() -> io::Result<CaptureSocket> {
    let addrs = ipv4_ifaces()?;
    if addrs.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            "no non-loopback IPv4 interface found",
        ));
    }

    let mut sockets = Vec::new();
    let mut last_err = None;
    for addr in addrs {
        match unsafe { open_one(addr) } {
            Ok(s) => sockets.push(s),
            Err(e) => {
                #[cfg(debug_assertions)]
                eprintln!(
                    "raw socket on {}.{}.{}.{} failed: {e}",
                    addr & 0xff,
                    (addr >> 8) & 0xff,
                    (addr >> 16) & 0xff,
                    (addr >> 24) & 0xff
                );
                last_err = Some(e);
            }
        }
    }
    if sockets.is_empty() {
        return Err(last_err.unwrap_or_else(|| io::Error::other("cannot open a raw socket")));
    }
    Ok(CaptureSocket { sockets })
}

unsafe fn open_one(addr: u32) -> io::Result<SOCKET> {
    let s = unsafe { socket(AF_INET as i32, SOCK_RAW, IPPROTO_IP) };
    if s == INVALID_SOCKET {
        return Err(wsa_err());
    }

    let sa = SOCKADDR_IN {
        sin_family: AF_INET,
        sin_port: 0,
        sin_addr: IN_ADDR {
            S_un: IN_ADDR_0 { S_addr: addr },
        },
        sin_zero: [0; 8],
    };
    if unsafe {
        bind(
            s,
            &sa as *const SOCKADDR_IN as *const SOCKADDR,
            std::mem::size_of::<SOCKADDR_IN>() as i32,
        )
    } == SOCKET_ERROR
    {
        let e = wsa_err();
        unsafe { closesocket(s) };
        return Err(e);
    }

    // Promiscuous receive of all IPv4 traffic (both directions) on this
    // interface. Admin-only on Windows.
    let on: i32 = RCVALL_ON;
    let mut bytes: u32 = 0;
    if unsafe {
        WSAIoctl(
            s,
            SIO_RCVALL,
            &on as *const i32 as *const c_void,
            std::mem::size_of::<i32>() as u32,
            std::ptr::null_mut(),
            0,
            &mut bytes,
            std::ptr::null_mut(),
            None,
        )
    } == SOCKET_ERROR
    {
        let e = wsa_err();
        unsafe { closesocket(s) };
        return Err(e);
    }

    // Grow the receive buffer; the short timeout keeps the drain loop in
    // `run` responsive to the stop flag while recv-blocking only when the
    // socket is actually empty.
    let rcvbuf: u32 = 8 * 1024 * 1024;
    unsafe {
        setsockopt(
            s,
            SOL_SOCKET,
            SO_RCVBUF,
            &rcvbuf as *const u32 as *const u8,
            std::mem::size_of::<u32>() as i32,
        );
    }
    let rcvtimeo: u32 = 50;
    unsafe {
        setsockopt(
            s,
            SOL_SOCKET,
            SO_RCVTIMEO,
            &rcvtimeo as *const u32 as *const u8,
            std::mem::size_of::<u32>() as i32,
        );
    }

    Ok(s)
}

/// Whether the current process is elevated (raw sockets need Administrator).
pub fn is_elevated() -> bool {
    unsafe { IsUserAnAdmin() != 0 }
}

/// Whether packet capture can be opened in this process.
pub fn capture_available() -> bool {
    is_elevated()
}

/// Human-readable hint for a failed `open_socket` (missing privileges).
pub fn open_error(e: io::Error) -> String {
    format!(
        "cannot open the raw capture socket ({e}).\n\n\
         Raw capture needs Administrator privileges on Windows.\n\
         Close the app and start it again elevated \
         (right-click the terminal/executable -> Run as administrator)."
    )
}

/// Whether the given process id is still running as a Waves client/launcher.
pub fn process_alive(pid: u32) -> bool {
    game_processes().iter().any(|p| p.pid == pid)
}

/// Capture loop. `ports` is kept up to date with the process's live UDP sockets.
///
/// The loop stops when the user pauses the sniffer, or when the game process
/// has been gone for the 60 s grace period (lets late inventory notifies arrive).
pub fn run(
    app: AppHandle,
    pid: u32,
    ports: Arc<Mutex<HashSet<u16>>>,
    pem: String,
    session_key: Option<[u8; 32]>,
    sock: CaptureSocket,
) -> io::Result<()> {
    let mut sniffer = spectrum::Sniffer::with_session_key(pem, session_key);
    let mut buf = vec![0u8; 65_536];
    let mut last_refresh = Instant::now();
    let mut last_seen = Instant::now();
    {
        let state = app.state::<SnifferState>();
        state.capturing.store(true, Ordering::SeqCst);
    }

    loop {
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

        let mut readfds = FD_SET {
            fd_count: 0,
            fd_array: [0; 64],
        };
        for s in &sock.sockets {
            if (readfds.fd_count as usize) < readfds.fd_array.len() {
                readfds.fd_array[readfds.fd_count as usize] = *s;
                readfds.fd_count += 1;
            }
        }
        let tv = TIMEVAL {
            tv_sec: 0,
            tv_usec: 250_000,
        };
        let ready = unsafe {
            select(
                0,
                &mut readfds,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                &tv,
            )
        };
        if ready <= 0 {
            continue; // timeout (or transient error): nothing to read this round
        }

        for i in 0..readfds.fd_count as usize {
            let s = readfds.fd_array[i];
            // Drain the socket until it runs empty (bounded, so the stop flag
            // and the port refresh stay responsive). Reading only one
            // datagram per select round lets the kernel buffer overflow
            // during login bursts, and a single lost frame permanently
            // stalls the passive KCP mirror - the echoes from every later
            // `PhantomItemResponse` chunk would be missing.
            let mut drained = 0u32;
            while drained < 512 {
                let n = unsafe { recv(s, buf.as_mut_ptr(), buf.len() as i32, 0) };
                if n <= 0 {
                    break; // empty (SO_RCVTIMEO) or transient error
                }
                drained += 1;
                let ip = &buf[..n as usize];
                if ip.is_empty() || ip[0] >> 4 != 4 {
                    continue;
                }

                // Bare IPv4 datagram -> synthetic Ethernet frame for the pipeline.
                let mut frame = Vec::with_capacity(SYNTH_ETH.len() + ip.len());
                frame.extend_from_slice(&SYNTH_ETH);
                frame.extend_from_slice(ip);

                // Userspace pre-filter: only the game's own ports or the known
                // server ranges; everything else is dropped before the sniffer.
                if super::keep_frame(&ports, &frame) {
                    super::handle_frame(&app, &mut sniffer, &frame);
                }
            }
        }
    }

    app.state::<SnifferState>()
        .capturing
        .store(false, Ordering::SeqCst);
    Ok(())
}
