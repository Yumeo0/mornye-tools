//! Spectrum - a rust crate for processing and parsing waves game packets.
//!
//! Developed by Wuthery team, open-sourced for the community. Works with any packet source.

use thiserror::Error;

use crate::crypto::decrypt_session_key;
use crate::game::message::MessageId;
use crate::game::proto::{ProtoKeyRequest, ProtoKeyResponse};
use crate::game::{GamePacket, GamePacketError};
use crate::kcp::KcpSniffer;
use crate::network::parse_network_packet;

mod crypto;
mod kcp;
mod network;
mod utility;

pub mod game;
pub use crate::crypto::CryptoError;
pub use crate::kcp::KcpError;
pub use crate::network::NetworkPacketError;

const PORT_RANGES: &[(u16, u16)] = &[(13100, 13200), (23100, 23200)];

/// Top-level errors that can occur during packet sniffing and processing
#[derive(Error, Debug)]
pub enum SnifferError {
    /// Error occurred during network packet parsing or validation
    #[error(transparent)]
    NetworkPacket(#[from] NetworkPacketError),

    /// Error occurred during KCP segment processing
    #[error(transparent)]
    Kcp(#[from] KcpError),

    /// Error occurred during game packet parsing, decryption, or decompression
    #[error(transparent)]
    GamePacket(#[from] GamePacketError),
}

pub enum Packet {
    NetworkPacket(NetworkPacket),
    GamePacket(Result<GamePacket, GamePacketError>),
}

pub enum NetworkPacket {
    HandshakeRequested,
    HandshakeEstablished(u32),
    SegmentData(PacketDirection, Vec<u8>),
}

#[derive(Debug, Clone, Copy, Hash, PartialEq, Eq)]
pub enum PacketDirection {
    Sent,
    Received,
}

/// Main packet sniffer that processes network traffic and extracts game packets
#[derive(Default)]
pub struct Sniffer {
    sent_kcp: Option<KcpSniffer>,
    sent_buffer: Vec<u8>,
    recv_kcp: Option<KcpSniffer>,
    recv_buffer: Vec<u8>,
    session_key: Option<[u8; 32]>,
    private_key: String,
}

impl Sniffer {
    /// Creates a new packet sniffer with the specified RSA private key
    ///
    /// # Arguments
    ///
    /// * `private_key` - RSA private key in PEM format used for session key decryption
    ///
    /// # Example
    ///
    /// ```
    /// use spectrum::Sniffer;
    ///
    /// let private_key = "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----";
    /// let sniffer = Sniffer::new(private_key.to_string());
    /// ```
    pub fn new(private_key: String) -> Self {
        Self {
            private_key,
            ..Default::default()
        }
    }

    /// Creates a sniffer pre-seeded with a known session key, so a capture can be
    /// restarted without observing the handshake again.
    pub fn with_session_key(private_key: String, session_key: Option<[u8; 32]>) -> Self {
        Self {
            private_key,
            session_key,
            ..Default::default()
        }
    }

    /// The currently known session key (hex key from msg 111 or RSA-decrypted msg 112).
    pub fn session_key(&self) -> Option<[u8; 32]> {
        self.session_key
    }

    /// Manually install a session key (e.g. a cached token).
    pub fn set_session_key(&mut self, key: [u8; 32]) {
        self.session_key = Some(key);
    }

    /// Processes a raw network packet and returns any extracted packets
    ///
    /// # Arguments
    ///
    /// * `data` - Raw UDP network packet bytes
    ///
    /// # Returns
    ///
    /// A vector of processed packets, which may include network packets and game packets.
    /// Game packets may contain parsing errors if decryption or decompression fails.
    ///
    /// # Errors
    ///
    /// Returns `SnifferError` if:
    /// - Network packet parsing fails
    /// - KCP segment processing encounters errors
    /// - Critical game packet parsing errors occur
    pub fn receive_packet(&mut self, data: Vec<u8>) -> Result<Vec<Packet>, SnifferError> {
        let packet = parse_network_packet(PORT_RANGES, data)?;

        match packet {
            NetworkPacket::HandshakeRequested => {
                self.recv_kcp = None;
                self.recv_buffer.clear();
                self.sent_kcp = None;
                self.sent_buffer.clear();
                self.session_key = None;
                Ok(vec![Packet::NetworkPacket(packet)])
            }

            NetworkPacket::HandshakeEstablished(_) => Ok(vec![Packet::NetworkPacket(packet)]),

            NetworkPacket::SegmentData(direction, kcp_seg) => {
                let packets = self
                    .receive_kcp_segment(direction, &kcp_seg)?
                    .into_iter()
                    .map(Packet::GamePacket)
                    .collect();

                Ok(packets)
            }
        }
    }

    fn receive_kcp_segment(
        &mut self,
        direction: PacketDirection,
        kcp_seg: &[u8],
    ) -> Result<Vec<Result<GamePacket, GamePacketError>>, KcpError> {
        let (kcp_slot, buffer) = self.kcp_and_buffer_mut(direction);

        if kcp_slot.is_none() {
            let new_kcp = KcpSniffer::try_new(kcp_seg)?;
            *kcp_slot = Some(new_kcp);
        }

        let kcp = kcp_slot.as_mut().unwrap(); // safe unwrap

        let segments = kcp.receive_segments(kcp_seg)?;
        for seg in segments {
            buffer.extend_from_slice(&seg);
        }

        Ok(self.process_game_packets(direction))
    }

    #[inline]
    fn kcp_and_buffer_mut(
        &mut self,
        direction: PacketDirection,
    ) -> (&mut Option<KcpSniffer>, &mut Vec<u8>) {
        match direction {
            PacketDirection::Sent => (&mut self.sent_kcp, &mut self.sent_buffer),
            PacketDirection::Received => (&mut self.recv_kcp, &mut self.recv_buffer),
        }
    }

    fn process_game_packets(
        &mut self,
        direction: PacketDirection,
    ) -> Vec<Result<GamePacket, GamePacketError>> {
        let buf = match direction {
            PacketDirection::Sent => &mut self.sent_buffer,
            PacketDirection::Received => &mut self.recv_buffer,
        };

        let mut packets = Vec::new();
        while buf.len() >= 2 {
            let len = u16::from_le_bytes([buf[0], buf[1]]) as usize + 3;
            if buf.len() < len {
                break;
            }
            let leftover = buf.split_off(len);
            let packet = std::mem::replace(buf, leftover);
            packets.push(packet);
        }

        packets
            .into_iter()
            .map(|packet| self.receive_game_packet(packet))
            .collect()
    }

    fn receive_game_packet(&mut self, data: Vec<u8>) -> Result<GamePacket, GamePacketError> {
        let packet = GamePacket::try_new(data, self.session_key.as_ref())?;

        if let Ok(MessageId::ProtoKeyRequest) = MessageId::try_from(packet.msg_id) {
            if let Ok(parsed) = packet.parse_proto::<ProtoKeyRequest>() {
                println!(
                    "msg 111: is_login={} trace_id={} ({} chars)",
                    parsed.is_login,
                    parsed.trace_id,
                    parsed.trace_id.len()
                );
                if let Ok(k) = <[u8; 32]>::try_from(parsed.trace_id.as_bytes()) {
                    self.session_key = Some(k); // hypothesis: hex string IS the AES-256 key
                }
            }
        }

        if let Ok(MessageId::ProtoKeyResponse) = MessageId::try_from(packet.msg_id) {
            if let Ok(parsed_packet) = packet.parse_proto::<ProtoKeyResponse>() {
                let keyhex: String = parsed_packet.key.iter().map(|b| format!("{b:02x}")).collect();
                println!("msg 112: key={} bytes: {}", parsed_packet.key.len(), keyhex);
                match decrypt_session_key(parsed_packet.key, &self.private_key) {
                    Ok(k) => {
                        println!("msg 112: RSA-decrypted session key: {}", k.iter().map(|b| format!("{b:02x}")).collect::<String>());
                        self.session_key = Some(k);
                    }
                    Err(e) => println!("msg 112: decrypt failed ({e}); keeping session key from msg 111"),
                }
            }
        }

        Ok(packet)
    }
}
