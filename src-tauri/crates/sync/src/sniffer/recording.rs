//! Opt-in, bounded packet recording. Capture threads only copy bytes into memory;
//! snapshots are written and protobuf-decoded on a blocking export worker.

use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::{self, BufWriter, Write};
use std::path::Path;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use mornye_game_client::schema::Schema;
use pcap_file::pcap::{PcapHeader, PcapPacket, PcapWriter};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use spectrum::{game::GamePacket, Packet, SnifferError};
use tauri::{AppHandle, Manager, State};

use super::SnifferState;

const MAX_BYTES: usize = 64 * 1024 * 1024;
const MAX_FRAMES: usize = 50_000;
const PACKET_IDS: &str = include_str!("../../../../protocol/packetIds.json");
const PROTOS: &str = include_str!("../../../../protocol/protos.proto");

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum CaptureSource {
    Live,
    Offline,
}

#[derive(Debug, Clone, Serialize)]
pub struct RecordingStatus {
    pub revision: u64,
    pub recording: bool,
    pub frames: usize,
    pub packets: usize,
    pub stored_bytes: usize,
    pub max_bytes: usize,
    pub max_frames: usize,
    pub limit_reached: bool,
    pub started_at_ms: Option<u64>,
}

struct RecordedFrame {
    timestamp: Duration,
    source: CaptureSource,
    data: Vec<u8>,
    packets: Vec<GamePacket>,
    frame_error: Option<String>,
    packet_errors: Vec<String>,
}

pub(super) struct Recording {
    status: RecordingStatus,
    frames: Vec<Arc<RecordedFrame>>,
}

impl Default for Recording {
    fn default() -> Self {
        Self {
            status: RecordingStatus {
                revision: 0,
                recording: false,
                frames: 0,
                packets: 0,
                stored_bytes: 0,
                max_bytes: MAX_BYTES,
                max_frames: MAX_FRAMES,
                limit_reached: false,
                started_at_ms: None,
            },
            frames: Vec::new(),
        }
    }
}

impl Recording {
    pub fn status(&self) -> RecordingStatus {
        self.status.clone()
    }

    pub fn set_recording(&mut self, enabled: bool) -> Result<RecordingStatus, String> {
        if enabled && self.status.limit_reached {
            return Err(
                "Recording limit reached. Export and clear the capture to record again.".into(),
            );
        }
        self.status.recording = enabled;
        self.status.revision += 1;
        if enabled {
            self.status.started_at_ms.get_or_insert_with(super::now_ms);
        }
        Ok(self.status())
    }

    pub fn clear(&mut self) -> Result<RecordingStatus, String> {
        if self.status.recording {
            return Err("Stop recording before clearing the capture.".into());
        }
        let revision = self.status.revision + 1;
        *self = Self::default();
        self.status.revision = revision;
        Ok(self.status())
    }

    /// Returns true only when this frame stops recording at the limit. Keep the
    /// beginning of the stream instead of evicting its key exchange/KCP start.
    pub fn record(
        &mut self,
        timestamp: Duration,
        source: CaptureSource,
        data: &[u8],
        result: &Result<Vec<Packet>, SnifferError>,
    ) -> bool {
        if !self.status.recording {
            return false;
        }
        let mut packets = Vec::new();
        let mut packet_errors = Vec::new();
        let frame_error = match result {
            Ok(items) => {
                for item in items {
                    match item {
                        Packet::GamePacket(Ok(packet)) => packets.push(packet),
                        Packet::GamePacket(Err(error)) => packet_errors.push(error.to_string()),
                        _ => {}
                    }
                }
                None
            }
            Err(error) => Some(error.to_string()),
        };
        let bytes = data.len()
            + std::mem::size_of::<RecordedFrame>()
            + packets
                .iter()
                .map(|p| p.raw_msg.len() + std::mem::size_of::<GamePacket>())
                .sum::<usize>()
            + packet_errors
                .iter()
                .map(|e| e.len() + std::mem::size_of::<String>())
                .sum::<usize>()
            + frame_error.as_ref().map_or(0, String::len);
        if self.status.stored_bytes + bytes > self.status.max_bytes
            || self.frames.len() >= self.status.max_frames
        {
            self.status.recording = false;
            self.status.limit_reached = true;
            self.status.revision += 1;
            return true;
        }
        self.status.stored_bytes += bytes;
        self.status.packets += packets.len();
        self.status.frames += 1;
        self.status.revision += 1;
        self.frames.push(Arc::new(RecordedFrame {
            timestamp,
            source,
            data: data.to_vec(),
            packets: packets.into_iter().cloned().collect(),
            frame_error,
            packet_errors,
        }));
        false
    }

    fn snapshot(&self) -> Result<RecordingSnapshot, String> {
        if self.frames.is_empty() {
            return Err(
                "No recorded packets yet. Start recording before reconnecting the game.".into(),
            );
        }
        Ok(RecordingSnapshot {
            status: self.status(),
            frames: self.frames.clone(),
            exported_at_ms: super::now_ms(),
        })
    }
}

struct RecordingSnapshot {
    status: RecordingStatus,
    frames: Vec<Arc<RecordedFrame>>,
    exported_at_ms: u64,
}

impl RecordingSnapshot {
    fn write_raw(&self, writer: impl Write) -> Result<(), String> {
        // Windows adds a synthetic Ethernet header to an IPv4 datagram, so
        // allow the entire capture buffer plus that header without truncation.
        let snaplen = self
            .frames
            .iter()
            .map(|f| f.data.len() as u32)
            .max()
            .unwrap_or(65_550)
            .max(65_550);
        let mut pcap = PcapWriter::with_header(
            writer,
            PcapHeader {
                snaplen,
                ..Default::default()
            },
        )
        .map_err(|error| error.to_string())?;
        for frame in &self.frames {
            pcap.write_packet(&PcapPacket::new(
                frame.timestamp,
                frame.data.len() as u32,
                &frame.data,
            ))
            .map_err(|error| error.to_string())?;
        }
        Ok(())
    }

    fn write_parsed(&self, mut writer: impl Write) -> Result<(), String> {
        let schema = Schema::load().map_err(|error| error.to_string())?;
        let names: HashMap<u16, String> =
            serde_json::from_str(PACKET_IDS).map_err(|error| error.to_string())?;
        let protocol: Value =
            serde_json::from_str(include_str!("../../../../protocol/manifest.json"))
                .map_err(|error| error.to_string())?;
        let metadata = json!({
            "format": "mornye-packet-capture",
            "format_version": 1,
            "exported_at_ms": self.exported_at_ms,
            "protocol": {
                "game_version": protocol["game_version"],
                "resource_version": protocol["resource_version"],
                "assembly_mvid": protocol["assembly_mvid"],
                "proto_sha256": hex(&Sha256::digest(PROTOS.as_bytes())),
                "packet_ids_sha256": hex(&Sha256::digest(PACKET_IDS.as_bytes())),
            },
            "recording": self.status,
        });
        // Stream one frame at a time. Large captures must not create a second
        // in-memory JSON document or hold the recorder lock during export.
        let header = serde_json::to_string_pretty(&metadata).map_err(|error| error.to_string())?;
        writer
            .write_all(header.trim_end().trim_end_matches('}').as_bytes())
            .map_err(|e| e.to_string())?;
        writer
            .write_all(b",\n  \"frames\": [\n")
            .map_err(|e| e.to_string())?;
        for (index, frame) in self.frames.iter().enumerate() {
            if index != 0 {
                writer.write_all(b",\n").map_err(|e| e.to_string())?;
            }
            let direction = match super::transport::udp_payload(&frame.data) {
                Ok((true, _)) => "server_to_client",
                Ok((false, _)) => "client_to_server",
                Err(_) => "unknown",
            };
            let packets: Vec<Value> = frame
                .packets
                .iter()
                .map(|packet| {
                    let name = names.get(&packet.msg_id);
                    let decoded = name
                        .ok_or_else(|| "Message ID is absent from the pinned protocol.".to_string())
                        .and_then(|name| {
                            schema
                                .decode(name, &packet.raw_msg)
                                .map_err(|e| e.to_string())
                        })
                        .and_then(|message| {
                            serde_json::to_value(message).map_err(|e| e.to_string())
                        });
                    let (decoded, decode_error) = match decoded {
                        Ok(value) => (Some(value), None),
                        Err(error) => (None, Some(error)),
                    };
                    json!({
                        "message_id": packet.msg_id,
                        "message_name": name,
                        "message_type": packet.msg_type,
                        "sequence_number": packet.seq_no,
                        "rpc_id": packet.rpc_id,
                        "size": packet.size,
                        "crc32": packet.crc,
                        "payload_hex": hex(&packet.raw_msg),
                        "decoded": decoded,
                        "decode_error": decode_error,
                    })
                })
                .collect();
            let entry = json!({
                "index": index,
                "timestamp_ms": frame.timestamp.as_millis() as u64,
                "source": frame.source,
                "direction": direction,
                "size": frame.data.len(),
                "frame_error": frame.frame_error,
                "packet_errors": frame.packet_errors,
                "packets": packets,
            });
            serde_json::to_writer_pretty(&mut writer, &entry).map_err(|error| error.to_string())?;
        }
        writer.write_all(b"\n  ]\n}\n").map_err(|e| e.to_string())
    }

    fn save(&self, directory: &Path, format: ExportFormat) -> Result<CaptureExport, String> {
        std::fs::create_dir_all(directory)
            .map_err(|error| format!("Cannot create export directory: {error}"))?;
        let extension = match format {
            ExportFormat::Raw => "pcap",
            ExportFormat::Parsed => "json",
        };
        let mut created = None;
        for suffix in 0..100 {
            let path = directory.join(format!(
                "mornye-capture-{}-{suffix}.{extension}",
                self.exported_at_ms
            ));
            match OpenOptions::new().write(true).create_new(true).open(&path) {
                Ok(file) => {
                    created = Some((path, file));
                    break;
                }
                Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
                Err(error) => return Err(format!("Cannot create capture export: {error}")),
            }
        }
        let (path, file) = created.ok_or("Could not choose an unused capture filename.")?;
        let result = (|| {
            let mut writer = BufWriter::new(file);
            match format {
                ExportFormat::Raw => self.write_raw(&mut writer)?,
                ExportFormat::Parsed => self.write_parsed(&mut writer)?,
            }
            writer.flush().map_err(|error| error.to_string())
        })();
        if let Err(error) = result {
            let _ = std::fs::remove_file(&path);
            return Err(format!("Capture export failed: {error}"));
        }
        Ok(CaptureExport {
            path: path.to_string_lossy().into_owned(),
            frames: self.status.frames,
            packets: self.status.packets,
        })
    }
}

fn hex(bytes: &[u8]) -> String {
    use std::fmt::Write;
    let mut result = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        let _ = write!(result, "{byte:02x}");
    }
    result
}

pub(super) fn timestamp() -> Duration {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
}

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExportFormat {
    Raw,
    Parsed,
}

#[derive(Serialize)]
pub struct CaptureExport {
    pub path: String,
    pub frames: usize,
    pub packets: usize,
}

#[tauri::command]
pub fn sniffer_set_recording(
    state: State<SnifferState>,
    enabled: bool,
) -> Result<RecordingStatus, String> {
    state.recording.lock().set_recording(enabled)
}

#[tauri::command]
pub fn sniffer_clear_recording(state: State<SnifferState>) -> Result<RecordingStatus, String> {
    state.recording.lock().clear()
}

#[tauri::command]
pub async fn sniffer_export_capture(
    app: AppHandle,
    state: State<'_, SnifferState>,
    format: ExportFormat,
) -> Result<CaptureExport, String> {
    let snapshot = state.recording.lock().snapshot()?;
    let directory = app
        .path()
        .download_dir()
        .map_err(|error| format!("Downloads folder unavailable: {error}"))?;
    tauri::async_runtime::spawn_blocking(move || snapshot.save(&directory, format))
        .await
        .map_err(|error| format!("Capture export worker failed: {error}"))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use pcap_file::pcap::PcapReader;
    use spectrum::prost::Message;
    use std::fs::File;

    fn frame() -> Vec<u8> {
        let mut bytes = Vec::new();
        etherparse::PacketBuilder::ethernet2([0; 6], [1; 6])
            .ipv4([10, 0, 0, 1], [10, 0, 0, 2], 64)
            .udp(50000, 13101)
            .write(&mut bytes, b"raw game data")
            .unwrap();
        bytes
    }

    fn packet(msg_id: u16, raw_msg: Vec<u8>) -> Packet {
        Packet::GamePacket(Ok(GamePacket {
            size: raw_msg.len() + 16,
            msg_type: 1,
            seq_no: 7,
            rpc_id: Some(3),
            msg_id,
            crc: 123,
            raw_msg,
            timestamp: UNIX_EPOCH,
        }))
    }

    #[test]
    fn recording_is_opt_in_and_stop_clear_do_not_mutate_existing_snapshots() {
        let mut recording = Recording::default();
        let data = frame();
        let result = Ok(vec![]);
        recording.record(Duration::from_secs(1), CaptureSource::Live, &data, &result);
        assert_eq!(recording.status.frames, 0);
        assert!(recording.snapshot().is_err());
        recording.set_recording(true).unwrap();
        recording.record(Duration::from_secs(2), CaptureSource::Live, &data, &result);
        assert!(recording.clear().is_err());
        recording.set_recording(false).unwrap();
        let snapshot = recording.snapshot().unwrap();
        recording.record(Duration::from_secs(3), CaptureSource::Live, &data, &result);
        assert_eq!(recording.status.frames, 1);
        let revision = recording.status.revision;
        recording.clear().unwrap();
        assert!(recording.status.revision > revision);
        assert_eq!(recording.status.stored_bytes, 0);
        assert_eq!(snapshot.frames[0].data, data);
    }

    #[test]
    fn limits_stop_recording_and_preserve_the_beginning_of_the_stream() {
        for byte_limit in [false, true] {
            let mut recording = Recording::default();
            recording.set_recording(true).unwrap();
            recording.record(
                Duration::from_secs(1),
                CaptureSource::Live,
                b"handshake",
                &Ok(vec![]),
            );
            if byte_limit {
                recording.status.max_bytes = recording.status.stored_bytes;
            } else {
                recording.status.max_frames = 1;
            }
            assert!(recording.record(
                Duration::from_secs(2),
                CaptureSource::Live,
                b"later",
                &Ok(vec![])
            ));
            assert!(recording.status.limit_reached);
            assert!(!recording.status.recording);
            assert_eq!(recording.status.frames, 1);
            assert_eq!(recording.frames[0].data, b"handshake");
            assert!(recording.set_recording(true).is_err());
            recording.clear().unwrap();
            assert!(recording.set_recording(true).is_ok());
        }
    }

    #[test]
    fn raw_pcap_preserves_timestamps_and_frames_even_when_decoding_fails() {
        let mut recording = Recording::default();
        recording.set_recording(true).unwrap();
        let data = frame();
        let timestamp = Duration::new(1_792_000_000, 123_456_000);
        let failed = Err(SnifferError::GamePacket(
            io::Error::other("missing session key").into(),
        ));
        recording.record(timestamp, CaptureSource::Live, &data, &failed);
        let mut bytes = Vec::new();
        recording.snapshot().unwrap().write_raw(&mut bytes).unwrap();
        let mut reader = PcapReader::new(bytes.as_slice()).unwrap();
        assert_eq!(reader.header().datalink, pcap_file::DataLink::ETHERNET);
        let exported = reader.next_packet().unwrap().unwrap();
        assert_eq!(exported.timestamp, timestamp);
        assert_eq!(exported.orig_len as usize, data.len());
        assert_eq!(exported.data.as_ref(), data);
        assert!(reader.next_packet().is_none());
        let mut parsed = Vec::new();
        recording
            .snapshot()
            .unwrap()
            .write_parsed(&mut parsed)
            .unwrap();
        let parsed: Value = serde_json::from_slice(&parsed).unwrap();
        assert!(parsed["frames"][0]["frame_error"]
            .as_str()
            .unwrap()
            .contains("missing session key"));
    }

    #[test]
    fn parsed_export_decodes_known_messages_and_retains_unknown_and_invalid_payloads() {
        let mut recording = Recording::default();
        recording.set_recording(true).unwrap();
        let request = spectrum::game::proto::ProtoKeyRequest {
            is_login: true,
            trace_id: "test-trace".into(),
        };
        let payload = request.encode_to_vec();
        let result = Ok(vec![
            packet(111, payload.clone()),
            packet(u16::MAX, vec![0x08, 0x01]),
            packet(111, vec![0xff]),
            Packet::GamePacket(Err(io::Error::other("CRC failed").into())),
        ]);
        recording.record(
            Duration::from_secs(2),
            CaptureSource::Offline,
            &frame(),
            &result,
        );
        let mut bytes = Vec::new();
        recording
            .snapshot()
            .unwrap()
            .write_parsed(&mut bytes)
            .unwrap();
        let exported: Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(exported["format"], "mornye-packet-capture");
        assert_eq!(exported["recording"]["packets"], 3);
        assert_eq!(
            exported["protocol"]["proto_sha256"].as_str().unwrap().len(),
            64
        );
        let frame = &exported["frames"][0];
        assert_eq!(frame["direction"], "client_to_server");
        assert_eq!(frame["source"], "offline");
        assert_eq!(frame["packet_errors"][0], "IO Error: CRC failed");
        let packets = frame["packets"].as_array().unwrap();
        assert_eq!(packets[0]["message_name"], "ProtoKeyRequest");
        assert_eq!(packets[0]["decoded"]["IsLogin"], true);
        assert_eq!(packets[0]["decoded"]["TraceId"], "test-trace");
        assert_eq!(packets[0]["payload_hex"], hex(&payload));
        assert_eq!(packets[0]["sequence_number"], 7);
        assert_eq!(packets[1]["payload_hex"], "0801");
        assert!(packets[1]["decoded"].is_null());
        assert!(packets[1]["decode_error"].is_string());
        assert_eq!(packets[2]["payload_hex"], "ff");
        assert!(packets[2]["decode_error"].is_string());
    }

    #[test]
    fn saving_both_formats_never_overwrites_an_existing_export() {
        let directory = std::env::temp_dir().join(format!(
            "mornye-packet-export-{}-{}",
            std::process::id(),
            super::super::now_ms()
        ));
        let mut recording = Recording::default();
        recording.set_recording(true).unwrap();
        recording.record(
            Duration::from_secs(1),
            CaptureSource::Live,
            &frame(),
            &Ok(vec![]),
        );
        let snapshot = recording.snapshot().unwrap();
        let raw = snapshot.save(&directory, ExportFormat::Raw).unwrap();
        let parsed = snapshot.save(&directory, ExportFormat::Parsed).unwrap();
        let second = snapshot.save(&directory, ExportFormat::Raw).unwrap();
        assert_ne!(raw.path, second.path);
        assert_eq!(raw.frames, 1);
        assert!(PcapReader::new(File::open(&raw.path).unwrap()).is_ok());
        let parsed: Value = serde_json::from_reader(File::open(&parsed.path).unwrap()).unwrap();
        assert_eq!(parsed["frames"].as_array().unwrap().len(), 1);
        for entry in std::fs::read_dir(&directory).unwrap() {
            std::fs::remove_file(entry.unwrap().path()).unwrap();
        }
        std::fs::remove_dir(directory).unwrap();
    }
}
