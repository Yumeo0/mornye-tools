//! Kuro's public H5 account OAuth flow, followed by a separate game-login exchange.
//! Protocol reference: the official /pro/h5sdk/ and /pro/account-center/ bundles.
use anyhow::{bail, ensure, Context, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::{blocking::Client, redirect::Policy, Url};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::BTreeMap, io::Read, time::Duration};

use crate::config::Config;

const SDK_BASE: &str = "https://sdkapi.kurogame-service.com/sdkcom/v2";
const SDK_ORIGIN: &str = "https://sdk-prod-cdn-aws.kurogame-service.com";
const MAX_RESPONSE: u64 = 2 * 1024 * 1024;

#[derive(Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EmailLogin {
    pub email: String,
    pub password: String,
    pub device_num: String,
    #[serde(default)]
    pub sdk: Sdk,
    #[serde(default)]
    pub game_login: GameLogin,
}

#[derive(Clone, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct Sdk {
    pub client_id: String,
    pub client_secret: String,
    pub project_id: String,
    pub product_id: String,
    pub channel_id: String,
    pub version: String,
    /// The global PC SDK callback uses cuid as the game-login user ID.
    /// sdkuserid and id belong to different account-service namespaces.
    pub user_id_field: String,
}

impl Default for Sdk {
    fn default() -> Self {
        Self {
            client_id: String::new(),
            client_secret: String::new(),
            project_id: String::new(),
            product_id: String::new(),
            channel_id: String::new(),
            // This is the H5 protocol version, not KR_GameVersion or the native DLL version.
            version: "2.3.0".into(),
            user_id_field: "cuid".into(),
        }
    }
}

#[derive(Clone, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct GameLogin {
    pub url: String,
    pub login_type: u32,
    #[serde(default)]
    pub extra_query: BTreeMap<String, String>,
}

impl Default for GameLogin {
    fn default() -> Self {
        Self {
            url: String::new(),
            login_type: 1,
            extra_query: BTreeMap::new(),
        }
    }
}

fn actual(value: &str) -> bool {
    !value.is_empty() && !value.contains(['<', '>'])
}

impl EmailLogin {
    pub fn validate(&self) -> Result<()> {
        self.validate_with_discovery(false)
    }

    pub fn validate_with_discovery(&self, unresolved_server: bool) -> Result<()> {
        ensure!(
            actual(&self.email) && self.email.contains('@'),
            "set email_login.email to your Kuro account email"
        );
        ensure!(!self.password.is_empty() && self.password != "<your password>" && self.password.is_ascii(), "set email_login.password to the account password (the public H5 flow supports ASCII passwords)");
        ensure!(
            actual(&self.device_num),
            "set email_login.device_num to a consistent client device identifier"
        );
        for (name, value) in [
            ("client_id", &self.sdk.client_id),
            ("client_secret", &self.sdk.client_secret),
            ("project_id", &self.sdk.project_id),
            ("product_id", &self.sdk.product_id),
            ("channel_id", &self.sdk.channel_id),
            ("version", &self.sdk.version),
        ] {
            ensure!(
                actual(value),
                "set email_login.sdk.{name} to the matching public SDK client value"
            );
        }
        ensure!(
            matches!(self.sdk.user_id_field.as_str(), "sdkuserid" | "cuid" | "id"),
            "sdk.user_id_field must be sdkuserid, cuid, or id"
        );
        if !(unresolved_server && self.game_login.url.is_empty()) {
            let url = Url::parse(&self.game_login.url)
                .map_err(|_| anyhow::anyhow!("invalid game_login.url"))?;
            ensure!(
                url.scheme() == "https"
                    && url.host_str().is_some()
                    && url.username().is_empty()
                    && url.password().is_none()
                    && url.query().is_none()
                    && url.fragment().is_none(),
                "game_login.url must be an HTTPS endpoint without credentials, query, or fragment"
            );
        }
        for key in self.game_login.extra_query.keys() {
            ensure!(
                ![
                    "loginType",
                    "userId",
                    "userName",
                    "token",
                    "deviceId",
                    "loginTraceId",
                    "userData"
                ]
                .contains(&key.as_str()),
                "game_login.extra_query must not override authentication fields"
            );
        }
        Ok(())
    }
}

fn encode_password(password: &str) -> String {
    let mut bytes = STANDARD.encode(password.as_bytes()).into_bytes();
    // The official JS swaps in the loop condition, including its final swap.
    for seed in [0, 1] {
        let mut i = seed;
        while i + 2 < bytes.len() {
            bytes.swap(i, i + 2);
            if i + 6 >= bytes.len() {
                break;
            }
            i += 4;
        }
    }
    String::from_utf8(bytes).unwrap()
}

fn read_json(response: reqwest::blocking::Response, stage: &str) -> Result<Value> {
    let status = response.status();
    if stage == "game login" && matches!(status.as_u16(), 401 | 403) {
        return Err(AuthorizationRejected {
            code: i64::from(status.as_u16()),
            http: true,
        }
        .into());
    }
    ensure!(
        status.is_success(),
        "{stage} failed (HTTP {})",
        status.as_u16()
    );
    let mut bytes = Vec::new();
    response
        .take(MAX_RESPONSE + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| anyhow::anyhow!("{stage} response could not be read"))?;
    ensure!(
        bytes.len() as u64 <= MAX_RESPONSE,
        "{stage} response exceeded size limit"
    );
    let json: Value = serde_json::from_slice(&bytes)
        .map_err(|_| anyhow::anyhow!("{stage} returned invalid JSON"))?;
    let code = json
        .get("code")
        .and_then(Value::as_i64)
        .context("authentication response missing numeric code")?;
    if code == 41000 || code == 71001 {
        bail!("{stage} requires interactive verification; this CLI cannot complete that challenge");
    }
    if stage == "game login" && code == 43 {
        return Err(AuthorizationRejected { code, http: false }.into());
    }
    ensure!(code == 0, "{stage} rejected the request (code {code})");
    Ok(json)
}

fn text(json: &Value, field: &str) -> Result<String> {
    let value = json
        .get(field)
        .context("authentication response missing required field")?;
    let value = match value {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        _ => bail!("authentication response contains an invalid field type"),
    };
    ensure!(
        !value.is_empty(),
        "authentication response contains an empty required field"
    );
    Ok(value)
}

fn gateway_address(node: &Value) -> Result<String> {
    let host = text(node, "host")?;
    let port = node
        .get("port")
        .and_then(Value::as_u64)
        .and_then(|n| u16::try_from(n).ok())
        .filter(|n| *n > 0)
        .context("game login response missing valid gateway port")?;
    let host = host
        .parse::<std::net::Ipv6Addr>()
        .map(|ip| format!("[{ip}]"))
        .unwrap_or(host);
    // Accept a host/IP only, never a URI, credentials, path, or embedded port.
    let parsed = Url::parse(&format!("https://{host}/"))
        .ok()
        .filter(|u| {
            u.host_str().is_some()
                && u.username().is_empty()
                && u.password().is_none()
                && u.port().is_none()
                && u.path() == "/"
                && u.query().is_none()
                && u.fragment().is_none()
        })
        .context("game login response has invalid gateway host")?;
    Ok(format!("{}:{port}", parsed.host_str().unwrap()))
}

fn game_gateway(result: &Value) -> Result<String> {
    ensure!(
        result
            .get("clientWaitingMode")
            .and_then(Value::as_i64)
            .unwrap_or(0)
            == 0,
        "game login placed the client in a login queue; queue handling is not implemented"
    );
    if let Some(nodes) = result.get("udpHosts") {
        let nodes = nodes
            .as_array()
            .context("game login response has an invalid UDP gateway list")?;
        // Current PC clients receive multiple {host, port} objects. TCP gateways
        // are deliberately excluded because this probe implements UDP/KCP.
        return nodes
            .iter()
            .find_map(|n| gateway_address(n).ok())
            .context("game login response contains no usable UDP gateway");
    }
    // Older protocol versions and local test servers use top-level host/port.
    gateway_address(result)
}

fn base_form(email: &EmailLogin) -> BTreeMap<String, String> {
    [
        ("redirect_uri", "1"),
        ("__e__", "1"),
        ("pack_mark", "1"),
        ("platform", "h5"),
        ("version", &email.sdk.version),
        ("sdkVersion", &email.sdk.version),
        ("deviceNum", &email.device_num),
        ("projectId", &email.sdk.project_id),
        ("productId", &email.sdk.product_id),
        ("channelId", &email.sdk.channel_id),
        ("client_id", &email.sdk.client_id),
        ("response_type", "code"),
    ]
    .into_iter()
    .map(|(k, v)| (k.to_owned(), v.to_owned()))
    .collect()
}

fn post_form(
    client: &Client,
    base: &str,
    path: &str,
    form: &BTreeMap<String, String>,
    email: &EmailLogin,
    stage: &str,
) -> Result<Value> {
    let response = client
        .post(format!("{base}/{path}"))
        .header("Kr-Ver", &email.sdk.version)
        .header("Origin", SDK_ORIGIN)
        .header("Referer", format!("{SDK_ORIGIN}/"))
        .header("Accept-Language", "en")
        .form(form)
        .send()
        .map_err(|_| anyhow::anyhow!("{stage} network request failed"))?;
    read_json(response, stage)
}

fn authorize(client: &Client, sdk_base: &str, email: &EmailLogin) -> Result<Authorization> {
    eprintln!("Authenticating the Kuro email/password...");
    let mut form = base_form(email);
    form.insert("email".into(), email.email.clone());
    form.insert("password".into(), encode_password(&email.password));
    let result = post_form(
        client,
        sdk_base,
        "login/emailPwd.lg",
        &form,
        email,
        "email login",
    )?;
    let identity = result
        .get("data")
        .context("email login response missing data")?;
    ensure!(
        !identity
            .get("realNameUrl")
            .is_some_and(|v| v.as_str().is_some_and(|s| !s.is_empty())),
        "account requires interactive identity verification"
    );
    let code = text(identity, "code")?;
    let user_id = text(identity, &email.sdk.user_id_field)?;
    let user_name = text(identity, "username")?;

    eprintln!("Exchanging the account authorization code...");
    let mut form = base_form(email);
    form.insert("grant_type".into(), "authorization_code".into());
    form.insert("code".into(), code);
    form.insert("client_secret".into(), email.sdk.client_secret.clone());
    let result = post_form(
        client,
        sdk_base,
        "auth/getToken.lg",
        &form,
        email,
        "account token exchange",
    )?;
    let access_token = text(
        result.get("data").context("token response missing data")?,
        "access_token",
    )?;

    Ok(Authorization {
        user_id,
        user_name,
        access_token,
    })
}

// Never Debug or part of any webview response. Serialization is used only for
// explicit persistence in the desktop app's OS credential store.
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Authorization {
    user_id: String,
    user_name: String,
    access_token: String,
}

impl Authorization {
    pub fn is_valid(&self) -> bool {
        !self.user_id.is_empty() && !self.user_name.is_empty() && !self.access_token.is_empty()
    }
}

#[derive(Debug)]
struct AuthorizationRejected {
    code: i64,
    http: bool,
}
impl std::fmt::Display for AuthorizationRejected {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.http {
            write!(
                formatter,
                "game login failed (HTTP {}): account authorization rejected",
                self.code
            )
        } else {
            write!(formatter, "game login rejected the request (code 43: TokenNotAuthrized); the account token was not authorized for the supplied user ID and SDK client context")
        }
    }
}
impl std::error::Error for AuthorizationRejected {}

/// Only an explicit account-token rejection requires reauthentication. Timeouts,
/// discovery failures and game-session kicks must not erase a remembered login.
pub fn requires_login(error: &anyhow::Error) -> bool {
    error.downcast_ref::<AuthorizationRejected>().is_some()
}

fn exchange(
    client: &Client,
    sdk_base: &str,
    email: &EmailLogin,
    config: &Config,
) -> Result<Config> {
    let authorization = authorize(client, sdk_base, email)?;
    game_login(client, email, config, &authorization)
}

pub fn authenticate(email: &EmailLogin, timeout: Duration) -> Result<Authorization> {
    email.validate_with_discovery(true)?;
    authorize(&https_client(timeout)?, SDK_BASE, email)
}

pub fn prepare_authorized(
    config: &Config,
    email: &EmailLogin,
    authorization: &Authorization,
) -> Result<Config> {
    game_login(
        &https_client(config.timeout())?,
        email,
        config,
        authorization,
    )
}

#[derive(Clone, Debug, Deserialize, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub struct PlayerRegion {
    pub region: String,
    pub level: i32,
}

/// The launcher's read-only region service distinguishes absent characters
/// from unavailable servers before any game login is attempted.
pub fn player_regions(
    endpoint: &str,
    authorization: &Authorization,
    timeout: Duration,
) -> Result<Vec<PlayerRegion>> {
    let mut url = crate::discovery::official_url(endpoint)?;
    url.set_path(&format!(
        "{}/UserRegion/GetUserInfo",
        url.path().trim_end_matches('/')
    ));
    let response = https_client(timeout)?
        .get(url)
        .query(&[
            ("loginType", "1"),
            ("userId", authorization.user_id.as_str()),
            ("token", authorization.access_token.as_str()),
            ("area", "US"),
            ("userName", authorization.user_name.as_str()),
        ])
        .send()
        .map_err(|_| anyhow::anyhow!("player region lookup network request failed"))?;
    ensure!(
        response.status().is_success(),
        "player region lookup failed (HTTP {})",
        response.status().as_u16()
    );
    let mut bytes = Vec::new();
    response
        .take(MAX_RESPONSE + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| anyhow::anyhow!("player region response could not be read"))?;
    ensure!(
        bytes.len() as u64 <= MAX_RESPONSE,
        "player region response exceeded size limit"
    );
    parse_player_regions(&bytes)
}

fn parse_player_regions(bytes: &[u8]) -> Result<Vec<PlayerRegion>> {
    let json: Value = serde_json::from_slice(bytes)
        .map_err(|_| anyhow::anyhow!("player region lookup returned invalid JSON"))?;
    ensure!(
        json.get("Code").and_then(Value::as_i64) == Some(0)
            && json.get("SdkLoginCode").and_then(Value::as_i64) == Some(0),
        "player region lookup was rejected"
    );
    let regions: Vec<PlayerRegion> = serde_json::from_value(
        json.get("UserInfos")
            .cloned()
            .context("player region lookup returned no player list")?,
    )
    .map_err(|_| anyhow::anyhow!("player region lookup returned an invalid player list"))?;
    let mut seen = std::collections::HashSet::new();
    ensure!(
        regions.iter().all(|r| !r.region.trim().is_empty()
            && r.level > 0
            && seen.insert(r.region.to_lowercase())),
        "player region lookup returned invalid or duplicate regions"
    );
    Ok(regions)
}

fn game_login(
    client: &Client,
    email: &EmailLogin,
    config: &Config,
    authorization: &Authorization,
) -> Result<Config> {
    eprintln!("Requesting the game login token and gateway...");
    let trace = format!("{:032x}", rand::random::<u128>());
    let mut query = email.game_login.extra_query.clone();
    query.extend([
        ("loginType".into(), email.game_login.login_type.to_string()),
        ("userId".into(), authorization.user_id.clone()),
        ("userName".into(), authorization.user_name.clone()),
        ("token".into(), authorization.access_token.clone()),
        ("userData".into(), "0".into()),
        ("deviceId".into(), email.device_num.clone()),
        ("loginTraceId".into(), trace.clone()),
    ]);
    let response = client
        .get(&email.game_login.url)
        .query(&query)
        .send()
        .map_err(|_| anyhow::anyhow!("game login network request failed"))?;
    let result = read_json(response, "game login")?;
    let token = text(&result, "token")?;
    let gateway = game_gateway(&result)?;
    let mut prepared = config.clone();
    prepared.gateway = gateway;
    let login = prepared
        .login
        .as_object_mut()
        .context("login must be a JSON object")?;
    login.insert(
        "Account".into(),
        Value::String(authorization.user_id.clone()),
    );
    login.insert("Token".into(), Value::String(token));
    login.insert("LoginTraceId".into(), Value::String(trace));
    prepared.email_login = None;
    Ok(prepared)
}

pub fn prepare(config: &Config) -> Result<Config> {
    let Some(email) = &config.email_login else {
        return Ok(config.clone());
    };
    email.validate()?;
    exchange(&https_client(config.timeout())?, SDK_BASE, email, config)
}

fn https_client(timeout: Duration) -> Result<Client> {
    Client::builder()
        .redirect(Policy::none())
        .https_only(true)
        .timeout(timeout)
        .connect_timeout(Duration::from_secs(10))
        .user_agent("Mozilla/5.0 Mornye-Tools")
        .build()
        .context("could not create HTTPS client")
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use serde_json::json;
    use std::{
        io::{BufRead, BufReader, Write},
        net::TcpListener,
        thread,
    };

    pub(crate) fn fixture() -> Config {
        serde_json::from_value(json!({
            "handshake_request_hex": "41", "handshake_response_hex": "42",
            "timeout_seconds": 3, "heartbeat_seconds": 1,
            "email_login": {
                "email": "test+probe@example.invalid", "password": "password123!", "device_num": "local-test-device",
                "sdk": {"client_id": "public-test-client", "client_secret": "public-test-client-secret", "project_id": "G153", "product_id": "test-product", "channel_id": "test-channel", "version": "2.3.0"},
                "game_login": {"url": "https://login.example.invalid/api/login", "login_type": 1}
            },
            "login": {"Id": 0, "AppVersion": "test", "LauncherVersion": "test", "ResourceVersion": "test"}
        })).unwrap()
    }

    #[test]
    fn only_explicit_game_account_rejections_require_reauthentication() {
        use std::net::TcpListener;
        for (status, code, stage, expected) in [
            (200, 43, "game login", true),
            (401, 0, "game login", true),
            (403, 0, "game login", true),
            (503, 0, "game login", false),
            (200, 1004, "game login", false),
            (401, 0, "email login", false),
        ] {
            let listener = TcpListener::bind("127.0.0.1:0").unwrap();
            let url = format!("http://{}", listener.local_addr().unwrap());
            let server = thread::spawn(move || {
                let (mut stream, _) = listener.accept().unwrap();
                stream
                    .set_read_timeout(Some(Duration::from_secs(3)))
                    .unwrap();
                let mut reader = BufReader::new(stream.try_clone().unwrap());
                loop {
                    let mut line = String::new();
                    reader.read_line(&mut line).unwrap();
                    if line == "\r\n" || line.is_empty() {
                        break;
                    }
                }
                let body = json!({"code": code, "msg": "do-not-expose-this-secret"}).to_string();
                write!(stream, "HTTP/1.1 {status} Test\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()).unwrap();
            });
            let response = Client::builder()
                .no_proxy()
                .timeout(Duration::from_secs(3))
                .build()
                .unwrap()
                .get(url)
                .send()
                .unwrap();
            let error = read_json(response, stage).unwrap_err();
            assert_eq!(requires_login(&error), expected);
            assert!(!format!("{error:#}").contains("do-not-expose-this-secret"));
            server.join().unwrap();
        }
    }

    #[test]
    fn account_authorization_can_roundtrip_for_secure_storage_without_a_password() {
        let authorization = Authorization {
            user_id: "dummy-account".into(),
            user_name: "Rover".into(),
            access_token: "dummy-access-token".into(),
        };
        let serialized = serde_json::to_vec(&authorization).unwrap();
        assert!(!String::from_utf8_lossy(&serialized).contains("password"));
        let restored: Authorization = serde_json::from_slice(&serialized).unwrap();
        assert!(restored.is_valid());
        assert_eq!(restored.user_id, authorization.user_id);
        assert_eq!(restored.access_token, authorization.access_token);
    }

    fn mock_http(listener: TcpListener, game_port: u16, failure: Option<i64>) -> Result<()> {
        listener.set_nonblocking(true)?;
        let expected = ["/login/emailPwd.lg", "/auth/getToken.lg", "/api/login"];
        for (index, path) in expected.into_iter().enumerate() {
            let deadline = std::time::Instant::now() + Duration::from_secs(5);
            let (mut stream, _) = loop {
                match listener.accept() {
                    Ok(peer) => break peer,
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        ensure!(
                            std::time::Instant::now() < deadline,
                            "mock authentication request timed out"
                        );
                        thread::sleep(Duration::from_millis(5));
                    }
                    Err(error) => return Err(error.into()),
                }
            };
            // Windows accepts sockets in the listening socket's non-blocking
            // mode; restore blocking I/O so the buffered request parsing below
            // never fails with WSAEWOULDBLOCK.
            stream.set_nonblocking(false)?;
            stream.set_read_timeout(Some(Duration::from_secs(5)))?;
            let mut reader = BufReader::new(stream.try_clone()?);
            let mut line = String::new();
            reader.read_line(&mut line)?;
            let parts: Vec<_> = line.split_whitespace().collect();
            ensure!(parts.len() == 3, "bad HTTP request");
            let method = parts[0].to_owned();
            let url = Url::parse(&format!("http://localhost{}", parts[1]))?;
            ensure!(url.path() == path, "wrong HTTP authentication endpoint");
            let mut length = 0;
            let mut headers = BTreeMap::new();
            loop {
                let mut line = String::new();
                reader.read_line(&mut line)?;
                if line == "\r\n" {
                    break;
                }
                let (key, value) = line.split_once(':').context("bad HTTP header")?;
                headers.insert(key.to_lowercase(), value.trim().to_owned());
                if key.eq_ignore_ascii_case("content-length") {
                    length = value.trim().parse()?;
                }
            }
            ensure!(length < 16384, "mock request too large");
            let mut body = vec![0; length];
            reader.read_exact(&mut body)?;
            if index < 2 {
                ensure!(method == "POST", "SDK login requires POST");
                ensure!(
                    headers.get("origin").map(String::as_str) == Some(SDK_ORIGIN),
                    "missing SDK origin"
                );
                let form: BTreeMap<_, _> =
                    Url::parse(&format!("http://localhost/?{}", String::from_utf8(body)?))?
                        .query_pairs()
                        .into_owned()
                        .collect();
                ensure!(
                    form.get("deviceNum").map(String::as_str) == Some("local-test-device"),
                    "device identity changed"
                );
                if index == 0 {
                    ensure!(
                        form.get("email").map(String::as_str) == Some("test+probe@example.invalid"),
                        "email form encoding failed"
                    );
                    // Independent vector from the official JS btoa + two shuffles.
                    ensure!(
                        form.get("password").map(String::as_str) == Some("FzcGdvc3QxcmMhMj"),
                        "password encoding failed"
                    );
                    ensure!(
                        !form.contains_key("client_secret"),
                        "unnecessary client secret in password request"
                    );
                } else {
                    ensure!(
                        !form.contains_key("password") && !form.contains_key("email"),
                        "password forwarded during token exchange"
                    );
                    ensure!(
                        form.get("code").map(String::as_str) == Some("one-time-code&+"),
                        "authorization code encoding failed"
                    );
                    ensure!(
                        form.get("grant_type").map(String::as_str) == Some("authorization_code"),
                        "wrong OAuth grant"
                    );
                }
            } else {
                ensure!(method == "GET", "game login requires GET");
                let query: BTreeMap<_, _> = url.query_pairs().into_owned().collect();
                ensure!(
                    query.get("userId").map(String::as_str) == Some("CUID-123"),
                    "game user identity must use cuid, not sdkuserid or id"
                );
                ensure!(
                    query.get("token").map(String::as_str) == Some("sdk-account-token+&"),
                    "account access token not passed to game login"
                );
                ensure!(
                    !query.contains_key("password") && !query.contains_key("email"),
                    "password leaked to game login"
                );
                ensure!(
                    query.get("loginTraceId").is_some_and(|s| s.len() == 32),
                    "missing shared login trace"
                );
            }
            let result = match index {
                0 if failure.is_some() => {
                    json!({"code": failure.unwrap(), "msg": "must-not-print-password123!", "data": {}})
                }
                0 => {
                    json!({"code": 0, "data": {"code": "one-time-code&+", "sdkuserid": "SDK-123", "cuid": "CUID-123", "id": 98765, "username": "test-name"}})
                }
                1 => json!({"code": 0, "data": {"access_token": "sdk-account-token+&"}}),
                _ => {
                    json!({"code": 0, "token": "never-print-this-token", "udpHosts": [{"host": "127.0.0.1", "port": game_port}], "tcpHosts": [{"host": "127.0.0.1", "port": 1}]})
                }
            };
            let body = serde_json::to_vec(&result)?;
            write!(stream, "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", body.len())?;
            stream.write_all(&body)?;
            if failure.is_some() {
                break;
            }
        }
        Ok(())
    }

    pub(crate) fn prepare_with_mock(game_port: u16, failure: Option<i64>) -> Result<Config> {
        let listener = TcpListener::bind("127.0.0.1:0")?;
        let origin = format!("http://{}", listener.local_addr()?);
        let server = thread::spawn(move || mock_http(listener, game_port, failure));
        let config = fixture();
        let mut email = config.email_login.as_ref().unwrap().clone();
        email.game_login.url = format!("{origin}/api/login");
        // HTTP is only enabled for this local test. Production always uses HTTPS.
        let client = Client::builder()
            .no_proxy()
            .redirect(Policy::none())
            .timeout(Duration::from_secs(3))
            .build()?;
        let result = exchange(&client, &origin, &email, &config);
        server.join().unwrap()?;
        result
    }

    #[test]
    fn email_password_becomes_a_distinct_game_token_and_discovered_gateway() {
        let config = prepare_with_mock(22102, None).unwrap();
        assert_eq!(config.gateway, "127.0.0.1:22102");
        assert_eq!(config.login["Account"], "CUID-123");
        assert_eq!(config.login["Token"], "never-print-this-token");
        assert_ne!(config.login["Token"], "sdk-account-token+&");
        assert!(config.email_login.is_none());
        assert_eq!(config.login["LoginTraceId"].as_str().unwrap().len(), 32);
        config
            .validate(&crate::schema::Schema::load().unwrap())
            .unwrap();
    }

    #[test]
    fn rejects_bad_credentials_and_interactive_challenges_without_leaking_messages() {
        for code in [1004, 41000, 71001] {
            let error = prepare_with_mock(22102, Some(code)).err().unwrap();
            let diagnostic = format!("{error:#}");
            assert!(!diagnostic.contains("password123!"));
            assert!(!diagnostic.contains("must-not-print"));
            if code == 1004 {
                assert!(diagnostic.contains("1004"));
            } else {
                assert!(diagnostic.contains("interactive verification"));
            }
        }
    }

    #[test]
    fn prevents_insecure_endpoints_and_authentication_field_overrides() {
        let mut email = fixture().email_login.unwrap();
        email.validate().unwrap();
        email.game_login.url = "http://login.example.invalid/api/login".into();
        assert!(email.validate().is_err());
        email.game_login.url = "https://login.example.invalid/api/login?token=secret".into();
        assert!(email.validate().is_err());
        email.game_login.url = "https://login.example.invalid/api/login".into();
        email
            .game_login
            .extra_query
            .insert("token".into(), "override".into());
        assert!(email.validate().is_err());
    }

    #[test]
    fn gateway_supports_current_udp_hosts_and_legacy_response() {
        let current = json!({"udpHosts":[{"host":"127.0.0.1", "port":22102}],
            "tcpHosts":[{"host":"127.0.0.2", "port":22103}]});
        assert_eq!(game_gateway(&current).unwrap(), "127.0.0.1:22102");
        assert_eq!(
            game_gateway(&json!({"host":"gateway.example.invalid", "port":22102})).unwrap(),
            "gateway.example.invalid:22102"
        );
        assert_eq!(
            game_gateway(&json!({"udpHosts":[{"host":"2001:db8::1", "port":22102}]})).unwrap(),
            "[2001:db8::1]:22102"
        );
        for invalid in [
            json!({"udpHosts":[]}),
            json!({"tcpHosts":[{"host":"127.0.0.1", "port":22102}]}),
            json!({"udpHosts":[{"host":"user:secret@example.invalid", "port":22102}]}),
            json!({"udpHosts":[{"host":"example.invalid/unexpected", "port":22102}]}),
            json!({"udpHosts":[{"host":"127.0.0.1", "port":70000}]}),
            json!({"host":"127.0.0.1", "port":22102, "clientWaitingMode":1}),
        ] {
            assert!(game_gateway(&invalid).is_err());
        }
    }

    #[test]
    fn password_transform_matches_official_javascript_vectors() {
        assert_eq!(encode_password("password123!"), "FzcGdvc3QxcmMhMj");
        assert_eq!(encode_password("12345678"), "IzMTU2NDg=Nz");
    }

    #[test]
    fn region_lookup_distinguishes_empty_accounts_from_failed_or_invalid_responses() {
        let parse = |value: Value| parse_player_regions(&serde_json::to_vec(&value).unwrap());
        assert!(parse(json!({"Code":0,"SdkLoginCode":0,"UserInfos":[]}))
            .unwrap()
            .is_empty());
        let players = parse(json!({"Code":0,"SdkLoginCode":0,"UserInfos":[
            {"Region":"Europe","Level":80,"LastOnlineTime":123},
            {"Region":"Asia","Level":12}
        ]}))
        .unwrap();
        assert_eq!(
            players[0],
            PlayerRegion {
                region: "Europe".into(),
                level: 80
            }
        );
        assert_eq!(players.len(), 2);
        for invalid in [
            json!({"Code":49,"SdkLoginCode":43,"UserInfos":[],"message":"secret-token"}),
            json!({"Code":0,"SdkLoginCode":1,"UserInfos":[]}),
            json!({"Code":0,"UserInfos":[]}),
            json!({"Code":0,"SdkLoginCode":0}),
            json!({"Code":0,"SdkLoginCode":0,"UserInfos":null}),
            json!({"Code":0,"SdkLoginCode":0,"UserInfos":[{"Region":"Europe","Level":0}]}),
            json!({"Code":0,"SdkLoginCode":0,"UserInfos":[{"Region":" ","Level":1}]}),
            json!({"Code":0,"SdkLoginCode":0,"UserInfos":[{"Region":"Europe","Level":1},{"Region":"europe","Level":2}]}),
        ] {
            let error = parse(invalid).unwrap_err();
            assert!(!format!("{error:#}").contains("secret-token"));
        }
    }
}
