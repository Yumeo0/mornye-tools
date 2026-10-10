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
