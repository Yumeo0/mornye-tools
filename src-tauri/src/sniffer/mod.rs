//! Sniffer subsystem: always-on lifecycle, state machine, commands and log.
//!
//! The sniffer is the app's only account-data source and runs by design. On
//! start it arms and polls for the game process; when found it opens a capture
//! handle and feeds frames through the vendored `spectrum` crate. Pausing stops
//! reading frames immediately while leaving the session key and store intact.

pub mod extract;
pub mod keys;
pub mod live;
pub mod position;
pub mod world;

use std::collections::{BTreeSet, HashMap, VecDeque};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::account::{emit_updated, AccountState};
use crate::sniffer::extract::ExtractTables;
use crate::sniffer::keys::KeyInfo;

const LOG_CAPACITY: usize = 200;

/// How long game frames may keep arriving without a single decoded packet
/// before the KCP mirror is declared stalled. A passive mirror that lost one
/// segment can never recover within the session, and the loss is otherwise
/// completely silent.
const STALL_WARN: Duration = Duration::from_secs(45);
/// Minimum spacing between two log lines of the same failure class.
const ERROR_LOG_INTERVAL: Duration = Duration::from_secs(60);
/// Proto decode failures are per message id and sticky (e.g. pinned protos
/// drifting behind a game update), so they re-log even more rarely.
const DECODE_LOG_INTERVAL: Duration = Duration::from_secs(300);

/// Time-based dedupe for the failure classes: a persistent error stays
/// visible in the log without drowning everything else out.
#[derive(Default)]
struct ErrorLogTimes {
    frame_error: Option<Instant>,
    conv_mismatch: Option<Instant>,
    packet_error: Option<Instant>,
    decode: HashMap<u16, Instant>,
}

/// Returns true (and stamps `slot`) when this failure class may log again.
fn should_log(slot: &mut Option<Instant>, interval: Duration) -> bool {
    if slot.is_some_and(|at| at.elapsed() < interval) {
        return false;
    }
    *slot = Some(Instant::now());
    true
}

/// Progress bookkeeping for the stalled-stream warning.
struct StreamWatch {
    last_frames: u64,
    last_packets: u64,
    last_frame_progress: Instant,
    last_packet_progress: Instant,
    warned: bool,
}

/// One echo mark change seen in an `ItemFuncValueUpdateNotify`. The overlay's
/// toggle command uses `previous` (the state before its key press) to restore
/// the mark the echo had before it was identified.
#[derive(Debug, Clone, Copy)]
pub struct FuncValueChange {
    pub incr_id: i64,
    /// `FuncValue` before the change (0 = none, 1 = locked, 2 = discard-marked).
    pub previous: i32,
    /// `FuncValue` after the change.
    pub current: i32,
}

/// Runtime state shared between the supervisor thread, capture loops and the
/// Tauri commands.
pub struct SnifferState {
    data_dir: PathBuf,
    pub capturing: AtomicBool,
    pub game_process_found: AtomicBool,
    pub packets_seen: AtomicU64,
    /// Frames handed to the sniffer (after the port pre-filter).
    pub frames_fed: AtomicU64,
    /// Frames rejected by network/KCP parsing (CRC, size, ...).
    pub frame_errors: AtomicU64,
    /// Subset of `frame_errors`: the frame belongs to another KCP
    /// conversation - a reconnect handshake was missed and nothing decodes
    /// until the next one.
    pub conv_mismatches: AtomicU64,
    /// Game packets that failed CRC/decryption/decompression.
    pub packet_errors: AtomicU64,
    /// Handled messages whose proto payload failed to decode.
    pub decode_failures: AtomicU64,
    /// Set while frames keep arriving but nothing decodes (lost KCP segment).
    pub stream_stalled: AtomicBool,
    last_error: Mutex<Option<String>>,
    log: Mutex<VecDeque<String>>,
    session_key: Mutex<Option<[u8; 32]>>,
    key_info: Mutex<KeyInfo>,
    pending: Mutex<BTreeSet<String>>,
    tables: Mutex<Option<Arc<ExtractTables>>>,
    stream_watch: Mutex<StreamWatch>,
    error_log_times: Mutex<ErrorLogTimes>,
    /// Bumped on every echo mark change; the toggle command snapshots it
    /// before pressing a key and waits for it to move.
    func_value_generation: AtomicU64,
    last_func_value_change: Mutex<Option<FuncValueChange>>,
    /// When the last echo stat update (level-up/tuning) packet arrived; the
    /// scan waits out the tuning banner's intro animation before reading it.
    last_echo_update: Mutex<Option<Instant>>,
    pub world: Mutex<world::WorldCapture>,
    pub position: Mutex<position::PositionTracker>,
}

impl SnifferState {
    pub fn new(app: &AppHandle, data_dir: PathBuf) -> Self {
        let tables = Arc::new(ExtractTables::load(app));
        let now = Instant::now();
        Self {
            data_dir: data_dir.clone(),
            capturing: AtomicBool::new(false),
            game_process_found: AtomicBool::new(false),
            packets_seen: AtomicU64::new(0),
            frames_fed: AtomicU64::new(0),
            frame_errors: AtomicU64::new(0),
            conv_mismatches: AtomicU64::new(0),
            packet_errors: AtomicU64::new(0),
            decode_failures: AtomicU64::new(0),
            stream_stalled: AtomicBool::new(false),
            last_error: Mutex::new(None),
            log: Mutex::new(VecDeque::new()),
            session_key: Mutex::new(keys::read_session_key(&data_dir)),
            key_info: Mutex::new(keys::key_info(app)),
            pending: Mutex::new(BTreeSet::new()),
            tables: Mutex::new(Some(tables)),
            stream_watch: Mutex::new(StreamWatch {
                last_frames: 0,
                last_packets: 0,
                last_frame_progress: now,
                last_packet_progress: now,
                warned: false,
            }),
            error_log_times: Mutex::new(ErrorLogTimes::default()),
            func_value_generation: AtomicU64::new(0),
            last_func_value_change: Mutex::new(None),
            last_echo_update: Mutex::new(None),
            world: Mutex::new(world::WorldCapture::default()),
            position: Mutex::new(position::PositionTracker::default()),
        }
    }

    /// Note one frame handed to the sniffer.
    pub fn note_frame(&self) {
        self.frames_fed.fetch_add(1, Ordering::Relaxed);
    }

    /// Note one successfully decoded game packet.
    pub fn note_packet(&self) {
        self.packets_seen.fetch_add(1, Ordering::Relaxed);
    }

    /// Record a frame rejected before decoding. Conversation mismatches are
    /// counted and logged separately: they mean the mirror is watching a
    /// stale KCP conversation (the reconnect handshake was missed) and no
    /// data at all will decode until the game starts a new one.
    pub fn record_frame_error(&self, err: &spectrum::SnifferError) {
        self.frame_errors.fetch_add(1, Ordering::Relaxed);
        let conv_mismatch = matches!(
            err,
            spectrum::SnifferError::Kcp(
                spectrum::KcpError::PacketDoesNotBelongToConversation { .. }
            )
        );
        if conv_mismatch {
            self.conv_mismatches.fetch_add(1, Ordering::Relaxed);
        }
        let mut times = self.error_log_times.lock();
        if conv_mismatch {
            if should_log(&mut times.conv_mismatch, ERROR_LOG_INTERVAL) {
                drop(times);
                self.log(format!(
                    "KCP conversation mismatch ({err}); a reconnect handshake was likely \
                     missed - nothing decodes until the next one"
                ));
            }
        } else if should_log(&mut times.frame_error, ERROR_LOG_INTERVAL) {
            drop(times);
            self.log(format!("frame dropped before decoding: {err}"));
        }
    }

    /// Record a game packet that failed CRC, decryption or decompression
    /// (e.g. a stale session key right after a reconnect).
    pub fn record_packet_error(&self, err: &spectrum::game::GamePacketError) {
        self.packet_errors.fetch_add(1, Ordering::Relaxed);
        let mut times = self.error_log_times.lock();
        if should_log(&mut times.packet_error, ERROR_LOG_INTERVAL) {
            drop(times);
            self.log(format!("game packet dropped: {err}"));
        }
    }

    /// Record a proto decode failure for a handled message; this is how a
    /// pinned `protos.proto` drifting behind a game update becomes visible
    /// instead of silently dropping data.
    pub fn record_decode_failure(&self, msg_id: u16, msg_name: Option<&str>, detail: &str) {
        self.decode_failures.fetch_add(1, Ordering::Relaxed);
        let now = Instant::now();
        let mut times = self.error_log_times.lock();
        let due = match times.decode.get(&msg_id) {
            Some(at) => now.duration_since(*at) >= DECODE_LOG_INTERVAL,
            None => true,
        };
        if due {
            times.decode.insert(msg_id, now);
            drop(times);
            self.log(format!(
                "proto decode failed for message {msg_id} ({}): {detail}",
                msg_name.unwrap_or("unknown")
            ));
        }
    }

    /// Periodic progress check driven by the debouncer thread. Warns once
    /// when game frames keep arriving but nothing has decoded for
    /// [`STALL_WARN`]: the passive KCP mirror lost a segment and cannot
    /// recover it within the session, so account data stays stale until the
    /// game restarts its connection.
    pub fn watch_stream_progress(&self) {
        let frames = self.frames_fed.load(Ordering::Relaxed);
        let packets = self.packets_seen.load(Ordering::Relaxed);
        let now = Instant::now();
        let mut watch = self.stream_watch.lock();

        if !self.capturing.load(Ordering::SeqCst) {
            // Keep the watch neutral while no capture runs so a stale stall
            // warning cannot survive into the next session.
            watch.last_frames = frames;
            watch.last_packets = packets;
            watch.last_frame_progress = now;
            watch.last_packet_progress = now;
            if watch.warned {
                watch.warned = false;
                self.stream_stalled.store(false, Ordering::SeqCst);
            }
            return;
        }

        if packets != watch.last_packets {
            watch.last_packets = packets;
            watch.last_packet_progress = now;
            if watch.warned {
                watch.warned = false;
                self.stream_stalled.store(false, Ordering::SeqCst);
                self.log("stream recovered: decoding game packets again");
            }
        }
        if frames != watch.last_frames {
            watch.last_frames = frames;
            watch.last_frame_progress = now;
        }
        if watch.warned {
            return;
        }
        let frames_flowing = now.duration_since(watch.last_frame_progress) < Duration::from_secs(5);
        let silent_for = now.duration_since(watch.last_packet_progress);
        if frames_flowing && silent_for >= STALL_WARN {
            watch.warned = true;
            self.stream_stalled.store(true, Ordering::SeqCst);
            self.log(format!(
                "warning: game frames keep arriving but nothing decoded for {}s - the KCP \
                 mirror most likely lost a segment; account data stays stale until the \
                 game restarts its connection",
                silent_for.as_secs()
            ));
        }
    }

    /// Record an echo mark change and wake the toggle command waiting on it.
    pub fn record_func_value_change(&self, change: FuncValueChange) {
        *self.last_func_value_change.lock() = Some(change);
        self.func_value_generation.fetch_add(1, Ordering::SeqCst);
    }

    /// Snapshot for [`Self::func_value_change_since`].
    pub fn func_value_generation(&self) -> u64 {
        self.func_value_generation.load(Ordering::SeqCst)
    }

    /// The most recent mark change, if it happened after `generation`.
    pub fn func_value_change_since(&self, generation: u64) -> Option<FuncValueChange> {
        if self.func_value_generation() <= generation {
            return None;
        }
        *self.last_func_value_change.lock()
    }

    /// Record that an echo stat update (level-up/tuning) just arrived.
    pub fn record_echo_update(&self) {
        *self.last_echo_update.lock() = Some(Instant::now());
    }

    /// Whether an echo stat update arrived within `within`.
    pub fn echo_update_recent(&self, within: Duration) -> bool {
        self.last_echo_update
            .lock()
            .is_some_and(|at| at.elapsed() < within)
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
        std::mem::take(&mut *self.pending.lock())
            .into_iter()
            .collect()
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
    pub frames_fed: u64,
    pub frame_errors: u64,
    pub conv_mismatches: u64,
    pub packet_errors: u64,
    pub decode_failures: u64,
    pub stream_stalled: bool,
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
                state.position.lock().clear();
                *state.world.lock() = world::WorldCapture::default();
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

/// Flush pending account sections into at most one `account-updated` per
/// 250 ms, and drive the stream-progress watchdog.
fn spawn_debouncer(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(250));
        let state = app.state::<SnifferState>();
        state.watch_stream_progress();
        position::flush(&app);
        let sections = state.take_pending();
        if sections.is_empty() {
            continue;
        }
        // Clone the payload under the store lock; serialisation and the file
        // writes happen after releasing it so the capture loop is never
        // blocked on disk I/O.
        let prepared = match app.state::<AccountState>().store.lock() {
            Ok(mut store) => Some(store.prepare_save()),
            Err(_) => None,
        };
        if let Some(prepared) = prepared {
            let _ = prepared.write();
        }
        let refs: Vec<&str> = sections.iter().map(|s| s.as_str()).collect();
        emit_updated(&app, &refs);
    });
}

/// Feed one raw frame through the sniffer and extract account deltas. Every
/// failure class is counted and logged (deduped); none of them may panic or
/// stall the capture loop.
pub(crate) fn process_frame(app: &AppHandle, sniffer: &mut spectrum::Sniffer, frame: Vec<u8>) {
    let state = app.state::<SnifferState>();
    state.note_frame();
    let packets = match sniffer.receive_packet(frame) {
        Ok(packets) => packets,
        Err(e) => {
            state.record_frame_error(&e);
            return;
        }
    };
    cache_session_key(app, sniffer);
    for packet in packets {
        match packet {
            spectrum::Packet::GamePacket(Ok(gp)) => {
                state.note_packet();
                extract::handle_packet(app, &gp);
            }
            spectrum::Packet::GamePacket(Err(e)) => state.record_packet_error(&e),
            spectrum::Packet::NetworkPacket(_) => {}
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

/// Read the raw frames from a pcap or pcapng capture file; used by the
/// offline import path.
fn import_frames(path: &str) -> Result<Vec<Vec<u8>>, String> {
    use std::io::{BufReader, Read, Seek, SeekFrom};
    let mut file =
        BufReader::new(std::fs::File::open(path).map_err(|e| format!("cannot open {path}: {e}"))?);
    let mut head = [0u8; 4];
    file.read_exact(&mut head)
        .map_err(|e| format!("cannot read {path}: {e}"))?;
    if head == [0x0a, 0x0d, 0x0d, 0x0a] {
        let mut all = head.to_vec();
        file.read_to_end(&mut all).map_err(|e| e.to_string())?;
        Ok(pcapng_frames(&all))
    } else {
        use pcap_file::pcap::PcapReader;
        // The magic probe above consumed the header; rewind before parsing.
        file.seek(SeekFrom::Start(0))
            .map_err(|e| format!("cannot rewind {path}: {e}"))?;
        let mut reader = PcapReader::new(file).map_err(|e| e.to_string())?;
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
        frames_fed: state.frames_fed.load(Ordering::Relaxed),
        frame_errors: state.frame_errors.load(Ordering::Relaxed),
        conv_mismatches: state.conv_mismatches.load(Ordering::Relaxed),
        packet_errors: state.packet_errors.load(Ordering::Relaxed),
        decode_failures: state.decode_failures.load(Ordering::Relaxed),
        stream_stalled: state.stream_stalled.load(Ordering::SeqCst),
        last_error: state.last_error.lock().clone(),
        log: state.log.lock().iter().cloned().collect(),
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn sniffer_import_pcap(
    app: AppHandle,
    state: State<SnifferState>,
    path: String,
) -> Result<usize, String> {
    if state.capturing.load(Ordering::SeqCst) {
        return Err("a live capture is running; close the game to import offline".into());
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

/// Millisecond timestamps shared by persisted claims and transient capture events.
pub(super) fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| u64::try_from(duration.as_millis()).unwrap_or(u64::MAX))
        .unwrap_or(0)
}
