//! Explicitly opted-in active sessions synchronize their account/server profile.
//! Passwords and tokens never cross back into the webview. Account authorization
//! is remembered only in the OS credential store; passwords are never saved.
mod credentials;
pub mod profiles;

use crate::account::{
    ingest::{game_packet, AccountCapture},
    AccountState,
};
use credentials::{OsSessionVault, SessionVault};
use mornye_game_client::{
    auth::{self, Authorization, EmailLogin},
    config::Config,
    discovery::{Installation, Options, Server},
    schema::Schema,
    session,
};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Duration,
};
use tauri::{AppHandle, Manager, State, WebviewWindow};
use zeroize::Zeroizing;

#[derive(Clone, Serialize, Deserialize)]
struct Preferences {
    decision: Option<bool>,
    device_num: String,
    server_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    email: Option<String>,
    /// A durable gate: stale credentials must not restore after sign-out even
    /// when deleting the OS credential fails.
    #[serde(default)]
    session_saved: bool,
    /// Nonsecret metadata only. The top-level fields remain the selected
    /// account, preserving the original single-account preference/vault format.
    #[serde(default)]
    accounts: BTreeMap<String, AccountPreferences>,
    #[serde(default)]
    profile_accounts: BTreeMap<String, String>,
}

#[derive(Clone, Serialize, Deserialize)]
struct AccountPreferences {
    email: String,
    server_id: Option<String>,
    #[serde(default)]
    session_saved: bool,
}

impl Preferences {
    fn accounts(&self) -> BTreeMap<String, AccountPreferences> {
        let mut accounts = self.accounts.clone();
        if let Some(email) = &self.email {
            accounts.insert(
                self.device_num.clone(),
                AccountPreferences {
                    email: email.clone(),
                    server_id: self.server_id.clone(),
                    session_saved: self.session_saved,
                },
            );
        }
        accounts
    }

    fn choose(&mut self, id: &str) -> Result<(), String> {
        let accounts = self.accounts();
        let account = accounts.get(id).ok_or("Unknown saved game account.")?;
        self.device_num = id.to_owned();
        self.email = Some(account.email.clone());
        self.server_id = account.server_id.clone();
        self.session_saved = account.session_saved;
        self.accounts = accounts;
        Ok(())
    }
}

impl Default for Preferences {
    fn default() -> Self {
        use rsa::rand_core::RngCore;
        let mut bytes = [0u8; 16];
        rsa::rand_core::OsRng.fill_bytes(&mut bytes);
        Self {
            decision: None,
            device_num: bytes.iter().map(|b| format!("{b:02x}")).collect(),
            server_id: None,
            email: None,
            session_saved: false,
            accounts: BTreeMap::new(),
            profile_accounts: BTreeMap::new(),
        }
    }
}

#[derive(Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    SignedOut,
    Authenticating,
    Discovering,
    Ready,
    Connecting,
    Connected,
    Disconnecting,
}

#[derive(Clone, Serialize)]
pub struct Status {
    asked: bool,
    enabled: bool,
    phase: Phase,
    email: Option<String>,
    signed_in: bool,
    server_id: Option<String>,
    player_id: Option<i32>,
    error: Option<String>,
    account_id: String,
    accounts: Vec<AccountSummary>,
    profile_accounts: BTreeMap<String, String>,
}

#[derive(Clone, Serialize)]
struct AccountSummary {
    id: String,
    email: String,
    remembered: bool,
}

struct Catalogue {
    installation: Installation,
    servers: Vec<Server>,
    region_url: Option<String>,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Login {
    email: String,
    authorization: Authorization,
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct SavedSession {
    version: u8,
    device_num: String,
    login: Login,
}
struct Inner {
    preferences: Preferences,
    phase: Phase,
    player_id: Option<i32>,
    error: Option<String>,
    catalogue: Option<Arc<Catalogue>>,
    login: Option<Arc<Login>>,
    /// Retain usable logins when switching accounts even if secure storage is
    /// temporarily unavailable. This map is never serialized.
    logins: BTreeMap<String, Arc<Login>>,
    discovered: Option<profiles::DiscoveredProfiles>,
    generation: u64,
    cancelled: Arc<AtomicBool>,
    worker_active: bool,
    commands: Option<std::sync::mpsc::SyncSender<SessionCommand>>,
    command_busy: bool,
}

struct SessionCommand {
    profile_id: String,
    operation: SessionOperation,
    reply: std::sync::mpsc::Sender<Result<SessionResult, String>>,
}
enum SessionOperation {
    UpdateTeam {
        expected: crate::account::model::SavedTeam,
        name: String,
        role_ids: Vec<i32>,
    },
    SwitchTeam(i32),
    Unequip(mornye_game_client::echo_equip::UnequipEcho),
    Equip {
        role_id: i32,
        echoes: Vec<mornye_game_client::echo_equip::EquipEcho>,
    },
    Upgrade {
        incr_id: i32,
        target_level: i32,
        protected_ids: Vec<i32>,
        approved: Option<mornye_game_client::echo_upgrade::UpgradePlan>,
        material_policy: mornye_game_client::echo_upgrade::MaterialPolicy,
    },
    Discard(mornye_game_client::echo_upgrade::DiscardEcho),
    Mark {
        expected: mornye_game_client::echo_mark::MarkEcho,
        mark: mornye_game_client::echo_mark::EchoMark,
    },
}
impl SessionOperation {
    fn mutates(&self) -> bool {
        matches!(
            self,
            Self::Upgrade {
                approved: Some(_),
                ..
            } | Self::Discard(_)
                | Self::Mark { .. }
                | Self::Equip { .. }
                | Self::Unequip(_)
                | Self::UpdateTeam { .. }
                | Self::SwitchTeam(_)
        )
    }

    fn teams(&self) -> bool {
        matches!(self, Self::UpdateTeam { .. } | Self::SwitchTeam(_))
    }
}
enum SessionResult {
    Team(mornye_game_client::teams::TeamUpdate),
    Unequip,
    Equip(Vec<i32>),
    Upgrade(mornye_game_client::echo_upgrade::UpgradePlan),
    Discard(mornye_game_client::echo_upgrade::DiscardResult),
    Mark(i32),
}

impl Inner {
    fn enabled(&self) -> Result<(), String> {
        if self.preferences.decision == Some(true) {
            Ok(())
        } else {
            Err("Enable Dangerous Features before accessing your game account.".into())
        }
    }
    fn idle(&self) -> Result<(), String> {
        if self.worker_active
            || matches!(
                self.phase,
                Phase::Authenticating
                    | Phase::Discovering
                    | Phase::Connecting
                    | Phase::Connected
                    | Phase::Disconnecting
            )
        {
            Err("Disconnect or wait for the current operation to finish first.".into())
        } else {
            Ok(())
        }
    }
    fn status(&self) -> Status {
        Status {
            asked: self.preferences.decision.is_some(),
            enabled: self.preferences.decision == Some(true),
            phase: self.phase,
            email: self.preferences.email.clone(),
            signed_in: self.login.is_some(),
            server_id: self.preferences.server_id.clone(),
            player_id: self.player_id,
            error: self.error.clone(),
            account_id: self.preferences.device_num.clone(),
            accounts: self
                .preferences
                .accounts()
                .into_iter()
                .map(|(id, account)| {
                    let remembered = if id == self.preferences.device_num {
                        self.login.is_some()
                    } else {
                        account.session_saved || self.logins.contains_key(&id)
                    };
                    AccountSummary {
                        id,
                        email: account.email,
                        remembered,
                    }
                })
                .collect(),
            profile_accounts: self.preferences.profile_accounts.clone(),
        }
    }
    fn cancel(&mut self, sign_out: bool) {
        self.cancelled.store(true, Ordering::Relaxed);
        self.generation += 1;
        self.player_id = None;
        self.error = None;
        self.commands = None;
        self.discovered = None;
        if sign_out {
            self.login = None;
        }
        self.phase = if self.worker_active {
            Phase::Disconnecting
        } else if self.login.is_some() {
            Phase::Ready
        } else {
            Phase::SignedOut
        };
    }
}

struct Service {
    inner: Mutex<Inner>,
    path: PathBuf,
    vault: Arc<dyn SessionVault>,
}
#[derive(Clone)]
pub struct DangerousState {
    service: Arc<Service>,
}

impl DangerousState {
    pub fn new(data_dir: PathBuf) -> Self {
        Self::with_vault(data_dir, Arc::new(OsSessionVault))
    }

    fn with_vault(data_dir: PathBuf, vault: Arc<dyn SessionVault>) -> Self {
        let path = data_dir.join("dangerous-features.json");
        let preferences = fs::read(&path)
            .ok()
            .and_then(|b| serde_json::from_slice::<Preferences>(&b).ok())
            .filter(|p| {
                p.device_num.len() == 32
                    && p.device_num.bytes().all(|b| b.is_ascii_hexdigit())
                    && p.accounts.iter().all(|(id, account)| {
                        id.len() == 32
                            && id.bytes().all(|b| b.is_ascii_hexdigit())
                            && account.email.contains('@')
                    })
            })
            .unwrap_or_default();
        // Restoring local authorization performs no HTTP or game connection.
        // Installation metadata and a fresh game token are obtained on Connect.
        let mut error = None;
        let login = if preferences.decision == Some(true) && preferences.session_saved {
            match Self::restore(&preferences, vault.as_ref()) {
                Ok(login) => login.map(Arc::new),
                Err(message) => {
                    error = Some(message);
                    None
                }
            }
        } else {
            None
        };
        let phase = if login.is_some() {
            Phase::Ready
        } else {
            Phase::SignedOut
        };
        Self {
            service: Arc::new(Service {
                path,
                vault,
                inner: Mutex::new(Inner {
                    preferences,
                    phase,
                    player_id: None,
                    error,
                    catalogue: None,
                    login,
                    logins: BTreeMap::new(),
                    discovered: None,
                    generation: 0,
                    cancelled: Arc::new(AtomicBool::new(false)),
                    worker_active: false,
                    commands: None,
                    command_busy: false,
                }),
            }),
        }
    }

    fn restore(
        preferences: &Preferences,
        vault: &dyn SessionVault,
    ) -> Result<Option<Login>, String> {
        let Some(bytes) = vault.load(&preferences.device_num)? else {
            return Ok(None);
        };
        let bytes = Zeroizing::new(bytes);
        let session: SavedSession = serde_json::from_slice(&bytes)
            .map_err(|_| "Could not restore saved sign-in. Sign in again.".to_string())?;
        if session.version != 1
            || session.device_num != preferences.device_num
            || preferences.email.as_deref() != Some(session.login.email.as_str())
            || !session.login.email.contains('@')
            || !session.login.authorization.is_valid()
        {
            return Err("The saved sign-in does not match this app profile. Sign in again.".into());
        }
        Ok(Some(session.login))
    }

    fn select_account(&self, inner: &mut Inner, id: &str) -> Result<(), String> {
        inner.enabled()?;
        inner.idle()?;
        if inner.preferences.device_num == id && inner.login.is_some() {
            return Ok(());
        }
        let mut preferences = inner.preferences.clone();
        preferences.choose(id)?;
        let mut error = None;
        let login = if let Some(login) = inner.logins.get(id) {
            Some(login.clone())
        } else if preferences.session_saved {
            match Self::restore(&preferences, self.service.vault.as_ref()) {
                Ok(login) => login.map(Arc::new),
                Err(message) => {
                    error = Some(message);
                    None
                }
            }
        } else {
            None
        };
        self.save(&preferences)?;
        if let Some(login) = &inner.login {
            inner
                .logins
                .insert(inner.preferences.device_num.clone(), login.clone());
        }
        inner.cancel(false);
        inner.preferences = preferences;
        inner.login = login;
        inner.phase = if inner.login.is_some() {
            Phase::Ready
        } else {
            Phase::SignedOut
        };
        inner.error = error;
        Ok(())
    }

    fn begin_login(&self, email: &str) -> Result<(u64, String), String> {
        if !email.contains('@') {
            return Err("Enter your Kuro account email.".into());
        }
        let mut inner = self.service.inner.lock();
        inner.enabled()?;
        inner.idle()?;
        let mut preferences = inner.preferences.clone();
        preferences.accounts = preferences.accounts();
        let existing = preferences
            .accounts
            .iter()
            .find(|(_, account)| account.email.eq_ignore_ascii_case(email))
            .map(|(id, _)| id.clone());
        if let Some(id) = existing {
            preferences.choose(&id)?;
        } else if preferences.email.is_some() {
            preferences.device_num = Preferences::default().device_num;
            preferences.email = Some(email.to_owned());
            preferences.session_saved = false;
        }
        if let Some(login) = inner.login.clone() {
            let id = inner.preferences.device_num.clone();
            inner.logins.insert(id, login);
        }
        inner.logins.remove(&preferences.device_num);
        inner.cancel(true);
        inner.preferences = preferences;
        inner.phase = Phase::Authenticating;
        Ok((inner.generation, inner.preferences.device_num.clone()))
    }

    /// Resolve only the account/server for a new connection. Packet ingestion
    /// continues to use the immutable identity authenticated by the socket.
    fn prepare_profile(
        &self,
        inner: &mut Inner,
        profile: Option<&crate::account::model::ProfileIdentity>,
    ) -> Result<bool, String> {
        let Some(profile) = profile else {
            return Ok(false);
        };
        let Some(id) = inner.preferences.profile_accounts.get(&profile.id).cloned() else {
            return Ok(false);
        };
        self.select_account(inner, &id)?;
        if profile.player_id <= 0 || profile.provisional {
            return Err(
                "Identify this player profile's official server before connecting it.".into(),
            );
        }
        inner.preferences.server_id = Some(profile.server_id.clone());
        self.save(&inner.preferences)?;
        Ok(true)
    }

    fn link_profile(
        &self,
        inner: &mut Inner,
        profile_id: &str,
        account_id: Option<&str>,
    ) -> Result<(), String> {
        inner.enabled()?;
        inner.idle()?;
        let mut preferences = inner.preferences.clone();
        if let Some(id) = account_id {
            if !preferences.accounts().contains_key(id) {
                return Err("Unknown saved game account.".into());
            }
            preferences
                .profile_accounts
                .insert(profile_id.to_owned(), id.to_owned());
        } else {
            preferences.profile_accounts.remove(profile_id);
        }
        self.save(&preferences)?;
        inner.preferences = preferences;
        inner.error = None;
        Ok(())
    }

    /// Called under the service lock, serializing credential-store access with
    /// sign-out/disable. No stale authentication task may write credentials.
    fn remember(&self, inner: &mut Inner, login: &Login) -> Result<(), String> {
        inner.preferences.email = Some(login.email.clone());
        inner.preferences.session_saved = false;
        self.save(&inner.preferences)?;
        let bytes = Zeroizing::new(
            serde_json::to_vec(&SavedSession {
                version: 1,
                device_num: inner.preferences.device_num.clone(),
                login: login.clone(),
            })
            .map_err(|_| "Could not encode saved sign-in.".to_string())?,
        );
        self.service
            .vault
            .save(&inner.preferences.device_num, &bytes)?;
        inner.preferences.session_saved = true;
        if let Err(error) = self.save(&inner.preferences) {
            inner.preferences.session_saved = false;
            let _ = self.service.vault.delete(&inner.preferences.device_num);
            return Err(error);
        }
        Ok(())
    }

    /// Both operations are attempted. If secure deletion fails, the persisted
    /// false marker still prevents restoring the old token on the next launch.
    fn forget(&self, inner: &mut Inner) -> Result<(), String> {
        inner.logins.remove(&inner.preferences.device_num);
        let had_session = inner.preferences.session_saved || inner.preferences.email.is_some();
        inner.preferences.session_saved = false;
        let saved = self.save(&inner.preferences);
        let deleted = if had_session {
            self.service.vault.delete(&inner.preferences.device_num)
        } else {
            Ok(())
        };
        saved.and(deleted)
    }

    fn finish_login(&self, generation: u64, result: Result<Login, String>) -> Status {
        let mut inner = self.service.inner.lock();
        if generation != inner.generation {
            return inner.status();
        }
        match result {
            Ok(login) => {
                inner.error = self.remember(&mut inner, &login).err().map(|_| {
                    "Signed in for this run, but the session could not be saved securely. Your next restart may require signing in again.".into()
                });
                inner.login = Some(Arc::new(login));
                inner.phase = Phase::Ready;
            }
            Err(error) => {
                inner.phase = Phase::SignedOut;
                inner.error = Some(error);
            }
        }
        inner.status()
    }

    fn sign_out(&self) -> Status {
        let mut inner = self.service.inner.lock();
        inner.cancel(true);
        inner.error = self.forget(&mut inner).err().map(|_| {
            "Signed out, but the saved session could not be completely removed. Check access to the app data directory and OS credential store.".into()
        });
        inner.status()
    }

    fn finish_connection(&self, generation: u64, result: Result<(), String>, expired: bool) {
        let mut inner = self.service.inner.lock();
        inner.worker_active = false;
        inner.commands = None;
        inner.command_busy = false;
        inner.player_id = None;
        if inner.generation == generation {
            if expired {
                inner.login = None;
                let forgotten = self.forget(&mut inner);
                inner.error = Some(if forgotten.is_ok() {
                    "Your saved session expired or was rejected. Sign in again; your email has been kept.".into()
                } else {
                    "Your saved session was rejected. Sign in again. The old saved session could not be completely removed.".into()
                });
            } else {
                inner.error = result.err();
            }
        }
        inner.phase = if inner.login.is_some() {
            Phase::Ready
        } else {
            Phase::SignedOut
        };
    }

    fn save(&self, preferences: &Preferences) -> Result<(), String> {
        let mut preferences = preferences.clone();
        preferences.accounts = preferences.accounts();
        let temporary = self.service.path.with_extension("json.tmp");
        let bytes = serde_json::to_vec(&preferences)
            .map_err(|_| "Could not save Dangerous Features preferences.")?;
        fs::write(&temporary, bytes)
            .and_then(|_| fs::rename(&temporary, &self.service.path))
            .map_err(|_| {
                "Could not save Dangerous Features preferences. Check the app data directory."
                    .into()
            })
    }

    pub fn shutdown(&self) {
        let mut inner = self.service.inner.lock();
        inner.cancel(true);
        inner.logins.clear();
    }

    fn catalogue(&self) -> Result<Arc<Catalogue>, String> {
        let generation = {
            let inner = self.service.inner.lock();
            inner.enabled()?;
            if let Some(catalogue) = &inner.catalogue {
                return Ok(catalogue.clone());
            }
            inner.generation
        };
        let installation = Installation::read(&Options::default()).map_err(|e| format!("{e:#}"))?;
        let (servers, region_url) = installation
            .catalogue(Duration::from_secs(20))
            .map_err(|e| format!("{e:#}"))?;
        let catalogue = Arc::new(Catalogue {
            installation,
            servers,
            region_url,
        });
        let mut inner = self.service.inner.lock();
        inner.enabled()?;
        if inner.generation != generation {
            return Err("Operation cancelled.".into());
        }
        inner.catalogue = Some(catalogue.clone());
        Ok(catalogue)
    }

    fn decide(&self, enabled: bool) -> Result<Status, String> {
        let mut inner = self.service.inner.lock();
        let mut preferences = inner.preferences.clone();
        preferences.decision = Some(enabled);
        if !enabled {
            inner.cancel(true);
            inner.preferences = preferences;
            inner.preferences.accounts = inner.preferences.accounts();
            let ids: Vec<_> = inner.preferences.accounts.keys().cloned().collect();
            for account in inner.preferences.accounts.values_mut() {
                account.session_saved = false;
            }
            inner.preferences.session_saved = false;
            inner.logins.clear();
            let mut failed = self.save(&inner.preferences).is_err();
            for id in ids {
                failed |= self.service.vault.delete(&id).is_err();
            }
            inner.error = failed.then(|| "Dangerous Features are disabled, but saved sessions could not be completely removed.".into());
            return Ok(inner.status());
        }
        self.save(&preferences)?;
        inner.preferences = preferences;
        Ok(inner.status())
    }
}

fn main_window(window: &WebviewWindow) -> Result<(), String> {
    if window.label() == "settings" {
        Ok(())
    } else {
        Err("Account controls are available only in the main window.".into())
    }
}

fn validate_connected_profile(
    profile: Option<&crate::account::model::ProfileIdentity>,
    player_id: i32,
    _server_id: &str,
) -> Result<(), String> {
    if profile.is_some_and(|p| p.player_id != i64::from(player_id)) {
        Err("This game account does not match the selected player profile. Update its linked account in Settings.".into())
    } else {
        Ok(())
    }
}

#[tauri::command]
pub fn dangerous_status(
    window: WebviewWindow,
    state: State<DangerousState>,
) -> Result<Status, String> {
    main_window(&window)?;
    Ok(state.service.inner.lock().status())
}

#[tauri::command]
pub async fn dangerous_set_enabled(
    window: WebviewWindow,
    state: State<'_, DangerousState>,
    enabled: bool,
) -> Result<Status, String> {
    main_window(&window)?;
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || state.decide(enabled))
        .await
        .map_err(|_| "Could not update account preferences.".to_string())?
}

#[tauri::command]
pub async fn dangerous_servers(
    window: WebviewWindow,
    state: State<'_, DangerousState>,
) -> Result<Vec<Server>, String> {
    main_window(&window)?;
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || state.catalogue().map(|c| c.servers.clone()))
        .await
        .map_err(|_| "Server discovery task failed.".to_string())?
}

#[tauri::command]
pub fn dangerous_select_server(
    window: WebviewWindow,
    state: State<DangerousState>,
    server_id: String,
) -> Result<Status, String> {
    main_window(&window)?;
    let mut inner = state.service.inner.lock();
    inner.enabled()?;
    inner.idle()?;
    if !inner
        .catalogue
        .as_ref()
        .is_some_and(|c| c.servers.iter().any(|s| s.id == server_id))
    {
        return Err("Choose a server from the official catalogue.".into());
    }
    let mut preferences = inner.preferences.clone();
    preferences.server_id = Some(server_id);
    state.save(&preferences)?;
    inner.preferences = preferences;
    inner.error = None;
    Ok(inner.status())
}

#[tauri::command]
pub async fn dangerous_select_account(
    window: WebviewWindow,
    state: State<'_, DangerousState>,
    account_id: String,
) -> Result<Status, String> {
    main_window(&window)?;
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut inner = state.service.inner.lock();
        state.select_account(&mut inner, &account_id)?;
        Ok(inner.status())
    })
    .await
    .map_err(|_| "Could not select the saved game account.".to_string())?
}

#[tauri::command]
pub fn dangerous_link_profile(
    window: WebviewWindow,
    state: State<DangerousState>,
    account: State<AccountState>,
    profile_id: String,
    account_id: Option<String>,
) -> Result<Status, String> {
    main_window(&window)?;
    // Match the service -> profiles lock order used by the connection worker.
    let mut inner = state.service.inner.lock();
    let profiles = account
        .store
        .lock()
        .map_err(|_| "Account store is unavailable.")?;
    let profile = profiles
        .snapshot()
        .profile
        .as_ref()
        .filter(|p| p.id == profile_id)
        .ok_or("Select the intended player profile before linking an account.")?;
    if account_id.is_some() && (profile.player_id <= 0 || profile.provisional) {
        return Err(
            "Connect once to identify this profile's official player and server first.".into(),
        );
    }
    state.link_profile(&mut inner, &profile_id, account_id.as_deref())?;
    Ok(inner.status())
}

/// Rebuild public client/version information from the current installation.
/// No password or installation snapshot is retained in a remembered session.
fn login_context(
    app: &AppHandle,
    catalogue: &Catalogue,
    email: &str,
    password: &str,
    device: &str,
) -> Result<(Config, EmailLogin), String> {
    let mut config: Config = serde_json::from_value(serde_json::json!({
        "email_login": {"email": email, "password": password, "device_num": device}
    }))
    .map_err(|_| "Invalid account login inputs.".to_string())?;
    catalogue
        .installation
        .apply(&mut config)
        .map_err(|e| format!("{e:#}"))?;
    config.private_key_file =
        crate::config::resource_candidates(app, ["data/client_private_key.pem"])
            .into_iter()
            .find(|p| p.is_file());
    let email = config
        .email_login
        .take()
        .ok_or("Missing account login inputs.")?;
    Ok((config, email))
}

#[tauri::command]
pub async fn dangerous_login(
    window: WebviewWindow,
    app: AppHandle,
    state: State<'_, DangerousState>,
    email: String,
    password: String,
) -> Result<Status, String> {
    main_window(&window)?;
    let state = state.inner().clone();
    let email = email.trim().to_owned();
    let (generation, device) = state.begin_login(&email)?;
    let service = state.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let login = (|| -> Result<Login, String> {
            let catalogue = service.catalogue()?;
            let (config, email) = login_context(&app, &catalogue, &email, &password, &device)?;
            let authorization =
                auth::authenticate(&email, config.timeout()).map_err(|e| format!("{e:#}"))?;
            Ok(Login {
                email: email.email.clone(),
                authorization,
            })
        })();
        service.finish_login(generation, login)
    })
    .await;
    Ok(result.unwrap_or_else(|_| {
        state.finish_login(generation, Err("Account login task failed.".into()))
    }))
}

#[tauri::command]
pub fn dangerous_connect(
    window: WebviewWindow,
    app: AppHandle,
    state: State<DangerousState>,
) -> Result<Status, String> {
    main_window(&window)?;
    let (generation, cancelled, login, server_id, device, expected_profile) = {
        let mut inner = state.service.inner.lock();
        inner.enabled()?;
        inner.idle()?;
        let account = app.state::<AccountState>();
        let profiles = account
            .store
            .lock()
            .map_err(|_| "Account store is unavailable.")?;
        let profile = profiles.snapshot().profile.clone();
        let linked = state.prepare_profile(&mut inner, profile.as_ref())?;
        if !linked {
            return Err("Add a player profile in Settings before connecting.".into());
        }
        let expected_profile = if linked { profile } else { None };
        let login = inner
            .login
            .clone()
            .ok_or("Log in to your game account first.")?;
        let server_id = inner
            .preferences
            .server_id
            .clone()
            .ok_or("Select a server before connecting.")?;
        let device = inner.preferences.device_num.clone();
        inner.generation += 1;
        inner.cancelled = Arc::new(AtomicBool::new(false));
        inner.worker_active = true;
        inner.phase = Phase::Connecting;
        inner.error = None;
        (
            inner.generation,
            inner.cancelled.clone(),
            login,
            server_id,
            device,
            expected_profile,
        )
    };
    let service = state.inner().clone();
    let worker = std::thread::Builder::new()
        .name("active-game-session".into())
        .spawn(move || {
            let mut expired = false;
            let result = (|| -> Result<(), String> {
                if cancelled.load(Ordering::Relaxed) {
                    return Ok(());
                }
                let catalogue = service.catalogue()?;
                let server = catalogue.servers.iter().find(|s| s.id == server_id)
                    .ok_or("The saved server is no longer in the official catalogue. Choose a server in Settings.")?;
                let (config, mut email) = login_context(&app, &catalogue, &login.email, "", &device)?;
                email.game_login.url = server
                    .login_urls
                    .first()
                    .ok_or("Server has no login endpoint.")?
                    .clone();
                let prepared =
                    auth::prepare_authorized(&config, &email, &login.authorization)
                        .map_err(|e| { expired = auth::requires_login(&e); format!("{e:#}") })?;
                let schema = Schema::load().map_err(|_| "Could not load the game protocol.")?;
                let mut session = session::connect_recording(
                    &prepared,
                    &schema,
                    cancelled.clone(),
                    &AccountCapture::message_ids(),
                )
                .map_err(|e| format!("{e:#}"))?;
                validate_connected_profile(expected_profile.as_ref(), session.player_id(), &server.id)?;
                let tables = crate::sniffer::extract::ExtractTables::load(&app);
                let profile_id = {
                    let mut inner = service.service.inner.lock();
                    if inner.generation != generation || cancelled.load(Ordering::Relaxed) {
                        return Ok(());
                    }
                    let account = app.state::<AccountState>();
                    let mut profiles = account
                        .store
                        .lock()
                        .map_err(|_| "Account store is unavailable.")?;
                    let key = profiles.ensure(
                        i64::from(session.player_id()),
                        &server.id,
                        &server.region,
                    )?;
                    profiles.select(&key)?;
                    // Only a successfully authenticated identity may establish
                    // an automatic profile/account association.
                    let mut preferences = inner.preferences.clone();
                    preferences.profile_accounts.insert(key.clone(), device.clone());
                    service.save(&preferences)?;
                    inner.preferences = preferences;
                    key
                };
                crate::account::emit_updated(&app, &["profile"]);
                let mut capture = AccountCapture::default();
                // Older servers may only send LoginNotify. Seed the shared state
                // machines with the player identity already verified by Session.
                let initial = session.drain_packets();
                if !initial.iter().any(|p| p.message_id == mornye_game_client::message_id::BasicInfoNotify) {
                    use spectrum::prost::Message;
                    let packet = session::ReceivedPacket {
                        message_id: mornye_game_client::message_id::BasicInfoNotify,
                        kind: 4,
                        rpc_id: None,
                        payload: spectrum::game::proto::BasicInfoNotify {
                            id: session.player_id(),
                            ..Default::default()
                        }
                        .encode_to_vec(),
                    };
                    sync_packets(
                        &app,
                        &profile_id,
                        &mut capture,
                        &tables,
                        vec![packet],
                        &cancelled,
                    )?;
                }
                sync_packets(
                    &app,
                    &profile_id,
                    &mut capture,
                    &tables,
                    initial,
                    &cancelled,
                )?;
                // A single unsupported request must not discard the snapshots
                // that already arrived; apply them before reporting the error.
                let synchronized = session.synchronize();
                sync_packets(
                    &app,
                    &profile_id,
                    &mut capture,
                    &tables,
                    session.drain_packets(),
                    &cancelled,
                )?;
                synchronized.map_err(|e| format!("{e:#}"))?;
                let (sender, receiver) = std::sync::mpsc::sync_channel::<SessionCommand>(1);
                {
                    let mut inner = service.service.inner.lock();
                    if inner.generation != generation || cancelled.load(Ordering::Relaxed) {
                        return Ok(());
                    }
                    inner.phase = Phase::Connected;
                    inner.player_id = Some(session.player_id());
                    inner.commands = Some(sender);
                }
                let mut last_flush = std::time::Instant::now();
                while !cancelled.load(Ordering::Relaxed) {
                    if let Ok(command) = receiver.try_recv() {
                        let mutates = command.operation.mutates();
                        let operation = (|| -> Result<_, String> {
                            {
                                let account = app.state::<AccountState>();
                                let profiles = account.store.lock().map_err(|_| "Account store is unavailable.")?;
                                if command.profile_id != profile_id || !profiles.is_selected(&profile_id) {
                                    return Err("Select the connected account profile before changing account data.".into());
                                }
                            }
                            if command.operation.teams() {
                                session.synchronize_teams().map_err(|e| format!("{e:#}"))?;
                                sync_packets(&app, &profile_id, &mut capture, &tables,
                                    session.drain_packets(), &cancelled)?;
                            }
                            match &command.operation {
                                SessionOperation::UpdateTeam { expected, name, role_ids } => {
                                    let update = {
                                        let account = app.state::<AccountState>();
                                        let mut profiles = account.store.lock().map_err(|_| "Account store is unavailable.")?;
                                        if !profiles.is_selected(&profile_id) {
                                            return Err("Select the connected account profile before changing teams.".into());
                                        }
                                        let store = profiles.get_mut(&profile_id).ok_or("The connected account profile is unavailable.")?;
                                        validate_team_edit(store.snapshot(), expected, name, role_ids)?
                                    };
                                    session.update_team(&update).map(|()| SessionResult::Team(update)).map_err(|e| format!("{e:#}"))
                                }
                                SessionOperation::SwitchTeam(id) => {
                                    let update = {
                                        let account = app.state::<AccountState>();
                                        let mut profiles = account.store.lock().map_err(|_| "Account store is unavailable.")?;
                                        if !profiles.is_selected(&profile_id) {
                                            return Err("Select the connected account profile before changing teams.".into());
                                        }
                                        let store = profiles.get_mut(&profile_id).ok_or("The connected account profile is unavailable.")?;
                                        validate_team_switch(store.snapshot(), *id)?
                                    };
                                    session.switch_team(&update).map(|()| SessionResult::Team(update)).map_err(|e| format!("{e:#}"))
                                }
                                SessionOperation::Unequip(expected) => {
                                    {
                                        let account = app.state::<AccountState>();
                                        let profiles = account.store.lock().map_err(|_| "Account store is unavailable.")?;
                                        let snapshot = profiles.snapshot();
                                        if !snapshot.resonators.iter().any(|role| role.id == i64::from(expected.role_id))
                                            || !snapshot.echoes.iter().any(|echo|
                                                echo.incr_id == i64::from(expected.incr_id)
                                                && echo.item_id == i64::from(expected.item_id)
                                                && echo.equipped_by == Some(i64::from(expected.role_id))
                                                && echo.slot.map(i32::from) == Some(expected.slot)
                                                && echo.source == crate::account::model::EchoSource::Sniffer) {
                                            return Err("Choose an equipped captured echo from the connected profile.".into());
                                        }
                                    }
                                    session.unequip_echo(expected).map(|()| SessionResult::Unequip).map_err(|e| format!("{e:#}"))
                                }
                                SessionOperation::Equip { role_id, echoes } => {
                                    {
                                        let account = app.state::<AccountState>();
                                        let profiles = account.store.lock().map_err(|_| "Account store is unavailable.")?;
                                        let snapshot = profiles.snapshot();
                                        if !snapshot.resonators.iter().any(|role| role.id == i64::from(*role_id))
                                            || echoes.iter().any(|expected| !snapshot.echoes.iter().any(|echo|
                                                echo.incr_id == i64::from(expected.incr_id)
                                                && echo.item_id == i64::from(expected.item_id)
                                                && echo.source == crate::account::model::EchoSource::Sniffer)) {
                                            return Err("Choose an owned resonator and captured echoes from the connected profile.".into());
                                        }
                                    }
                                    session.equip_echoes(*role_id, echoes).map(SessionResult::Equip).map_err(|e| format!("{e:#}"))
                                }
                                SessionOperation::Upgrade { incr_id, target_level, protected_ids, approved, material_policy } => {
                                    if let Some(approved) = approved {
                                        if approved.incr_id != *incr_id || approved.target_level != *target_level {
                                            return Err("Upgrade preview does not match the selected echo and target.".into());
                                        }
                                        session.upgrade_echo_with_policy(approved, protected_ids, material_policy)
                                    } else {
                                        session.plan_echo_upgrade_with_policy(*incr_id, *target_level, protected_ids, material_policy)
                                    }.map(SessionResult::Upgrade).map_err(|e| format!("{e:#}"))
                                }
                                SessionOperation::Discard(expected) => session.discard_echo(expected)
                                    .map(SessionResult::Discard).map_err(|e| format!("{e:#}")),
                                SessionOperation::Mark { expected, mark } => session.mark_echo(expected, *mark)
                                    .map(SessionResult::Mark).map_err(|e| format!("{e:#}")),
                            }
                        })();
                        // Even rejected or interrupted operations may have received
                        // inventory updates. Persist them through the shared path.
                        let mut flushed = sync_packets(&app, &profile_id, &mut capture, &tables,
                            session.drain_packets(), &cancelled);
                        if mutates {
                            let refreshed = if command.operation.teams() {
                                session.synchronize_teams()
                            } else {
                                session.synchronize_echo_inventory()
                            }.map_err(|e| format!("{e:#}"));
                            let saved = sync_packets(&app, &profile_id, &mut capture, &tables,
                                session.drain_packets(), &cancelled);
                            flushed = flushed.and(refreshed).and(saved);
                        }
                        let operation = operation.and_then(|result| {
                            if flushed.is_ok() {
                                if let SessionResult::Team(team) = &result {
                                    // Confirm after the server's ordered notifications and refresh
                                    // have been applied through the shared converter.
                                    let account = app.state::<AccountState>();
                                    let mut profiles = account.store.lock().map_err(|_| "Account store is unavailable.")?;
                                    let store = profiles.get_mut(&profile_id).ok_or("The connected account profile is unavailable.")?;
                                    if matches!(&command.operation, SessionOperation::SwitchTeam(_)) {
                                        confirm_team_switch(&store.snapshot(), team)?;
                                    } else {
                                        // CurRole/IsCurrent are server-managed context, not editor inputs.
                                        confirm_team_edit(&store.snapshot(), team.id, &team.name, &team.role_ids)?;
                                    }
                                }
                            }
                            Ok(result)
                        });
                        let failed = operation.is_err() && mutates;
                        let connection_error = flushed.clone().err();
                        service.service.inner.lock().command_busy = false;
                        let _ = command.reply.send(flushed.and(operation));
                        // A lost mutation response must never be retried on this
                        // connection. Reconciliation above is read-only.
                        if let Some(error) = connection_error { return Err(error); }
                        if failed { return Err("Account operation stopped. Check the refreshed data before reconnecting.".into()); }
                    }
                    session.keep_alive().map_err(|e| format!("{e:#}"))?;
                    if last_flush.elapsed() >= Duration::from_millis(250) {
                        sync_packets(
                            &app,
                            &profile_id,
                            &mut capture,
                            &tables,
                            session.drain_packets(),
                            &cancelled,
                        )?;
                        last_flush = std::time::Instant::now();
                    }
                }
                Ok(())
            })();
            service.finish_connection(generation, result, expired);
        });
    if worker.is_err() {
        let mut inner = state.service.inner.lock();
        inner.worker_active = false;
        inner.phase = Phase::Ready;
        inner.error = Some("Could not start the game connection worker.".into());
    }
    Ok(state.service.inner.lock().status())
}

/// A single worker owns the socket. IPC only queues a typed, bounded operation;
/// the webview cannot submit arbitrary game requests or choose an ingestion target.
#[tauri::command]
pub async fn dangerous_echo_upgrade(
    window: WebviewWindow,
    state: State<'_, DangerousState>,
    profile_id: String,
    incr_id: i32,
    target_level: i32,
    protected_ids: Vec<i32>,
    approved: Option<mornye_game_client::echo_upgrade::UpgradePlan>,
    material_policy: mornye_game_client::echo_upgrade::MaterialPolicy,
) -> Result<mornye_game_client::echo_upgrade::UpgradePlan, String> {
    main_window(&window)?;
    if protected_ids.len() > 10000 || !protected_ids.contains(&incr_id) {
        return Err("The selected echo must be protected from use as upgrade material.".into());
    }
    material_policy.validate().map_err(|e| e.to_string())?;
    match queue_operation(
        state.inner(),
        profile_id,
        SessionOperation::Upgrade {
            incr_id,
            target_level,
            protected_ids,
            approved,
            material_policy,
        },
    )
    .await?
    {
        SessionResult::Upgrade(plan) => Ok(plan),
        _ => Err("Unexpected echo operation result.".into()),
    }
}

#[tauri::command]
pub async fn dangerous_echo_discard(
    window: WebviewWindow,
    state: State<'_, DangerousState>,
    profile_id: String,
    expected: mornye_game_client::echo_upgrade::DiscardEcho,
) -> Result<mornye_game_client::echo_upgrade::DiscardResult, String> {
    main_window(&window)?;
    match queue_operation(
        state.inner(),
        profile_id,
        SessionOperation::Discard(expected),
    )
    .await?
    {
        SessionResult::Discard(result) => Ok(result),
        _ => Err("Unexpected echo operation result.".into()),
    }
}

#[tauri::command]
pub async fn dangerous_echo_mark(
    window: WebviewWindow,
    state: State<'_, DangerousState>,
    profile_id: String,
    expected: mornye_game_client::echo_mark::MarkEcho,
    mark: mornye_game_client::echo_mark::EchoMark,
) -> Result<i32, String> {
    main_window(&window)?;
    match queue_operation(
        state.inner(),
        profile_id,
        SessionOperation::Mark { expected, mark },
    )
    .await?
    {
        SessionResult::Mark(value) => Ok(value),
        _ => Err("Unexpected echo operation result.".into()),
    }
}

#[tauri::command]
pub async fn dangerous_echo_equip(
    window: WebviewWindow,
    state: State<'_, DangerousState>,
    profile_id: String,
    role_id: i32,
    echoes: Vec<mornye_game_client::echo_equip::EquipEcho>,
) -> Result<Vec<i32>, String> {
    main_window(&window)?;
    mornye_game_client::echo_equip::validate(role_id, &echoes)
        .map_err(|error| error.to_string())?;
    match queue_operation(
        state.inner(),
        profile_id,
        SessionOperation::Equip { role_id, echoes },
    )
    .await?
    {
        SessionResult::Equip(ids) => Ok(ids),
        _ => Err("Unexpected echo operation result.".into()),
    }
}

#[tauri::command]
pub async fn dangerous_echo_unequip(
    window: WebviewWindow,
    state: State<'_, DangerousState>,
    profile_id: String,
    expected: mornye_game_client::echo_equip::UnequipEcho,
) -> Result<(), String> {
    main_window(&window)?;
    expected.validate().map_err(|error| error.to_string())?;
    match queue_operation(
        state.inner(),
        profile_id,
        SessionOperation::Unequip(expected),
    )
    .await?
    {
        SessionResult::Unequip => Ok(()),
        _ => Err("Unexpected echo operation result.".into()),
    }
}

fn validate_team_edit(
    snapshot: &crate::account::model::AccountSnapshot,
    expected: &crate::account::model::SavedTeam,
    name: &str,
    role_ids: &[i32],
) -> Result<mornye_game_client::teams::TeamUpdate, String> {
    let current = snapshot
        .teams
        .iter()
        .find(|team| team.id == expected.id)
        .ok_or("Choose a synced team from the connected profile.")?;
    if current != expected {
        return Err("This team changed. Reopen the editor to use its latest composition.".into());
    }
    if role_ids.iter().any(|id| {
        !snapshot
            .resonators
            .iter()
            .any(|role| role.id == i64::from(*id))
    }) {
        return Err("Choose owned Resonators from the connected profile.".into());
    }
    let update = mornye_game_client::teams::TeamUpdate {
        id: current.id,
        name: name.to_owned(),
        role_ids: role_ids.to_vec(),
        current_role: if role_ids.contains(&current.current_role) {
            current.current_role
        } else {
            role_ids.first().copied().unwrap_or_default()
        },
        is_current: current.is_current,
    };
    update.validate().map_err(|e| format!("{e:#}"))?;
    Ok(update)
}

fn confirm_team_edit(
    snapshot: &crate::account::model::AccountSnapshot,
    id: i32,
    name: &str,
    role_ids: &[i32],
) -> Result<(), String> {
    if snapshot.teams.iter().any(|team| {
        team.id == id
            && team.name == name
            && team
                .role_ids
                .iter()
                .copied()
                .eq(role_ids.iter().copied().map(i64::from))
    }) {
        Ok(())
    } else {
        Err("The server did not confirm the edited team; check the refreshed teams".into())
    }
}

fn validate_team_switch(
    snapshot: &crate::account::model::AccountSnapshot,
    id: i32,
) -> Result<mornye_game_client::teams::TeamUpdate, String> {
    let team = snapshot
        .teams
        .iter()
        .find(|team| team.id == id)
        .ok_or("Choose a synced team from the connected profile.")?;
    let role_ids = team
        .role_ids
        .iter()
        .map(|id| i32::try_from(*id))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "The synced team has an invalid Resonator ID. Refresh the teams.")?;
    let mut update = validate_team_edit(snapshot, team, &team.name, &role_ids)?;
    // Like the game client, keep the active slot when selecting another team,
    // falling back to its first member if that slot is unavailable.
    let position = snapshot
        .teams
        .iter()
        .find(|team| team.is_current)
        .and_then(|team| {
            team.role_ids
                .iter()
                .position(|id| *id == i64::from(team.current_role))
        });
    update.current_role = position
        .and_then(|position| role_ids.get(position).copied())
        .unwrap_or(role_ids[0]);
    update.is_current = true;
    Ok(update)
}

fn confirm_team_switch(
    snapshot: &crate::account::model::AccountSnapshot,
    expected: &mornye_game_client::teams::TeamUpdate,
) -> Result<(), String> {
    if snapshot.teams.iter().any(|team| {
        team.id == expected.id
            && team.is_current
            && team
                .role_ids
                .iter()
                .copied()
                .eq(expected.role_ids.iter().copied().map(i64::from))
    }) {
        Ok(())
    } else {
        Err("The server did not confirm the active team; check the refreshed teams".into())
    }
}

#[tauri::command]
pub async fn dangerous_team_update(
    window: WebviewWindow,
    state: State<'_, DangerousState>,
    profile_id: String,
    expected: crate::account::model::SavedTeam,
    name: String,
    role_ids: Vec<i32>,
) -> Result<(), String> {
    main_window(&window)?;
    match queue_operation(
        state.inner(),
        profile_id,
        SessionOperation::UpdateTeam {
            expected,
            name,
            role_ids,
        },
    )
    .await?
    {
        SessionResult::Team(_) => Ok(()),
        _ => Err("Unexpected team operation result.".into()),
    }
}

#[tauri::command]
pub async fn dangerous_team_switch(
    window: WebviewWindow,
    state: State<'_, DangerousState>,
    profile_id: String,
    team_id: i32,
) -> Result<(), String> {
    main_window(&window)?;
    match queue_operation(
        state.inner(),
        profile_id,
        SessionOperation::SwitchTeam(team_id),
    )
    .await?
    {
        SessionResult::Team(_) => Ok(()),
        _ => Err("Unexpected team operation result.".into()),
    }
}

async fn queue_operation(
    state: &DangerousState,
    profile_id: String,
    operation: SessionOperation,
) -> Result<SessionResult, String> {
    let receiver = {
        let mut inner = state.service.inner.lock();
        inner.enabled()?;
        if inner.phase != Phase::Connected {
            return Err("Connect to the game before changing account data.".into());
        }
        if inner.command_busy {
            return Err("An account operation is already running. Wait for it to finish.".into());
        }
        let sender = inner
            .commands
            .as_ref()
            .ok_or("The active connection is unavailable.")?;
        let (reply, receiver) = std::sync::mpsc::channel();
        sender
            .try_send(SessionCommand {
                profile_id,
                operation,
                reply,
            })
            .map_err(|_| "The active connection is busy or has closed.")?;
        inner.command_busy = true;
        receiver
    };
    tauri::async_runtime::spawn_blocking(move || {
        receiver.recv().map_err(|_| {
            "The connection closed. Check the refreshed account data before making another change.".to_string()
        })?
    })
    .await
    .map_err(|_| "The account operation worker failed.".to_string())?
}

fn sync_packets(
    app: &AppHandle,
    profile_id: &str,
    capture: &mut AccountCapture,
    tables: &crate::sniffer::extract::ExtractTables,
    packets: Vec<session::ReceivedPacket>,
    cancelled: &AtomicBool,
) -> Result<(), String> {
    if packets.is_empty() || cancelled.load(Ordering::Relaxed) {
        return Ok(());
    }
    let account = app.state::<AccountState>();
    let mut profiles = account
        .store
        .lock()
        .map_err(|_| "Account store is unavailable.")?;
    let store = profiles
        .get_mut(profile_id)
        .ok_or("Account profile is unavailable.")?;
    let mut sections = std::collections::BTreeSet::new();
    for packet in packets {
        sections.extend(capture.apply(
            tables,
            store,
            &game_packet(
                packet.message_id,
                packet.kind,
                packet.rpc_id,
                packet.payload,
            ),
        )?);
    }
    if sections.is_empty() {
        return Ok(());
    }
    let save = store.prepare_save();
    drop(profiles);
    save.write()?;
    crate::account::emit_updated(app, &sections.into_iter().collect::<Vec<_>>());
    Ok(())
}

#[tauri::command]
pub fn dangerous_disconnect(
    window: WebviewWindow,
    state: State<DangerousState>,
) -> Result<Status, String> {
    main_window(&window)?;
    let mut inner = state.service.inner.lock();
    inner.cancel(false);
    Ok(inner.status())
}

#[tauri::command]
pub async fn dangerous_sign_out(
    window: WebviewWindow,
    state: State<'_, DangerousState>,
) -> Result<Status, String> {
    main_window(&window)?;
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || state.sign_out())
        .await
        .map_err(|_| "Account sign-out task failed.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{collections::HashMap, sync::atomic::AtomicUsize};

    #[test]
    fn team_edits_revalidate_ownership_and_saved_state_and_preserve_the_active_role() {
        use crate::account::model::{AccountSnapshot, Resonator, SavedTeam};
        let team = SavedTeam {
            id: 2,
            name: "Tower".into(),
            role_ids: vec![1503, 1505],
            current_role: 1505,
            is_current: true,
        };
        let snapshot = AccountSnapshot {
            teams: vec![team.clone()],
            resonators: [1503, 1505, 1404]
                .into_iter()
                .map(|id| Resonator {
                    id,
                    name: String::new(),
                    level: 90,
                    breakthrough: 6,
                    chain: 0,
                    skills: vec![],
                })
                .collect(),
            ..Default::default()
        };
        let update = validate_team_edit(&snapshot, &team, "Renamed", &[1404, 1505, 1503]).unwrap();
        assert_eq!(update.current_role, 1505);
        assert_eq!(update.name, "Renamed");
        assert!(update.is_current);
        assert_eq!(
            validate_team_edit(&snapshot, &team, "Tower", &[1404])
                .unwrap()
                .current_role,
            1404
        );
        for ids in [vec![], vec![1503, 1503], vec![9999]] {
            assert!(validate_team_edit(&snapshot, &team, "Tower", &ids).is_err());
        }
        let stale = SavedTeam {
            name: "Old".into(),
            ..team
        };
        assert!(validate_team_edit(&snapshot, &stale, "Tower", &[1503])
            .unwrap_err()
            .contains("changed"));
    }

    #[test]
    fn team_switches_use_synced_members_and_the_current_active_slot() {
        use crate::account::model::{AccountSnapshot, Resonator, SavedTeam};
        let mut snapshot = AccountSnapshot {
            teams: vec![
                SavedTeam {
                    id: 1,
                    name: "Current".into(),
                    role_ids: vec![1603, 1606, 1608],
                    current_role: 1606,
                    is_current: true,
                },
                SavedTeam {
                    id: 2,
                    name: "Tower".into(),
                    role_ids: vec![1505, 1503],
                    current_role: 1505,
                    is_current: false,
                },
            ],
            resonators: [1503, 1505, 1603, 1606, 1608]
                .into_iter()
                .map(|id| Resonator {
                    id,
                    name: String::new(),
                    level: 90,
                    breakthrough: 6,
                    chain: 0,
                    skills: vec![],
                })
                .collect(),
            ..Default::default()
        };
        for (active, current_role, expected_role) in [
            (true, 1606, 1503), // Preserve slot two, not the target's old CurRole.
            (true, 1603, 1505),
            (true, 1608, 1505), // Target has no third slot.
            (true, 0, 1505),
            (false, 1606, 1505),
        ] {
            snapshot.teams[0].is_current = active;
            snapshot.teams[0].current_role = current_role;
            let update = validate_team_switch(&snapshot, 2).unwrap();
            assert_eq!(update.id, 2);
            assert_eq!(update.name, "Tower");
            assert_eq!(update.role_ids, [1505, 1503]);
            assert_eq!(update.current_role, expected_role);
            assert!(update.is_current);
            assert!(update.validate().is_ok());
        }
        snapshot.teams[1].is_current = true;
        snapshot.teams[1].current_role = 1503;
        assert_eq!(
            validate_team_switch(&snapshot, 2).unwrap().current_role,
            1503
        );
        assert!(validate_team_switch(&snapshot, 3).is_err());
        for roles in [
            vec![],
            vec![1503, 1503],
            vec![1503, 1505, 1603, 1606],
            vec![9999],
            vec![-1503],
            vec![(1_i64 << 32) + 1503],
        ] {
            snapshot.teams[1].role_ids = roles;
            assert!(validate_team_switch(&snapshot, 2).is_err());
        }
    }

    #[test]
    fn refreshed_team_switch_confirmation_requires_the_selected_team_and_member_order() {
        use crate::account::model::{AccountSnapshot, SavedTeam};
        let expected = mornye_game_client::teams::TeamUpdate {
            id: 2,
            name: "Tower".into(),
            role_ids: vec![1505, 1503],
            current_role: 1503,
            is_current: true,
        };
        for (id, roles, is_current, current_role, valid) in [
            (2, vec![1505, 1503], true, 1503, true),
            (2, vec![1505, 1503], true, 1505, true),
            (2, vec![1505, 1503], false, 1503, false),
            (1, vec![1505, 1503], true, 1503, false),
            (2, vec![1503, 1505], true, 1503, false),
            (2, vec![1505], true, 1505, false),
            (2, vec![], true, 0, false),
        ] {
            let snapshot = AccountSnapshot {
                teams: vec![SavedTeam {
                    id,
                    name: "Server name".into(),
                    role_ids: roles,
                    current_role,
                    is_current,
                }],
                ..Default::default()
            };
            assert_eq!(confirm_team_switch(&snapshot, &expected).is_ok(), valid);
        }
        assert!(confirm_team_switch(&AccountSnapshot::default(), &expected).is_err());
    }

    #[test]
    fn refreshed_team_confirmation_checks_edits_and_accepts_server_managed_metadata() {
        use crate::account::model::{AccountSnapshot, SavedTeam};
        for (id, name, roles, current_role, is_current, valid) in [
            (2, "Tower", vec![1505, 1503], 1503, true, true),
            (2, "Tower", vec![1505, 1503], 1505, false, true),
            (2, "Tower", vec![1505, 1503], 0, false, true),
            (1, "Tower", vec![1505, 1503], 1503, true, false),
            (2, "Other", vec![1505, 1503], 1503, true, false),
            (2, "Tower", vec![1503, 1505], 1503, true, false),
            (2, "Tower", vec![1505], 1505, true, false),
        ] {
            let snapshot = AccountSnapshot {
                teams: vec![SavedTeam {
                    id,
                    name: name.into(),
                    role_ids: roles,
                    current_role,
                    is_current,
                }],
                ..Default::default()
            };
            assert_eq!(
                confirm_team_edit(&snapshot, 2, "Tower", &[1505, 1503]).is_ok(),
                valid
            );
        }
        assert!(confirm_team_edit(&AccountSnapshot::default(), 2, "Tower", &[1505, 1503]).is_err());
        let cleared_name = AccountSnapshot {
            teams: vec![SavedTeam {
                id: 2,
                name: String::new(),
                role_ids: vec![1505, 1503],
                current_role: 0,
                is_current: false,
            }],
            ..Default::default()
        };
        assert!(confirm_team_edit(&cleared_name, 2, "", &[1505, 1503]).is_ok());
    }

    #[derive(Default)]
    struct MemoryVault {
        entries: Mutex<HashMap<String, Vec<u8>>>,
        fail_load: AtomicBool,
        fail_save: AtomicBool,
        fail_delete: AtomicBool,
        reads: AtomicUsize,
    }
    impl SessionVault for MemoryVault {
        fn load(&self, key: &str) -> Result<Option<Vec<u8>>, String> {
            self.reads.fetch_add(1, Ordering::Relaxed);
            if self.fail_load.load(Ordering::Relaxed) {
                return Err("Credential store unavailable.".into());
            }
            Ok(self.entries.lock().get(key).cloned())
        }
        fn save(&self, key: &str, secret: &[u8]) -> Result<(), String> {
            if self.fail_save.load(Ordering::Relaxed) {
                return Err("Credential store unavailable.".into());
            }
            self.entries.lock().insert(key.into(), secret.to_vec());
            Ok(())
        }
        fn delete(&self, key: &str) -> Result<(), String> {
            if self.fail_delete.load(Ordering::Relaxed) {
                return Err("Credential store unavailable.".into());
            }
            self.entries.lock().remove(key);
            Ok(())
        }
    }

    fn test_login() -> Login {
        Login {
            email: "rover@example.invalid".into(),
            authorization: serde_json::from_value(serde_json::json!({
                "user_id": "dummy-sdk-account", "user_name": "Rover", "access_token": "dummy-account-secret"
            })).unwrap(),
        }
    }

    struct Fixture {
        directory: PathBuf,
        state: DangerousState,
        vault: Arc<MemoryVault>,
    }
    impl Fixture {
        fn new() -> Self {
            let directory = std::env::temp_dir().join(format!(
                "mornye-dangerous-test-{}",
                Preferences::default().device_num
            ));
            fs::create_dir(&directory).unwrap();
            let vault = Arc::new(MemoryVault::default());
            let state = DangerousState::with_vault(directory.clone(), vault.clone());
            Self {
                directory,
                state,
                vault,
            }
        }
        fn reload(&self) -> DangerousState {
            DangerousState::with_vault(self.directory.clone(), self.vault.clone())
        }
        fn login(&self) -> Status {
            self.state.decide(true).unwrap();
            let generation = self.state.service.inner.lock().generation;
            self.state.finish_login(generation, Ok(test_login()))
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            assert_eq!(
                self.directory.parent(),
                Some(std::env::temp_dir().as_path())
            );
            let _ = fs::remove_dir_all(&self.directory);
        }
    }

    #[test]
    fn opt_in_is_required_and_both_choices_survive_restarts_without_credentials() {
        let fixture = Fixture::new();
        let state = &fixture.state;
        assert!(!state.service.inner.lock().status().asked);
        assert!(state.service.inner.lock().enabled().is_err());
        assert!(state.catalogue().is_err()); // Must reject before discovery/networking.
        let device = state.service.inner.lock().preferences.device_num.clone();
        state.decide(false).unwrap();
        let reloaded = fixture.reload();
        assert!(reloaded.service.inner.lock().status().asked);
        assert!(!reloaded.service.inner.lock().status().enabled);
        state.decide(true).unwrap();
        let reloaded = fixture.reload();
        assert!(reloaded.service.inner.lock().status().enabled);
        assert!(reloaded.service.inner.lock().preferences.email.is_none());
        assert!(reloaded.service.inner.lock().login.is_none());
        assert_eq!(reloaded.service.inner.lock().preferences.device_num, device);
        let saved = fs::read_to_string(&state.service.path).unwrap();
        for forbidden in ["never-save", "email", "password", "token", "authorization"] {
            assert!(!saved.contains(forbidden));
        }
    }

    #[test]
    fn disabling_cancels_the_worker_and_prevents_a_second_connection() {
        let fixture = Fixture::new();
        fixture.state.decide(true).unwrap();
        let (cancelled, generation) = {
            let mut inner = fixture.state.service.inner.lock();
            inner.worker_active = true;
            inner.phase = Phase::Connected;
            inner.player_id = Some(123);
            inner.preferences.email = Some("test@example.invalid".into());
            (inner.cancelled.clone(), inner.generation)
        };
        let status = fixture.state.decide(false).unwrap();
        assert!(cancelled.load(Ordering::Relaxed));
        assert!(status.player_id.is_none());
        assert_eq!(status.email.as_deref(), Some("test@example.invalid"));
        assert!(!status.signed_in);
        assert!(matches!(status.phase, Phase::Disconnecting));
        assert!(fixture.state.service.inner.lock().generation > generation);
        fixture.state.decide(true).unwrap();
        assert!(fixture.state.service.inner.lock().idle().is_err());
    }

    #[test]
    fn corrupt_preferences_fail_closed_and_failed_save_does_not_enable() {
        let fixture = Fixture::new();
        fs::write(&fixture.state.service.path, b"invalid json").unwrap();
        let reloaded = fixture.reload();
        assert!(reloaded.service.inner.lock().enabled().is_err());
        assert!(!reloaded.service.inner.lock().status().asked);
        let unwritable = DangerousState::with_vault(
            fixture.directory.join("missing-directory"),
            fixture.vault.clone(),
        );
        assert!(unwritable.decide(true).is_err());
        assert!(unwritable.service.inner.lock().enabled().is_err());
    }

    #[test]
    fn restart_restores_only_account_authorization_not_a_world_connection() {
        let fixture = Fixture::new();
        let status = fixture.login();
        assert!(status.signed_in);
        assert!(status.error.is_none());
        fixture.state.shutdown();
        assert!(fixture.state.service.inner.lock().login.is_none());
        let restored = fixture.reload();
        let inner = restored.service.inner.lock();
        assert!(matches!(inner.phase, Phase::Ready));
        assert!(inner.login.is_some());
        assert!(!inner.worker_active);
        assert!(inner.catalogue.is_none());
        assert!(inner.player_id.is_none());
        assert_eq!(
            inner.status().email.as_deref(),
            Some("rover@example.invalid")
        );
        let status_json = serde_json::to_string(&inner.status()).unwrap();
        let preferences_json = fs::read_to_string(&fixture.state.service.path).unwrap();
        assert!(preferences_json.contains("rover@example.invalid"));
        for forbidden in [
            "dummy-account-secret",
            "dummy-sdk-account",
            "password",
            "access_token",
            "authorization",
        ] {
            assert!(!status_json.contains(forbidden));
            assert!(!preferences_json.contains(forbidden));
        }
        assert_eq!(fixture.vault.entries.lock().len(), 1);
    }

    #[test]
    fn explicit_sign_out_deletes_the_token_but_remembers_the_email() {
        let fixture = Fixture::new();
        fixture.login();
        let status = fixture.state.sign_out();
        assert!(!status.signed_in);
        assert_eq!(status.email.as_deref(), Some("rover@example.invalid"));
        assert!(fixture.vault.entries.lock().is_empty());
        let restored = fixture.reload();
        let inner = restored.service.inner.lock();
        assert!(!inner.status().signed_in);
        assert!(matches!(inner.phase, Phase::SignedOut));
        assert_eq!(
            inner.status().email.as_deref(),
            Some("rover@example.invalid")
        );
    }

    #[test]
    fn rejected_authorization_is_forgotten_but_network_failures_are_not() {
        let fixture = Fixture::new();
        fixture.login();
        let generation = fixture.state.service.inner.lock().generation;
        fixture
            .state
            .finish_connection(generation, Err("network unavailable".into()), false);
        assert!(fixture.reload().service.inner.lock().status().signed_in);
        fixture
            .state
            .finish_connection(generation, Err("account token rejected".into()), true);
        let restored = fixture.reload();
        let inner = restored.service.inner.lock();
        assert!(!inner.status().signed_in);
        assert_eq!(
            inner.status().email.as_deref(),
            Some("rover@example.invalid")
        );
        assert!(fixture.vault.entries.lock().is_empty());
    }

    #[test]
    fn disabling_removes_saved_sign_in_and_reenabling_does_not_resurrect_it() {
        let fixture = Fixture::new();
        fixture.login();
        fixture.state.decide(false).unwrap();
        assert!(fixture.vault.entries.lock().is_empty());
        let reads = fixture.vault.reads.load(Ordering::Relaxed);
        assert!(!fixture.reload().service.inner.lock().status().signed_in);
        assert_eq!(fixture.vault.reads.load(Ordering::Relaxed), reads);
        fixture.state.decide(true).unwrap();
        let restored = fixture.reload();
        assert!(!restored.service.inner.lock().status().signed_in);
        assert_eq!(
            restored.service.inner.lock().status().email.as_deref(),
            Some("rover@example.invalid")
        );
    }

    #[test]
    fn stale_login_completion_cannot_save_or_restore_credentials_after_sign_out() {
        let fixture = Fixture::new();
        fixture.state.decide(true).unwrap();
        let generation = fixture.state.service.inner.lock().generation;
        fixture.state.sign_out();
        assert!(
            !fixture
                .state
                .finish_login(generation, Ok(test_login()))
                .signed_in
        );
        assert!(fixture.vault.entries.lock().is_empty());
        assert!(!fixture.reload().service.inner.lock().status().signed_in);
    }

    #[test]
    fn unavailable_secure_storage_never_falls_back_to_plaintext_or_a_fake_restored_login() {
        let fixture = Fixture::new();
        fixture.vault.fail_save.store(true, Ordering::Relaxed);
        let status = fixture.login();
        assert!(status.signed_in); // Current run can still connect.
        assert!(status.error.is_some());
        assert_eq!(status.email.as_deref(), Some("rover@example.invalid"));
        assert!(fixture.vault.entries.lock().is_empty());
        let restored = fixture.reload();
        assert!(!restored.service.inner.lock().status().signed_in);
        assert_eq!(
            restored.service.inner.lock().status().email.as_deref(),
            Some("rover@example.invalid")
        );
        assert!(!fs::read_to_string(&fixture.state.service.path)
            .unwrap()
            .contains("dummy-account-secret"));
    }

    #[test]
    fn failed_secure_deletion_cannot_resurrect_the_old_session() {
        let fixture = Fixture::new();
        fixture.login();
        fixture.vault.fail_delete.store(true, Ordering::Relaxed);
        assert!(fixture.state.sign_out().error.is_some());
        assert_eq!(fixture.vault.entries.lock().len(), 1); // Stale entry remains in vault.
        let restored = fixture.reload();
        assert!(!restored.service.inner.lock().status().signed_in);
        assert_eq!(
            restored.service.inner.lock().status().email.as_deref(),
            Some("rover@example.invalid")
        );
    }

    #[test]
    fn unreadable_or_mismatched_secure_entries_fail_closed_without_leaking_payloads() {
        let fixture = Fixture::new();
        fixture.login();
        fixture.vault.fail_load.store(true, Ordering::Relaxed);
        let restored = fixture.reload();
        assert!(!restored.service.inner.lock().status().signed_in);
        assert!(restored.service.inner.lock().status().error.is_some());
        fixture.vault.fail_load.store(false, Ordering::Relaxed);
        let key = fixture
            .state
            .service
            .inner
            .lock()
            .preferences
            .device_num
            .clone();
        let original = fixture.vault.entries.lock()[&key].clone();
        for replacement in [
            b"dummy-account-secret".to_vec(),
            {
                let mut value: serde_json::Value = serde_json::from_slice(&original).unwrap();
                value["login"]["email"] = "another@example.invalid".into();
                serde_json::to_vec(&value).unwrap()
            },
            {
                let mut value: serde_json::Value = serde_json::from_slice(&original).unwrap();
                value["device_num"] = "different-device".into();
                serde_json::to_vec(&value).unwrap()
            },
        ] {
            fixture
                .vault
                .entries
                .lock()
                .insert(key.clone(), replacement);
            let restored = fixture.reload();
            let status = restored.service.inner.lock().status();
            assert!(!status.signed_in);
            assert!(!status.error.unwrap().contains("dummy-account-secret"));
        }
    }

    fn login_as(state: &DangerousState, email: &str) -> String {
        let (generation, _) = state.begin_login(email).unwrap();
        let mut login = test_login();
        login.email = email.into();
        let status = state.finish_login(generation, Ok(login));
        assert!(status.signed_in);
        status.account_id
    }

    fn profile(player_id: i64, server_id: &str) -> crate::account::model::ProfileIdentity {
        crate::account::model::ProfileIdentity {
            id: format!("{server_id}-{player_id}"),
            player_id,
            server_id: server_id.into(),
            region: "Europe".into(),
            provisional: false,
        }
    }

    #[test]
    fn multiple_accounts_restore_independently_and_keep_their_servers() {
        let fixture = Fixture::new();
        let first = fixture.login().account_id;
        {
            let mut inner = fixture.state.service.inner.lock();
            inner.preferences.server_id = Some("eu".into());
        }
        let second = login_as(&fixture.state, "second@example.invalid");
        assert_ne!(first, second);
        {
            let mut inner = fixture.state.service.inner.lock();
            inner.preferences.server_id = Some("asia".into());
            fixture.state.save(&inner.preferences).unwrap();
        }
        assert_eq!(fixture.vault.entries.lock().len(), 2);
        let restored = fixture.reload();
        let mut inner = restored.service.inner.lock();
        assert_eq!(inner.status().accounts.len(), 2);
        assert_eq!(
            inner.status().email.as_deref(),
            Some("second@example.invalid")
        );
        assert_eq!(inner.status().server_id.as_deref(), Some("asia"));
        restored.select_account(&mut inner, &first).unwrap();
        assert_eq!(
            inner.status().email.as_deref(),
            Some("rover@example.invalid")
        );
        assert_eq!(inner.status().server_id.as_deref(), Some("eu"));
        assert!(inner.status().signed_in);
        restored.select_account(&mut inner, &second).unwrap();
        assert_eq!(inner.status().server_id.as_deref(), Some("asia"));
        let json = fs::read_to_string(&restored.service.path).unwrap();
        for forbidden in [
            "dummy-account-secret",
            "access_token",
            "authorization",
            "password",
        ] {
            assert!(!json.contains(forbidden));
            assert!(!serde_json::to_string(&inner.status())
                .unwrap()
                .contains(forbidden));
        }
    }

    #[test]
    fn legacy_single_account_is_preserved_when_adding_another() {
        let fixture = Fixture::new();
        let first = fixture.login().account_id;
        let mut legacy: serde_json::Value =
            serde_json::from_slice(&fs::read(&fixture.state.service.path).unwrap()).unwrap();
        legacy.as_object_mut().unwrap().remove("accounts");
        legacy.as_object_mut().unwrap().remove("profile_accounts");
        fs::write(
            &fixture.state.service.path,
            serde_json::to_vec(&legacy).unwrap(),
        )
        .unwrap();
        let restored = fixture.reload();
        assert!(restored.service.inner.lock().status().signed_in);
        let second = login_as(&restored, "second@example.invalid");
        assert_ne!(first, second);
        let again = fixture.reload();
        let mut inner = again.service.inner.lock();
        again.select_account(&mut inner, &first).unwrap();
        assert!(inner.status().signed_in);
        assert_eq!(inner.status().accounts.len(), 2);
    }

    #[test]
    fn profile_links_persist_and_choose_the_matching_account_and_server() {
        let fixture = Fixture::new();
        let first = fixture.login().account_id;
        let selected = profile(123, "eu");
        {
            let mut inner = fixture.state.service.inner.lock();
            fixture
                .state
                .link_profile(&mut inner, &selected.id, Some(&first))
                .unwrap();
        }
        login_as(&fixture.state, "second@example.invalid");
        let restored = fixture.reload();
        let mut inner = restored.service.inner.lock();
        assert!(restored
            .prepare_profile(&mut inner, Some(&selected))
            .unwrap());
        assert_eq!(inner.preferences.device_num, first);
        assert_eq!(inner.preferences.server_id.as_deref(), Some("eu"));
        assert!(inner.login.is_some());
        assert!(validate_connected_profile(Some(&selected), 123, "eu").is_ok());
        assert!(validate_connected_profile(Some(&selected), 456, "eu").is_err());
        assert!(validate_connected_profile(Some(&selected), 123, "asia").is_ok());
        assert!(!restored
            .prepare_profile(&mut inner, Some(&profile(456, "eu")))
            .unwrap());
        restored
            .link_profile(&mut inner, &selected.id, None)
            .unwrap();
        assert!(!inner
            .preferences
            .profile_accounts
            .contains_key(&selected.id));
        assert!(restored
            .link_profile(&mut inner, &selected.id, Some("unknown"))
            .is_err());
    }

    #[test]
    fn signing_out_or_expiring_one_account_does_not_forget_the_other() {
        for expired in [false, true] {
            let fixture = Fixture::new();
            let first = fixture.login().account_id;
            let second = login_as(&fixture.state, "second@example.invalid");
            if expired {
                let generation = fixture.state.service.inner.lock().generation;
                fixture
                    .state
                    .finish_connection(generation, Err("rejected".into()), true);
            } else {
                fixture.state.sign_out();
            }
            assert!(fixture.vault.entries.lock().contains_key(&first));
            assert!(!fixture.vault.entries.lock().contains_key(&second));
            let restored = fixture.reload();
            let mut inner = restored.service.inner.lock();
            assert!(!inner.status().signed_in);
            restored.select_account(&mut inner, &first).unwrap();
            assert!(inner.status().signed_in);
            restored.select_account(&mut inner, &second).unwrap();
            assert!(!inner.status().signed_in);
        }
    }

    #[test]
    fn disabling_gates_all_accounts_even_when_os_deletion_fails() {
        let fixture = Fixture::new();
        let first = fixture.login().account_id;
        let second = login_as(&fixture.state, "second@example.invalid");
        fixture.vault.fail_delete.store(true, Ordering::Relaxed);
        assert!(fixture.state.decide(false).unwrap().error.is_some());
        assert_eq!(fixture.vault.entries.lock().len(), 2);
        fixture.state.decide(true).unwrap();
        let restored = fixture.reload();
        let mut inner = restored.service.inner.lock();
        for id in [first, second] {
            restored.select_account(&mut inner, &id).unwrap();
            assert!(!inner.status().signed_in);
        }
    }

    #[test]
    fn temporary_logins_survive_switching_and_reauthentication_reuses_the_account() {
        let fixture = Fixture::new();
        fixture.vault.fail_save.store(true, Ordering::Relaxed);
        let first = fixture.login().account_id;
        login_as(&fixture.state, "second@example.invalid");
        {
            let mut inner = fixture.state.service.inner.lock();
            fixture.state.select_account(&mut inner, &first).unwrap();
            assert!(inner.status().signed_in);
        }
        let same = login_as(&fixture.state, "ROVER@example.invalid");
        assert_eq!(first, same);
        assert_eq!(
            fixture.state.service.inner.lock().status().accounts.len(),
            2
        );
        assert!(fixture.vault.entries.lock().is_empty());
    }

    #[test]
    fn linked_profile_cannot_switch_credentials_while_another_session_is_active() {
        let fixture = Fixture::new();
        let first = fixture.login().account_id;
        let selected = profile(123, "eu");
        {
            let mut inner = fixture.state.service.inner.lock();
            fixture
                .state
                .link_profile(&mut inner, &selected.id, Some(&first))
                .unwrap();
        }
        let second = login_as(&fixture.state, "second@example.invalid");
        let mut inner = fixture.state.service.inner.lock();
        inner.worker_active = true;
        inner.phase = Phase::Connected;
        assert!(fixture
            .state
            .prepare_profile(&mut inner, Some(&selected))
            .is_err());
        assert_eq!(inner.preferences.device_num, second);
    }

    #[test]
    fn stale_authentication_cannot_replace_a_different_selected_account() {
        let fixture = Fixture::new();
        let first = fixture.login().account_id;
        let (generation, second) = fixture.state.begin_login("second@example.invalid").unwrap();
        assert_ne!(first, second);
        fixture.state.sign_out();
        {
            let mut inner = fixture.state.service.inner.lock();
            fixture.state.select_account(&mut inner, &first).unwrap();
        }
        let mut late = test_login();
        late.email = "second@example.invalid".into();
        let status = fixture.state.finish_login(generation, Ok(late));
        assert_eq!(status.account_id, first);
        assert_eq!(status.email.as_deref(), Some("rover@example.invalid"));
        assert!(status.signed_in);
        assert_eq!(fixture.vault.entries.lock().len(), 1);
        assert!(!fixture.vault.entries.lock().contains_key(&second));
    }

    #[test]
    fn failed_deletion_of_one_account_does_not_restore_it_or_disable_the_other() {
        let fixture = Fixture::new();
        let first = fixture.login().account_id;
        let second = login_as(&fixture.state, "second@example.invalid");
        fixture.vault.fail_delete.store(true, Ordering::Relaxed);
        fixture.state.sign_out();
        let restored = fixture.reload();
        let mut inner = restored.service.inner.lock();
        assert!(!inner.status().signed_in);
        assert!(
            !inner
                .status()
                .accounts
                .iter()
                .find(|a| a.id == second)
                .unwrap()
                .remembered
        );
        restored.select_account(&mut inner, &first).unwrap();
        assert!(inner.status().signed_in);
        restored.select_account(&mut inner, &second).unwrap();
        assert!(!inner.status().signed_in);
    }
}
