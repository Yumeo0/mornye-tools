//! Sniffer subsystem: always-on lifecycle, state machine, commands and log.
//!
//! The sniffer is the app's only account-data source and runs by design. On
//! start it arms and polls for the game process; when found it opens a capture
//! handle and feeds frames through the vendored `spectrum` crate. Pausing stops
//! reading frames immediately while leaving the session key and store intact.

pub mod extract;
pub mod keys;
pub mod live;

use std::collections::{BTreeSet, VecDeque};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use parking_lot::Mutex;
use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::account::{emit_updated, AccountState};
use crate::sniffer::extract::ExtractTables;
use crate::sniffer::keys::KeyInfo;

const LOG_CAPACITY: usize = 200;

/// Runtime state shared between the supervisor thread, capture loops and the
/// Tauri commands.
pub struct SnifferState {
    data_dir: PathBuf,
    pub paused: AtomicBool,
    pub capturing: AtomicBool,
    pub game_process_found: AtomicBool,
    pub packets_seen: AtomicU64,
    last_error: Mutex<Option<String>>,
    log: Mutex<VecDeque<String>>,
    session_key: Mutex<Option<[u8; 32]>>,
    key_info: Mutex<KeyInfo>,
    pending: Mutex<BTreeSet<String>>,
    tables: Mutex<Option<Arc<ExtractTables>>>,
}

impl SnifferState {
    pub fn new(app: &AppHandle, data_dir: PathBuf) -> Self {
        let tables = Arc::new(ExtractTables::load(app));
        Self {
            data_dir: data_dir.clone(),
            paused: AtomicBool::new(false),
            capturing: AtomicBool::new(false),
            game_process_found: AtomicBool::new(false),
            packets_seen: AtomicU64::new(0),
            last_error: Mutex::new(None),
            log: Mutex::new(VecDeque::new()),
            session_key: Mutex::new(keys::read_session_key(&data_dir)),
            key_info: Mutex::new(keys::key_info(app)),
            pending: Mutex::new(BTreeSet::new()),
            tables: Mutex::new(Some(tables)),
        }
    }

    pub fn extract_tables(&self) -> Arc<ExtractTables> {
        self.tables
            .lock()
            .clone()
            .unwrap_or_else(|| Arc::new(ExtractTables::default()))
    }

    pub fn log<S: Into<String>>(&self, message: S) {
        let mut log = self.log.lock();
        log.push_back(message.into());
        while log.len() > LOG_CAPACITY {
            log.pop_front();
        }
    }

    pub fn set_error(&self, error: Option<String>) {
        if let Some(ref e) = error {
            self.log(e.clone());
        }
        *self.last_error.lock() = error;
    }

    pub fn mark_pending(&self, sections: &[&str]) {
        let mut pending = self.pending.lock();
        for section in sections {
            pending.insert((*section).to_string());
        }
    }

    pub fn take_pending(&self) -> Vec<String> {
        std::mem::take(&mut *self.pending.lock()).into_iter().collect()
    }

    pub fn stored_key_info(&self) -> KeyInfo {
        self.key_info.lock().clone()
    }

    pub fn session_key_cached(&self) -> bool {
        self.session_key.lock().is_some()
    }

    fn current_session_key(&self) -> Option<[u8; 32]> {
        *self.session_key.lock()
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct SnifferStatus {
    pub paused: bool,
    pub capturing: bool,
    pub game_process_found: bool,
    pub capture_available: bool,
    pub is_elevated: bool,
    pub session_key_cached: bool,
    pub rsa_key_path: Option<String>,
    pub rsa_key_fingerprint: Option<String>,
    pub rsa_key_valid: bool,
    pub rsa_key_error: Option<String>,
    pub tables_loaded: bool,
    pub packets_seen: u64,
    pub last_error: Option<String>,
    pub log: Vec<String>,
}

/// Start the always-on supervisor and the account-update debouncer.
pub fn start(app: &AppHandle) {
    spawn_supervisor(app.clone());
    spawn_debouncer(app.clone());
}

fn spawn_supervisor(app: AppHandle) {
    std::thread::spawn(move || loop {
        let state = app.state::<SnifferState>();
        if state.paused.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(400));
            continue;
        }

        let pem = match keys::load_bundled_key(&app) {
            Ok(pem) => pem,
            Err(e) => {
                state.set_error(Some(e));
                std::thread::sleep(Duration::from_secs(5));
                continue;
            }
        };

        let procs = live::game_processes();
        let Some(proc_info) = live::pick_process(&procs) else {
            state.game_process_found.store(false, Ordering::SeqCst);
            std::thread::sleep(Duration::from_secs(5));
            continue;
        };
        state.game_process_found.store(true, Ordering::SeqCst);
        let pid = proc_info.pid;
        let ports = live::port_set(&proc_info.ports);

        match live::open_socket() {
            Ok(handle) => {
                state.set_error(None);
                state.log(format!("capturing game process pid {pid}"));
                let session_key = state.current_session_key();
                let _ = live::run(app.clone(), pid, ports, pem, session_key, handle);
                state.log("capture stopped");
                std::thread::sleep(Duration::from_secs(1));
            }
            Err(e) => {
                state.set_error(Some(live::open_error(e)));
                std::thread::sleep(Duration::from_secs(5));
            }
        }
    });
}

/// Flush pending account sections into at most one `account-updated` per 250 ms.
fn spawn_debouncer(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(250));
        let sections = app.state::<SnifferState>().take_pending();
        if sections.is_empty() {
            continue;
        }
        let account = app.state::<AccountState>();
        if let Ok(mut store) = account.store.lock() {
            let _ = store.save();
        }
        let refs: Vec<&str> = sections.iter().map(|s| s.as_str()).collect();
        emit_updated(&app, &refs);
    });
}

/// Feed one raw frame through the sniffer and extract account deltas.
pub(crate) fn process_frame(app: &AppHandle, sniffer: &mut spectrum::Sniffer, frame: Vec<u8>) {
    let packets = match sniffer.receive_packet(frame) {
        Ok(packets) => packets,
        Err(_) => return,
    };
    cache_session_key(app, sniffer);
    for packet in packets {
        if let spectrum::Packet::GamePacket(Ok(gp)) = packet {
            app.state::<SnifferState>()
                .packets_seen
                .fetch_add(1, Ordering::Relaxed);
            extract::handle_packet(app, &gp);
        }
    }
}

/// Copy the sniffer's current session key into state, cache it to disk, and
/// never log key material.
fn cache_session_key(app: &AppHandle, sniffer: &spectrum::Sniffer) {
    let Some(key) = sniffer.session_key() else {
        return;
    };
    let state = app.state::<SnifferState>();
    let mut guard = state.session_key.lock();
    if guard.as_ref() != Some(&key) {
        *guard = Some(key);
        drop(guard);
        let _ = keys::write_session_key(&state.data_dir, &key);
        state.log("session key captured");
    }
}

/// Read the (src, dst) UDP ports from a frame; used by the offline import path.
fn import_frames(path: &str) -> Result<Vec<Vec<u8>>, String> {
    use std::io::Read;
    let mut head = [0u8; 4];
    let mut file = std::fs::File::open(path).map_err(|e| format!("cannot open {path}: {e}"))?;
    file.read_exact(&mut head)
        .map_err(|e| format!("cannot read {path}: {e}"))?;
    if head == [0x0a, 0x0d, 0x0d, 0x0a] {
        let mut rest = Vec::new();
        file.read_to_end(&mut rest).map_err(|e| e.to_string())?;
        let mut all = head.to_vec();
        all.extend_from_slice(&rest);
        Ok(pcapng_frames(&all))
    } else {
        use pcap_file::pcap::PcapReader;
        let mut reader = PcapReader::new(std::io::BufReader::new(
            std::fs::File::open(path).map_err(|e| e.to_string())?,
        ))
        .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        while let Some(Ok(packet)) = reader.next_packet() {
            out.push(packet.data.to_vec());
        }
        Ok(out)
    }
}

/// Minimal pcapng reader (EPB/SPB), tolerant of options some crates reject.
fn pcapng_frames(buf: &[u8]) -> Vec<Vec<u8>> {
    let mut out = Vec::new();
    let mut le = true;
    let mut pos = 0usize;
    let rd = |b: &[u8], le: bool| -> u32 {
        let a: [u8; 4] = b[..4].try_into().unwrap();
        if le {
            u32::from_le_bytes(a)
        } else {
            u32::from_be_bytes(a)
        }
    };
    while pos + 12 <= buf.len() {
        if buf[pos..pos + 4] == [0x0a, 0x0d, 0x0d, 0x0a] {
            le = buf[pos + 8..pos + 12] == [0x4d, 0x3c, 0x2b, 0x1a];
        }
        let ty = rd(&buf[pos..], le);
        let len = rd(&buf[pos + 4..], le) as usize;
        if len < 12 || pos + len > buf.len() {
            break;
        }
        let body = &buf[pos + 8..pos + len - 4];
        match ty {
            6 if body.len() >= 20 => {
                let cap = rd(&body[12..], le) as usize;
                let end = (20 + cap).min(body.len());
                if end > 20 {
                    out.push(body[20..end].to_vec());
                }
            }
            3 if body.len() >= 4 => out.push(body[4..].to_vec()),
            _ => {}
        }
        pos += len;
    }
    out
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn sniffer_get_status(state: State<SnifferState>) -> SnifferStatus {
    let key_info = state.stored_key_info();
    SnifferStatus {
        paused: state.paused.load(Ordering::SeqCst),
        capturing: state.capturing.load(Ordering::SeqCst),
        game_process_found: state.game_process_found.load(Ordering::SeqCst),
        capture_available: live::capture_available(),
        is_elevated: live::is_elevated(),
        session_key_cached: state.session_key_cached(),
        rsa_key_path: key_info.path,
        rsa_key_fingerprint: key_info.fingerprint,
        rsa_key_valid: key_info.valid,
        rsa_key_error: key_info.error,
        tables_loaded: state.extract_tables().tables_loaded(),
        packets_seen: state.packets_seen.load(Ordering::Relaxed),
        last_error: state.last_error.lock().clone(),
        log: state.log.lock().iter().cloned().collect(),
    }
}

#[tauri::command]
pub fn sniffer_pause(state: State<SnifferState>) {
    state.paused.store(true, Ordering::SeqCst);
    state.log("paused");
}

#[tauri::command]
pub fn sniffer_resume(state: State<SnifferState>) {
    state.paused.store(false, Ordering::SeqCst);
    state.log("resumed");
}

#[tauri::command(rename_all = "snake_case")]
pub fn sniffer_set_session_key(
    state: State<SnifferState>,
    key: String,
) -> Result<(), String> {
    let parsed = keys::parse_key(&key)?;
    *state.session_key.lock() = Some(parsed);
    keys::write_session_key(&state.data_dir, &parsed)?;
    state.log("session key set manually");
    Ok(())
}

#[tauri::command]
pub fn sniffer_clear_session_key(state: State<SnifferState>) -> Result<(), String> {
    *state.session_key.lock() = None;
    keys::clear_session_key(&state.data_dir)?;
    state.log("session key cleared");
    Ok(())
}

/// Offline test/debug tool: feed a saved `.pcap`/`.pcapng` through the extractor.
#[tauri::command(rename_all = "snake_case")]
pub fn sniffer_import_pcap(
    app: AppHandle,
    state: State<SnifferState>,
    path: String,
) -> Result<usize, String> {
    if state.capturing.load(Ordering::SeqCst) {
        return Err("a live capture is running; pause it before importing".into());
    }
    let pem = keys::load_bundled_key(&app)?;
    let frames = import_frames(&path)?;
    let mut sniffer = spectrum::Sniffer::with_session_key(pem, state.current_session_key());
    let mut decoded = 0usize;
    for frame in frames {
        let before = state.packets_seen.load(Ordering::Relaxed);
        process_frame(&app, &mut sniffer, frame);
        if state.packets_seen.load(Ordering::Relaxed) > before {
            decoded += 1;
        }
    }
    state.log(format!("imported {decoded} game packets from {path}"));
    Ok(decoded)
}

/// Emit an `account-updated` after an import so the UI refreshes immediately.
pub fn flush_pending(app: &AppHandle) {
    let sections = app.state::<SnifferState>().take_pending();
    if sections.is_empty() {
        return;
    }
    if let Ok(mut store) = app.state::<AccountState>().store.lock() {
        let _ = store.save();
    }
    let refs: Vec<&str> = sections.iter().map(|s| s.as_str()).collect();
    emit_updated(app, &refs);
}
