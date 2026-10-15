//! Bundled RSA key loading/validation and session-key cache.
//!
//! The `data/client_private_key.pem` resource is bundled with the app and loaded
//! at startup. Only its SHA-256 fingerprint is ever exposed; key material is
//! never logged or emitted. The session key cache is the only key state that
//! changes at runtime.

use std::fs;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};

const KEY_FILE: &str = "client_private_key.pem";
/// Repository-relative path of the bundled key. Resources outside the Tauri
/// crate are bundled under `_up_/`; see `config.rs`.
const KEY_RELATIVE_PATH: &str = "data/client_private_key.pem";
const SESSION_FILE: &str = "session.key";

/// Metadata about the bundled key, safe to show in the UI.
#[derive(Debug, Clone, Default, serde::Serialize)]
pub struct KeyInfo {
    /// First 8 hex chars of the SHA-256 of the key bytes.
    pub fingerprint: Option<String>,
    pub path: Option<String>,
    pub valid: bool,
    pub error: Option<String>,
}

/// Resolve the bundled key path, preferring the dev source tree then the
/// packaged resource directory.
pub fn key_path(app: &AppHandle) -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        if let Some(project_root) = PathBuf::from(manifest_dir).parent() {
            candidates.push(project_root.join(KEY_RELATIVE_PATH));
        }
    }
    if let Ok(resource_dir) = app.path().resource_dir() {
        // Resources outside the Tauri crate are bundled under `_up_/`.
        candidates.push(resource_dir.join("_up_").join(KEY_RELATIVE_PATH));
        candidates.push(resource_dir.join(KEY_RELATIVE_PATH));
        candidates.push(resource_dir.join(KEY_FILE));
    }
    candidates.into_iter().find(|p| p.exists())
}

/// Load and validate the bundled key. Returns the PEM contents on success.
pub fn load_bundled_key(app: &AppHandle) -> Result<String, String> {
    let path = key_path(app).ok_or_else(|| {
        format!(
            "bundled RSA key not found. Expected {KEY_RELATIVE_PATH} next to the app resource directory."
        )
    })?;
    let pem = fs::read_to_string(&path).map_err(|e| format!("cannot read {}: {e}", path.display()))?;
    validate_pem(&pem)?;
    Ok(pem)
}

/// Key metadata for diagnostics (never includes key material).
pub fn key_info(app: &AppHandle) -> KeyInfo {
    let Some(path) = key_path(app) else {
        return KeyInfo {
            valid: false,
            error: Some(format!("{KEY_RELATIVE_PATH} not found")),
            ..Default::default()
        };
    };
    match fs::read(&path) {
        Ok(bytes) => {
            let fingerprint = hex_bytes(&Sha256::digest(&bytes));
            let validation = std::str::from_utf8(&bytes)
                .map_err(|e| e.to_string())
                .and_then(validate_pem);
            match validation {
                Ok(()) => KeyInfo {
                    fingerprint: Some(fingerprint),
                    path: Some(path.display().to_string()),
                    valid: true,
                    error: None,
                },
                Err(error) => KeyInfo {
                    fingerprint: Some(fingerprint),
                    path: Some(path.display().to_string()),
                    valid: false,
                    error: Some(error),
                },
            }
        }
        Err(e) => KeyInfo {
            path: Some(path.display().to_string()),
            valid: false,
            error: Some(e.to_string()),
            ..Default::default()
        },
    }
}

/// Validate a PKCS#1 PEM RSA 2048-bit key.
pub fn validate_pem(pem: &str) -> Result<(), String> {
    use rsa::pkcs1::DecodeRsaPrivateKey;
    use rsa::traits::PublicKeyParts;
    let key = rsa::RsaPrivateKey::from_pkcs1_pem(pem)
        .map_err(|e| format!("invalid PKCS#1 PEM RSA key: {e}"))?;
    if key.n().bits() != 2048 {
        return Err(format!("expected a 2048-bit RSA key, got {} bits", key.n().bits()));
    }
    Ok(())
}

/// Parse a session token: 64 hex chars, or the 32 ASCII chars used by msg 111.
pub fn parse_key(text: &str) -> Result<[u8; 32], String> {
    let s = text.trim();
    if s.len() == 32 && s.bytes().all(|b| b.is_ascii()) {
        let mut out = [0u8; 32];
        out.copy_from_slice(s.as_bytes());
        return Ok(out);
    }
    let clean: String = s.chars().filter(|c| !c.is_whitespace()).collect();
    if clean.len() == 64 && clean.chars().all(|c| c.is_ascii_hexdigit()) {
        let mut out = [0u8; 32];
        for (i, byte) in out.iter_mut().enumerate() {
            *byte = u8::from_str_radix(&clean[i * 2..i * 2 + 2], 16).map_err(|e| e.to_string())?;
        }
        return Ok(out);
    }
    Err("expected 64 hex chars or 32 ASCII chars".into())
}

pub fn hex(key: &[u8; 32]) -> String {
    key.iter().map(|b| format!("{b:02x}")).collect()
}

fn hex_bytes(bytes: &[u8]) -> String {
    bytes.iter().take(4).map(|b| format!("{b:02x}")).collect()
}

fn session_path(dir: &Path) -> PathBuf {
    dir.join("keys").join(SESSION_FILE)
}

/// Read a cached session key (hex) from `<app_data>/keys/session.key`.
pub fn read_session_key(dir: &Path) -> Option<[u8; 32]> {
    let text = fs::read_to_string(session_path(dir)).ok()?;
    parse_key(&text).ok()
}

/// Persist the session key as 64 lowercase hex chars.
pub fn write_session_key(dir: &Path, key: &[u8; 32]) -> Result<(), String> {
    let path = session_path(dir);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, hex(key)).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

/// Remove the cached session key.
pub fn clear_session_key(dir: &Path) -> Result<(), String> {
    let path = session_path(dir);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_hex_and_ascii_tokens() {
        let hex_key = "ab".repeat(32);
        assert_eq!(parse_key(&hex_key).unwrap(), [0xab; 32]);
        let ascii = "a".repeat(32);
        assert_eq!(parse_key(&ascii).unwrap(), [b'a'; 32]);
        assert!(parse_key("nope").is_err());
    }

    #[test]
    fn session_key_roundtrip() {
        let dir = std::env::temp_dir().join(format!("mny-keys-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        write_session_key(&dir, &[7u8; 32]).unwrap();
        assert_eq!(read_session_key(&dir), Some([7u8; 32]));
        clear_session_key(&dir).unwrap();
        assert_eq!(read_session_key(&dir), None);
        let _ = fs::remove_dir_all(&dir);
    }
}
