//! Account/server isolation. Selection affects browsing, never packet routing.
use super::{
    model::{PlayerInfo, ProfileIdentity},
    store::{AccountStore, PreparedSave},
};
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs,
    ops::{Deref, DerefMut},
    path::PathBuf,
};

#[derive(Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct Index {
    selected: String,
    profiles: Vec<ProfileIdentity>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileSummary {
    #[serde(flatten)]
    pub identity: ProfileIdentity,
    pub name: String,
    pub level: i32,
    pub updated_at: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileList {
    pub selected: String,
    pub profiles: Vec<ProfileSummary>,
}

pub struct Profiles {
    root: PathBuf,
    stores: BTreeMap<String, AccountStore>,
    selected: String,
    passive: Option<String>,
}

fn valid(identity: &ProfileIdentity) -> bool {
    let server = &identity.server_id;
    identity.player_id >= 0
        && !server.is_empty()
        && server.chars().count() <= 64
        && server.chars().all(|c| c.is_alphanumeric() || c == '-')
        && identity.id == format!("{}-{}", server, identity.player_id)
}

/// A stable key from a user-supplied server or region label.
fn slug(value: &str) -> String {
    let mut slug = String::new();
    let mut separator = false;
    for c in value.trim().chars().flat_map(char::to_lowercase) {
        if c.is_alphanumeric() {
            slug.push(c);
            separator = false;
        } else if !separator && !slug.is_empty() {
            slug.push('-');
            separator = true;
        }
    }
    while slug.ends_with('-') {
        slug.pop();
    }
    if slug.is_empty() {
        "server".into()
    } else {
        slug
    }
}

fn empty_local(store: &AccountStore) -> bool {
    let snapshot = store.snapshot();
    let exploration = &snapshot.exploration;
    let progression = &snapshot.progression;
    let quests = &progression.quests;
    let achievements = &progression.achievements;
    snapshot.player.is_none()
        && snapshot.resonators.is_empty()
        && snapshot.weapons.is_empty()
        && snapshot.echoes.is_empty()
        && snapshot.inventory.is_empty()
        && snapshot.teams.is_empty()
        && exploration.player_id == 0
        && exploration.scene.is_none()
        && exploration.rewards.is_empty()
        && progression.player_id == 0
        && quests.list_synced_at.is_none()
        && quests.completed_synced_at.is_none()
        && quests.states.is_empty()
        && quests.completed_ids.is_empty()
        && quests.available_ids.is_empty()
        && quests.active_nodes.is_empty()
        && achievements.synced_at.is_none()
        && achievements.updated_at.is_none()
        && achievements.entries.is_empty()
        && achievements.finished_count == 0
        && achievements.star_count == 0
}

impl Profiles {
    pub fn load(root: PathBuf) -> Self {
        let index = fs::read(root.join("profiles.json"))
            .ok()
            .and_then(|bytes| serde_json::from_slice::<Index>(&bytes).ok())
            .unwrap_or_default();
        let mut stores = BTreeMap::new();
        for identity in index.profiles.into_iter().filter(valid) {
            let mut store = AccountStore::load(root.join("profiles").join(&identity.id));
            store.set_profile(identity.clone());
            stores.insert(identity.id.clone(), store);
        }
        let mut result = Self {
            root: root.clone(),
            stores,
            selected: index.selected,
            passive: None,
        };
        if result.stores.is_empty() {
            // Copy the legacy snapshot and overrides; leave the original files intact.
            let mut legacy = AccountStore::load(root.clone());
            let player_id = legacy.snapshot().player.as_ref().map_or(0, |p| p.player_id);
            let identity = ProfileIdentity {
                id: format!("unknown-{player_id}"),
                player_id,
                server_id: "unknown".into(),
                region: if player_id > 0 {
                    "Region not identified"
                } else {
                    "Local"
                }
                .into(),
                provisional: true,
            };
            legacy.set_profile(identity.clone());
            let migrated = legacy
                .relocate(root.join("profiles").join(&identity.id))
                .is_ok();
            result.selected = identity.id.clone();
            result.stores.insert(identity.id, legacy);
            if migrated {
                let _ = result.save_index();
            }
        }
        if result.remove_empty_local().is_some() {
            let _ = result.save_index();
        }
        if !result.stores.contains_key(&result.selected) {
            result.selected = result.stores.keys().next().unwrap().clone();
        }
        result
    }

    /// The local store only fills the gap before a player is known. Keep its
    /// files (including any separate manual map marks), but stop listing an
    /// empty placeholder once a real profile exists. Never remove captured data.
    fn remove_empty_local(&mut self) -> Option<AccountStore> {
        if self.stores.len() <= 1
            || self.passive.as_deref() == Some("unknown-0")
            || !self.stores.get("unknown-0").is_some_and(empty_local)
        {
            return None;
        }
        let removed = self.stores.remove("unknown-0");
        if self.selected == "unknown-0" {
            self.selected = self.stores.keys().next().unwrap().clone();
        }
        removed
    }

    fn save_index(&self) -> Result<(), String> {
        let index = Index {
            selected: self.selected.clone(),
            profiles: self
                .stores
                .values()
                .filter_map(|s| s.snapshot().profile.clone())
                .collect(),
        };
        let bytes = serde_json::to_vec_pretty(&index).map_err(|_| "Could not encode profiles.")?;
        let temporary = self.root.join("profiles.json.tmp");
        fs::write(&temporary, bytes)
            .and_then(|_| fs::rename(temporary, self.root.join("profiles.json")))
            .map_err(|_| "Could not save profiles.".into())
    }

    pub fn list(&self) -> ProfileList {
        ProfileList {
            selected: self.selected.clone(),
            profiles: self
                .stores
                .values()
                .filter_map(|store| {
                    let snapshot = store.snapshot();
                    Some(ProfileSummary {
                        identity: snapshot.profile.clone()?,
                        name: snapshot
                            .player
                            .as_ref()
                            .map_or(String::new(), |p| p.name.clone()),
                        level: snapshot.player.as_ref().map_or(0, |p| p.level),
                        updated_at: snapshot.updated_at.clone(),
                    })
                })
                .collect(),
        }
    }

    pub fn select(&mut self, id: &str) -> Result<(), String> {
        if !self.stores.contains_key(id) {
            return Err("Unknown account profile.".into());
        }
        let previous = std::mem::replace(&mut self.selected, id.to_owned());
        if let Err(error) = self.save_index() {
            self.selected = previous;
            return Err(error);
        }
        Ok(())
    }

    /// Unregister a profile without deleting its cached data or map progress.
    /// Adding the same authenticated player again reuses its existing store.
    pub fn forget(&mut self, id: &str) -> Result<(), String> {
        let store = self.stores.get(id).ok_or("Unknown player profile.")?;
        if store
            .snapshot()
            .profile
            .as_ref()
            .is_none_or(|p| p.player_id <= 0)
        {
            return Err("The empty local profile cannot be removed.".into());
        }
        let removed = self.stores.remove(id).unwrap();
        let selected = self.selected.clone();
        let passive = self.passive.clone();
        let placeholder = self.stores.is_empty();
        if placeholder {
            let mut empty = AccountStore::load(self.root.join("profiles").join("unknown-0"));
            empty.set_profile(ProfileIdentity {
                id: "unknown-0".into(),
                player_id: 0,
                server_id: "unknown".into(),
                region: "Local".into(),
                provisional: true,
            });
            self.stores.insert("unknown-0".into(), empty);
        }
        if self.selected == id {
            self.selected = self.stores.keys().next().unwrap().clone();
        }
        if self.passive.as_deref() == Some(id) {
            self.passive = None;
        }
        if let Err(error) = self.save_index() {
            if placeholder {
                self.stores.remove("unknown-0");
            }
            self.stores.insert(id.to_owned(), removed);
            self.selected = selected;
            self.passive = passive;
            return Err(error);
        }
        Ok(())
    }

    pub fn ensure(
        &mut self,
        player_id: i64,
        server_id: &str,
        region: &str,
    ) -> Result<String, String> {
        let identity = ProfileIdentity {
            id: format!("{server_id}-{player_id}"),
            player_id,
            server_id: server_id.into(),
            region: region.into(),
            provisional: server_id == "unknown",
        };
        if player_id <= 0 || !valid(&identity) {
            return Err("Invalid account profile identity.".into());
        }
        if let Some(store) = self.stores.get_mut(&identity.id) {
            let needs_update = store
                .snapshot()
                .profile
                .as_ref()
                .is_some_and(|p| p.provisional || p.region != region);
            if needs_update {
                store.set_profile(identity.clone());
                store.save()?;
                self.save_index()?;
            }
            return Ok(identity.id);
        }
        let adopt = if server_id == "unknown" {
            None
        } else {
            // Only provisional profiles may be adopted by an official server.
            let candidates: Vec<_> = self
                .stores
                .iter()
                .filter_map(|(id, store)| {
                    let snapshot = store.snapshot();
                    let profile = snapshot.profile.as_ref()?;
                    (snapshot.player.as_ref()?.player_id == player_id
                        && (profile.provisional || profile.server_id == "unknown"))
                        .then_some((id, profile))
                })
                .collect();
            match candidates.as_slice() {
                [(id, _)] => Some((*id).clone()),
                _ => candidates
                    .iter()
                    .find(|(_, profile)| profile.server_id == "unknown")
                    .or_else(|| {
                        candidates
                            .iter()
                            .find(|(_, profile)| profile.region.eq_ignore_ascii_case(region))
                    })
                    .map(|(id, _)| (*id).clone()),
            }
        };
        let mut store = match &adopt {
            Some(key) => self.stores.remove(key).unwrap(),
            None => AccountStore::load(self.root.join("profiles").join(&identity.id)),
        };
        if store.snapshot().player.is_none() {
            store.upsert_player(PlayerInfo {
                player_id,
                ..Default::default()
            });
        }
        self.save_profile(adopt.as_deref(), identity, store)
    }

    /// User-entered regions stay provisional until an official connection.
    pub fn identify(
        &mut self,
        id: &str,
        player_id: i64,
        region: &str,
        name: &str,
    ) -> Result<String, String> {
        let region = region.trim();
        if player_id <= 0 {
            return Err("Enter the positive player ID from the game account.".into());
        }
        if region.is_empty() {
            return Err("Enter the server or region for this profile.".into());
        }
        if region.chars().count() > 64 {
            return Err("The server or region name is too long.".into());
        }
        let store = self.stores.get(id).ok_or("Unknown account profile.")?;
        let profile = store
            .snapshot()
            .profile
            .as_ref()
            .ok_or("This profile has no identity.")?;
        if profile.server_id != "unknown" {
            return Err("This profile is already identified.".into());
        }
        if profile.player_id > 0 && profile.player_id != player_id {
            return Err("The captured account data belongs to a different player ID.".into());
        }
        let server_id = slug(region);
        let identity = ProfileIdentity {
            id: format!("{server_id}-{player_id}"),
            player_id,
            server_id,
            region: region.to_owned(),
            provisional: true,
        };
        if !valid(&identity) {
            return Err("Could not derive a profile key from that server or region.".into());
        }
        if identity.id != id && self.stores.contains_key(&identity.id) {
            return Err("A profile for that player and server already exists.".into());
        }
        let mut store = self.stores.remove(id).unwrap();
        let mut player = store
            .snapshot()
            .player
            .as_ref()
            .filter(|p| p.player_id == player_id)
            .cloned()
            .unwrap_or_else(|| PlayerInfo {
                player_id,
                ..Default::default()
            });
        if !name.trim().is_empty() {
            player.name = name.trim().to_owned();
        }
        store.upsert_player(player);
        self.save_profile(Some(id), identity, store)
    }

    /// Save the copy before publishing its index; retain the old store on failure.
    fn save_profile(
        &mut self,
        previous_id: Option<&str>,
        identity: ProfileIdentity,
        mut store: AccountStore,
    ) -> Result<String, String> {
        let previous_identity = store.snapshot().profile.clone();
        store.set_profile(identity.clone());
        if let Err(error) = store.relocate(self.root.join("profiles").join(&identity.id)) {
            if let Some(previous) = previous_identity {
                store.set_profile(previous);
            }
            if let Some(id) = previous_id {
                self.stores.insert(id.to_owned(), store);
            }
            return Err(error);
        }
        if let Some(id) = previous_id {
            if self.selected == id {
                self.selected = identity.id.clone();
            }
            if self.passive.as_deref() == Some(id) {
                self.passive = Some(identity.id.clone());
            }
        }
        self.stores.insert(identity.id.clone(), store);
        let selected = self.selected.clone();
        let placeholder = self.remove_empty_local();
        if let Err(error) = self.save_index() {
            if let Some(store) = placeholder {
                self.stores.insert("unknown-0".into(), store);
                self.selected = selected;
            }
            return Err(error);
        }
        Ok(identity.id)
    }

    pub fn observe_passive(&mut self, player_id: i64) -> Result<(), String> {
        let matches: Vec<_> = self
            .stores
            .iter()
            .filter(|(_, s)| {
                s.snapshot()
                    .profile
                    .as_ref()
                    .is_some_and(|p| p.player_id == player_id && p.server_id != "unknown")
            })
            .map(|(key, _)| key.clone())
            .collect();
        let key = if matches.len() == 1 {
            matches[0].clone()
        } else {
            self.ensure(player_id, "unknown", "Region not identified")?
        };
        if self
            .passive
            .as_ref()
            .is_some_and(|previous| previous != &key)
        {
            if let Some(previous) = self.passive_mut() {
                previous.save()?;
            }
        }
        // Follow the first observed login; later browsing stays under user control.
        if self.passive.is_none() {
            self.select(&key)?;
        }
        self.passive = Some(key);
        Ok(())
    }
    pub fn reset_passive(&mut self) {
        self.passive = None;
    }
    pub fn passive_mut(&mut self) -> Option<&mut AccountStore> {
        self.stores.get_mut(self.passive.as_ref()?)
    }
    pub fn get_mut(&mut self, id: &str) -> Option<&mut AccountStore> {
        self.stores.get_mut(id)
    }
    pub fn is_selected(&self, id: &str) -> bool {
        self.selected == id
    }
    pub fn passive_is_selected(&self) -> bool {
        self.passive.as_ref() == Some(&self.selected)
    }
    pub fn prepare_saves(&mut self) -> Vec<PreparedSave> {
        self.passive_mut()
            .map(AccountStore::prepare_save)
            .into_iter()
            .collect()
    }
}

// Existing UI commands operate on the selected profile. Ingestion uses explicit targets.
impl Deref for Profiles {
    type Target = AccountStore;
    fn deref(&self) -> &AccountStore {
        &self.stores[&self.selected]
    }
}
impl DerefMut for Profiles {
    fn deref_mut(&mut self) -> &mut AccountStore {
        self.stores.get_mut(&self.selected).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::InventoryItem;

    fn temp_dir(name: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "mny-profiles-{name}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        root
    }

    fn save_inventory(store: &mut AccountStore, id: i32, count: i32) {
        store.replace_inventory(vec![InventoryItem { id, count }]);
        store.save().unwrap();
    }

    #[test]
    fn adding_a_player_replaces_the_empty_placeholder_without_deleting_files() {
        let root = temp_dir("empty-placeholder");
        let mut profiles = Profiles::load(root.clone());
        let local_file = root.join("profiles/unknown-0/account.json");
        let original = fs::read(&local_file).unwrap();
        let marks = root.join("map-markers.json");
        fs::write(&marks, b"preserve manual map marks").unwrap();
        let id = profiles.ensure(77, "europe", "Europe").unwrap();
        assert_eq!(profiles.list().profiles.len(), 1);
        assert_eq!(profiles.list().selected, id);
        assert_eq!(profiles.snapshot().profile.as_ref().unwrap().id, id);
        assert_eq!(fs::read(&local_file).unwrap(), original);
        assert_eq!(fs::read(&marks).unwrap(), b"preserve manual map marks");
        drop(profiles);
        let mut profiles = Profiles::load(root.clone());
        assert_eq!(profiles.list().profiles.len(), 1);
        profiles.forget(&id).unwrap();
        assert_eq!(profiles.list().selected, "unknown-0");
        profiles.ensure(88, "asia", "Asia").unwrap();
        assert_eq!(profiles.list().profiles.len(), 1);
        assert_eq!(profiles.list().selected, "asia-88");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn loading_an_older_index_removes_the_extra_placeholder_and_fixes_selection() {
        let root = temp_dir("old-placeholder");
        let mut profiles = Profiles::load(root.clone());
        let mut local = AccountStore::load(root.join("profiles/unknown-0"));
        local.set_profile(profiles.snapshot().profile.clone().unwrap());
        let id = profiles.ensure(77, "europe", "Europe").unwrap();
        profiles.stores.insert("unknown-0".into(), local);
        profiles.selected = "unknown-0".into();
        profiles.save_index().unwrap();
        drop(profiles);
        let profiles = Profiles::load(root.clone());
        assert_eq!(profiles.list().profiles.len(), 1);
        assert_eq!(profiles.list().selected, id);
        let index: Index =
            serde_json::from_slice(&fs::read(root.join("profiles.json")).unwrap()).unwrap();
        assert_eq!(index.profiles.len(), 1);
        assert_eq!(index.selected, id);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn unidentified_local_capture_stays_available_when_adding_a_player() {
        use crate::model::RewardEvidence;
        for map_only in [false, true] {
            let root = temp_dir("local-capture");
            let mut profiles = Profiles::load(root.clone());
            let local = profiles.get_mut("unknown-0").unwrap();
            if map_only {
                local.exploration_mut().rewards.insert(
                    "8:42".into(),
                    RewardEvidence {
                        map_id: 8,
                        entity_id: 42,
                        source: "capture".into(),
                        observed_at: 123,
                    },
                );
                local.save().unwrap();
            } else {
                save_inventory(local, 5, 12);
            }
            profiles.ensure(77, "europe", "Europe").unwrap();
            drop(profiles);
            let mut profiles = Profiles::load(root.clone());
            assert_eq!(profiles.list().profiles.len(), 2);
            let local = profiles.get_mut("unknown-0").unwrap().snapshot();
            if map_only {
                assert_eq!(local.exploration.rewards["8:42"].observed_at, 123);
            } else {
                assert_eq!(local.inventory[0].count, 12);
            }
            let _ = fs::remove_dir_all(root);
        }
    }

    #[test]
    fn legacy_store_is_migrated_into_its_own_profile() {
        let root = temp_dir("legacy");
        let mut legacy = AccountStore::load(root.clone());
        legacy.upsert_player(PlayerInfo {
            player_id: 42,
            name: "Rover".into(),
            level: 1,
            world_level: 1,
            head_id: None,
            signature: None,
        });
        save_inventory(&mut legacy, 7, 3);

        let profiles = Profiles::load(root.clone());
        let list = profiles.list();
        assert_eq!(list.profiles.len(), 1);
        assert_eq!(list.selected, "unknown-42");
        let profile = &list.profiles[0];
        assert_eq!(profile.identity.server_id, "unknown");
        assert_eq!(profile.name, "Rover");
        assert_eq!(profile.updated_at, profiles.snapshot().updated_at);
        assert_eq!(profiles.snapshot().inventory[0].count, 3);
        assert!(root.join("profiles/unknown-42/account.json").is_file());
        // Migration copies; the legacy files stay recoverable.
        assert!(root.join("account.json").is_file());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn active_identity_adopts_the_passive_unknown_profile() {
        let root = temp_dir("adopt");
        let mut profiles = Profiles::load(root.clone());
        profiles.observe_passive(77).unwrap();
        let passive = profiles.get_mut("unknown-77").unwrap();
        passive.upsert_player(PlayerInfo {
            player_id: 77,
            name: "Rover".into(),
            level: 1,
            world_level: 1,
            head_id: None,
            signature: None,
        });
        save_inventory(passive, 7, 2);

        let key = profiles.ensure(77, "asia", "Asia").unwrap();
        assert_eq!(key, "asia-77");
        assert_eq!(profiles.selected, "asia-77");
        assert_eq!(profiles.passive.as_deref(), Some("asia-77"));
        assert!(!profiles.stores.contains_key("unknown-77"));
        assert_eq!(profiles.snapshot().inventory[0].count, 2);
        let summary = profiles
            .list()
            .profiles
            .into_iter()
            .find(|p| p.identity.id == "asia-77")
            .unwrap();
        assert_eq!(summary.identity.region, "Asia");

        let reloaded = Profiles::load(root.clone());
        assert_eq!(reloaded.selected, "asia-77");
        assert_eq!(reloaded.snapshot().player.as_ref().unwrap().player_id, 77);
        assert_eq!(reloaded.snapshot().inventory[0].count, 2);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn profiles_isolate_data_and_persist_the_selection() {
        let root = temp_dir("isolation");
        let mut profiles = Profiles::load(root.clone());
        let asia = profiles.ensure(9, "asia", "Asia").unwrap();
        let europe = profiles.ensure(9, "europe", "Europe").unwrap();
        assert_eq!(asia, "asia-9");
        assert_eq!(europe, "europe-9");
        save_inventory(profiles.get_mut(&asia).unwrap(), 11, 1);
        save_inventory(profiles.get_mut(&europe).unwrap(), 22, 2);

        assert_eq!(
            profiles.get_mut(&asia).unwrap().snapshot().inventory[0].id,
            11
        );
        assert_eq!(
            profiles.get_mut(&europe).unwrap().snapshot().inventory[0].id,
            22
        );
        profiles.select(&europe).unwrap();
        assert!(profiles.select("missing-1").is_err());
        assert_eq!(profiles.selected, europe);
        drop(profiles);

        let reloaded = Profiles::load(root.clone());
        assert_eq!(reloaded.selected, europe);
        assert!(reloaded
            .list()
            .profiles
            .iter()
            .any(|p| p.identity.id == asia));
        assert_eq!(reloaded.snapshot().inventory[0].id, 22);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn invalid_identities_and_unknown_players_are_rejected() {
        let root = temp_dir("invalid");
        let mut profiles = Profiles::load(root.clone());
        assert!(profiles.ensure(0, "asia", "Asia").is_err());
        assert!(profiles.ensure(1, "", "Asia").is_err());
        assert!(profiles.ensure(1, "asia/east", "Asia").is_err());
        assert!(profiles.select("unknown").is_err());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn identifying_a_local_profile_uses_the_entered_account_and_region() {
        let root = temp_dir("identify");
        let mut profiles = Profiles::load(root.clone());
        assert_eq!(profiles.selected, "unknown-0");
        save_inventory(profiles.get_mut("unknown-0").unwrap(), 5, 4);

        let key = profiles
            .identify("unknown-0", 123, "Asia / Southeast", "Rover")
            .unwrap();
        assert_eq!(key, "asia-southeast-123");
        assert_eq!(profiles.selected, key);
        assert!(!profiles.stores.contains_key("unknown-0"));
        assert_eq!(profiles.snapshot().player.as_ref().unwrap().player_id, 123);
        assert_eq!(profiles.snapshot().player.as_ref().unwrap().name, "Rover");
        assert_eq!(profiles.snapshot().inventory[0].count, 4);
        let summary = profiles
            .list()
            .profiles
            .into_iter()
            .find(|p| p.identity.id == key)
            .unwrap();
        assert_eq!(summary.identity.server_id, "asia-southeast");
        assert_eq!(summary.identity.region, "Asia / Southeast");
        assert!(summary.identity.provisional);
        assert!(root
            .join("profiles/asia-southeast-123/account.json")
            .is_file());
        assert!(profiles.identify(&key, 123, "Europe", "").is_err());

        let reloaded = Profiles::load(root.clone());
        assert_eq!(reloaded.selected, key);
        assert_eq!(reloaded.snapshot().inventory[0].count, 4);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn identifying_rejects_a_different_captured_player() {
        let root = temp_dir("identify-mismatch");
        let mut profiles = Profiles::load(root.clone());
        profiles.observe_passive(77).unwrap();
        profiles
            .get_mut("unknown-77")
            .unwrap()
            .upsert_player(PlayerInfo {
                player_id: 77,
                name: "Rover".into(),
                level: 1,
                world_level: 1,
                head_id: None,
                signature: None,
            });
        let error = profiles.identify("unknown-77", 78, "Asia", "").unwrap_err();
        assert!(error.contains("different player"));
        assert!(profiles.identify("unknown-77", 77, "  ", "").is_err());
        assert!(profiles.identify("missing", 77, "Asia", "").is_err());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn official_server_refines_a_user_identified_profile() {
        let root = temp_dir("identify-refine");
        let mut profiles = Profiles::load(root.clone());
        save_inventory(profiles.get_mut("unknown-0").unwrap(), 5, 1);
        let provisional = profiles
            .identify("unknown-0", 123, "Asia", "Rover")
            .unwrap();
        assert_eq!(provisional, "asia-123");

        let official = profiles.ensure(123, "1001", "Asia").unwrap();
        assert_eq!(official, "1001-123");
        assert!(!profiles.stores.contains_key(&provisional));
        assert_eq!(profiles.selected, official);
        assert_eq!(profiles.snapshot().inventory[0].id, 5);
        let identity = profiles.snapshot().profile.as_ref().unwrap();
        assert_eq!(identity.server_id, "1001");
        assert!(!identity.provisional);

        let reloaded = Profiles::load(root.clone());
        assert_eq!(reloaded.selected, official);
        assert!(reloaded.stores.contains_key(&official));
        assert!(!reloaded.stores.contains_key(&provisional));
        assert_eq!(reloaded.snapshot().player.as_ref().unwrap().name, "Rover");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn slug_keeps_labels_path_safe() {
        assert_eq!(slug("Asia / Southeast"), "asia-southeast");
        assert_eq!(slug("  Europe  "), "europe");
        assert_eq!(slug("---"), "server");
        assert_eq!(slug("a".repeat(10).as_str()).len(), 10);
        assert!(valid(&ProfileIdentity {
            id: format!("{}-1", slug("Asia")),
            player_id: 1,
            server_id: slug("Asia"),
            region: "Asia".into(),
            provisional: true,
        }));
    }

    #[test]
    fn removing_and_readding_after_restart_preserves_cached_map_data() {
        use crate::model::RewardEvidence;
        let root = temp_dir("forget-map");
        let mut profiles = Profiles::load(root.clone());
        let id = profiles.ensure(77, "europe", "Europe").unwrap();
        profiles.select(&id).unwrap();
        profiles.passive = Some(id.clone());
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
        save_inventory(store, 5, 12);
        let original = fs::read(root.join("profiles").join(&id).join("account.json")).unwrap();
        profiles.forget(&id).unwrap();
        assert!(profiles.passive.is_none());
        assert!(!profiles.list().profiles.iter().any(|p| p.identity.id == id));
        assert_eq!(
            fs::read(root.join("profiles").join(&id).join("account.json")).unwrap(),
            original
        );
        drop(profiles);
        let mut profiles = Profiles::load(root.clone());
        assert!(!profiles.list().profiles.iter().any(|p| p.identity.id == id));
        profiles.ensure(77, "europe", "Europe").unwrap();
        let snapshot = profiles.get_mut(&id).unwrap().snapshot();
        assert_eq!(snapshot.exploration.rewards["8:42"].observed_at, 123);
        assert_eq!(snapshot.inventory[0].count, 12);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn failed_unregister_keeps_profile_selection_and_packet_routing() {
        let root = temp_dir("forget-failure");
        let mut profiles = Profiles::load(root.clone());
        let id = profiles.ensure(77, "europe", "Europe").unwrap();
        profiles.select(&id).unwrap();
        profiles.passive = Some(id.clone());
        fs::create_dir(root.join("profiles.json.tmp")).unwrap();
        assert!(profiles.forget(&id).is_err());
        assert_eq!(profiles.selected, id);
        assert_eq!(profiles.passive.as_deref(), Some(id.as_str()));
        assert!(profiles.get_mut(&id).is_some());
        let _ = fs::remove_dir_all(root);
    }
}
