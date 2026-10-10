use std::time::Instant;

use crc32fast::Hasher;
use kcp::{KCP_OVERHEAD, Kcp, get_conv};
use thiserror::Error;

const CRC_LEN: usize = 4;
const MIN_KCP_SEGMENT_LEN: usize = KCP_OVERHEAD + CRC_LEN;

/// Errors that can occur during KCP segment processing and validation
#[derive(Error, Debug)]
pub enum KcpError {
    /// KCP segment is too short to contain valid header and CRC data
    #[error("kcp segment must be at least {expected} bytes, but was {actual}")]
    SegmentTooShort { expected: usize, actual: usize },

    /// KCP client instance was not properly initialized
    #[error("kcp client was not constructed")]
    ClientNotConstructed,

    /// KCP segment belongs to a different conversation than expected
    #[error(
        "kcp packet does not belong to expected conversation (expected {expected}, was {actual})"
    )]
    PacketDoesNotBelongToConversation { expected: u32, actual: u32 },

    /// CRC32 checksum validation failed for the KCP segment
    #[error("kcp packet CRC mismatch")]
    CrcMismatch { expected: u32, actual: u32 },

    /// Error from the underlying KCP library
    #[error(transparent)]
    InnerKcpError(#[from] kcp::Error),
}

pub struct KcpSniffer {
    conv_id: u32,
    kcp: Kcp<Vec<u8>>,
    time_start: Instant,
}

impl KcpSniffer {
    pub fn try_new(segments: &[u8]) -> Result<KcpSniffer, KcpError> {
        validate_kcp_segments(segments).map(Self::new)
    }

    fn new(conv_id: u32) -> Self {
        KcpSniffer {
            conv_id,
            kcp: new_kcp(conv_id),
            time_start: Instant::now(),
        }
    }

    pub fn receive_segments(&mut self, segments: &[u8]) -> Result<Vec<Vec<u8>>, KcpError> {
        let conv_id = validate_kcp_segments(segments)?;
        let segments = &segments[..segments.len() - CRC_LEN];

        if conv_id != self.conv_id {
            return Err(KcpError::PacketDoesNotBelongToConversation {
                expected: self.conv_id,
                actual: conv_id,
            });
        }

        self.kcp.input(segments)?;
        let mut received_messages = Vec::new();

        while let Ok(message_size) = self.kcp.peeksize() {
            let mut buffer = vec![0; message_size];
            if self.kcp.recv(&mut buffer).is_ok() {
                received_messages.push(buffer);
            }
        }

        let _ = self.kcp.update(self.clock()); // Ignore update error
        Ok(received_messages)
    }

    #[inline]
    fn clock(&self) -> u32 {
        Instant::now().duration_since(self.time_start).as_millis() as u32
    }
}

#[inline]
fn new_kcp(conv_id: u32) -> Kcp<Vec<u8>> {
    let mut kcp = Kcp::new(conv_id, Vec::new());
    kcp.set_wndsize(1024, 1024);
    kcp
}

fn validate_kcp_segments(payload: &[u8]) -> Result<u32, KcpError> {
    if payload.len() < MIN_KCP_SEGMENT_LEN {
        return Err(KcpError::SegmentTooShort {
            expected: MIN_KCP_SEGMENT_LEN,
            actual: payload.len(),
        });
    }

    let (data, crc_tail) = payload.split_at(payload.len() - CRC_LEN);
    let expected_crc = u32::from_le_bytes(crc_tail.try_into().unwrap());

    let crc = {
        let mut hasher = Hasher::new();
        hasher.update(data);
        hasher.finalize()
    };

    if crc != expected_crc {
        return Err(KcpError::CrcMismatch {
            expected: expected_crc,
            actual: crc,
        });
    }

    Ok(get_conv(payload))
}
