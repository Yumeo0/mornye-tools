//! Account store: model, persistence and Tauri commands/events.
//!
//! The single account source is `account.json`, written by `sniffer::extract`
//! on packet batches and by explicit user overrides. The frontend mirrors the
//! model (`src/lib/account.ts`) and re-fetches `account_get_snapshot` whenever
//! `account-updated` fires.

pub mod model;
pub mod store;

use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::account::model::{AccountSnapshot, Echo};
use crate::account::store::AccountStore;

/// Managed state wrapping the one production store.
pub struct AccountState {
    pub store: Mutex<AccountStore>,
}

impl AccountState {
    pub fn new(dir: PathBuf) -> Self {
        Self {
            store: Mutex::new(AccountStore::load(dir)),
        }
    }
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
#[derive(Debug, Clone, Serialize)]
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

/// Manual equipment override for one echo (the only user-writable account data).
#[tauri::command(rename_all = "snake_case")]
pub fn account_set_equipped_override(
    app: AppHandle,
    state: State<AccountState>,
    incr_id: i64,
    equipped_by: Option<i64>,
    slot: Option<u8>,
) -> Result<(), String> {
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    store.set_echo_override(incr_id, equipped_by, slot);
    store.save()?;
    drop(store);
    emit_updated(&app, &["echoes"]);
    Ok(())
}

/// Clear an override so packet-derived equipment wins again.
#[tauri::command(rename_all = "snake_case")]
pub fn account_clear_echo_override(
    app: AppHandle,
    state: State<AccountState>,
    incr_id: i64,
) -> Result<(), String> {
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    store.set_echo_override(incr_id, None, None);
    store.save()?;
    drop(store);
    emit_updated(&app, &["echoes"]);
    Ok(())
}

/// Read the full echo bag (convenience for the id-based Inventory tab).
#[tauri::command]
pub fn account_get_echoes(state: State<AccountState>) -> Result<Vec<Echo>, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    Ok(store.snapshot().echoes.clone())
}

/// Add an echo entered by hand (no packet capture involved). The store assigns
/// the synthetic instance id and marks the source as manual.
#[tauri::command]
pub fn account_add_manual_echo(
    app: AppHandle,
    state: State<AccountState>,
    echo: Echo,
) -> Result<Echo, String> {
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
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
) -> Result<(), String> {
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    if !store.remove_manual_echo(incr_id) {
        return Err("manual echo not found".to_string());
    }
    store.save()?;
    drop(store);
    emit_updated(&app, &["echoes"]);
    Ok(())
}
