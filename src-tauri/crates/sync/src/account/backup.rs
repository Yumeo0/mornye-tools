//! Explicit, reviewed imports of the public Settings export.
use super::{emit_updated, selected_profile, AccountState};
use mornye_account::{
    backup::{merge_marks, Backup, BackupPart, ManualMark, PartSummary},
    model::ProfileIdentity,
    profiles::Profiles,
};
use serde::Serialize;
use std::collections::{BTreeMap, HashMap, HashSet};
use tauri::{AppHandle, State, WebviewWindow};
use tauri_plugin_store::StoreExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreview {
    profile: ProfileIdentity,
    name: String,
    new_profile: bool,
    parts: Vec<PartSummary>,
}

fn preview(backup: &Backup, profiles: &Profiles) -> Result<ImportPreview, String> {
    let uid = backup.player_id()?;
    let list = profiles.list();
    let existing = list.profiles.into_iter().find(|p| {
        uid.map_or(p.identity.id == list.selected, |uid| {
            p.identity.player_id == uid
        })
    });
    let new_profile = existing.is_none();
    let (profile, name) = match existing {
        Some(p) => (p.identity, p.name),
        None => {
            let uid = uid.ok_or("Select a profile before importing local data.")?;
            // Retain valid backup metadata only for a new profile. Derive the
            // folder key ourselves; imported paths never reach the filesystem.
            let profile = backup
                .map
                .as_ref()
                .and_then(|m| m.profile.as_ref())
                .filter(|p| {
                    !p.server_id.is_empty()
                        && p.server_id.chars().count() <= 64
                        && p.server_id.chars().all(|c| c.is_alphanumeric() || c == '-')
                        && !p.region.trim().is_empty()
                        && p.region.chars().count() <= 64
                        && format!("{}-{uid}", p.server_id).len() <= 96
                })
                .map(|p| ProfileIdentity {
                    id: format!("{}-{uid}", p.server_id),
                    player_id: uid,
                    server_id: p.server_id.clone(),
                    region: p.region.clone(),
                    provisional: p.provisional,
                })
                .unwrap_or_else(|| ProfileIdentity {
                    id: format!("unknown-{uid}"),
                    player_id: uid,
                    server_id: "unknown".into(),
                    region: "Region not identified".into(),
                    provisional: true,
                });
            (profile, String::new())
        }
    };
    let name = if name.is_empty() {
        backup
            .player
            .as_ref()
            .map_or(String::new(), |p| p.name.clone())
    } else {
        name
    };
    Ok(ImportPreview {
        profile,
        name,
        new_profile,
        parts: backup.parts(),
    })
}

fn main_window(window: &WebviewWindow) -> Result<(), String> {
    if window.label() == "settings" {
        Ok(())
    } else {
        Err("Import backups in the main window.".into())
    }
}

#[tauri::command]
pub fn account_preview_import(
    window: WebviewWindow,
    state: State<AccountState>,
    json: String,
    profile_id: String,
) -> Result<ImportPreview, String> {
    main_window(&window)?;
    let backup = Backup::parse(&json)?;
    let profiles = state.store.lock().map_err(|e| e.to_string())?;
    selected_profile(&profiles, &profile_id)?;
    preview(&backup, &profiles)
}

#[tauri::command]
pub fn account_import_backup(
    app: AppHandle,
    window: WebviewWindow,
    state: State<AccountState>,
    json: String,
    profile_id: String,
    target_id: String,
    parts: Vec<BackupPart>,
) -> Result<(), String> {
    main_window(&window)?;
    let backup = Backup::parse(&json)?;
    let mut profiles = state.store.lock().map_err(|e| e.to_string())?;
    selected_profile(&profiles, &profile_id)?;
    let review = preview(&backup, &profiles)?;
    if review.profile.id != target_id {
        return Err("The import destination changed. Review the file again.".into());
    }
    // Validate the selected parts before creating any new profile.
    let mut base = mornye_account::model::AccountSnapshot::default();
    base.profile = Some(review.profile.clone());
    backup.merge(&base, &parts)?;
    let target_id = if review.new_profile {
        profiles.ensure(
            review.profile.player_id,
            &review.profile.server_id,
            &review.profile.region,
        )?
    } else {
        target_id
    };
    let target = profiles
        .get_mut(&target_id)
        .ok_or("Import profile is unavailable.")?;
    if review.new_profile {
        target.set_profile(review.profile.clone());
    }
    let next = backup.merge(target.snapshot(), &parts)?;
    let echo_ids: Vec<_> = if parts.contains(&BackupPart::Echoes) {
        // Also clear overrides on displaced manual Echoes.
        let imported: HashSet<_> = backup.echoes.iter().flatten().map(|e| e.incr_id).collect();
        let previous: HashMap<_, _> = target
            .snapshot()
            .echoes
            .iter()
            .map(|e| (e.incr_id, e))
            .collect();
        next.echoes
            .iter()
            .filter(|e| {
                imported.contains(&e.incr_id)
                    || previous
                        .get(&e.incr_id)
                        .is_some_and(|old| old.equipped_by != e.equipped_by || old.slot != e.slot)
            })
            .map(|e| e.incr_id)
            .collect()
    } else {
        Vec::new()
    };

    let marker_key = format!("account:{}", review.profile.player_id);
    let markers = if parts.contains(&BackupPart::Map) {
        let store = app.store("map-markers.json").map_err(|e| e.to_string())?;
        let old = store.get(&marker_key);
        let current: BTreeMap<String, ManualMark> = old
            .clone()
            .map(serde_json::from_value)
            .transpose()
            .map_err(|_| "Existing map marks could not be read. Import was stopped.".to_string())?
            .unwrap_or_default();
        let merged = merge_marks(current, &backup.map.as_ref().unwrap().manual_marks);
        let value = serde_json::to_value(merged).map_err(|e| e.to_string())?;
        store.set(&marker_key, value);
        if let Err(error) = store.save() {
            match old {
                Some(value) => store.set(&marker_key, value),
                None => {
                    store.delete(&marker_key);
                }
            }
            return Err(format!("Could not save map marks: {error}"));
        }
        Some((store, old))
    } else {
        None
    };

    if let Err(error) = target.restore_backup(next, &echo_ids) {
        if let Some((store, old)) = markers {
            match old {
                Some(value) => store.set(&marker_key, value),
                None => {
                    store.delete(&marker_key);
                }
            }
            if let Err(rollback) = store.save() {
                return Err(format!(
                    "{error}. Could not restore previous map marks: {rollback}"
                ));
            }
        }
        return Err(error);
    }
    let selection = profiles.select(&target_id);
    drop(profiles);
    emit_updated(&app, &["profile", "resonators", "weapons", "echoes", "map"]);
    selection.map_err(|e| format!("Data was imported, but the profile could not be selected: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn review_routes_by_uid_without_switching_profiles_or_packet_routing() {
        let dir = std::env::temp_dir().join(format!("mornye-import-review-{}", std::process::id()));
        let mut profiles = Profiles::load(dir.clone());
        let first = profiles.ensure(12345, "eu", "Europe").unwrap();
        let second = profiles.ensure(999, "asia", "Asia").unwrap();
        profiles.select(&second).unwrap();
        let backup = Backup::parse(include_str!(
            "../../../../../src/lib/fixtures/account-export.json"
        ))
        .unwrap();
        let review = preview(&backup, &profiles).unwrap();
        assert_eq!(review.profile.id, first);
        assert!(!review.new_profile);
        assert!(profiles.is_selected(&second));
        assert!(profiles.passive_mut().is_none());
        let next = backup
            .merge(
                profiles.get_mut(&first).unwrap().snapshot(),
                &[BackupPart::Echoes],
            )
            .unwrap();
        profiles
            .get_mut(&first)
            .unwrap()
            .restore_backup(next, &[])
            .unwrap();
        assert_eq!(profiles.get_mut(&first).unwrap().snapshot().echoes.len(), 2);
        assert!(profiles
            .get_mut(&second)
            .unwrap()
            .snapshot()
            .echoes
            .is_empty());
        assert!(profiles.is_selected(&second));
        assert!(profiles.passive_mut().is_none());
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn review_new_players_is_read_only_and_local_exports_use_selected_profile() {
        let dir = std::env::temp_dir().join(format!("mornye-import-new-{}", std::process::id()));
        let profiles = Profiles::load(dir.clone());
        let backup = Backup::parse(include_str!(
            "../../../../../src/lib/fixtures/account-export.json"
        ))
        .unwrap();
        let review = preview(&backup, &profiles).unwrap();
        assert!(review.new_profile);
        assert_eq!(review.profile.player_id, 12345);
        assert_eq!(profiles.list().profiles.len(), 1);
        let local = Backup::parse(r#"{"version":1,"echoes":[]}"#).unwrap();
        assert_eq!(
            preview(&local, &profiles).unwrap().profile.id,
            profiles.list().selected
        );
        std::fs::remove_dir_all(dir).unwrap();
    }
}
