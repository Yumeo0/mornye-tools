use std::array::TryFromSliceError;

use aes::Aes256;
use aes::cipher::block_padding::{Pkcs7, UnpadError};
use aes::cipher::{BlockDecrypt, InvalidLength, KeyInit};
use rsa::pkcs1::DecodeRsaPrivateKey;
use thiserror::Error;

/// Errors that can occur during cryptographic operations
#[derive(Error, Debug)]
pub enum CryptoError {
    /// RSA encryption/decryption operation failed
    #[error("RSA Error: {0}")]
    RSA(#[from] rsa::errors::Error),

    /// Failed to parse RSA private key from PEM format
    #[error("failed to parse RSA key from PEM: {0}")]
    ParsePemFailed(#[from] rsa::pkcs1::Error),

    /// AES decryption padding removal failed
    #[error("AES unpadding error: {0}")]
    Unpadding(String),

    /// Invalid AES key length provided (must be 32 bytes for AES-256)
    #[error("invalid AES key length: {0}")]
    AesInvalidLength(#[from] InvalidLength),

    /// Failed to convert byte slice to fixed-size array
    #[error("TryFromSliceError: {0}")]
    TryFromSlice(#[from] TryFromSliceError),

    /// Session key is required for decryption but was not provided
    #[error("session key is missing, cannot decrypt")]
    MissingSessionKey,

    /// The provided session key is invalid or corrupted
    #[error("invalid session key provided")]
    InvalidSessionKey,
}

impl From<UnpadError> for CryptoError {
    fn from(err: UnpadError) -> Self {
        CryptoError::Unpadding(err.to_string())
    }
}

#[inline]
pub fn requires_crypto(msg_id: u16) -> bool {
    msg_id != 111 && msg_id != 112
}

pub fn decrypt_payload(
    seq_no: u32,
    session_key: &[u8; 32],
    data: Box<[u8]>,
) -> Result<Box<[u8]>, CryptoError> {
    if data.is_empty() {
        return Ok(data);
    }
    let mut decrypted = decrypt_aes256_ecb_pkcs7(session_key, &data)?;
    kuro_magic(seq_no, session_key, &mut decrypted);
    Ok(decrypted)
}

fn kuro_magic(seq_no: u32, session_key: &[u8; 32], data: &mut [u8]) {
    let mut index = seq_no & 0x8000001f;
    if (index as i32) < 0 {
        index = ((index - 1) | 0xffffffe0) + 1;
    }
    let length = data.len();
    data[seq_no as usize % length] ^= session_key[index as usize]
}

fn decrypt_aes256_ecb_pkcs7(session_key: &[u8; 32], data: &[u8]) -> Result<Box<[u8]>, CryptoError> {
    let cipher = Aes256::new_from_slice(session_key)?;
    let result = cipher.decrypt_padded_vec::<Pkcs7>(data)?;
    Ok(result.into_boxed_slice())
}

pub fn decrypt_session_key(data: Vec<u8>, private_key: &str) -> Result<[u8; 32], CryptoError> {
    // current protocol: key field is a 32-char ASCII hex string used directly as the AES-256 key
    if data.len() == 32 && data.iter().all(u8::is_ascii_hexdigit) {
        return data.as_slice().try_into().map_err(Into::into);
    }
    let rsa_key = rsa::RsaPrivateKey::from_pkcs1_pem(private_key)?;
    let session_key = rsa_key.decrypt(rsa::Pkcs1v15Encrypt, &data[..])?;
    Ok(session_key.as_slice().try_into()?)
}
