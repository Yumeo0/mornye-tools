//! `account.json` persistence, merge policy and overrides.
//!
//! Only [`AccountStore`] mutates the account snapshot. Packet extraction
//! (`sniffer::extract`) is the sole production writer; the UI may only write
//! `overrides.json` (equipped-by / slot adjustments).

use std::fs;
use std::path::{Path, PathBuf};

use crate::account::model::{
    AccountSnapshot, Echo, EchoOverride, Overrides, PlayerInfo, Resonator, SkillNode, Weapon,
    STORE_VERSION,
};

const ACCOUNT_FILE: &str = "account.json";
const OVERRIDES_FILE: &str = "overrides.json";
/// The abandoned OCR store; deleted outright on first run (no migration).
const LEGACY_ECHOES_FILE: &str = "echoes.json";

pub struct AccountStore {
    dir: PathBuf,
    snapshot: AccountSnapshot,
    overrides: Overrides,
}

impl AccountStore {
    /// Load the store from `dir`, deleting the abandoned OCR `echoes.json`.
    pub fn load(dir: PathBuf) -> Self {
        let _ = fs::create_dir_all(&dir);
        let _ = fs::remove_file(dir.join(LEGACY_ECHOES_FILE));

        let snapshot = read_json::<AccountSnapshot>(&dir.join(ACCOUNT_FILE))
            .filter(|s| s.version == STORE_VERSION)
            .unwrap_or_default();
        let overrides =
            read_json::<Overrides>(&dir.join(OVERRIDES_FILE)).unwrap_or_default();

        let mut store = Self {
            dir,
            snapshot,
            overrides,
        };
        store.snapshot.version = STORE_VERSION;
        store.apply_overrides();
        store
    }

    pub fn snapshot(&self) -> &AccountSnapshot {
        &self.snapshot
    }

    /// Look up one echo by its instance id (`incr_id`).
    pub fn echo(&self, incr_id: i64) -> Option<Echo> {
        self.snapshot
            .echoes
            .iter()
            .find(|echo| echo.incr_id == incr_id)
            .cloned()
    }

    /// Replace the player info.
    pub fn upsert_player(&mut self, mut player: PlayerInfo) {
        if let Some(existing) = self.snapshot.player.as_ref() {
            // Keep a previously captured name/signature if the new packet omits it.
            if player.name.is_empty() {
                player.name = existing.name.clone();
            }
            if player.signature.is_none() {
                player.signature = existing.signature.clone();
            }
        }
        self.snapshot.player = Some(player);
    }

    /// Upsert resonators by role id.
    pub fn upsert_resonators(&mut self, incoming: Vec<Resonator>) {
        for resonator in incoming {
            match self
                .snapshot
                .resonators
                .iter_mut()
                .find(|r| r.id == resonator.id)
            {
                Some(existing) => {
                    // Sequence unlocks are monotonic and some role payloads
                    // omit the field; never let a sparse packet lower it.
                    let chain = existing.chain.max(resonator.chain);
                    if resonator.name.is_empty() {
                        let name = existing.name.clone();
                        *existing = resonator;
                        existing.name = name;
                    } else {
                        *existing = resonator;
                    }
                    existing.chain = chain;
                }
                None => self.snapshot.resonators.push(resonator),
            }
        }
    }

    /// Set a known resonator's level. Unknown roles are ignored; the full
    /// role-list snapshot introduces them. Returns whether a resonator matched.
    pub fn patch_resonator_level(&mut self, role_id: i64, level: i32) -> bool {
        let Some(resonator) = self
            .snapshot
            .resonators
            .iter_mut()
            .find(|r| r.id == role_id)
        else {
            return false;
        };
        resonator.level = level;
        true
    }

    /// Raise a known resonator's chain count. Chain nodes unlock in sequence, so
    /// incremental packets only ever move the count up; full snapshots stay
    /// authoritative. Returns whether a resonator matched.
    pub fn raise_resonator_chain(&mut self, role_id: i64, chain: i32) -> bool {
        let Some(resonator) = self
            .snapshot
            .resonators
            .iter_mut()
            .find(|r| r.id == role_id)
        else {
            return false;
        };
        resonator.chain = resonator.chain.max(chain);
        true
    }

    /// Merge one skill level into a known resonator. Returns whether a
    /// resonator matched.
    pub fn merge_resonator_skill(&mut self, role_id: i64, skill_id: i64, level: i32) -> bool {
        let Some(resonator) = self
            .snapshot
            .resonators
            .iter_mut()
            .find(|r| r.id == role_id)
        else {
            return false;
        };
        match resonator.skills.iter_mut().find(|s| s.id == skill_id) {
            Some(skill) => skill.level = level,
            None => resonator.skills.push(SkillNode {
                id: skill_id,
                level,
            }),
        }
        true
    }

    /// Upsert weapons by incr id. Partial notifies (`OneWeaponItemInfo`) carry
    /// no item id, so a stored id/equipment is preserved when the packet omits it.
    pub fn upsert_weapons(&mut self, incoming: Vec<Weapon>) {
        for mut weapon in incoming {
            match self
                .snapshot
                .weapons
                .iter_mut()
                .find(|w| w.incr_id == weapon.incr_id)
            {
                Some(existing) => {
                    if weapon.item_id == 0 {
                        weapon.item_id = existing.item_id;
                    }
                    if weapon.equipped_by.is_none() {
                        weapon.equipped_by = existing.equipped_by;
                    }
                    *existing = weapon;
                }
                None => self.snapshot.weapons.push(weapon),
            }
        }
    }

    /// Apply an `EquipTakeOn*` result for one role: every weapon previously
    /// equipped by the role is cleared, then `incr_id` (if any) becomes the
    /// equipped weapon. Unknown weapons are ignored; the next full weapon
    /// response carries them. Returns whether anything changed.
    pub fn apply_weapon_equip(&mut self, role_id: i64, incr_id: Option<i64>) -> bool {
        let mut changed = false;
        for weapon in self.snapshot.weapons.iter_mut() {
            let is_incoming = incr_id == Some(weapon.incr_id);
            let is_equipped_by_role = weapon.equipped_by == Some(role_id);
            if is_incoming {
                if !is_equipped_by_role {
                    weapon.equipped_by = Some(role_id);
                    changed = true;
                }
            } else if is_equipped_by_role {
                weapon.equipped_by = None;
                changed = true;
            }
        }
        changed
    }

    /// Patch a known weapon's level/breach/rank by incr id. Unknown weapons are
    /// ignored; the full `WeaponItemResponse` introduces them. Returns whether
    /// a weapon was found.
    pub fn patch_weapon(
        &mut self,
        incr_id: i64,
        level: Option<i32>,
        breach: Option<i32>,
        rank: Option<i32>,
    ) -> bool {
        let Some(weapon) = self
            .snapshot
            .weapons
            .iter_mut()
            .find(|w| w.incr_id == incr_id)
        else {
            return false;
        };
        if let Some(level) = level {
            weapon.level = level;
        }
        if let Some(breach) = breach {
            weapon.breach = breach;
        }
        if let Some(rank) = rank {
            weapon.rank = rank;
        }
        true
    }

    /// Upsert echoes by incr id. Packet fields win over everything except
    /// explicit user overrides for `equipped_by`/`slot`.
    pub fn upsert_echoes(&mut self, incoming: Vec<Echo>) {
        for mut echo in incoming {
            match self
                .snapshot
                .echoes
                .iter_mut()
                .find(|e| e.incr_id == echo.incr_id)
            {
                Some(existing) => {
                    // Preserve equipment the new packet does not carry.
                    if echo.equipped_by.is_none() {
                        echo.equipped_by = existing.equipped_by;
                    }
                    if echo.slot.is_none() {
                        echo.slot = existing.slot;
                    }
                    *existing = echo;
                }
                None => self.snapshot.echoes.push(echo),
            }
        }
        self.apply_overrides();
    }

    /// Apply the equip info from `PhantomEquipInfoNotify` / `RolePhantomEquipInfo`:
    /// each `incr_id` at `slot` (index 0 = main echo) belongs to `role_id`.
    pub fn apply_equip_info(&mut self, role_id: i64, incr_ids: &[i64]) {
        // Clear the role's previous assignment so re-equips are reflected.
        for echo in self.snapshot.echoes.iter_mut() {
            if echo.equipped_by == Some(role_id) {
                echo.equipped_by = None;
                echo.slot = None;
            }
        }
        for (slot, incr_id) in incr_ids.iter().enumerate() {
            if let Some(echo) = self
                .snapshot
                .echoes
                .iter_mut()
                .find(|e| e.incr_id == *incr_id)
            {
                echo.equipped_by = Some(role_id);
                echo.slot = Some(slot as u8);
            }
        }
        self.apply_overrides();
    }

    /// Set (or clear) a user override for an echo's equipped role and slot.
    pub fn set_echo_override(
        &mut self,
        incr_id: i64,
        equipped_by: Option<i64>,
        slot: Option<u8>,
    ) {
        let key = incr_id.to_string();
        if equipped_by.is_none() && slot.is_none() {
            self.overrides.echoes.remove(&key);
        } else {
            self.overrides.echoes.insert(
                key,
                EchoOverride {
                    equipped_by,
                    slot,
                },
            );
        }
        self.apply_overrides();
    }

    /// Drop every echo (used by explicit user clear / reset).
    pub fn clear_echoes(&mut self) {
        self.snapshot.echoes.clear();
    }

    /// Re-apply stored overrides on top of the current snapshot.
    pub fn apply_overrides(&mut self) {
        if self.overrides.echoes.is_empty() {
            return;
        }
        for echo in self.snapshot.echoes.iter_mut() {
            if let Some(over) = self.overrides.echoes.get(&echo.incr_id.to_string()) {
                if over.equipped_by.is_some() {
                    echo.equipped_by = over.equipped_by;
                }
                if over.slot.is_some() {
                    echo.slot = over.slot;
                }
            }
        }
    }

    /// Persist `account.json` and `overrides.json` atomically. Returns the set
    /// of sections written so callers can emit `account-updated`.
    pub fn save(&mut self) -> Result<(), String> {
        self.snapshot.version = STORE_VERSION;
        self.snapshot.updated_at = now_iso8601();
        atomic_write_json(&self.dir.join(ACCOUNT_FILE), &self.snapshot)?;
        atomic_write_json(&self.dir.join(OVERRIDES_FILE), &self.overrides)?;
        Ok(())
    }
}

fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Option<T> {
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

fn atomic_write_json<T: serde::Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let text = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, text).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| e.to_string())?;
    Ok(())
}

/// RFC3339-ish UTC timestamp without pulling in a date crate.
pub fn now_iso8601() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    // Days since epoch -> civil date (Howard Hinnant's algorithm).
    let days = (secs / 86_400) as i64;
    let rem = secs % 86_400;
    let (h, m, s) = (rem / 3600, (rem % 3600) / 60, rem % 60);
    let (y, mo, d) = civil_from_days(days);
    format!("{y:04}-{mo:02}-{d:02}T{h:02}:{m:02}:{s:02}Z")
}

fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (if m <= 2 { y + 1 } else { y }, m as u32, d as u32)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::account::model::{Echo, Resonator, Weapon};

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("mny-account-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn echo(incr_id: i64, item_id: i64) -> Echo {
        Echo {
            incr_id,
            item_id,
            monster_id: 390080007,
            set_id: 2,
            level: 25,
            main_props: Vec::new(),
            sub_props: Vec::new(),
            equipped_by: None,
            slot: None,
        }
    }

    #[test]
    fn upsert_resonators_by_role_id() {
        let dir = temp_dir("resonators");
        let mut store = AccountStore::load(dir.clone());
        store.upsert_resonators(vec![Resonator {
            id: 1503,
            name: "Carlotta".into(),
            level: 80,
            breakthrough: 5,
            chain: 0,
            skills: Vec::new(),
        }]);
        store.upsert_resonators(vec![Resonator {
            id: 1503,
            name: String::new(),
            level: 90,
            breakthrough: 6,
            chain: 2,
            skills: Vec::new(),
        }]);
        assert_eq!(store.snapshot().resonators.len(), 1);
        let resonator = &store.snapshot().resonators[0];
        assert_eq!(resonator.level, 90);
        assert_eq!(resonator.chain, 2);
        // A nameless update keeps the previously captured name.
        assert_eq!(resonator.name, "Carlotta");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn upsert_echoes_merges_and_preserves_equipment() {
        let dir = temp_dir("echoes");
        let mut store = AccountStore::load(dir.clone());
        let mut equipped = echo(7, 60000325);
        equipped.equipped_by = Some(1503);
        equipped.slot = Some(0);
        store.upsert_echoes(vec![equipped]);

        // A later update without equip fields must not clear the equipment.
        store.upsert_echoes(vec![echo(7, 60000325)]);
        assert_eq!(store.snapshot().echoes.len(), 1);
        let stored = &store.snapshot().echoes[0];
        assert_eq!(stored.equipped_by, Some(1503));
        assert_eq!(stored.slot, Some(0));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn overrides_win_over_packet_equipment() {
        let dir = temp_dir("overrides");
        let mut store = AccountStore::load(dir.clone());
        let mut equipped = echo(7, 60000325);
        equipped.equipped_by = Some(1503);
        equipped.slot = Some(0);
        store.upsert_echoes(vec![equipped.clone()]);
        store.set_echo_override(7, Some(1504), Some(2));
        // A new packet batch must not clobber the override.
        store.upsert_echoes(vec![equipped]);
        let stored = &store.snapshot().echoes[0];
        assert_eq!(stored.equipped_by, Some(1504));
        assert_eq!(stored.slot, Some(2));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn apply_equip_info_sets_slot_index() {
        let dir = temp_dir("equip");
        let mut store = AccountStore::load(dir.clone());
        store.upsert_echoes(vec![echo(1, 1), echo(2, 2), echo(3, 3)]);
        store.apply_equip_info(1503, &[2, 3, 1]);
        let by_id = |id: i64| {
            store
                .snapshot()
                .echoes
                .iter()
                .find(|e| e.incr_id == id)
                .unwrap()
        };
        assert_eq!(by_id(2).slot, Some(0));
        assert_eq!(by_id(3).slot, Some(1));
        assert_eq!(by_id(1).slot, Some(2));
        assert!(by_id(2).equipped_by == Some(1503));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn load_deletes_legacy_echoes_json() {
        let dir = temp_dir("legacy");
        fs::write(dir.join("echoes.json"), "[]").unwrap();
        let store = AccountStore::load(dir.clone());
        assert!(!dir.join("echoes.json").exists());
        assert!(store.snapshot().echoes.is_empty());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn upsert_weapons_keeps_item_id_from_partial_notify() {
        let dir = temp_dir("weapons-partial");
        let mut store = AccountStore::load(dir.clone());
        store.upsert_weapons(vec![Weapon {
            incr_id: 11,
            item_id: 21010044,
            level: 1,
            breach: 0,
            rank: 0,
            equipped_by: None,
        }]);
        // `OneWeaponItemInfo` carries no item id; it must not clobber the known one.
        store.upsert_weapons(vec![Weapon {
            incr_id: 11,
            item_id: 0,
            level: 90,
            breach: 6,
            rank: 0,
            equipped_by: None,
        }]);
        let weapon = &store.snapshot().weapons[0];
        assert_eq!(weapon.item_id, 21010044);
        assert_eq!(weapon.level, 90);
        assert_eq!(weapon.breach, 6);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn patch_weapon_updates_known_only() {
        let dir = temp_dir("weapons-patch");
        let mut store = AccountStore::load(dir.clone());
        store.upsert_weapons(vec![Weapon {
            incr_id: 11,
            item_id: 21010044,
            level: 1,
            breach: 0,
            rank: 0,
            equipped_by: None,
        }]);
        assert!(store.patch_weapon(11, Some(90), Some(6), Some(1)));
        let weapon = &store.snapshot().weapons[0];
        assert_eq!(weapon.item_id, 21010044);
        assert_eq!(weapon.level, 90);
        assert_eq!(weapon.breach, 6);
        assert_eq!(weapon.rank, 1);
        assert!(!store.patch_weapon(99, Some(90), None, None));
        assert_eq!(store.snapshot().weapons.len(), 1);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn patch_resonator_updates_level_chain_and_skills() {
        let dir = temp_dir("resonator-patch");
        let mut store = AccountStore::load(dir.clone());
        store.upsert_resonators(vec![Resonator {
            id: 1503,
            name: "Carlotta".into(),
            level: 1,
            breakthrough: 0,
            chain: 0,
            skills: Vec::new(),
        }]);
        assert!(store.patch_resonator_level(1503, 80));
        assert!(store.merge_resonator_skill(1503, 2, 5));
        assert!(store.merge_resonator_skill(1503, 2, 6));
        assert!(store.raise_resonator_chain(1503, 3));
        assert!(store.raise_resonator_chain(1503, 1));
        let resonator = &store.snapshot().resonators[0];
        assert_eq!(resonator.level, 80);
        assert_eq!(resonator.chain, 3);
        assert_eq!(resonator.skills.len(), 1);
        assert_eq!(resonator.skills[0].level, 6);
        // Unknown roles are ignored.
        assert!(!store.patch_resonator_level(9999, 90));
        assert!(!store.merge_resonator_skill(9999, 1, 1));
        assert!(!store.raise_resonator_chain(9999, 1));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn apply_weapon_equip_sets_and_clears_role_weapon() {
        let dir = temp_dir("weapon-equip");
        let mut store = AccountStore::load(dir.clone());
        store.upsert_weapons(vec![
            Weapon {
                incr_id: 1,
                item_id: 21010044,
                level: 1,
                breach: 0,
                rank: 0,
                equipped_by: None,
            },
            Weapon {
                incr_id: 2,
                item_id: 21020044,
                level: 1,
                breach: 0,
                rank: 0,
                equipped_by: None,
            },
        ]);
        assert!(store.apply_weapon_equip(1503, Some(1)));
        assert_eq!(store.snapshot().weapons[0].equipped_by, Some(1503));
        // Switching weapons clears the previous one.
        assert!(store.apply_weapon_equip(1503, Some(2)));
        assert_eq!(store.snapshot().weapons[0].equipped_by, None);
        assert_eq!(store.snapshot().weapons[1].equipped_by, Some(1503));
        // Re-applying the same state is a no-op.
        assert!(!store.apply_weapon_equip(1503, Some(2)));
        // Unequip clears the role's weapon.
        assert!(store.apply_weapon_equip(1503, None));
        assert_eq!(store.snapshot().weapons[1].equipped_by, None);
        // An unknown weapon cannot be attached.
        assert!(!store.apply_weapon_equip(1503, Some(99)));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn upsert_resonators_never_lowers_chain() {
        let dir = temp_dir("resonator-chain");
        let mut store = AccountStore::load(dir.clone());
        store.upsert_resonators(vec![Resonator {
            id: 1608,
            name: "Phrolova".into(),
            level: 90,
            breakthrough: 6,
            chain: 6,
            skills: Vec::new(),
        }]);
        // A sparse payload without the chain field must not zero it.
        store.upsert_resonators(vec![Resonator {
            id: 1608,
            name: String::new(),
            level: 90,
            breakthrough: 6,
            chain: 0,
            skills: Vec::new(),
        }]);
        let resonator = &store.snapshot().resonators[0];
        assert_eq!(resonator.chain, 6);
        assert_eq!(resonator.name, "Phrolova");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn save_and_reload_roundtrip() {
        let dir = temp_dir("roundtrip");
        let mut store = AccountStore::load(dir.clone());
        store.upsert_weapons(vec![Weapon {
            incr_id: 11,
            item_id: 21010044,
            level: 90,
            breach: 6,
            rank: 1,
            equipped_by: Some(1503),
        }]);
        store.upsert_echoes(vec![echo(7, 60000325)]);
        store.set_echo_override(7, Some(1503), Some(0));
        store.save().unwrap();

        let reloaded = AccountStore::load(dir.clone());
        assert_eq!(reloaded.snapshot().weapons.len(), 1);
        assert_eq!(reloaded.snapshot().echoes.len(), 1);
        assert_eq!(reloaded.snapshot().echoes[0].equipped_by, Some(1503));
        assert!(!reloaded.snapshot().updated_at.is_empty());
        let _ = fs::remove_dir_all(&dir);
    }
}
