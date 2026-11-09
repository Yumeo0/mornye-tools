//! Active transport, separate from Spectrum's passive KCP mirror.
use aes::{
    cipher::{block_padding::Pkcs7, BlockDecrypt, BlockEncrypt, KeyInit},
    Aes256,
};
use anyhow::{bail, ensure, Context, Result};
use kcp::Kcp;
use std::{
    io::{self, Write},
    net::{ToSocketAddrs, UdpSocket},
    time::{Duration, Instant},
};

const MAX_BUFFER: usize = 4 * 1024 * 1024;
const LENGTH_PREFIX_SIZE: usize = 3;

#[derive(Debug)]
struct RpcException {
    kind: u8,
    length: usize,
}

impl std::fmt::Display for RpcException {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "server returned an RPC exception (frame {}, length {}); the operation was not confirmed and will not be retried",
            self.kind, self.length
        )
    }
}

impl std::error::Error for RpcException {}

pub fn frame_size(prefix: &[u8]) -> Result<usize> {
    ensure!(
        prefix.len() >= LENGTH_PREFIX_SIZE,
        "truncated game frame length prefix"
    );
    // The third byte is the high byte of a uint24, not a reserved byte.
    // Independent protocol reference: Shorekeeper gateway-server/src/session/util.rs.
    let size = (prefix[0] as usize | (prefix[1] as usize) << 8 | (prefix[2] as usize) << 16)
        + LENGTH_PREFIX_SIZE;
    ensure!(size >= 14, "invalid game frame length {size}");
    ensure!(
        size <= MAX_BUFFER,
        "game frame length {size} exceeds receive limit {MAX_BUFFER}"
    );
    Ok(size)
}

#[derive(Clone, Copy, Default, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HandshakeFormat {
    #[default]
    TraceCrc,
    Legacy,
}

fn handshake(request: u8, format: HandshakeFormat, trace: &str) -> Result<Vec<u8>> {
    if matches!(format, HandshakeFormat::Legacy) {
        return Ok(vec![request]);
    }
    ensure!(
        trace.len() == 32 && trace.bytes().all(|b| b.is_ascii_hexdigit()),
        "handshake trace must contain 32 hexadecimal characters"
    );
    // Current PC client: SYN, CrcCheckDisable, GuidStrLen, ASCII GUID, CRC32.
    // CRC checking stays enabled, as it does for subsequent KCP datagrams.
    let mut bytes = Vec::with_capacity(39);
    bytes.extend([request, 0, 32]);
    bytes.extend(trace.as_bytes());
    bytes.extend(crc32fast::hash(&bytes).to_le_bytes());
    Ok(bytes)
}

pub struct Packet {
    pub kind: u8,
    pub rpc: Option<u16>,
    pub message: u16,
    pub payload: Vec<u8>,
}

fn crypt_byte(sequence: u32, key: &[u8; 32], payload: &mut [u8]) {
    if !payload.is_empty() {
        let index = sequence as usize % payload.len();
        payload[index] ^= key[(sequence & 31) as usize];
    }
}

pub fn encode(
    kind: u8,
    sequence: u32,
    rpc: u16,
    message: u16,
    payload: &[u8],
    key: Option<&[u8; 32]>,
) -> Result<Vec<u8>> {
    ensure!(
        matches!(kind, 1 | 2 | 4),
        "unsupported outgoing packet type"
    );
    let mut payload = payload.to_vec();
    if !matches!(message, 111 | 112) {
        let key = key.context("cannot send encrypted request before key exchange")?;
        if !payload.is_empty() {
            crypt_byte(sequence, key, &mut payload);
            payload = Aes256::new_from_slice(key)
                .unwrap()
                .encrypt_padded_vec::<Pkcs7>(&payload);
        }
    }
    let size = payload.len() + if kind == 4 { 14 } else { 16 };
    ensure!(size <= MAX_BUFFER, "request exceeds game frame size limit");
    let prefix = ((size - LENGTH_PREFIX_SIZE) as u32).to_le_bytes();
    let mut bytes = Vec::with_capacity(size);
    bytes.extend(&prefix[..LENGTH_PREFIX_SIZE]);
    bytes.push(kind);
    bytes.extend(sequence.to_le_bytes());
    if kind != 4 {
        bytes.extend(rpc.to_le_bytes());
    }
    bytes.extend(message.to_le_bytes());
    bytes.extend(crc32fast::hash(&payload).to_le_bytes());
    bytes.extend(payload);
    Ok(bytes)
}

pub fn decode(bytes: &[u8], key: Option<&[u8; 32]>) -> Result<Packet> {
    ensure!(bytes.len() >= 14, "truncated game frame");
    let declared = frame_size(bytes)?;
    ensure!(
        declared == bytes.len(),
        "game frame length mismatch: declared {declared}, received {}",
        bytes.len()
    );
    let kind = bytes[3];
    ensure!(
        matches!(kind, 1 | 2 | 3 | 4 | 17 | 18 | 19 | 20),
        "unsupported game frame type {kind}"
    );
    // Net.js routes type 3 to OnRecException. A live type-3 frame can be
    // only 14 bytes: it does not have the normal 16-byte RPC response header.
    // We always reject exceptions, so leave their undocumented body opaque.
    // Never infer a message/RPC ID, decrypt, decompress, or retain its text.
    if matches!(kind, 3 | 19) {
        return Err(RpcException {
            kind,
            length: declared,
        }
        .into());
    }
    let sequence = u32::from_le_bytes(bytes[4..8].try_into().unwrap());
    let notification = matches!(kind, 4 | 20);
    let compressed = matches!(kind, 17 | 18 | 20);
    let offset = if notification { 8 } else { 10 };
    let header = offset + 6 + if compressed { 4 } else { 0 };
    ensure!(
        bytes.len() >= header,
        "truncated game frame header: type {kind}, length {}, required {header}",
        bytes.len()
    );
    let rpc = if notification {
        None
    } else {
        Some(u16::from_le_bytes(bytes[8..10].try_into().unwrap()))
    };
    let message = u16::from_le_bytes(bytes[offset..offset + 2].try_into().unwrap());
    let crc = u32::from_le_bytes(bytes[offset + 2..offset + 6].try_into().unwrap());
    ensure!(
        crc32fast::hash(&bytes[header..]) == crc,
        "game frame CRC mismatch"
    );
    let mut payload = bytes[header..].to_vec();
    if !matches!(message, 111 | 112) {
        let key = key.context("received encrypted frame before session key")?;
        if !payload.is_empty() {
            payload = Aes256::new_from_slice(key)
                .unwrap()
                .decrypt_padded_vec::<Pkcs7>(&payload)
                .map_err(|_| anyhow::anyhow!("session payload decryption failed"))?;
            crypt_byte(sequence, key, &mut payload);
        }
    }
    if compressed {
        payload = miniz_oxide::inflate::decompress_to_vec_zlib_with_limit(&payload, MAX_BUFFER)
            .map_err(|_| anyhow::anyhow!("compressed game frame is invalid or too large"))?;
    }
    Ok(Packet {
        kind,
        rpc,
        message,
        payload,
    })
}

struct DatagramOutput(UdpSocket);

impl Write for DatagramOutput {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        let mut datagram = bytes.to_vec();
        datagram.extend(crc32fast::hash(bytes).to_le_bytes());
        let sent = self.0.send(&datagram)?;
        if sent != datagram.len() {
            return Err(io::ErrorKind::WriteZero.into());
        }
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

pub struct Connection {
    socket: UdpSocket,
    kcp: Kcp<DatagramOutput>,
    conversation: u32,
    started: Instant,
    buffer: Vec<u8>,
    sequence: u32,
    pub key: Option<[u8; 32]>,
}

impl Connection {
    pub fn connect(
        gateway: &str,
        request: u8,
        response: u8,
        format: HandshakeFormat,
        trace: &str,
        timeout: Duration,
    ) -> Result<Self> {
        let handshake = handshake(request, format, trace)?;
        let address = gateway
            .to_socket_addrs()
            .context("gateway resolution failed")?
            .next()
            .context("gateway resolved to no addresses")?;
        let socket = UdpSocket::bind(if address.is_ipv4() {
            "0.0.0.0:0"
        } else {
            "[::]:0"
        })?;
        socket
            .connect(address)
            .context("could not connect UDP socket to gateway")?;
        socket.set_read_timeout(Some(timeout))?;
        socket.set_write_timeout(Some(timeout))?;
        socket
            .send(&handshake)
            .context("could not send connection handshake")?;
        let mut reply = [0u8; 65535];
        let len = socket
            .recv(&mut reply)
            .context("gateway handshake failed or timed out")?;
        ensure!(
            len == 13 && reply[0] == response,
            "unexpected handshake reply; expected configured byte and 13-byte response"
        );
        let conversation = u32::from_le_bytes(reply[1..5].try_into().unwrap());
        Self::established(socket, conversation)
    }

    pub(crate) fn established(socket: UdpSocket, conversation: u32) -> Result<Self> {
        socket.set_read_timeout(Some(Duration::from_millis(10)))?;
        let mut kcp = Kcp::new(conversation, DatagramOutput(socket.try_clone()?));
        kcp.set_wndsize(1024, 1024);
        kcp.set_nodelay(true, 10, 2, true);
        kcp.update(0)?;
        Ok(Self {
            socket,
            kcp,
            conversation,
            started: Instant::now(),
            buffer: Vec::new(),
            sequence: 0,
            key: None,
        })
    }

    pub fn send(&mut self, kind: u8, rpc: u16, message: u16, payload: &[u8]) -> Result<()> {
        self.sequence = self
            .sequence
            .checked_add(1)
            .filter(|n| *n <= i32::MAX as u32)
            .context("packet sequence exhausted")?;
        let bytes = encode(
            kind,
            self.sequence,
            rpc,
            message,
            payload,
            self.key.as_ref(),
        )?;
        self.send_frame(&bytes)
    }

    fn send_frame(&mut self, bytes: &[u8]) -> Result<()> {
        self.kcp.send(bytes)?;
        self.kcp.update(self.started.elapsed().as_millis() as u32)?;
        self.kcp.flush()?;
        Ok(())
    }

    #[cfg(test)]
    pub(crate) fn send_test_frame(&mut self, bytes: &[u8]) -> Result<()> {
        self.send_frame(bytes)
    }

    /// One tick; callers retain their own request/heartbeat deadlines.
    pub fn poll(&mut self) -> Result<Option<Packet>> {
        self.kcp.update(self.started.elapsed().as_millis() as u32)?;
        if let Some(packet) = self.pop_frame()? {
            return Ok(Some(packet));
        }
        let mut datagram = [0u8; 65535];
        match self.socket.recv(&mut datagram) {
            Ok(13) => bail!("gateway sent a new handshake during the session"),
            Ok(1) => bail!("gateway closed or rejected the session"),
            Ok(size) => {
                ensure!(size >= 28, "truncated KCP datagram");
                let body = &datagram[..size - 4];
                let crc = u32::from_le_bytes(datagram[size - 4..size].try_into().unwrap());
                ensure!(crc32fast::hash(body) == crc, "KCP datagram CRC mismatch");
                ensure!(
                    kcp::get_conv(body) == self.conversation,
                    "KCP conversation changed"
                );
                self.kcp.input(body)?;
                while let Ok(size) = self.kcp.peeksize() {
                    ensure!(
                        size <= MAX_BUFFER && self.buffer.len() + size <= MAX_BUFFER,
                        "KCP receive buffer limit exceeded"
                    );
                    let start = self.buffer.len();
                    self.buffer.resize(start + size, 0);
                    self.kcp.recv(&mut self.buffer[start..])?;
                }
            }
            Err(error)
                if matches!(
                    error.kind(),
                    io::ErrorKind::WouldBlock
                        | io::ErrorKind::TimedOut
                        | io::ErrorKind::Interrupted
                ) => {}
            Err(error) => return Err(error).context("gateway receive failed"),
        }
        self.pop_frame()
    }

    fn pop_frame(&mut self) -> Result<Option<Packet>> {
        if self.buffer.len() < LENGTH_PREFIX_SIZE {
            return Ok(None);
        }
        let size = frame_size(&self.buffer)?;
        if self.buffer.len() < size {
            return Ok(None);
        }
        let result = decode(&self.buffer[..size], self.key.as_ref());
        // An exception is a complete, rejected frame. Consume it once so the
        // next heartbeat does not encounter the same exception again. Other
        // parse/integrity errors remain fatal rather than resynchronizing.
        if result.is_ok()
            || result
                .as_ref()
                .is_err_and(|error| error.is::<RpcException>())
        {
            self.buffer.drain(..size);
        }
        result.map(Some)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trace_crc_syn_matches_live_accepted_layout_and_independent_crc_vector() {
        // CRC calculated independently with Python zlib.crc32. The same layout
        // was accepted by the global PC gateway on 2026-11-07.
        let expected = [
            b"\xed\0\x20".as_slice(),
            b"0123456789abcdef0123456789abcdef",
            b"\xbe\xe4\x20\xeb",
        ]
        .concat();
        assert_eq!(
            handshake(
                0xed,
                HandshakeFormat::TraceCrc,
                "0123456789abcdef0123456789abcdef"
            )
            .unwrap(),
            expected
        );
        assert_eq!(
            handshake(0xed, HandshakeFormat::Legacy, "").unwrap(),
            [0xed]
        );
        for invalid in ["", "short", "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"] {
            assert!(handshake(0xed, HandshakeFormat::TraceCrc, invalid).is_err());
        }
    }

    #[test]
    fn rejects_wrong_ack_command_and_length_and_bounds_wait() {
        for reply in [vec![0xee; 12], vec![0xed; 13]] {
            let server = UdpSocket::bind("127.0.0.1:0").unwrap();
            let gateway = server.local_addr().unwrap().to_string();
            server
                .set_read_timeout(Some(Duration::from_secs(1)))
                .unwrap();
            let peer = std::thread::spawn(move || {
                let (_, peer) = server.recv_from(&mut [0u8; 64]).unwrap();
                server.send_to(&reply, peer).unwrap();
            });
            let error = Connection::connect(
                &gateway,
                0xed,
                0xee,
                HandshakeFormat::TraceCrc,
                "0123456789abcdef0123456789abcdef",
                Duration::from_secs(1),
            )
            .err()
            .unwrap();
            assert!(error.to_string().contains("unexpected handshake reply"));
            peer.join().unwrap();
        }
        let silent = UdpSocket::bind("127.0.0.1:0").unwrap();
        let started = Instant::now();
        assert!(Connection::connect(
            &silent.local_addr().unwrap().to_string(),
            0xed,
            0xee,
            HandshakeFormat::TraceCrc,
            "0123456789abcdef0123456789abcdef",
            Duration::from_millis(50)
        )
        .is_err());
        assert!(started.elapsed() < Duration::from_secs(2));
    }

    #[test]
    fn plaintext_frame_matches_independent_wire_layout() {
        // CRC32("abc") = 0x352441c2; length excludes the first three bytes.
        let expected = [
            16, 0, 0, 1, 1, 0, 0, 0, 7, 0, 111, 0, 0xc2, 0x41, 0x24, 0x35, b'a', b'b', b'c',
        ];
        assert_eq!(encode(1, 1, 7, 111, b"abc", None).unwrap(), expected);
        let packet = decode(&expected, None).unwrap();
        assert_eq!(packet.rpc, Some(7));
        assert_eq!(packet.payload, b"abc");
    }

    #[test]
    fn encryption_compression_and_crc_validation() {
        let key = *b"0123456789abcdef0123456789abcdef";
        let bytes = encode(2, 35, 3, 104, b"nonempty login response", Some(&key)).unwrap();
        assert_eq!(
            decode(&bytes, Some(&key)).unwrap().payload,
            b"nonempty login response"
        );
        assert!(decode(&bytes, None).is_err());
        let mut bad = bytes.clone();
        *bad.last_mut().unwrap() ^= 1;
        assert!(decode(&bad, Some(&key)).is_err());
        let zipped = miniz_oxide::deflate::compress_to_vec_zlib(b"response", 6);
        let mut compressed = encode(2, 7, 8, 106, &zipped, Some(&key)).unwrap();
        compressed[3] = 18;
        compressed.splice(16..16, [0u8; 4]);
        let len = (compressed.len() - 3) as u32;
        compressed[..3].copy_from_slice(&len.to_le_bytes()[..3]);
        assert_eq!(
            decode(&compressed, Some(&key)).unwrap().payload,
            b"response"
        );
        for end in 0..bytes.len() {
            assert!(decode(&bytes[..end], Some(&key)).is_err());
        }
    }

    #[test]
    fn rejects_opaque_exceptions_including_the_reported_short_frame() {
        // Only the envelope is known. Do not manufacture a response header or
        // infer RPC/message fields from the exception body.
        for kind in [3, 19] {
            for body in [vec![0; 10], b"never-print-this-token".to_vec()] {
                let length = body.len() + 1;
                let mut bytes = vec![length as u8, 0, 0, kind];
                bytes.extend(body);
                let error = decode(&bytes, None).err().unwrap();
                assert!(error.is::<RpcException>());
                let text = error.to_string();
                assert!(text.contains("RPC exception"), "{text}");
                assert!(!text.contains("truncated"), "{text}");
                assert!(!text.contains("never-print-this-token"));
                assert!(!text.contains("message"));
            }
        }
        let mut unknown = encode(2, 1, 1, 112, b"abc", None).unwrap();
        unknown[3] = 99;
        assert!(decode(&unknown, None)
            .err()
            .unwrap()
            .to_string()
            .contains("type 99"));
    }

    #[test]
    fn consumes_a_rejected_exception_once_and_preserves_following_frames() {
        let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
        socket.connect(socket.local_addr().unwrap()).unwrap();
        let mut connection = Connection::established(socket, 77).unwrap();
        connection
            .buffer
            .extend([11, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        let next = encode(2, 1, 1, 112, b"abc", None).unwrap();
        connection.buffer.extend(&next);
        assert!(connection.pop_frame().err().unwrap().is::<RpcException>());
        assert_eq!(connection.buffer, next);
        assert_eq!(connection.pop_frame().unwrap().unwrap().payload, b"abc");
        assert!(connection.pop_frame().unwrap().is_none());
    }

    #[test]
    fn encryption_matches_nist_aes256_vector_after_sequence_xor() {
        // NIST SP 800-38A F.1.5: first block after undoing our sequence XOR.
        let key = [
            0x60, 0x3d, 0xeb, 0x10, 0x15, 0xca, 0x71, 0xbe, 0x2b, 0x73, 0xae, 0xf0, 0x85, 0x7d,
            0x77, 0x81, 0x1f, 0x35, 0x2c, 0x07, 0x3b, 0x61, 0x08, 0xd7, 0x2d, 0x98, 0x10, 0xa3,
            0x09, 0x14, 0xdf, 0xf4,
        ];
        let payload = [
            0x0b, 0xc1, 0xbe, 0xe2, 0x2e, 0x40, 0x9f, 0x96, 0xe9, 0x3d, 0x7e, 0x11, 0x73, 0x93,
            0x17, 0x2a,
        ];
        let expected = [
            0xf3, 0xee, 0xd1, 0xbd, 0xb5, 0xd2, 0xa0, 0x3c, 0x06, 0x4b, 0x5a, 0x7e, 0x3d, 0xb1,
            0x81, 0xf8,
        ];
        let frame = encode(1, 0, 1, 103, &payload, Some(&key)).unwrap();
        assert_eq!(frame[16..32], expected);
    }

    #[test]
    fn frame_stream_handles_split_and_coalesced_frames() {
        let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
        socket.connect(socket.local_addr().unwrap()).unwrap();
        let mut connection = Connection::established(socket, 77).unwrap();
        let a = encode(2, 1, 1, 112, b"abc", None).unwrap();
        let b = encode(2, 2, 2, 112, b"def", None).unwrap();
        connection.buffer.extend(&a[..7]);
        assert!(connection.pop_frame().unwrap().is_none());
        connection.buffer.extend(&a[7..]);
        connection.buffer.extend(b);
        assert_eq!(connection.pop_frame().unwrap().unwrap().payload, b"abc");
        assert_eq!(connection.pop_frame().unwrap().unwrap().payload, b"def");
        assert!(connection.pop_frame().unwrap().is_none());
    }

    #[test]
    fn uint24_frame_waits_for_full_large_response_and_preserves_next_frame() {
        // Independently constructed, without encode(): uint24 LE body length
        // 0x01000b, response header, 65,534 Z bytes. Python zlib.crc32 gives
        // 0x3c272ccf. Reading only the low u16 declares a 14-byte frame and
        // reproduces "truncated game frame header" on this valid response.
        // Framing reference:
        // https://github.com/thexeondev/Shorekeeper/blob/master/gateway-server/src/session/util.rs
        let mut large = vec![
            0x0b, 0x00, 0x01, 2, 1, 0, 0, 0, 7, 0, 112, 0, 0xcf, 0x2c, 0x27, 0x3c,
        ];
        large.resize(65_550, b'Z');
        let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
        socket.connect(socket.local_addr().unwrap()).unwrap();
        let mut connection = Connection::established(socket, 77).unwrap();
        for end in [1, 2, 3, 14, 65_549] {
            let start = connection.buffer.len();
            connection.buffer.extend(&large[start..end]);
            assert!(connection.pop_frame().unwrap().is_none());
            assert_eq!(connection.buffer.len(), end);
        }
        connection.buffer.push(*large.last().unwrap());
        connection
            .buffer
            .extend([13, 0, 0, 2, 2, 0, 0, 0, 8, 0, 112, 0, 0, 0, 0, 0]);
        let packet = connection.pop_frame().unwrap().unwrap();
        assert_eq!(packet.rpc, Some(7));
        assert_eq!(packet.payload, vec![b'Z'; 65_534]);
        let next = connection.pop_frame().unwrap().unwrap();
        assert_eq!(next.rpc, Some(8));
        assert!(next.payload.is_empty());
        assert!(connection.buffer.is_empty());
        *large.last_mut().unwrap() ^= 1;
        assert!(decode(&large, None)
            .err()
            .unwrap()
            .to_string()
            .contains("CRC"));
    }

    #[test]
    fn encrypted_frames_cross_the_u16_length_boundary() {
        let key = *b"0123456789abcdef0123456789abcdef";
        let payload = vec![b'Z'; 65_536];
        let bytes = encode(2, 35, 7, 16448, &payload, Some(&key)).unwrap();
        // 16-byte header + AES payload including a full padding block - prefix.
        assert_eq!(&bytes[..3], &[0x1d, 0, 1]);
        assert_eq!(decode(&bytes, Some(&key)).unwrap().payload, payload);
        assert!(decode(&bytes[..16], Some(&key)).is_err());
    }

    #[test]
    fn uint24_lengths_keep_malformed_and_oversized_frames_rejected() {
        assert!(frame_size(&[13, 0]).is_err());
        assert!(frame_size(&[0, 0, 0]).is_err());
        assert_eq!(frame_size(&[0xfd, 0xff, 0x3f]).unwrap(), MAX_BUFFER);
        assert!(frame_size(&[0xfe, 0xff, 0x3f]).is_err());
        assert!(frame_size(&[0xff, 0xff, 0xff]).is_err());
        let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
        socket.connect(socket.local_addr().unwrap()).unwrap();
        let mut connection = Connection::established(socket, 77).unwrap();
        connection.buffer.extend([0xff, 0xff, 0xff]);
        assert!(connection.pop_frame().is_err());
        let short_rpc = [11, 0, 0, 2, 0, 0, 0, 0, 0, 0, 112, 0, 0, 0];
        let error = decode(&short_rpc, None).err().unwrap().to_string();
        assert!(error.contains("type 2, length 14, required 16"), "{error}");
    }
}
