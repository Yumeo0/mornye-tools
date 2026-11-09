//! Read-only installation discovery and the official public server catalogue.
use aes::Aes256;
use anyhow::{bail, ensure, Context, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use cipher::{block_padding::Pkcs7, BlockDecryptMut, KeyIvInit};
use regex::Regex;
use reqwest::{blocking::Client, redirect::Policy, Url};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::BTreeMap,
    fs,
    io::Read,
    path::{Path, PathBuf},
    time::{Duration, SystemTime},
};

use crate::{auth::Sdk, config::Config};

#[cfg(target_os = "linux")]
mod linux;

const SDK_FILE: &str = "Binaries/Win64/ThirdParty/KrPcSdk_Global/KRSDKRes/KRSDK.bin";
// Public global entry, also distributed in the game's KuroPublicConfig.ini.
const GLOBAL_BOOTSTRAP: &str =
    "https://aki-config-aws.aki-game.net/TkSftmDssRx6BIKZBudzeoOHTnxjoL43/index.json";
// Distributed client configuration encryption; these are not account/session keys.
// Format reference: Shorekeeper configserver.default.toml and shorekeeper-http/src/util.rs.
const ENTRY_KEY: &str = "t+AEu5SGdpz06tomonajLMau9AJgmyTvVhz9VtGf1+0=";
const ENTRY_IV: &str = "fprc5lBWADQB7tim0R2JxQ==";
const MAX_RESPONSE: u64 = 2 * 1024 * 1024;

#[derive(Clone, Default, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct Options {
    pub game_dir: Option<PathBuf>,
    /// Exact public region, display name, or server ID. Never infer a region from the PC locale.
    pub server: Option<String>,
    pub bootstrap_url: Option<String>,
}

#[derive(Clone)]
pub struct Installation {
    pub game_dir: PathBuf,
    pub app_version: String,
    pub launcher_version: String,
    pub resource_version: String,
    pub branch: Option<String>,
    pub login_check: Value,
    pub sdk: Sdk,
    pub bootstrap_url: String,
    pub bootstrap_source: &'static str,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct Server {
    pub id: String,
    pub name: String,
    pub region: String,
    pub login_urls: Vec<String>,
}

fn key_values(text: &str) -> BTreeMap<String, String> {
    text.lines()
        .filter_map(|line| line.split_once('='))
        .map(|(k, v)| {
            (
                k.trim().trim_start_matches('\u{feff}').to_owned(),
                v.trim().to_owned(),
            )
        })
        .collect()
}

fn version(text: &str) -> Option<Vec<u32>> {
    let parts: Option<Vec<_>> = text.split('.').map(|p| p.parse::<u32>().ok()).collect();
    parts.filter(|p| p.len() == 3)
}

fn mounted_version(text: &str, kind: &str) -> Result<String> {
    let mut active = false;
    let mut versions = Vec::new();
    for line in text.lines().map(str::trim) {
        if line.starts_with("::") {
            active = line == "::Mount::";
            continue;
        }
        if active {
            if let Some(rest) = line.strip_prefix(&format!("{kind}/")) {
                if let Some(v) = rest.split('/').next().filter(|v| version(v).is_some()) {
                    versions.push(v.to_owned());
                }
            }
        }
    }
    versions
        .into_iter()
        .max_by_key(|v| version(v))
        .context("active mount file has no valid version")
}

fn installed_versions(client: &Path) -> Result<(String, String, String)> {
    let mut candidates = Vec::new();
    for entry in fs::read_dir(client.join("Saved/Resources"))
        .context("installed resource directory not found; run the game updater first")?
    {
        let entry = entry?;
        let app = entry.file_name().to_string_lossy().into_owned();
        if version(&app).is_none() {
            continue;
        }
        let mount = entry.path().join("Mount");
        let launcher = mount.join("MountLauncher.txt");
        let resource = mount.join("MountResource.txt");
        if launcher.is_file() && resource.is_file() {
            let modified = fs::metadata(&launcher)?
                .modified()
                .unwrap_or(SystemTime::UNIX_EPOCH)
                .max(
                    fs::metadata(&resource)?
                        .modified()
                        .unwrap_or(SystemTime::UNIX_EPOCH),
                );
            candidates.push((modified, app, launcher, resource));
        }
    }
    let (_, app, launcher, resource) = candidates
        .into_iter()
        .max_by(|a, b| {
            a.0.cmp(&b.0)
                .then_with(|| version(&a.1).cmp(&version(&b.1)))
        })
        .context("no active launcher/resource mounts found; run the installed game once")?;
    Ok((
        app,
        mounted_version(&fs::read_to_string(launcher)?, "Launcher")?,
        mounted_version(&fs::read_to_string(resource)?, "Resource")?,
    ))
}

fn normalize_root(path: &Path) -> Option<PathBuf> {
    [
        path.to_path_buf(),
        path.join("Wuthering Waves Game"),
        path.parent().unwrap_or(path).to_path_buf(),
    ]
    .into_iter()
    .find(|root| root.join("Client").join(SDK_FILE).is_file())
    .and_then(|p| fs::canonicalize(p).ok())
}

#[cfg(windows)]
fn system_candidates() -> Vec<PathBuf> {
    use winreg::{
        enums::{HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE},
        RegKey,
    };
    let mut paths = Vec::new();
    let library_path = Regex::new(r#""path"\s+"([^"]+)""#).unwrap();
    for hive in [HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE] {
        let root = RegKey::predef(hive);
        for key in [
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
        ] {
            if let Ok(key) = root.open_subkey(key) {
                for child in key.enum_keys().flatten() {
                    if let Ok(child) = key.open_subkey(child) {
                        let name: String = child.get_value("DisplayName").unwrap_or_default();
                        if name.to_lowercase().contains("wuthering waves") || name.contains("鸣潮")
                        {
                            if let Ok(location) = child.get_value::<String, _>("InstallLocation") {
                                paths.push(PathBuf::from(location));
                            }
                        }
                    }
                }
            }
        }
        for key in [r"SOFTWARE\Valve\Steam", r"SOFTWARE\WOW6432Node\Valve\Steam"] {
            if let Ok(key) = root.open_subkey(key) {
                for value in ["SteamPath", "InstallPath"] {
                    if let Ok(steam) = key.get_value::<String, _>(value) {
                        let steam = PathBuf::from(steam);
                        paths.push(steam.join("steamapps/common/Wuthering Waves"));
                        if let Ok(text) =
                            fs::read_to_string(steam.join("steamapps/libraryfolders.vdf"))
                        {
                            for capture in library_path.captures_iter(&text) {
                                paths.push(
                                    PathBuf::from(capture[1].replace(r"\\", r"\"))
                                        .join("steamapps/common/Wuthering Waves"),
                                );
                            }
                        }
                    }
                }
            }
        }
    }
    paths
}

#[cfg(target_os = "linux")]
fn system_candidates() -> Vec<PathBuf> {
    linux::system_candidates()
}

#[cfg(not(any(windows, target_os = "linux")))]
fn system_candidates() -> Vec<PathBuf> {
    Vec::new()
}

fn find_game(explicit: Option<&Path>) -> Result<PathBuf> {
    if let Some(path) = explicit {
        return normalize_root(path).context(
            "--game-dir must point to a global PC game installation (or its Client directory)",
        );
    }
    resolve_candidates(system_candidates())
}

fn resolve_candidates(candidates: Vec<PathBuf>) -> Result<PathBuf> {
    let mut roots: Vec<_> = candidates
        .iter()
        .filter_map(|p| normalize_root(p))
        .collect();
    roots.sort();
    roots.dedup();
    ensure!(
        roots.len() <= 1,
        "multiple installations found; select one with --game-dir"
    );
    roots
        .pop()
        .context("installed global PC game not found; provide --game-dir")
}

pub(crate) fn official_url(text: &str) -> Result<Url> {
    let url = Url::parse(text).map_err(|_| anyhow::anyhow!("invalid public configuration URL"))?;
    ensure!(url.scheme() == "https" && url.username().is_empty() && url.password().is_none()
        && url.port().is_none() && url.query().is_none() && url.fragment().is_none()
        && url.host_str().is_some_and(|h| [".aki-game.net", ".aki-game2.net", ".aki-game.com"].iter().any(|suffix| h.ends_with(suffix))),
        "automatic discovery requires an official HTTPS game domain without credentials, port, query, or fragment");
    Ok(url)
}

fn log_setting(
    client: &Path,
    regex: &Regex,
    validate: impl Fn(&str) -> bool,
) -> Result<Option<String>> {
    let Ok(entries) = fs::read_dir(client.join("Saved/Logs")) else {
        return Ok(None);
    };
    let mut logs: Vec<_> = entries
        .flatten()
        .filter(|e| {
            e.file_name().to_string_lossy().starts_with("Client")
                && e.path().extension().is_some_and(|e| e == "log")
        })
        .collect();
    logs.sort_by_key(|e| {
        std::cmp::Reverse(
            e.metadata()
                .and_then(|m| m.modified())
                .unwrap_or(SystemTime::UNIX_EPOCH),
        )
    });
    for log in logs.into_iter().take(32) {
        // Decode only in memory, never export/print login lines, which may hold account tokens.
        let mut bytes = Vec::new();
        fs::File::open(log.path())?
            .take(32 * 1024 * 1024)
            .read_to_end(&mut bytes)?;
        let start = usize::from(bytes.starts_with(&[0xef, 0xbb, 0xbf])) * 3;
        if let Some(found) =
            setting_from_text(&String::from_utf8_lossy(&bytes[start..]), regex, &validate)
        {
            return Ok(Some(found));
        }
        for b in &mut bytes[start..] {
            *b ^= if *b & 1 != 0 { 0xa5 } else { 0xef };
        }
        if let Some(found) =
            setting_from_text(&String::from_utf8_lossy(&bytes[start..]), regex, &validate)
        {
            return Ok(Some(found));
        }
    }
    Ok(None)
}

fn setting_from_text(
    text: &str,
    regex: &Regex,
    validate: &impl Fn(&str) -> bool,
) -> Option<String> {
    regex
        .captures_iter(text)
        .filter_map(|c| c.get(1).or_else(|| c.get(0)))
        .map(|m| m.as_str())
        .filter(|s| validate(s))
        .last()
        .map(str::to_owned)
}

fn login_check_from_text(text: &str) -> Result<Value> {
    // Read only public build/protocol checks. Never retain other login fields.
    let regex = Regex::new(
        r"\[(ProtoMd5|ProtoSeedMd5|ProtoVersion|ConfigVersion|ConfigMd5): ([A-Za-z0-9]+)\]",
    )?;
    let mut fields = serde_json::Map::new();
    for captures in regex.captures_iter(text) {
        let name = captures[1].replace("Md5", "MD5");
        let value = if name.ends_with("Version") {
            let Ok(number) = captures[2].parse::<i32>() else {
                continue;
            };
            json!(number)
        } else {
            if captures[2].len() != 32 || !captures[2].bytes().all(|b| b.is_ascii_hexdigit()) {
                continue;
            }
            json!(&captures[2])
        };
        fields.insert(name, value);
    }
    Ok(Value::Object(fields))
}

impl Installation {
    pub fn read(options: &Options) -> Result<Self> {
        let game_dir = find_game(options.game_dir.as_deref())?;
        let client = game_dir.join("Client");
        let fields = key_values(
            &fs::read_to_string(client.join(SDK_FILE))
                .context("could not read installed SDK configuration")?,
        );
        let get = |key: &str| {
            fields
                .get(key)
                .filter(|v| !v.is_empty())
                .cloned()
                .with_context(|| format!("installed SDK configuration is missing {key}"))
        };
        ensure!(
            get("KR_ProjectId")? == "G153",
            "only the global PC email/password SDK is supported"
        );
        let sdk = Sdk {
            client_id: get("KR_AppKey")?,
            client_secret: get("KR_SecretKey")?,
            project_id: get("KR_ProjectId")?,
            product_id: get("KR_ProductId")?,
            channel_id: get("KR_ChannelID")?,
            ..Sdk::default()
        };
        let (app_version, launcher_version, resource_version) = installed_versions(&client)?;
        let branch = log_setting(
            &client,
            &Regex::new(r"(?:Branch name string: |\[branch: )(branch_[A-Za-z0-9_.-]+)")?,
            |s| {
                let parts: Vec<_> = app_version.split('.').collect();
                s.starts_with(&format!("branch_{}.{}_", parts[0], parts[1]))
            },
        )?;
        let login_check = if branch.is_some() {
            let text = log_setting(
                &client,
                &Regex::new(r"(?m)^.*\[ProtoMd5: [^\r\n]+")?,
                |_| true,
            )?;
            login_check_from_text(text.as_deref().unwrap_or(""))?
        } else {
            json!({})
        };
        let (bootstrap_url, bootstrap_source) = if let Some(url) = &options.bootstrap_url {
            (url.clone(), "explicit override")
        } else if let Ok(text) = fs::read_to_string(client.join("Config/Kuro/KuroPublicConfig.ini"))
        {
            let config = key_values(&text);
            let prefix = config
                .get("InternalPrefix")
                .and_then(|p| p.split(';').next())
                .context("public config has no InternalPrefix")?;
            let path = config
                .get("UrlPath")
                .context("public config has no UrlPath")?;
            (
                format!("{}/{path}/index.json", prefix.trim_end_matches('/')),
                "installed public config",
            )
        } else if let Some(url) = log_setting(
            &client,
            &Regex::new(r"https://aki-config-[a-z0-9.-]+/[A-Za-z0-9_-]+/index\.json")?,
            |s| official_url(s).is_ok(),
        )? {
            (url, "installed game log")
        } else {
            (
                GLOBAL_BOOTSTRAP.into(),
                "built-in global entry (no startup log available)",
            )
        };
        official_url(&bootstrap_url)?;
        Ok(Self {
            game_dir,
            app_version,
            launcher_version,
            resource_version,
            branch,
            login_check,
            sdk,
            bootstrap_url,
            bootstrap_source,
        })
    }

    pub fn report(&self) -> Value {
        json!({"game_dir": self.game_dir, "app_version": self.app_version, "launcher_version": self.launcher_version,
            "resource_version": self.resource_version, "branch": self.branch,
            "login_check": self.login_check,
            "version_source": "active installed mount files",
            "sdk": {"project_id": self.sdk.project_id, "product_id": self.sdk.product_id, "channel_id": self.sdk.channel_id,
                "h5_protocol_version": self.sdk.version, "identifier_source": "installed KRSDK.bin"},
            "bootstrap_url": self.bootstrap_url, "bootstrap_source": self.bootstrap_source})
    }

    pub fn apply(&self, config: &mut Config) -> Result<()> {
        let login = config
            .login
            .as_object_mut()
            .context("login must be a JSON object")?;
        for (name, value) in [
            ("AppVersion", &self.app_version),
            ("LauncherVersion", &self.launcher_version),
            ("ResourceVersion", &self.resource_version),
        ] {
            login
                .entry(name)
                .or_insert_with(|| Value::String(value.clone()));
        }
        if let Some(branch) = &self.branch {
            let check = login
                .entry("DevLoginCheckData")
                .or_insert_with(|| json!({}))
                .as_object_mut()
                .context("login.DevLoginCheckData must be a JSON object")?;
            check
                .entry("BranchName")
                .or_insert_with(|| Value::String(branch.clone()));
            for (name, value) in self
                .login_check
                .as_object()
                .context("invalid discovered login checks")?
            {
                check.entry(name).or_insert_with(|| value.clone());
            }
        }
        if let Some(email) = &mut config.email_login {
            for (target, value) in [
                (&mut email.sdk.client_id, &self.sdk.client_id),
                (&mut email.sdk.client_secret, &self.sdk.client_secret),
                (&mut email.sdk.project_id, &self.sdk.project_id),
                (&mut email.sdk.product_id, &self.sdk.product_id),
                (&mut email.sdk.channel_id, &self.sdk.channel_id),
            ] {
                if target.is_empty() {
                    *target = value.clone();
                }
            }
        }
        Ok(())
    }

    pub fn servers(&self, timeout: Duration) -> Result<Vec<Server>> {
        self.catalogue(timeout).map(|(servers, _)| servers)
    }

    pub fn catalogue(&self, timeout: Duration) -> Result<(Vec<Server>, Option<String>)> {
        let client = Client::builder()
            .https_only(true)
            .redirect(Policy::none())
            .timeout(timeout)
            .connect_timeout(Duration::from_secs(10))
            .build()?;
        let response = client
            .get(&self.bootstrap_url)
            .send()
            .map_err(|_| anyhow::anyhow!("public server catalogue request failed"))?;
        ensure!(
            response.status().is_success(),
            "public server catalogue returned HTTP {}",
            response.status().as_u16()
        );
        let mut bytes = Vec::new();
        response
            .take(MAX_RESPONSE + 1)
            .read_to_end(&mut bytes)
            .context("could not read public server catalogue")?;
        ensure!(
            bytes.len() as u64 <= MAX_RESPONSE,
            "public server catalogue exceeded size limit"
        );
        let value = decode_entry(&bytes)?;
        let region_url = value
            .get("p1")
            .and_then(|v| v.get("GARUrl"))
            .filter(|v| !v.is_null())
            .or_else(|| value.get("default").and_then(|v| v.get("GARUrl")))
            .and_then(Value::as_str)
            .map(|url| official_url(url).map(|url| url.to_string()))
            .transpose()?;
        Ok((parse_servers(&value)?, region_url))
    }
}

fn decode_entry(bytes: &[u8]) -> Result<Value> {
    let text = std::str::from_utf8(bytes)
        .context("public server catalogue is not UTF-8")?
        .trim();
    let decoded = (|| -> Option<Value> {
        if text.starts_with('{') {
            return serde_json::from_str(text).ok();
        }
        let encoded = serde_json::from_str::<String>(text).unwrap_or_else(|_| text.to_owned());
        let mut ciphertext = STANDARD.decode(encoded).ok()?;
        let key = STANDARD.decode(ENTRY_KEY).ok()?;
        let iv = STANDARD.decode(ENTRY_IV).ok()?;
        let plain = cbc::Decryptor::<Aes256>::new_from_slices(&key, &iv)
            .ok()?
            .decrypt_padded_mut::<Pkcs7>(&mut ciphertext)
            .ok()?;
        serde_json::from_slice(plain).ok()
    })();
    decoded.context("could not decode public server catalogue; the distributed configuration format may have changed")
}

fn parse_servers(value: &Value) -> Result<Vec<Server>> {
    // The PC client uses parallel p1, inheriting fields absent from p1 from default.
    let list = value
        .get("p1")
        .and_then(|v| v.get("LoginServers"))
        .filter(|v| !v.is_null())
        .or_else(|| value.get("default").and_then(|v| v.get("LoginServers")))
        .and_then(Value::as_array)
        .context("public catalogue has no LoginServers array")?;
    let mut servers = Vec::new();
    for item in list {
        let text = |key| {
            item.get(key)
                .and_then(Value::as_str)
                .filter(|s| !s.is_empty())
                .map(str::to_owned)
                .context("public server entry is missing a required field")
        };
        let id = text("id")?;
        ensure!(
            !servers.iter().any(|s: &Server| s.id == id),
            "public catalogue contains duplicate server IDs"
        );
        let name = text("name")?;
        let region = item
            .get("Region")
            .and_then(Value::as_str)
            .unwrap_or(&name)
            .to_owned();
        let urls = match item.get("LoginUrl") {
            Some(value) => value
                .as_array()
                .context("public server LoginUrl must be an array")?
                .iter()
                .map(|v| {
                    v.as_str()
                        .map(str::to_owned)
                        .context("public server LoginUrl contains a non-string")
                })
                .collect::<Result<Vec<_>>>()?,
            None => vec![text("ip")?],
        };
        ensure!(!urls.is_empty(), "public server entry has no login URLs");
        let mut login_urls = Vec::new();
        for url in urls {
            let mut url = official_url(&url)?;
            match url.path() {
                "/" | "" => url.set_path("/api/login"),
                "/api/login" => (),
                _ => bail!("public server has an unexpected login path"),
            }
            login_urls.push(url.into());
        }
        servers.push(Server {
            id,
            name,
            region,
            login_urls,
        });
    }
    ensure!(!servers.is_empty(), "public server catalogue is empty");
    Ok(servers)
}

pub fn select_server<'a>(servers: &'a [Server], selection: &str) -> Result<&'a Server> {
    let matches: Vec<_> = servers
        .iter()
        .filter(|s| {
            [&s.id, &s.name, &s.region]
                .iter()
                .any(|s| s.eq_ignore_ascii_case(selection.trim()))
        })
        .collect();
    ensure!(matches.len() == 1, "server selection is unknown or ambiguous; use --list-servers and select an exact region, name, or ID");
    Ok(matches[0])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mount_versions_use_active_entries_and_numeric_order() {
        let mount = "::Mount::\nLauncher/3.7.9/a,22,hash\nLauncher/3.7.18/b,22,hash\n::Del::\nLauncher/99.0.0/c\n";
        assert_eq!(mounted_version(mount, "Launcher").unwrap(), "3.7.18");
        assert!(mounted_version(mount, "Resource").is_err());
        assert!(mounted_version("::Del::\nLauncher/3.7.18/a", "Launcher").is_err());
    }

    #[test]
    fn public_catalogue_decodes_independent_aes_cbc_vector() {
        // Generated independently with Python Crypto AES-256-CBC + PKCS#7.
        let encoded = "Foi4gLexNclYvylsmyT7vgWajBRDC2O+kq5RIVb/RJFFYTwNUmGDUgoj6PUdoxjjV50GfNMmt9zbjhgTCYm8+yzPfn8/3vIeaKfyX5AJN0M7r5wdlTmXYRxc88450FpMLxbJYJdl0pOLF69x8nR53+ZrgwaUghcanqJnszRSg2UAUP+u0J87GXPFQO92Q/4N";
        let value = decode_entry(encoded.as_bytes()).unwrap();
        let servers = parse_servers(&value).unwrap();
        assert_eq!(
            servers[0].login_urls,
            ["https://login1-eu.aki-game.net/api/login"]
        );
        assert_eq!(select_server(&servers, " europe ").unwrap().id, "eu");
        assert!(select_server(&servers, "Asia").is_err());
        let wrapped = serde_json::to_vec(encoded).unwrap();
        assert_eq!(
            parse_servers(&decode_entry(&wrapped).unwrap()).unwrap(),
            servers
        );
        assert!(decode_entry(b"secret-response-invalid-base64")
            .unwrap_err()
            .to_string()
            .find("secret-response")
            .is_none());
    }

    fn catalogue() -> Value {
        json!({"default": {"LoginServers": [{"id": "eu", "name": "Europe", "ip": "https://login1-eu.aki-game.net"}]}, "p1": {}})
    }

    #[test]
    fn catalogue_honors_parallel_overrides_and_rejects_untrusted_endpoints() {
        let mut value = catalogue();
        value["p1"]["LoginServers"] =
            json!([{"id":"asia", "name":"Asia", "ip":"https://login1-jp.aki-game.net"}]);
        assert_eq!(parse_servers(&value).unwrap()[0].id, "asia");
        value["p1"]["LoginServers"] = Value::Null;
        assert_eq!(parse_servers(&value).unwrap()[0].id, "eu");
        for url in [
            "http://login1-eu.aki-game.net",
            "https://aki-game.net.attacker.invalid",
            "https://user:secret@login1-eu.aki-game.net",
            "https://login1-eu.aki-game.net?token=secret",
            "https://login1-eu.aki-game.net/unexpected",
        ] {
            value["default"]["LoginServers"][0]["ip"] = json!(url);
            assert!(parse_servers(&value).is_err());
        }
        let mut value = catalogue();
        let duplicate = value["default"]["LoginServers"][0].clone();
        value["default"]["LoginServers"]
            .as_array_mut()
            .unwrap()
            .push(duplicate);
        assert!(parse_servers(&value).is_err());
    }

    #[test]
    fn discovered_values_fill_missing_metadata_and_preserve_overrides() {
        let mut config = crate::auth::tests::fixture();
        config
            .login
            .as_object_mut()
            .unwrap()
            .remove("LauncherVersion");
        config.email_login.as_mut().unwrap().sdk.client_id.clear();
        let installation = Installation {
            game_dir: PathBuf::from("test"),
            app_version: "3.7.0".into(),
            launcher_version: "3.7.18".into(),
            resource_version: "3.7.18".into(),
            branch: Some("branch_3.7_final".into()),
            login_check: json!({"ProtoVersion":8889113,"ProtoSeedMD5":"66998bb533bca97154a7baff3da5e37d"}),
            sdk: Sdk {
                client_id: "installed-client".into(),
                client_secret: "never-log-sdk-client-secret".into(),
                ..Sdk::default()
            },
            bootstrap_url: GLOBAL_BOOTSTRAP.into(),
            bootstrap_source: "test",
        };
        installation.apply(&mut config).unwrap();
        assert_eq!(config.login["AppVersion"], "test");
        assert_eq!(config.login["LauncherVersion"], "3.7.18");
        assert_eq!(
            config.login["DevLoginCheckData"]["BranchName"],
            "branch_3.7_final"
        );
        assert_eq!(
            config.email_login.unwrap().sdk.client_id,
            "installed-client"
        );
        assert!(!installation
            .report()
            .to_string()
            .contains("never-log-sdk-client-secret"));
    }
}
