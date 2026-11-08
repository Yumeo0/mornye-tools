//! Profile setup is read-only until the user selects an authenticated character.
use super::*;
use crate::account::{model::PlayerInfo, profiles::Profiles};
use spectrum::{game::proto as pb, prost::Message};

#[derive(Clone, Serialize)]
pub struct ServerPlayer {
    server: Server,
    player: Option<PlayerInfo>,
    error: Option<String>,
}

pub(super) struct DiscoveredProfiles {
    account_id: String,
    rows: Vec<ServerPlayer>,
}

fn apply_player_packet(
    player: &mut PlayerInfo,
    packet: session::ReceivedPacket,
) -> Result<(), String> {
    let attributes = match packet.message_id {
        15380 => {
            let info = pb::BasicInfoNotify::decode(packet.payload.as_slice())
                .map_err(|_| "Could not decode player details.")?;
            if i64::from(info.id) != player.player_id {
                return Err("The server returned a different player identity.".into());
            }
            info.attributes
        }
        20778 => {
            pb::PlayerAttrNotify::decode(packet.payload.as_slice())
                .map_err(|_| "Could not decode player attributes.")?
                .attributes
        }
        _ => return Ok(()),
    };
    crate::sniffer::extract::merge_player_attributes(player, &attributes);
    Ok(())
}

fn probe_player(
    app: &AppHandle,
    catalogue: &Catalogue,
    server: &Server,
    login: &Login,
    device: &str,
    cancelled: Arc<AtomicBool>,
    level: i32,
) -> Result<PlayerInfo, String> {
    let (config, mut email) = login_context(app, catalogue, &login.email, "", device)?;
    email.game_login.url = server
        .login_urls
        .first()
        .ok_or("Server has no login endpoint.")?
        .clone();
    let prepared = auth::prepare_authorized(&config, &email, &login.authorization)
        .map_err(|e| format!("{e:#}"))?;
    let schema = Schema::load().map_err(|_| "Could not load the game protocol.")?;
    // Only servers confirmed to contain a character by GetUserInfo are probed.
    // No account data is ingested and no character creation RPC is exposed.
    let mut session = session::connect_recording(&prepared, &schema, cancelled, &[15380, 20778])
        .map_err(|e| format!("{e:#}"))?;
    let mut player = PlayerInfo {
        player_id: i64::from(session.player_id()),
        level,
        ..Default::default()
    };
    let deadline = std::time::Instant::now() + config.timeout();
    loop {
        for packet in session.drain_packets() {
            apply_player_packet(&mut player, packet)?;
        }
        if !player.name.is_empty() && player.level > 0 {
            return Ok(player);
        }
        if std::time::Instant::now() >= deadline {
            return Err("The server did not send the player's name and level. Try again.".into());
        }
        session.keep_alive().map_err(|e| format!("{e:#}"))?;
    }
}

#[tauri::command]
pub async fn dangerous_discover_profiles(
    window: WebviewWindow,
    app: AppHandle,
    state: State<'_, DangerousState>,
    account_id: String,
) -> Result<Vec<ServerPlayer>, String> {
    main_window(&window)?;
    let state = state.inner().clone();
    let (generation, login, cancelled) = {
        let mut inner = state.service.inner.lock();
        inner.enabled()?;
        inner.idle()?;
        if inner.preferences.device_num != account_id {
            return Err("The selected account changed. Start profile setup again.".into());
        }
        let login = inner
            .login
            .clone()
            .ok_or("Sign in to this account before finding player profiles.")?;
        inner.generation += 1;
        inner.cancelled = Arc::new(AtomicBool::new(false));
        inner.discovered = None;
        inner.phase = Phase::Discovering;
        inner.error = None;
        (inner.generation, login, inner.cancelled.clone())
    };
    let service = state.clone();
    let task_account = account_id.clone();
    let result = tauri::async_runtime::spawn_blocking(move || -> Result<Vec<ServerPlayer>, String> {
        let catalogue = service.catalogue()?;
        let url = catalogue.region_url.as_deref().ok_or("The server catalogue has no player discovery service. Update the game and try again.")?;
        let regions = auth::player_regions(url, &login.authorization, Duration::from_secs(20)).map_err(|e| format!("{e:#}"))?;
        let mut rows = Vec::new();
        for server in &catalogue.servers {
            if cancelled.load(Ordering::Relaxed) { return Err("Profile discovery cancelled.".into()); }
            let found = regions.iter().find(|r| r.region.eq_ignore_ascii_case(&server.region));
            let (player, error) = if let Some(region) = found {
                match probe_player(&app, &catalogue, server, &login, &task_account, cancelled.clone(), region.level) {
                    Ok(player) => (Some(player), None),
                    Err(error) => (None, Some(error)),
                }
            } else { (None, None) };
            rows.push(ServerPlayer { server: server.clone(), player, error });
        }
        Ok(rows)
    }).await.unwrap_or_else(|_| Err("Player discovery task failed. Try again.".into()));
    let mut inner = state.service.inner.lock();
    if inner.generation != generation {
        return Err("Profile discovery cancelled.".into());
    }
    inner.phase = if inner.login.is_some() {
        Phase::Ready
    } else {
        Phase::SignedOut
    };
    if let Ok(rows) = &result {
        inner.discovered = Some(DiscoveredProfiles {
            account_id,
            rows: rows.clone(),
        });
    }
    result
}

fn discovered_player(
    inner: &Inner,
    account_id: &str,
    server_id: &str,
) -> Result<(Server, PlayerInfo), String> {
    let discovery = inner
        .discovered
        .as_ref()
        .filter(|d| d.account_id == account_id)
        .ok_or("Find the player profiles for this account again before adding one.")?;
    let row = discovery
        .rows
        .iter()
        .find(|r| r.server.id == server_id && r.error.is_none())
        .ok_or("Choose a server that returned an existing player profile.")?;
    Ok((
        row.server.clone(),
        row.player
            .clone()
            .ok_or("There is no player profile on this server.")?,
    ))
}

fn add_profile(
    state: &DangerousState,
    inner: &mut Inner,
    profiles: &mut Profiles,
    account_id: &str,
    server_id: &str,
) -> Result<String, String> {
    inner.enabled()?;
    inner.idle()?;
    if inner.preferences.device_num != account_id || inner.login.is_none() {
        return Err("The signed-in account changed. Find its profiles again.".into());
    }
    let (server, player) = discovered_player(inner, account_id, server_id)?;
    let id = profiles.ensure(player.player_id, &server.id, &server.region)?;
    let store = profiles
        .get_mut(&id)
        .ok_or("Could not open the player profile.")?;
    // Re-adding a cached profile preserves its inventory and exploration data.
    let mut merged = store.snapshot().player.clone().unwrap_or_default();
    merged.player_id = player.player_id;
    merged.name = player.name;
    merged.level = player.level;
    if player.world_level > 0 {
        merged.world_level = player.world_level;
    }
    if player.head_id.is_some() {
        merged.head_id = player.head_id;
    }
    store.upsert_player(merged);
    store.save()?;
    let mut preferences = inner.preferences.clone();
    preferences
        .profile_accounts
        .insert(id.clone(), account_id.to_owned());
    preferences.server_id = Some(server.id);
    state.save(&preferences)?;
    inner.preferences = preferences;
    profiles.select(&id)?;
    Ok(id)
}

#[tauri::command]
pub fn dangerous_add_profile(
    window: WebviewWindow,
    app: AppHandle,
    state: State<DangerousState>,
    account: State<AccountState>,
    account_id: String,
    server_id: String,
) -> Result<Status, String> {
    main_window(&window)?;
    let mut inner = state.service.inner.lock();
    let mut profiles = account
        .store
        .lock()
        .map_err(|_| "Account store is unavailable.")?;
    add_profile(&state, &mut inner, &mut profiles, &account_id, &server_id)?;
    crate::account::emit_updated(&app, &["profile"]);
    Ok(inner.status())
}

#[tauri::command]
pub fn dangerous_remove_profile(
    window: WebviewWindow,
    app: AppHandle,
    state: State<DangerousState>,
    account: State<AccountState>,
    profile_id: String,
) -> Result<Status, String> {
    main_window(&window)?;
    let mut inner = state.service.inner.lock();
    inner.enabled()?;
    inner.idle()?;
    let mut profiles = account
        .store
        .lock()
        .map_err(|_| "Account store is unavailable.")?;
    let mut preferences = inner.preferences.clone();
    preferences.profile_accounts.remove(&profile_id);
    state.save(&preferences)?;
    if let Err(error) = profiles.forget(&profile_id) {
        let _ = state.save(&inner.preferences);
        return Err(error);
    }
    inner.preferences = preferences;
    crate::account::emit_updated(&app, &["profile"]);
    Ok(inner.status())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::account::model::RewardEvidence;

    struct TestVault;
    impl SessionVault for TestVault {
        fn load(&self, _: &str) -> Result<Option<Vec<u8>>, String> {
            Ok(None)
        }
        fn save(&self, _: &str, _: &[u8]) -> Result<(), String> {
            Ok(())
        }
        fn delete(&self, _: &str) -> Result<(), String> {
            Ok(())
        }
    }

    fn fixture() -> (PathBuf, DangerousState) {
        let root = std::env::temp_dir().join(format!(
            "mornye-setup-{}",
            Preferences::default().device_num
        ));
        fs::create_dir_all(&root).unwrap();
        let state = DangerousState::with_vault(root.clone(), Arc::new(TestVault));
        state.decide(true).unwrap();
        let (generation, _) = state.begin_login("test@example.invalid").unwrap();
        state.finish_login(
            generation,
            Ok(Login {
                email: "test@example.invalid".into(),
                authorization: serde_json::from_value(serde_json::json!({
                    "user_id":"test", "user_name":"Rover", "access_token":"dummy-token"
                }))
                .unwrap(),
            }),
        );
        (root, state)
    }

    fn row() -> ServerPlayer {
        ServerPlayer {
            server: Server {
                id: "europe".into(),
                name: "Europe".into(),
                region: "Europe".into(),
                login_urls: vec![],
            },
            player: Some(PlayerInfo {
                player_id: 77,
                name: "Rover".into(),
                level: 80,
                ..Default::default()
            }),
            error: None,
        }
    }

    #[test]
    fn only_authenticated_discovered_players_can_be_added_and_map_data_is_preserved() {
        let (root, state) = fixture();
        let mut inner = state.service.inner.lock();
        let account_id = inner.preferences.device_num.clone();
        let mut profiles = Profiles::load(root.clone());
        let id = profiles.ensure(77, "europe", "Europe").unwrap();
        let store = profiles.get_mut(&id).unwrap();
        store.exploration_mut().player_id = 77;
        store.exploration_mut().rewards.insert(
            "8:42".into(),
            RewardEvidence {
                map_id: 8,
                entity_id: 42,
                source: "capture".into(),
                observed_at: 123,
            },
        );
        store.save().unwrap();
        profiles.forget(&id).unwrap();
        assert!(add_profile(&state, &mut inner, &mut profiles, &account_id, "europe").is_err());
        inner.discovered = Some(DiscoveredProfiles {
            account_id: account_id.clone(),
            rows: vec![row()],
        });
        assert!(discovered_player(&inner, "other-account", "europe").is_err());
        assert!(discovered_player(&inner, &account_id, "asia").is_err());
        assert_eq!(
            add_profile(&state, &mut inner, &mut profiles, &account_id, "europe").unwrap(),
            id
        );
        assert_eq!(profiles.snapshot().player.as_ref().unwrap().name, "Rover");
        assert_eq!(
            profiles.snapshot().exploration.rewards["8:42"].observed_at,
            123
        );
        assert_eq!(inner.preferences.profile_accounts[&id], account_id);
        assert!(profiles.is_selected(&id));
        drop(inner);
        let restored = DangerousState::with_vault(root.clone(), Arc::new(TestVault));
        assert_eq!(
            restored.service.inner.lock().preferences.profile_accounts[&id],
            account_id
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn empty_failed_and_cancelled_discoveries_cannot_register_profiles() {
        let (root, state) = fixture();
        let mut inner = state.service.inner.lock();
        let account_id = inner.preferences.device_num.clone();
        let mut empty = row();
        empty.player = None;
        inner.discovered = Some(DiscoveredProfiles {
            account_id: account_id.clone(),
            rows: vec![empty],
        });
        assert!(discovered_player(&inner, &account_id, "europe").is_err());
        let mut failed = row();
        failed.error = Some("network error".into());
        inner.discovered.as_mut().unwrap().rows = vec![failed];
        assert!(discovered_player(&inner, &account_id, "europe").is_err());
        inner.discovered.as_mut().unwrap().rows = vec![row()];
        inner.phase = Phase::Discovering;
        assert!(inner.idle().is_err());
        let generation = inner.generation;
        let cancelled = inner.cancelled.clone();
        inner.cancel(false);
        assert!(cancelled.load(Ordering::Relaxed));
        assert_ne!(inner.generation, generation);
        assert!(discovered_player(&inner, &account_id, "europe").is_err());
        assert!(inner.idle().is_ok());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn player_details_must_match_the_authenticated_uid() {
        let mut player = row().player.unwrap();
        let packet = |id| session::ReceivedPacket {
            message_id: 15380,
            kind: 4,
            rpc_id: None,
            payload: pb::BasicInfoNotify {
                id,
                attributes: vec![pb::PlayerAttr {
                    key: pb::PlayerAttrKey::Name as i32,
                    value_type: pb::PlayerAttrType::String as i32,
                    value: Some(pb::player_attr::Value::StringValue("Verified Rover".into())),
                }],
                ..Default::default()
            }
            .encode_to_vec(),
        };
        assert!(apply_player_packet(&mut player, packet(78)).is_err());
        assert_eq!(player.name, "Rover");
        apply_player_packet(&mut player, packet(77)).unwrap();
        assert_eq!(player.name, "Verified Rover");
        assert_eq!(player.level, 80);
    }
}
