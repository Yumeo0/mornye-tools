use anyhow::{bail, ensure, Context, Result};
use serde::Deserialize;
use serde_json::Value;
use std::{
    fs,
    path::{Path, PathBuf},
    time::Duration,
};

use crate::{
    auth::EmailLogin,
    schema::{integer, Schema},
};

#[derive(Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Config {
    #[serde(default)]
    pub gateway: String,
    #[serde(default = "default_syn")]
    pub handshake_request_hex: String,
    #[serde(default = "default_ack")]
    pub handshake_response_hex: String,
    #[serde(default)]
    pub handshake_format: crate::wire::HandshakeFormat,
    #[serde(default = "empty_object")]
    pub login: Value,
    #[serde(default)]
    pub installation: Option<crate::discovery::Options>,
    #[serde(default)]
    pub email_login: Option<EmailLogin>,
    #[serde(default)]
    pub expected_player_id: Option<i32>,
    #[serde(default = "default_enter_game")]
    pub enter_game: Value,
    #[serde(default = "default_timeout")]
    pub timeout_seconds: u64,
    #[serde(default = "default_heartbeat")]
    pub heartbeat_seconds: u64,
    #[serde(default)]
    pub private_key_file: Option<PathBuf>,
}

fn empty_object() -> Value {
    serde_json::json!({})
}
fn default_enter_game() -> Value {
    // Global client's common_param defaults: default_single_map_id = 8,
    // default_multi_map_id = 0. An empty request selects no world branch.
    serde_json::json!({"SingleInstanceId": 8})
}
fn default_syn() -> String {
    "ed".into()
}
fn default_ack() -> String {
    "ee".into()
}
fn default_timeout() -> u64 {
    20
}
fn default_heartbeat() -> u64 {
    5
}

impl Config {
    pub fn read(path: &Path) -> Result<Self> {
        let bytes = fs::read(path).context("could not read config file")?;
        // Keep syntax errors and unknown field names out of logs as well.
        let mut config: Self = serde_json::from_slice(&bytes)
            .map_err(|_| anyhow::anyhow!("invalid config JSON or unknown top-level option"))?;
        if let Some(key) = &config.private_key_file {
            if key.is_relative() {
                config.private_key_file = Some(path.parent().unwrap_or(Path::new(".")).join(key));
            }
        } else {
            // Reuse the companion's bundled protocol key, without copying key
            // material into the game client or the credential config.
            let bundled =
                Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../data/client_private_key.pem");
            if bundled.is_file() {
                config.private_key_file = Some(bundled);
            }
        }
        if let Some(installation) = &mut config.installation {
            if let Some(dir) = &installation.game_dir {
                if dir.is_relative() {
                    installation.game_dir = Some(path.parent().unwrap_or(Path::new(".")).join(dir));
                }
            }
        }
        Ok(config)
    }

    pub fn validate(&self, schema: &Schema) -> Result<()> {
        self.validate_inner(schema, false)
    }

    pub fn validate_offline(&self, schema: &Schema) -> Result<()> {
        self.validate_inner(
            schema,
            self.installation
                .as_ref()
                .is_some_and(|i| i.server.as_ref().is_some_and(|s| !s.trim().is_empty())),
        )
    }

    fn validate_inner(&self, schema: &Schema, unresolved_server: bool) -> Result<()> {
        if let Some(email) = &self.email_login {
            email.validate_with_discovery(unresolved_server)?;
        } else {
            ensure!(
                !self.gateway.is_empty() && !self.gateway.contains(['<', '>']),
                "set gateway to the game's actual host:port"
            );
        }
        byte_from_hex(&self.handshake_request_hex)?;
        byte_from_hex(&self.handshake_response_hex)?;
        ensure!(
            (1..=120).contains(&self.timeout_seconds),
            "timeout_seconds must be between 1 and 120"
        );
        ensure!(
            (1..=30).contains(&self.heartbeat_seconds),
            "heartbeat_seconds must be between 1 and 30"
        );
        let login = schema.message("LoginRequest", &self.login)?;
        ensure!(integer(&login, "Id")? >= 0, "login.Id must not be negative");
        ensure!(
            self.expected_player_id.is_none_or(|id| id > 0),
            "expected_player_id must be positive when supplied"
        );
        let mut required = vec!["AppVersion", "LauncherVersion", "ResourceVersion"];
        if self.email_login.is_none() {
            required.extend(["Account", "Token"]);
        }
        for name in required {
            let value = login
                .get_field_by_name(name)
                .context("login schema missing required field")?;
            let text = value.as_str().context("invalid login field type")?;
            ensure!(
                !text.is_empty() && !text.contains(['<', '>']),
                "set login.{name} to the actual login value"
            );
        }
        schema.message("EnterGameRequest", &self.enter_game)?;
        if let Some(path) = &self.private_key_file {
            use rsa::pkcs1::DecodeRsaPrivateKey;
            let pem = fs::read_to_string(path).context("could not read private_key_file")?;
            rsa::RsaPrivateKey::from_pkcs1_pem(&pem).map_err(|_| {
                anyhow::anyhow!("private_key_file must contain a PKCS#1 RSA private key")
            })?;
        }
        Ok(())
    }

    pub fn timeout(&self) -> Duration {
        Duration::from_secs(self.timeout_seconds)
    }
}

pub fn byte_from_hex(text: &str) -> Result<u8> {
    if text.len() != 2 || !text.bytes().all(|b| b.is_ascii_hexdigit()) {
        bail!("handshake values must each be exactly one byte written as two hex digits; obtain them from an observed connection");
    }
    Ok(u8::from_str_radix(text, 16)?)
}
