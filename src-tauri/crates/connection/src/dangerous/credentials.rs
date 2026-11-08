//! Account tokens belong in the OS credential store, never in app JSON files.
//! No raw platform error is propagated: some errors contain secret byte buffers.
use keyring::{Entry, Error};

const SERVICE: &str = "mornye-tools.kuro-account";
const UNAVAILABLE: &str = "The OS credential store is unavailable or locked.";

pub(super) trait SessionVault: Send + Sync {
    fn load(&self, device: &str) -> Result<Option<Vec<u8>>, String>;
    fn save(&self, device: &str, secret: &[u8]) -> Result<(), String>;
    fn delete(&self, device: &str) -> Result<(), String>;
}

pub(super) struct OsSessionVault;

impl OsSessionVault {
    fn entry(device: &str) -> Result<Entry, String> {
        // Never accidentally use keyring's in-memory mock backend on an
        // unsupported platform and claim the session was persisted.
        if !cfg!(any(windows, target_os = "linux", target_os = "macos")) {
            return Err(UNAVAILABLE.into());
        }
        Entry::new(SERVICE, device).map_err(|_| UNAVAILABLE.into())
    }
}

impl SessionVault for OsSessionVault {
    fn load(&self, device: &str) -> Result<Option<Vec<u8>>, String> {
        match Self::entry(device)?.get_secret() {
            Ok(secret) => Ok(Some(secret)),
            Err(Error::NoEntry) => Ok(None),
            Err(_) => Err(UNAVAILABLE.into()),
        }
    }

    fn save(&self, device: &str, secret: &[u8]) -> Result<(), String> {
        Self::entry(device)?
            .set_secret(secret)
            .map_err(|_| UNAVAILABLE.into())
    }

    fn delete(&self, device: &str) -> Result<(), String> {
        match Self::entry(device)?.delete_credential() {
            Ok(()) | Err(Error::NoEntry) => Ok(()),
            Err(_) => Err(UNAVAILABLE.into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore = "requires an unlocked OS credential store; uses only a unique dummy entry"]
    fn native_vault_roundtrip() {
        let key = format!(
            "test-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        struct Cleanup(String);
        impl Drop for Cleanup {
            fn drop(&mut self) {
                let _ = OsSessionVault.delete(&self.0);
            }
        }
        let _cleanup = Cleanup(key.clone());
        let vault = OsSessionVault;
        assert!(vault.load(&key).unwrap().is_none());
        let dummy = b"mornye-native-vault-test-not-a-real-token";
        vault.save(&key, dummy).unwrap();
        assert_eq!(vault.load(&key).unwrap().as_deref(), Some(dummy.as_slice()));
        vault.delete(&key).unwrap();
        assert!(vault.load(&key).unwrap().is_none());
    }
}
