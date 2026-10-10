use std::fmt;
use std::io::{self, Read};
use std::time::SystemTime;

use byteorder::{LE, ReadBytesExt};
use crc32fast::hash;
use miniz_oxide::inflate::DecompressError;
use prost::Message;
use thiserror::Error;

use crate::crypto::{CryptoError, decrypt_payload, requires_crypto};
use crate::game::message::MessageId;
use crate::utility::{decompress, requires_decompression};

pub mod message;
pub mod proto;

/// Errors that can occur during game packet parsing, validation, and processing
#[derive(Error, Debug)]
pub enum GamePacketError {
    // Error reading or from the underlying IO stream
    #[error("IO Error: {0}")]
    Io(#[from] io::Error),

    /// Packet type is not one of the valid game packet types
    #[error("invalid packet type {actual}. Expected one of: 1, 2, 4, 17, 18, 20")]
    InvalidPacketType { actual: u8 },

    /// CRC32 checksum validation failed for the packet payload
    #[error("game packet CRC mismatch")]
    CrcMismatch { expected: u32, actual: u32 },

    /// Failed to decompress the packet payload using zlib
    #[error("failed to decompress packet payload: {0}")]
    DecompressError(DecompressError),

    /// Error occurred during payload decryption
    #[error(transparent)]
    CryptoError(#[from] CryptoError),
}

impl From<DecompressError> for GamePacketError {
    fn from(e: DecompressError) -> Self {
        GamePacketError::DecompressError(e)
    }
}

/// Represents a parsed game packet with all relevant fields
#[derive(Clone)]
pub struct GamePacket {
    /// Total packet size including headers
    pub size: usize,
    /// Message type identifier (determines header structure)
    pub msg_type: u8,
    /// Sequence number for packet ordering and crypto
    pub seq_no: u32,
    /// Optional RPC identifier for request/response matching
    pub rpc_id: Option<u16>,
    /// Message ID identifying the specific message type
    pub msg_id: u16,
    /// CRC32 checksum for payload validation
    pub crc: u32,
    /// Decrypted and decompressed message payload
    pub raw_msg: Vec<u8>,
    /// Timestamp when the packet was processed
    pub timestamp: SystemTime,
}

impl GamePacket {
    /// Creates a new GamePacket from raw packet data
    ///
    /// # Arguments
    ///
    /// * `data` - Raw packet bytes including all headers
    /// * `session_key` - Optional session key for decryption
    ///
    /// # Returns
    ///
    /// A parsed `GamePacket` with decrypted and decompressed payload
    ///
    /// # Errors
    ///
    /// Returns `GamePacketError` if:
    /// - Packet structure is invalid
    /// - CRC checksum fails
    /// - Decryption fails (missing key or crypto error)
    /// - Decompression fails
    pub fn try_new(data: Vec<u8>, session_key: Option<&[u8; 32]>) -> Result<Self, GamePacketError> {
        let mut cursor = io::Cursor::new(&data);
        let size = cursor.read_u16::<LE>()? as usize + 3;

        let _reserved = cursor.read_u8()?;
        let msg_type = cursor.read_u8()?;
        let seq_no = cursor.read_u32::<LE>()?;

        let rpc_id = match msg_type {
            4 | 20 => None,
            _ => {
                let id = cursor.read_u16::<LE>()?;
                (id != 0).then_some(id)
            }
        };

        let msg_id = cursor.read_u16::<LE>()?;
        let crc = cursor.read_u32::<LE>()?;

        if matches!(msg_type, 17 | 18 | 20) {
            cursor.read_exact(&mut [0u8; 4])?;
        }

        let payload_size = size - cursor.position() as usize;
        let mut raw_msg = vec![0u8; payload_size];
        cursor.read_exact(&mut raw_msg)?;

        let actual_crc = hash(&raw_msg);
        if actual_crc != crc {
            return Err(GamePacketError::CrcMismatch {
                expected: crc,
                actual: actual_crc,
            });
        }

        if requires_crypto(msg_id) {
            raw_msg = match session_key {
                Some(key) => decrypt_payload(seq_no, key, raw_msg.into_boxed_slice())?.into_vec(),
                None => return Err(GamePacketError::CryptoError(CryptoError::MissingSessionKey)),
            };
        }

        if requires_decompression(msg_type) {
            raw_msg = decompress(raw_msg)?;
        }

        Ok(GamePacket {
            size,
            msg_type,
            seq_no,
            rpc_id,
            msg_id,
            crc,
            raw_msg,
            timestamp: SystemTime::now(),
        })
    }

    /// Returns the human-readable name of the message type, if known
    ///
    /// # Returns
    ///
    /// `Some(name)` if the message ID corresponds to a known message type,
    /// `None` if the message ID is unknown
    pub fn get_msg_name(&self) -> Option<&str> {
        MessageId::try_from(self.msg_id).ok().map(|id| id.into())
    }

    /// Parses the packet payload as a Prost message
    ///
    /// # Type Parameters
    ///
    /// * `T` – The Prost-generated message type to parse (must implement `Message + Default`)
    ///
    /// # Returns
    ///
    /// The parsed message or a Prost decoding error
    ///
    /// # Example
    ///
    /// ```ignore
    /// let response: ProtoKeyResponse = packet.parse_proto()?;
    /// ```
    pub fn parse_proto<T>(&self) -> Result<T, prost::DecodeError>
    where
        T: Message + Default,
    {
        T::decode(self.raw_msg.as_ref())
    }
}

impl fmt::Debug for GamePacket {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("GamePacket")
            .field("size", &self.size)
            .field("msg_type", &self.msg_type)
            .field("msg_id", &self.msg_id)
            .field("msg_name", &self.get_msg_name())
            .field("seq_no", &self.seq_no)
            .field("rpc_id", &self.rpc_id)
            .field("crc", &self.crc)
            .field("timestamp", &self.timestamp)
            .finish()
    }
}
