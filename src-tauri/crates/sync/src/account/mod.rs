//! Account store: model, profiles, persistence and Tauri commands/events.
//!
//! Each account/server profile owns an `account.json`, written by
//! `sniffer::extract` (passive capture) or `ingest` (active session) and by
//! explicit user overrides. The frontend mirrors the selected profile
//! (`src/lib/account.ts`) and re-fetches `account_get_view` whenever
//! `account-updated` fires.

pub mod ingest;
pub use mornye_account::{model, profiles, store};

use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

use crate::account::model::{AccountSnapshot, Echo};
use crate::account::profiles::{ProfileList, Profiles};

/// Managed state wrapping the production profile registry.
pub struct AccountState {
    pub store: Mutex<Profiles>,
}

impl AccountState {
    pub fn new(dir: PathBuf) -> Self {
        Self {
            store: Mutex::new(Profiles::load(dir)),
        }
    }
}

#[tauri::command]
pub fn account_list_profiles(state: State<AccountState>) -> Result<ProfileList, String> {
    Ok(state.store.lock().map_err(|e| e.to_string())?.list())
}

#[tauri::command]
pub fn account_select_profile(
    app: AppHandle,
    window: tauri::WebviewWindow,
    state: State<AccountState>,
    profile_id: String,
) -> Result<(), String> {
    if window.label() != "settings" {
        return Err("Select profiles in the main window.".into());
    }
    state
        .store
        .lock()
        .map_err(|e| e.to_string())?
        .select(&profile_id)?;
    emit_updated(&app, &["profile"]);
    Ok(())
}

/// Bind a migrated or passively captured profile to a player and server.
#[tauri::command]
pub fn account_identify_profile(
    app: AppHandle,
    window: tauri::WebviewWindow,
    state: State<AccountState>,
    profile_id: String,
    player_id: i64,
    region: String,
    name: String,
) -> Result<(), String> {
    if window.label() != "settings" {
        return Err("Identify profiles in the main window.".into());
    }
    state.store.lock().map_err(|e| e.to_string())?.identify(
        &profile_id,
        player_id,
        &region,
        &name,
    )?;
    emit_updated(&app, &["profile"]);
    Ok(())
}

/// Event payload emitted when account sections change.
#[derive(Debug, Clone, Serialize)]
pub struct AccountUpdated {
    pub sections: Vec<String>,
}

pub const ACCOUNT_UPDATED_EVENT: &str = "account-updated";

/// Emit `account-updated` with the given section list.
pub fn emit_updated(app: &AppHandle, sections: &[&str]) {
    let _ = app.emit(
        ACCOUNT_UPDATED_EVENT,
        AccountUpdated {
            sections: sections.iter().map(|s| s.to_string()).collect(),
        },
    );
}

/// Event carrying the echo referenced by an item mark change
/// (`ItemFuncValueUpdateNotify`). The overlay presses a mark key on purpose to
/// identify the on-screen echo exactly, without OCR.
pub const ECHO_DETECTED_EVENT: &str = "echo-detected";

/// Emit the exact echo whose mark (lock/discard) the game just reported.
pub fn emit_echo_detected(app: &AppHandle, echo: &Echo) {
    let _ = app.emit(ECHO_DETECTED_EVENT, echo);
}

/// Event carrying an echo whose stored data changed in place, e.g. an upgrade
/// that added substats (`PhantomLevelUpResponse` / `PhantomItemUpdateNotify`).
/// The overlay refreshes the displayed card when the id matches.
pub const ECHO_UPDATED_EVENT: &str = "echo-updated";

/// Emit an echo whose data (level, stats, ...) changed.
pub fn emit_echo_updated(app: &AppHandle, echo: &Echo) {
    let _ = app.emit(ECHO_UPDATED_EVENT, echo);
}

/// Payload of [`ECHO_SPLIT_EVENT`]: upgrading/polishing one copy of a stack
/// splits it, and the operated half may move to a new instance id while the
/// old id becomes the remainder. The echo on screen is the operated half, so
/// an overlay tracking either id must follow it.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EchoSplit {
    pub operated: Echo,
    pub remainder: Option<Echo>,
}

/// Event carrying both halves of a stack split.
pub const ECHO_SPLIT_EVENT: &str = "echo-split";

/// Emit the halves of a stack split for the overlay to follow.
pub fn emit_echo_split(app: &AppHandle, operated: &Echo, remainder: Option<&Echo>) {
    let _ = app.emit(
        ECHO_SPLIT_EVENT,
        EchoSplit {
            operated: operated.clone(),
            remainder: remainder.cloned(),
        },
    );
}

#[tauri::command]
pub fn account_get_snapshot(state: State<AccountState>) -> Result<AccountSnapshot, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    Ok(store.snapshot().clone())
}

#[derive(Serialize)]
pub struct AccountView {
    snapshot: AccountSnapshot,
    profiles: ProfileList,
}
#[tauri::command]
pub fn account_get_view(state: State<AccountState>) -> Result<AccountView, String> {
    let profiles = state.store.lock().map_err(|e| e.to_string())?;
    Ok(AccountView {
        snapshot: profiles.snapshot().clone(),
        profiles: profiles.list(),
    })
}

fn selected_profile(store: &Profiles, id: &str) -> Result<(), String> {
    if store.is_selected(id) {
        Ok(())
    } else {
        Err("The selected profile changed. Try again in the intended profile.".into())
    }
}

/// Manual equipment override for one echo (the only user-writable account
/// data). Passing `equipped_by: None` and `slot: None` clears the override so
/// packet-derived equipment wins again.
#[tauri::command(rename_all = "snake_case")]
pub fn account_set_equipped_override(
    app: AppHandle,
    state: State<AccountState>,
    incr_id: i64,
    equipped_by: Option<i64>,
    slot: Option<u8>,
    profile_id: String,
) -> Result<(), String> {
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    selected_profile(&store, &profile_id)?;
    store.set_echo_override(incr_id, equipped_by, slot);
    store.save()?;
    drop(store);
    emit_updated(&app, &["echoes"]);
    Ok(())
}

/// Add an echo entered by hand (no packet capture involved). The store assigns
/// the synthetic instance id and marks the source as manual.
#[tauri::command]
pub fn account_add_manual_echo(
    app: AppHandle,
    state: State<AccountState>,
    echo: Echo,
    profile_id: String,
) -> Result<Echo, String> {
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    selected_profile(&store, &profile_id)?;
    let added = store.add_manual_echo(echo);
    store.save()?;
    drop(store);
    emit_updated(&app, &["echoes"]);
    Ok(added)
}

/// Remove a manually added echo; sniffer echoes cannot be removed here.
#[tauri::command(rename_all = "snake_case")]
pub fn account_remove_manual_echo(
    app: AppHandle,
    state: State<AccountState>,
    incr_id: i64,
    profile_id: String,
) -> Result<(), String> {
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    selected_profile(&store, &profile_id)?;
    if !store.remove_manual_echo(incr_id) {
        return Err("manual echo not found".to_string());
    }
    store.save()?;
    drop(store);
    emit_updated(&app, &["echoes"]);
    Ok(())
}
