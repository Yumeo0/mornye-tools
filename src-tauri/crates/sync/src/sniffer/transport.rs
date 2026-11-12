//! Passive KCP transport using the same bounded game-frame codec as active sessions.
//! Spectrum still supplies the generated messages and shared `GamePacket` type.

use etherparse::{SlicedPacket, TransportSlice};
use kcp::Kcp;
use mornye_game_client::{codec, message_id as id};
use rsa::pkcs1::DecodeRsaPrivateKey;
use spectrum::{
    game::GamePacket, KcpError, NetworkPacket, NetworkPacketError, Packet, SnifferError,
};
use std::{io, time::SystemTime};

#[derive(Default)]
struct Stream {
    kcp: Option<Kcp<io::Sink>>,
    buffer: Vec<u8>,
    first_push_seen: bool,
    missing_start: bool,
}

pub struct Sniffer {
    streams: [Stream; 2],
    conversation: Option<u32>,
    private_key: String,
    session_key: Option<[u8; 32]>,
    /// KCP starts at sequence zero. Attaching later cannot reconstruct a
    /// stream whose initial segments (and possibly key exchange) were missed.
    pub waiting_for_login: bool,
}

impl Sniffer {
    pub fn with_session_key(private_key: String, session_key: Option<[u8; 32]>) -> Self {
        Self {
            streams: Default::default(),
            conversation: None,
            private_key,
            session_key,
            waiting_for_login: false,
        }
    }

    pub fn session_key(&self) -> Option<[u8; 32]> {
        self.session_key
    }

    fn reset(&mut self, conversation: Option<u32>) {
        self.streams = Default::default();
        self.conversation = conversation;
        self.session_key = None;
        self.waiting_for_login = false;
    }

    pub fn receive_packet(&mut self, frame: impl AsRef<[u8]>) -> Result<Vec<Packet>, SnifferError> {
        let (received, payload) = udp_payload(frame.as_ref())?;
        // Current SYN includes a trace and CRC; treating its 39 bytes as KCP
        // rejected the reconnect that should reset the passive mirror.
        if payload.len() == 1 || trace_handshake(payload) {
            self.reset(None);
            return Ok(vec![Packet::NetworkPacket(
                NetworkPacket::HandshakeRequested,
            )]);
        }
        if payload.len() == 13 {
            let conv = u32::from_le_bytes(payload[1..5].try_into().unwrap());
            if self.conversation != Some(conv) {
                self.reset(Some(conv));
            }
            return Ok(vec![Packet::NetworkPacket(
                NetworkPacket::HandshakeEstablished(conv),
            )]);
        }
        if payload.len() < 28 {
            return Err(KcpError::SegmentTooShort {
                expected: 28,
                actual: payload.len(),
            }
            .into());
        }
        let (segments, tail) = payload.split_at(payload.len() - 4);
        let expected = u32::from_le_bytes(tail.try_into().unwrap());
        let actual = crc32fast::hash(segments);
        if expected != actual {
            return Err(KcpError::CrcMismatch { expected, actual }.into());
        }
        let conv = kcp::get_conv(segments);
        if let Some(expected) = self.conversation {
            if conv != expected {
                return Err(KcpError::PacketDoesNotBelongToConversation {
                    expected,
                    actual: conv,
                }
                .into());
            }
        } else {
            self.conversation = Some(conv);
        }
        let stream = &mut self.streams[usize::from(received)];
        // ACKs have their own sequence numbers and must not be mistaken for
        // the first PUSH when deciding whether login was missed.
        if !stream.first_push_seen {
            if let Some(sequence) = first_push_sequence(segments) {
                stream.first_push_seen = true;
                stream.missing_start = sequence != 0;
            }
        }
        let kcp = stream.kcp.get_or_insert_with(|| {
            let mut kcp = Kcp::new(conv, io::sink());
            kcp.set_wndsize(1024, 1024);
            kcp
        });
        kcp.input(segments).map_err(KcpError::from)?;
        while let Ok(size) = kcp.peeksize() {
            let mut message = vec![0; size];
            let read = kcp.recv(&mut message).map_err(KcpError::from)?;
            stream.missing_start = false;
            stream.buffer.extend_from_slice(&message[..read]);
        }
        let mut frames = Vec::new();
        let mut consumed = 0;
        while stream.buffer.len() - consumed >= 3 {
            let size = match codec::frame_size(&stream.buffer[consumed..]) {
                Ok(size) => size,
                Err(error) => {
                    stream.buffer.clear();
                    return Err(SnifferError::GamePacket(packet_error(error.to_string())));
                }
            };
            if stream.buffer.len() - consumed < size {
                break;
            }
            frames.push(stream.buffer[consumed..consumed + size].to_vec());
            consumed += size;
        }
        stream.buffer.drain(..consumed);
        self.waiting_for_login = self.streams.iter().any(|stream| stream.missing_start);
        Ok(frames
            .into_iter()
            .map(|bytes| Packet::GamePacket(self.decode(&bytes)))
            .collect())
    }

    fn decode(&mut self, bytes: &[u8]) -> Result<GamePacket, spectrum::game::GamePacketError> {
        let packet = codec::decode(bytes, self.session_key.as_ref())
            .map_err(|error| packet_error(error.to_string()))?;
        if packet.message == id::ProtoKeyRequest {
            use spectrum::prost::Message;
            if let Ok(request) =
                spectrum::game::proto::ProtoKeyRequest::decode(packet.payload.as_slice())
            {
                if request.trace_id.len() == 32
                    && request.trace_id.bytes().all(|b| b.is_ascii_hexdigit())
                {
                    self.session_key = request.trace_id.as_bytes().try_into().ok();
                }
            }
        } else if packet.message == id::ProtoKeyResponse {
            use spectrum::prost::Message;
            if let Ok(response) =
                spectrum::game::proto::ProtoKeyResponse::decode(packet.payload.as_slice())
            {
                let key =
                    if response.key.len() == 32 && response.key.iter().all(u8::is_ascii_hexdigit) {
                        Some(response.key)
                    } else {
                        rsa::RsaPrivateKey::from_pkcs1_pem(&self.private_key)
                            .ok()
                            .and_then(|rsa| rsa.decrypt(rsa::Pkcs1v15Encrypt, &response.key).ok())
                    };
                if let Some(key) = key.and_then(|key| <[u8; 32]>::try_from(key).ok()) {
                    self.session_key = Some(key);
                }
            }
        }
        Ok(GamePacket {
            size: bytes.len(),
            msg_type: packet.kind,
            seq_no: u32::from_le_bytes(bytes[4..8].try_into().unwrap()),
            rpc_id: packet.rpc,
            msg_id: packet.message,
            crc: {
                let offset = if matches!(packet.kind, 4 | 20) {
                    10
                } else {
                    12
                };
                u32::from_le_bytes(bytes[offset..offset + 4].try_into().unwrap())
            },
            raw_msg: packet.payload,
            timestamp: SystemTime::now(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use spectrum::prost::Message;

    /// Uses the production passive transport without writing any account data.
    /// The capture and its account payloads remain local; only aggregate counts are printed.
    #[test]
    #[ignore = "requires a full login PCAP in MORNYE_PROTOCOL_CAPTURE"]
    fn current_protocol_decodes_login_capture() {
        use mornye_game_client::schema::Schema;
        use spectrum::game::proto as pb;
        let capture =
            std::env::var("MORNYE_PROTOCOL_CAPTURE").expect("set MORNYE_PROTOCOL_CAPTURE");
        let frames = crate::sniffer::import_frames(&capture).unwrap();
        let pem = std::fs::read_to_string(
            std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("../../../data/client_private_key.pem"),
        )
        .unwrap();
        let mut sniffer = Sniffer::with_session_key(pem, None);
        let schema = Schema::load().unwrap();
        let names: std::collections::HashMap<u16, &str> = mornye_game_client::message_id::ALL
            .iter()
            .map(|&(name, id)| (id, name))
            .collect();
        let mut decoded = 0;
        let mut nonempty = 0;
        let mut rejected_datagrams = 0;
        let mut identity = false;
        let mut echoes = false;
        let mut weapons = false;
        let mut roles = false;
        for frame in &frames {
            // Login captures also include short probes and datagrams whose
            // outer CRC fails. Reject those just as production capture does;
            // every reconstructed game packet must still decrypt and decode.
            let packets = match sniffer.receive_packet(frame) {
                Ok(packets) => packets,
                Err(SnifferError::Kcp(
                    KcpError::SegmentTooShort { .. } | KcpError::CrcMismatch { .. },
                )) => {
                    rejected_datagrams += 1;
                    continue;
                }
                Err(error) => panic!("unexpected capture transport error: {error}"),
            };
            for packet in packets {
                let Packet::GamePacket(packet) = packet else {
                    continue;
                };
                let packet = packet.expect("game packet must decrypt and parse");
                let name = names
                    .get(&packet.msg_id)
                    .expect("captured message ID must be known");
                schema
                    .decode(name, &packet.raw_msg)
                    .unwrap_or_else(|_| panic!("schema decode failed for {name}"));
                assert_eq!(
                    packet.get_msg_name(),
                    Some(*name),
                    "Spectrum and active IDs must agree"
                );
                decoded += 1;
                nonempty += usize::from(!packet.raw_msg.is_empty());
                match packet.msg_id {
                    id::BasicInfoNotify => {
                        identity |= packet.parse_proto::<pb::BasicInfoNotify>().unwrap().id > 0
                    }
                    id::PhantomItemResponse => {
                        echoes |= !packet
                            .parse_proto::<pb::PhantomItemResponse>()
                            .unwrap()
                            .phantom_item_list
                            .is_empty()
                    }
                    id::WeaponItemResponse => {
                        weapons |= !packet
                            .parse_proto::<pb::WeaponItemResponse>()
                            .unwrap()
                            .weapon_item_list
                            .is_empty()
                    }
                    id::PbGetRoleListResponse => {
                        roles |= !packet
                            .parse_proto::<pb::PbGetRoleListResponse>()
                            .unwrap()
                            .role_list
                            .is_empty()
                    }
                    id::PbGetRoleListNotify => {
                        roles |= !packet
                            .parse_proto::<pb::PbGetRoleListNotify>()
                            .unwrap()
                            .role_list
                            .is_empty()
                    }
                    _ => {}
                }
            }
        }
        println!("Validated {} frames, {decoded} game packets, {nonempty} nonempty payloads, and typed identity/echo/weapon/role snapshots; rejected {rejected_datagrams} short probes/invalid-CRC datagrams.", frames.len());
        assert!(
            identity && echoes && weapons && roles,
            "capture must include identity and inventory snapshots (identity={identity}, echoes={echoes}, weapons={weapons}, roles={roles})"
        );
    }

    fn ethernet(payload: &[u8], received: bool) -> Vec<u8> {
        let (src, dst) = if received {
            (13101, 50000)
        } else {
            (50000, 13101)
        };
        let builder = etherparse::PacketBuilder::ethernet2([0x40; 6], [0x60; 6])
            .ipv4([10, 0, 0, 1], [10, 0, 0, 2], 64)
            .udp(src, dst);
        let mut frame = Vec::new();
        builder.write(&mut frame, payload).unwrap();
        frame
    }

    fn segment(conv: u32, sn: u32, payload: &[u8], command: u8) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend(conv.to_le_bytes());
        bytes.extend([command, 0, 0, 4]); // cmd, frg, wnd=1024
        bytes.extend(0u32.to_le_bytes()); // timestamp
        bytes.extend(sn.to_le_bytes());
        bytes.extend(0u32.to_le_bytes()); // una
        bytes.extend((payload.len() as u32).to_le_bytes());
        bytes.extend(payload);
        bytes.extend(crc32fast::hash(&bytes).to_le_bytes());
        bytes
    }

    fn key_request() -> Vec<u8> {
        let request = spectrum::game::proto::ProtoKeyRequest {
            trace_id: "0123456789abcdef0123456789abcdef".into(),
            ..Default::default()
        };
        codec::encode(1, 0, 1, id::ProtoKeyRequest, &request.encode_to_vec(), None).unwrap()
    }

    #[test]
    fn ethernet_mac_that_looks_like_ip_still_decodes_key_exchange() {
        let mut sniffer = Sniffer::with_session_key(String::new(), None);
        let packets = sniffer
            .receive_packet(ethernet(&segment(7, 0, &key_request(), 81), false))
            .unwrap();
        assert!(
            matches!(&packets[0], Packet::GamePacket(Ok(packet)) if packet.msg_id == id::ProtoKeyRequest)
        );
        assert_eq!(
            sniffer.session_key(),
            Some(*b"0123456789abcdef0123456789abcdef")
        );
    }

    #[test]
    fn trace_handshake_resets_both_streams_key_and_late_attach_state() {
        let mut sniffer = Sniffer::with_session_key(String::new(), Some([7; 32]));
        sniffer
            .receive_packet(ethernet(&segment(7, 42, &[], 81), true))
            .unwrap();
        assert!(sniffer.waiting_for_login);
        let mut syn = vec![0xed, 0, 32];
        syn.extend(b"0123456789abcdef0123456789abcdef");
        syn.extend(crc32fast::hash(&syn).to_le_bytes());
        let packets = sniffer.receive_packet(ethernet(&syn, false)).unwrap();
        assert!(matches!(
            packets[0],
            Packet::NetworkPacket(NetworkPacket::HandshakeRequested)
        ));
        assert!(!sniffer.waiting_for_login);
        assert_eq!(sniffer.session_key(), None);
        assert!(sniffer
            .receive_packet(ethernet(&segment(9, 0, &key_request(), 81), false))
            .is_ok());
        assert!(sniffer.session_key().is_some());
    }

    #[test]
    fn ack_before_first_push_does_not_hide_late_attach() {
        let mut sniffer = Sniffer::with_session_key(String::new(), None);
        sniffer
            .receive_packet(ethernet(&segment(7, 42, &[], 82), true))
            .unwrap();
        assert!(!sniffer.waiting_for_login);
        sniffer
            .receive_packet(ethernet(&segment(7, 43, &[], 81), true))
            .unwrap();
        assert!(sniffer.waiting_for_login);
    }

    #[test]
    fn large_split_frame_and_following_packet_keep_the_stream_aligned() {
        let key = *b"0123456789abcdef0123456789abcdef";
        let mut sniffer = Sniffer::with_session_key(String::new(), Some(key));
        let payload = vec![0x5a; 70000];
        let mut bytes =
            codec::encode(2, 1, 1, id::PhantomItemResponse, &payload, Some(&key)).unwrap();
        bytes.extend(codec::encode(4, 2, 0, 103, b"next", Some(&key)).unwrap());
        let mut packets = Vec::new();
        for (sn, chunk) in bytes.chunks(1000).enumerate() {
            packets.extend(
                sniffer
                    .receive_packet(ethernet(&segment(7, sn as u32, chunk, 81), true))
                    .unwrap(),
            );
        }
        assert_eq!(packets.len(), 2);
        assert!(matches!(&packets[0], Packet::GamePacket(Ok(packet)) if packet.raw_msg == payload));
        assert!(matches!(&packets[1], Packet::GamePacket(Ok(packet)) if packet.raw_msg == b"next"));
    }

    #[test]
    fn out_of_order_and_duplicate_segments_decode_once() {
        let mut sniffer = Sniffer::with_session_key(String::new(), None);
        let bytes = key_request();
        let a = ethernet(&segment(7, 0, &bytes[..10], 81), false);
        let b = ethernet(&segment(7, 1, &bytes[10..], 81), false);
        assert!(sniffer.receive_packet(b.clone()).unwrap().is_empty());
        assert!(sniffer.waiting_for_login);
        assert_eq!(sniffer.receive_packet(a.clone()).unwrap().len(), 1);
        assert!(!sniffer.waiting_for_login);
        assert!(sniffer.receive_packet(a).unwrap().is_empty());
        assert!(sniffer.receive_packet(b).unwrap().is_empty());
    }

    #[test]
    fn coalesced_ack_and_push_detect_missing_start() {
        let mut data = segment(7, 42, &[], 82);
        data.truncate(data.len() - 4);
        let push = segment(7, 43, &[], 81);
        data.extend(&push[..push.len() - 4]);
        data.extend(crc32fast::hash(&data).to_le_bytes());
        let mut sniffer = Sniffer::with_session_key(String::new(), None);
        sniffer.receive_packet(ethernet(&data, true)).unwrap();
        assert!(sniffer.waiting_for_login);
    }

    #[test]
    fn new_conversation_reply_recovers_when_syn_was_missed() {
        let mut sniffer = Sniffer::with_session_key(String::new(), None);
        sniffer
            .receive_packet(ethernet(&segment(7, 0, &key_request(), 81), false))
            .unwrap();
        assert!(sniffer.session_key().is_some());
        let mut reply = vec![0xee];
        reply.extend(9u32.to_le_bytes());
        reply.extend([0; 8]);
        sniffer.receive_packet(ethernet(&reply, true)).unwrap();
        assert!(sniffer.session_key().is_none());
        let packets = sniffer
            .receive_packet(ethernet(&segment(9, 0, &key_request(), 81), false))
            .unwrap();
        assert_eq!(packets.len(), 1);
        assert!(sniffer.session_key().is_some());
    }

    #[test]
    fn short_exception_does_not_block_following_key_exchange() {
        let mut bytes = vec![11, 0, 0, 3];
        bytes.extend([0; 10]);
        bytes.extend(key_request());
        let mut sniffer = Sniffer::with_session_key(String::new(), None);
        let packets = sniffer
            .receive_packet(ethernet(&segment(7, 0, &bytes, 81), false))
            .unwrap();
        assert_eq!(packets.len(), 2);
        assert!(matches!(&packets[0], Packet::GamePacket(Err(_))));
        assert!(
            matches!(&packets[1], Packet::GamePacket(Ok(packet)) if packet.msg_id == id::ProtoKeyRequest)
        );
    }

    #[test]
    fn ipv6_game_traffic_reaches_the_same_decoder() {
        let data = segment(7, 0, &key_request(), 81);
        let builder = etherparse::PacketBuilder::ethernet2([0; 6], [0; 6])
            .ipv6([0; 16], [1; 16], 64)
            .udp(50000, 13101);
        let mut frame = Vec::new();
        builder.write(&mut frame, &data).unwrap();
        assert!(crate::sniffer::live::keep_frame(
            &crate::sniffer::live::port_set(&[50000]),
            &frame
        ));
        let mut sniffer = Sniffer::with_session_key(String::new(), None);
        assert_eq!(sniffer.receive_packet(frame).unwrap().len(), 1);
    }

    #[test]
    fn unrelated_udp_is_filtered_and_crc_corruption_is_rejected() {
        let frame = etherparse::PacketBuilder::ethernet2([0; 6], [0; 6])
            .ipv4([10, 0, 0, 1], [10, 0, 0, 2], 64)
            .udp(50000, 9999);
        let mut bytes = Vec::new();
        frame.write(&mut bytes, b"telemetry").unwrap();
        assert!(!crate::sniffer::live::keep_frame(
            &crate::sniffer::live::port_set(&[50000]),
            &bytes
        ));
        let mut sniffer = Sniffer::with_session_key(String::new(), None);
        let mut data = segment(7, 0, &key_request(), 81);
        *data.last_mut().unwrap() ^= 1;
        assert!(matches!(
            sniffer.receive_packet(ethernet(&data, false)),
            Err(SnifferError::Kcp(KcpError::CrcMismatch { .. }))
        ));
    }
}

fn first_push_sequence(mut segments: &[u8]) -> Option<u32> {
    while segments.len() >= 24 {
        if segments[4] == 81 {
            return Some(kcp::get_sn(segments));
        }
        let length = u32::from_le_bytes(segments[20..24].try_into().unwrap()) as usize;
        segments = segments.get(24..)?.get(length..)?;
    }
    None
}

fn packet_error(message: String) -> spectrum::game::GamePacketError {
    io::Error::new(io::ErrorKind::InvalidData, message).into()
}

fn trace_handshake(payload: &[u8]) -> bool {
    payload.len() == 39
        && payload[1..3] == [0, 32]
        && payload[3..35].iter().all(u8::is_ascii_hexdigit)
        && crc32fast::hash(&payload[..35]) == u32::from_le_bytes(payload[35..].try_into().unwrap())
}

/// Capture paths explicitly supply Ethernet. Do not guess framing from the
/// destination MAC's high nibble: MACs starting with 4/6 look like IP versions.
pub(super) fn udp_payload(frame: &[u8]) -> Result<(bool, &[u8]), NetworkPacketError> {
    let packet = SlicedPacket::from_ethernet(frame)?;
    let Some(TransportSlice::Udp(udp)) = packet.transport else {
        return Err(NetworkPacketError::TransportLayerNotUdp);
    };
    if super::live::in_default_ranges(udp.source_port()) {
        Ok((true, udp.payload()))
    } else if super::live::in_default_ranges(udp.destination_port()) {
        Ok((false, udp.payload()))
    } else {
        Err(NetworkPacketError::IncorrectPorts)
    }
}
