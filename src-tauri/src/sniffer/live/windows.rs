//! Windows live capture: find the Wuthering Waves process (Toolhelp32), resolve
//! its UDP sockets (`GetExtendedUdpTable`), and read raw frames with Npcap's
//! `wpcap.dll` loaded at runtime. No capture file and no import library needed.

use std::collections::HashSet;
use std::ffi::{c_char, c_int, c_uchar, CStr, CString};
use std::io;
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use tauri::{AppHandle, Manager};

use super::ProcInfo;
use crate::sniffer::SnifferState;
use ffi::{
    BpfProgram, Pcap, PcapIf, PcapPkthdr, AF_INET, AF_INET6, INVALID_HANDLE_VALUE,
    TH32CS_SNAPPROCESS, UDP_TABLE_OWNER_PID,
};

/// One activated Npcap handle per network interface.
pub struct CaptureHandle {
    caps: Vec<Capture>,
    wp: Wpcap,
}

/// A live `pcap_t` handle; closed on drop.
struct Capture {
    ptr: *mut Pcap,
    close: unsafe extern "system" fn(*mut Pcap),
}

impl Drop for Capture {
    fn drop(&mut self) {
        unsafe { (self.close)(self.ptr) }
    }
}

// pcap_t is only ever used from the single thread owning the handle.
unsafe impl Send for CaptureHandle {}

/// Find running Wuthering Waves client/launcher processes.
pub fn game_processes() -> Vec<ProcInfo> {
    let mut out = Vec::new();
    let snap = unsafe { ffi::CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) };
    if snap.is_null() || snap as usize == INVALID_HANDLE_VALUE {
        return out;
    }
    let mut entry: ffi::ProcessEntry32W = unsafe { std::mem::zeroed() };
    entry.dw_size = std::mem::size_of::<ffi::ProcessEntry32W>() as u32;

    let mut ok = unsafe { ffi::Process32FirstW(snap, &mut entry) } != 0;
    while ok {
        let len = entry
            .sz_exe_file
            .iter()
            .position(|&c| c == 0)
            .unwrap_or(entry.sz_exe_file.len());
        let name = String::from_utf16_lossy(&entry.sz_exe_file[..len]);
        let pid = entry.th32_process_id;

        let is_client = name.contains("Client-Win64-Shipping");
        let is_launcher = name.eq_ignore_ascii_case("Wuthering Waves.exe");
        if is_client || is_launcher {
            out.push(ProcInfo {
                pid,
                name,
                is_client,
                ports: udp_ports(pid),
            });
        }
        ok = unsafe { ffi::Process32NextW(snap, &mut entry) } != 0;
    }
    unsafe { ffi::CloseHandle(snap) };

    // Real client first, then processes actually holding UDP sockets.
    out.sort_by(|a, b| {
        b.is_client
            .cmp(&a.is_client)
            .then(b.ports.len().cmp(&a.ports.len()))
            .then(a.pid.cmp(&b.pid))
    });
    out
}

/// Resolve the UDP local ports owned by `pid` (via `GetExtendedUdpTable`).
pub fn udp_ports(pid: u32) -> Vec<u16> {
    let mut ports = Vec::new();
    for af in [AF_INET, AF_INET6] {
        let mut size: u32 = 0;
        unsafe {
            ffi::GetExtendedUdpTable(std::ptr::null_mut(), &mut size, 0, af, UDP_TABLE_OWNER_PID, 0)
        };
        if size == 0 {
            continue;
        }
        let mut buf = vec![0u8; size as usize];
        let rc = unsafe {
            ffi::GetExtendedUdpTable(
                buf.as_mut_ptr() as *mut _,
                &mut size,
                0,
                af,
                UDP_TABLE_OWNER_PID,
                0,
            )
        };
        if rc != 0 || buf.len() < 4 {
            continue;
        }
        let count = u32::from_ne_bytes(buf[0..4].try_into().unwrap()) as usize;

        for i in 0..count {
            let (owner, local_port) = if af == AF_INET {
                let row = unsafe {
                    std::ptr::read_unaligned(
                        buf.as_ptr().add(4 + i * ffi::UDP_ROW_SIZE) as *const ffi::UdpRowOwnerPid,
                    )
                };
                (row.owning_pid, row.local_port)
            } else {
                let row = unsafe {
                    std::ptr::read_unaligned(
                        buf.as_ptr().add(4 + i * ffi::UDP6_ROW_SIZE)
                            as *const ffi::Udp6RowOwnerPid,
                    )
                };
                (row.owning_pid, row.local_port)
            };
            if owner == pid {
                ports.push(u16::from_be((local_port & 0xffff) as u16));
            }
        }
    }
    ports.sort_unstable();
    ports.dedup();
    ports
}

/// Whether the given process id is still running as a Waves client/launcher.
pub fn process_alive(pid: u32) -> bool {
    game_processes().iter().any(|p| p.pid == pid)
}

/// Open one Npcap capture per interface, filtered to the server port ranges.
pub fn open_socket() -> io::Result<CaptureHandle> {
    let wp = Wpcap::load()?;
    let ranges: Vec<String> = super::PORT_RANGES
        .iter()
        .map(|&(a, b)| format!("portrange {a}-{b}"))
        .collect();
    let filter = format!("udp and ({})", ranges.join(" or "));
    let (caps, errors) = wp.open_all(&filter)?;
    if caps.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::Other,
            if errors.is_empty() {
                "no usable Npcap interface".to_string()
            } else {
                errors.join("; ")
            },
        ));
    }
    Ok(CaptureHandle { wp, caps })
}

/// Human-readable hint for a failed `open_socket` (missing Npcap / privileges).
pub fn open_error(e: io::Error) -> String {
    format!(
        "cannot open packet capture ({e}).\n\n\
         Live capture needs Npcap installed (https://npcap.com) and is best run \
         as Administrator.\n\
         Reinstall Npcap with \"WinPcap API-compatible Mode\" and \
         \"Restrict Npcap driver's access to Administrators only\" unchecked to \
         capture without elevation."
    )
}

/// Whether Npcap's `wpcap.dll` can be loaded (installed and discoverable).
pub fn npcap_available() -> bool {
    match Wpcap::load() {
        Ok(wp) => {
            drop(wp);
            true
        }
        Err(_) => false,
    }
}

/// Whether the current process is elevated (member of the Administrators group).
pub fn is_elevated() -> bool {
    unsafe { ffi::IsUserAnAdmin() != 0 }
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
    handle: CaptureHandle,
) -> io::Result<()> {
    let CaptureHandle { wp, mut caps } = handle;
    let mut sniffer = spectrum::Sniffer::with_session_key(pem, session_key);
    let mut last_refresh = Instant::now();
    let mut last_seen = Instant::now();
    {
        let state = app.state::<SnifferState>();
        state.capturing.store(true, std::sync::atomic::Ordering::SeqCst);
    }

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

        let mut i = 0;
        while i < caps.len() {
            let cap = caps[i].ptr;
            let mut hdr: *mut PcapPkthdr = std::ptr::null_mut();
            let mut data: *const c_uchar = std::ptr::null();
            match unsafe { (wp.next_ex)(cap, &mut hdr, &mut data) } {
                1 if !hdr.is_null() && !data.is_null() => {
                    let frame = unsafe { std::slice::from_raw_parts(data, (*hdr).caplen as usize) };
                    if super::keep_frame(&ports, frame) {
                        super::handle_frame(&app, &mut sniffer, frame);
                    }
                    i += 1;
                }
                // Read timeout or capture closed.
                0 | -2 => i += 1,
                // Interface went away - drop it and keep the others.
                _ => {
                    caps.swap_remove(i);
                }
            }
        }

        if caps.is_empty() {
            return Err(io::Error::new(
                io::ErrorKind::Other,
                "all capture interfaces stopped",
            ));
        }
    }

    app.state::<SnifferState>()
        .capturing
        .store(false, std::sync::atomic::Ordering::SeqCst);
    Ok(())
}

/// Npcap's `wpcap.dll`, resolved at runtime - no build-time SDK or import lib.
struct Wpcap {
    handle: ffi::Handle,
    findalldevs: unsafe extern "system" fn(*mut *mut PcapIf, *mut c_char) -> c_int,
    freealldevs: unsafe extern "system" fn(*mut PcapIf),
    create: unsafe extern "system" fn(*const c_char, *mut c_char) -> *mut Pcap,
    set_snaplen: unsafe extern "system" fn(*mut Pcap, c_int) -> c_int,
    set_promisc: unsafe extern "system" fn(*mut Pcap, c_int) -> c_int,
    set_timeout: unsafe extern "system" fn(*mut Pcap, c_int) -> c_int,
    set_immediate_mode: Option<unsafe extern "system" fn(*mut Pcap, c_int) -> c_int>,
    set_buffer_size: unsafe extern "system" fn(*mut Pcap, c_int) -> c_int,
    activate: unsafe extern "system" fn(*mut Pcap) -> c_int,
    compile: unsafe extern "system" fn(*mut Pcap, *mut BpfProgram, *const c_char, c_int, u32) -> c_int,
    setfilter: unsafe extern "system" fn(*mut Pcap, *mut BpfProgram) -> c_int,
    freecode: unsafe extern "system" fn(*mut BpfProgram),
    next_ex: unsafe extern "system" fn(*mut Pcap, *mut *mut PcapPkthdr, *mut *const c_uchar) -> c_int,
    close: unsafe extern "system" fn(*mut Pcap),
    geterr: unsafe extern "system" fn(*mut Pcap) -> *const c_char,
}

impl Wpcap {
    fn load() -> io::Result<Self> {
        let name: Vec<u16> = "wpcap.dll\0".encode_utf16().collect();
        let handle = unsafe { ffi::LoadLibraryW(name.as_ptr()) };
        if handle.is_null() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                "wpcap.dll not found; is Npcap installed?",
            ));
        }
        match unsafe { Self::resolve(handle) } {
            Ok(wp) => Ok(wp),
            Err(e) => {
                unsafe { ffi::FreeLibrary(handle) };
                Err(e)
            }
        }
    }

    unsafe fn resolve(handle: ffi::Handle) -> io::Result<Self> {
        macro_rules! sym {
            ($name:literal) => {
                ffi::proc_address(handle, concat!($name, "\0").as_bytes())?
            };
        }
        macro_rules! sym_opt {
            ($name:literal) => {
                ffi::proc_address_opt(handle, concat!($name, "\0").as_bytes())
            };
        }
        Ok(Self {
            handle,
            findalldevs: sym!("pcap_findalldevs"),
            freealldevs: sym!("pcap_freealldevs"),
            create: sym!("pcap_create"),
            set_snaplen: sym!("pcap_set_snaplen"),
            set_promisc: sym!("pcap_set_promisc"),
            set_timeout: sym!("pcap_set_timeout"),
            set_immediate_mode: sym_opt!("pcap_set_immediate_mode"),
            set_buffer_size: sym!("pcap_set_buffer_size"),
            activate: sym!("pcap_activate"),
            compile: sym!("pcap_compile"),
            setfilter: sym!("pcap_setfilter"),
            freecode: sym!("pcap_freecode"),
            next_ex: sym!("pcap_next_ex"),
            close: sym!("pcap_close"),
            geterr: sym!("pcap_geterr"),
        })
    }

    /// Open every listed Npcap device with the given BPF filter.
    fn open_all(&self, filter: &str) -> io::Result<(Vec<Capture>, Vec<String>)> {
        let mut errbuf = [0 as c_char; 256];
        let mut alldevs: *mut PcapIf = std::ptr::null_mut();
        if unsafe { (self.findalldevs)(&mut alldevs, errbuf.as_mut_ptr()) } != 0 || alldevs.is_null()
        {
            return Err(io::Error::new(io::ErrorKind::Other, errbuf_error(&errbuf)));
        }
        let mut caps = Vec::new();
        let mut errors = Vec::new();
        let mut dev = alldevs;
        while !dev.is_null() {
            let name_ptr = unsafe { (*dev).name };
            if !name_ptr.is_null() {
                let name = unsafe { CStr::from_ptr(name_ptr) }.to_string_lossy();
                match self.open_device(name_ptr, filter) {
                    Ok(cap) => caps.push(cap),
                    Err(e) => errors.push(format!("{name}: {e}")),
                }
            }
            dev = unsafe { (*dev).next };
        }
        unsafe { (self.freealldevs)(alldevs) };
        Ok((caps, errors))
    }

    fn open_device(&self, name: *const c_char, filter: &str) -> io::Result<Capture> {
        let mut errbuf = [0 as c_char; 256];
        let cap = unsafe { (self.create)(name, errbuf.as_mut_ptr()) };
        if cap.is_null() {
            return Err(io::Error::new(io::ErrorKind::Other, errbuf_error(&errbuf)));
        }
        let result = self.configure(cap, filter);
        if let Err(e) = result {
            unsafe { (self.close)(cap) };
            return Err(e);
        }
        Ok(Capture {
            ptr: cap,
            close: self.close,
        })
    }

    fn configure(&self, cap: *mut Pcap, filter: &str) -> io::Result<()> {
        unsafe {
            (self.set_snaplen)(cap, 65_535);
            (self.set_promisc)(cap, 0);
            (self.set_timeout)(cap, 50);
            if let Some(set_immediate) = self.set_immediate_mode {
                set_immediate(cap, 1);
            }
            (self.set_buffer_size)(cap, 8 * 1024 * 1024);
        }
        if unsafe { (self.activate)(cap) } != 0 {
            return Err(io::Error::new(io::ErrorKind::Other, self.last_error(cap)));
        }

        let filter = CString::new(filter).map_err(|_| {
            io::Error::new(io::ErrorKind::InvalidInput, "BPF filter contains a NUL byte")
        })?;
        let mut prog: BpfProgram = unsafe { std::mem::zeroed() };
        if unsafe { (self.compile)(cap, &mut prog, filter.as_ptr(), 1, 0) } != 0 {
            return Err(io::Error::new(io::ErrorKind::Other, self.last_error(cap)));
        }
        let rc = unsafe { (self.setfilter)(cap, &mut prog) };
        unsafe { (self.freecode)(&mut prog) };
        if rc != 0 {
            return Err(io::Error::new(io::ErrorKind::Other, self.last_error(cap)));
        }
        Ok(())
    }

    fn last_error(&self, cap: *mut Pcap) -> String {
        let ptr = unsafe { (self.geterr)(cap) };
        if ptr.is_null() {
            "unknown pcap error".to_string()
        } else {
            unsafe { CStr::from_ptr(ptr) }.to_string_lossy().into_owned()
        }
    }
}

impl Drop for Wpcap {
    fn drop(&mut self) {
        unsafe { ffi::FreeLibrary(self.handle) };
    }
}

fn errbuf_error(errbuf: &[c_char; 256]) -> String {
    let text = unsafe { CStr::from_ptr(errbuf.as_ptr()) };
    let text = text.to_string_lossy();
    if text.is_empty() {
        "unknown pcap error".into()
    } else {
        text.into_owned()
    }
}

/// Minimal hand-rolled FFI for the Win32 process/UDP table APIs and Npcap's
/// `wpcap.dll` - avoids a `windows-sys` dependency and any Npcap import library.
mod ffi {
    use std::ffi::{c_char, c_void};

    pub type Handle = *mut c_void;
    pub type Pcap = c_void;

    pub const INVALID_HANDLE_VALUE: usize = usize::MAX;
    pub const TH32CS_SNAPPROCESS: u32 = 0x0000_0002;
    pub const AF_INET: u32 = 2;
    pub const AF_INET6: u32 = 23;
    pub const UDP_TABLE_OWNER_PID: u32 = 1;

    #[repr(C)]
    pub struct ProcessEntry32W {
        pub dw_size: u32,
        pub cnt_usage: u32,
        pub th32_process_id: u32,
        pub th32_default_heap_id: usize,
        pub th32_module_id: u32,
        pub cnt_threads: u32,
        pub th32_parent_process_id: u32,
        pub pc_pri_class_base: i32,
        pub dw_flags: u32,
        pub sz_exe_file: [u16; 260],
    }

    #[derive(Clone, Copy)]
    #[repr(C)]
    pub struct UdpRowOwnerPid {
        pub local_addr: u32,
        pub local_port: u32,
        pub owning_pid: u32,
    }

    #[derive(Clone, Copy)]
    #[repr(C)]
    pub struct Udp6RowOwnerPid {
        pub local_addr: [u8; 16],
        pub local_scope_id: u32,
        pub local_port: u32,
        pub owning_pid: u32,
    }

    pub const UDP_ROW_SIZE: usize = std::mem::size_of::<UdpRowOwnerPid>();
    pub const UDP6_ROW_SIZE: usize = std::mem::size_of::<Udp6RowOwnerPid>();

    /// `pcap_if_t` - only `next`/`name` are read; the rest keeps the layout.
    #[repr(C)]
    pub struct PcapIf {
        pub next: *mut PcapIf,
        pub name: *mut c_char,
        pub description: *mut c_char,
        pub addresses: *mut c_void,
        pub flags: u32,
    }

    #[repr(C)]
    pub struct BpfProgram {
        pub bf_len: u32,
        pub bf_insns: *mut c_void,
    }

    /// Npcap uses Winsock's `timeval` (32-bit `long` fields) - 8 bytes total.
    #[repr(C)]
    pub struct Timeval {
        pub tv_sec: i32,
        pub tv_usec: i32,
    }

    #[repr(C)]
    pub struct PcapPkthdr {
        pub ts: Timeval,
        pub caplen: u32,
        pub len: u32,
    }

    pub unsafe fn proc_address<T: Copy>(handle: Handle, name: &[u8]) -> std::io::Result<T> {
        proc_address_opt(handle, name).ok_or_else(|| {
            let name = String::from_utf8_lossy(&name[..name.len() - 1]);
            std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("wpcap.dll is missing {name}"),
            )
        })
    }

    pub unsafe fn proc_address_opt<T: Copy>(handle: Handle, name: &[u8]) -> Option<T> {
        let ptr = GetProcAddress(handle, name.as_ptr());
        if ptr.is_null() {
            return None;
        }
        Some(std::mem::transmute_copy(&ptr))
    }

    #[link(name = "kernel32")]
    extern "system" {
        pub fn CreateToolhelp32Snapshot(dw_flags: u32, th32_process_id: u32) -> Handle;
        pub fn Process32FirstW(h_snapshot: Handle, lppe: *mut ProcessEntry32W) -> i32;
        pub fn Process32NextW(h_snapshot: Handle, lppe: *mut ProcessEntry32W) -> i32;
        pub fn CloseHandle(h_object: Handle) -> i32;
        pub fn LoadLibraryW(name: *const u16) -> Handle;
        pub fn GetProcAddress(module: Handle, name: *const u8) -> *mut c_void;
        pub fn FreeLibrary(module: Handle) -> i32;
    }

    #[link(name = "iphlpapi")]
    extern "system" {
        pub fn GetExtendedUdpTable(
            udp_table: *mut c_void,
            size: *mut u32,
            order: i32,
            af: u32,
            table_class: u32,
            reserved: u32,
        ) -> u32;
    }

    #[link(name = "shell32")]
    extern "system" {
        pub fn IsUserAnAdmin() -> i32;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The UDP table lookup must see sockets owned by this process (IPv4 + IPv6).
    #[test]
    fn udp_ports_includes_bound_sockets() {
        let v4 = std::net::UdpSocket::bind("127.0.0.1:0").unwrap();
        let v6 = std::net::UdpSocket::bind("[::1]:0").unwrap();
        let ports = udp_ports(std::process::id());
        let p4 = v4.local_addr().unwrap().port();
        let p6 = v6.local_addr().unwrap().port();
        assert!(ports.contains(&p4), "missing IPv4 port {p4} in {ports:?}");
        assert!(ports.contains(&p6), "missing IPv6 port {p6} in {ports:?}");
    }
}
