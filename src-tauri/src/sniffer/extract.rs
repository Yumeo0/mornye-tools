//! Decoded game packets -> account deltas. Sole production writer of the
//! account store.
//!
//! Spanning messages (`PhantomItemResponse`, `WeaponItemResponse`, ...) carry
//! full snapshots; update/add notifies carry deltas. Both upsert by stable
//! game ids (incr id / role id).

use std::collections::HashMap;

use serde::Deserialize;
use spectrum::game::proto as pb;
use tauri::{AppHandle, Manager};

use crate::account::model::{Echo, EchoProp, PlayerInfo, Resonator, SkillNode, StatKey, Weapon};
use crate::account::store::AccountStore;
use crate::account::AccountState;
use crate::sniffer::SnifferState;

// Message ids from `data/wuwa-protos/packetIds.json`.
pub const PB_GET_ROLE_LIST_RESPONSE: u16 = 25557;
pub const PB_GET_ROLE_LIST_NOTIFY: u16 = 18368;
pub const PB_ROLE_ACTIVE_NOTIFY: u16 = 27050;
pub const PB_UP_LEVEL_ROLE_RESPONSE: u16 = 17222;
pub const PB_ROLE_EXP_NOTIFY: u16 = 27992;
pub const PB_ROLE_SKILL_LEVEL_NOTIFY: u16 = 17396;
pub const PB_UP_LEVEL_SKILL_RESPONSE: u16 = 17988;
pub const RESONANT_CHAIN_UNLOCK_RESPONSE: u16 = 29448;
pub const ROLE_CHANGE_NOTIFY: u16 = 28197;
pub const ROLE_SKILL_QUICK_LEVEL_UP_RESPONSE: u16 = 18822;
pub const PHANTOM_ITEM_RESPONSE: u16 = 26275;
pub const PHANTOM_ITEM_UPDATE_NOTIFY: u16 = 28162;
pub const PHANTOM_ITEM_ADD_NOTIFY: u16 = 17848;
pub const PHANTOM_ITEM_REMOVE_NOTIFY: u16 = 29775;
pub const PHANTOM_EQUIP_INFO_NOTIFY: u16 = 15372;
pub const PHANTOM_LEVEL_UP_RESPONSE: u16 = 22489;
pub const WEAPON_ITEM_RESPONSE: u16 = 27089;
pub const WEAPON_ALL_INFO_NOTIFY: u16 = 19780;
pub const WEAPON_ADD_NOTIFY: u16 = 18560;
pub const WEAPON_ITEM_ADD_NOTIFY: u16 = 24339;
pub const WEAPON_LEVEL_UP_RESPONSE: u16 = 21842;
pub const WEAPON_BREACH_RESPONSE: u16 = 24159;
pub const WEAPON_RESON_UP_RESPONSE: u16 = 24490;
pub const EQUIP_TAKE_ON_RESPONSE: u16 = 28184;
pub const EQUIP_TAKE_ON_NOTIFY: u16 = 28760;
pub const PLAYER_BASIC_INFO_GET_RESPONSE: u16 = 22549;
/// Client request sent when an item is locked/unlocked. The overlay triggers
/// it on purpose (lock + re-lock) to learn which echo is on screen.
pub const PB_ITEM_LOCK_REQUEST: u16 = 25683;

#[derive(Deserialize, Default)]
struct EchoCatalogEntry {
    echo_id: i64,
    #[serde(default)]
    monster_id: Option<i64>,
}

#[derive(Deserialize, Default)]
struct EchoPropsFile {
    #[serde(default)]
    main: HashMap<String, String>,
    #[serde(default)]
    sub: HashMap<String, String>,
}

/// Static game-data tables used to translate packet payloads.
#[derive(Default)]
pub struct ExtractTables {
    item_to_monster: HashMap<i64, i64>,
    main_props: HashMap<i64, StatKey>,
    sub_props: HashMap<i64, StatKey>,
    known: bool,
}

impl ExtractTables {
    /// Load `echo_data.json` (ItemId -> MonsterId) and `echo_props.json`.
    pub fn load(app: &AppHandle) -> Self {
        let mut tables = Self::default();
        if let Ok(entries) = crate::config::load_json_resource::<Vec<EchoCatalogEntry>>(
            app,
            "echo_data.json",
        ) {
            for entry in entries {
                if let Some(monster_id) = entry.monster_id {
                    tables.item_to_monster.insert(entry.echo_id, monster_id);
                }
            }
        }
        if let Ok(props) = crate::config::load_json_resource::<EchoPropsFile>(app, "echo_props.json") {
            for (id, key) in props.main {
                if let (Ok(id), Some(key)) = (id.parse::<i64>(), stat_key_from_str(&key)) {
                    tables.main_props.insert(id, key);
                }
            }
            for (id, key) in props.sub {
                if let (Ok(id), Some(key)) = (id.parse::<i64>(), stat_key_from_str(&key)) {
                    tables.sub_props.insert(id, key);
                }
            }
        }
        tables.known = !tables.main_props.is_empty() || !tables.sub_props.is_empty();
        tables
    }

    pub fn monster_id(&self, item_id: i64) -> Option<i64> {
        self.item_to_monster.get(&item_id).copied()
    }

    /// Convert one packet prop to an [`EchoProp`].
    fn echo_prop(&self, prop: &pb::PhantomPropInfo, main: bool) -> Option<EchoProp> {
        let prop_id = prop.phantom_prop_id as i64;
        let table = if main { &self.main_props } else { &self.sub_props };
        let key = *table.get(&prop_id)?;
        let raw = prop.value as i64;
        let value = if key.is_percent() {
            raw as f64 / 100.0
        } else {
            raw as f64
        };
        Some(EchoProp {
            prop_id,
            key,
            raw,
            value,
        })
    }

    fn echo_from_item(&self, item: &pb::PhantomItem) -> Echo {
        Echo {
            incr_id: item.incr_id as i64,
            item_id: item.id as i64,
            monster_id: self.monster_id(item.id as i64).unwrap_or(0),
            set_id: item.fetter_group_id,
            level: item.phantom_level,
            main_props: item
                .phantom_main_prop
                .iter()
                .filter_map(|p| self.echo_prop(p, true))
                .collect(),
            sub_props: item
                .phantom_sub_prop
                .iter()
                .filter_map(|p| self.echo_prop(p, false))
                .collect(),
            equipped_by: None,
            slot: None,
        }
    }

    pub fn tables_loaded(&self) -> bool {
        self.known
    }
}

/// Handle one decoded game packet, updating the account store and marking the
/// changed sections for the debounced `account-updated` event.
pub fn handle_packet(app: &AppHandle, gp: &spectrum::game::GamePacket) {
    let tables = app.state::<SnifferState>().extract_tables();
    let account = app.state::<AccountState>();
    let mut store = match account.store.lock() {
        Ok(s) => s,
        Err(_) => return,
    };

    let mut sections: Vec<&'static str> = Vec::new();
    // Echo referenced by a lock request; emitted once the store lock is free.
    let mut locked_echo: Option<Echo> = None;

    match gp.msg_id {
        PB_GET_ROLE_LIST_RESPONSE | PB_GET_ROLE_LIST_NOTIFY => {
            if gp.msg_id == PB_GET_ROLE_LIST_RESPONSE {
                if let Ok(msg) = gp.parse_proto::<pb::PbGetRoleListResponse>() {
                    let list: Vec<Resonator> = msg.role_list.iter().map(role_to_resonator).collect();
                    if !list.is_empty() {
                        store.upsert_resonators(list);
                        sections.push("resonators");
                    }
                }
            } else if let Ok(msg) = gp.parse_proto::<pb::PbGetRoleListNotify>() {
                let list: Vec<Resonator> = msg.role_list.iter().map(role_to_resonator).collect();
                if !list.is_empty() {
                    store.upsert_resonators(list);
                    sections.push("resonators");
                }
            }
        }
        PB_ROLE_ACTIVE_NOTIFY => {
            if let Ok(msg) = gp.parse_proto::<pb::PbRoleActiveNotify>() {
                if let Some(role) = msg.role.as_ref() {
                    store.upsert_resonators(vec![role_to_resonator(role)]);
                    sections.push("resonators");
                }
            }
        }
        PB_UP_LEVEL_ROLE_RESPONSE => {
            if let Ok(msg) = gp.parse_proto::<pb::PbUpLevelRoleResponse>() {
                if msg.code == pb::ErrorCode::Success as i32
                    && store.patch_resonator_level(msg.role_id as i64, msg.level)
                {
                    sections.push("resonators");
                }
            }
        }
        PB_ROLE_EXP_NOTIFY => {
            if let Ok(msg) = gp.parse_proto::<pb::PbRoleExpNotify>() {
                if store.patch_resonator_level(msg.role_id as i64, msg.level) {
                    sections.push("resonators");
                }
            }
        }
        PB_ROLE_SKILL_LEVEL_NOTIFY => {
            if let Ok(msg) = gp.parse_proto::<pb::PbRoleSkillLevelNotify>() {
                if let Some(skill) = msg.skill_info.as_ref() {
                    if store.merge_resonator_skill(
                        msg.role_id as i64,
                        skill.key as i64,
                        skill.value,
                    ) {
                        sections.push("resonators");
                    }
                }
            }
        }
        PB_UP_LEVEL_SKILL_RESPONSE => {
            if let Ok(msg) = gp.parse_proto::<pb::PbUpLevelSkillResponse>() {
                if msg.code == pb::ErrorCode::Success as i32 {
                    if let Some(skill) = msg.skill_info.as_ref() {
                        if store.merge_resonator_skill(
                            msg.role_id as i64,
                            skill.key as i64,
                            skill.value,
                        ) {
                            sections.push("resonators");
                        }
                    }
                }
            }
        }
        RESONANT_CHAIN_UNLOCK_RESPONSE => {
            if let Ok(msg) = gp.parse_proto::<pb::ResonantChainUnlockResponse>() {
                if msg.err_code == pb::ErrorCode::Success as i32
                    && store.raise_resonator_chain(
                        msg.role_id as i64,
                        msg.resonant_chain_group_index,
                    )
                {
                    sections.push("resonators");
                }
            }
        }
        ROLE_CHANGE_NOTIFY => {
            if let Ok(msg) = gp.parse_proto::<pb::RoleChangeNotify>() {
                if let Some(role) = msg.role_info.as_ref() {
                    store.upsert_resonators(vec![role_to_resonator(role)]);
                    sections.push("resonators");
                }
            }
        }
        ROLE_SKILL_QUICK_LEVEL_UP_RESPONSE => {
            if let Ok(msg) = gp.parse_proto::<pb::RoleSkillQuickLevelUpResponse>() {
                if msg.error_code == pb::ErrorCode::Success as i32 {
                    if let Some(role) = msg.role_info.as_ref() {
                        store.upsert_resonators(vec![role_to_resonator(role)]);
                        sections.push("resonators");
                    }
                }
            }
        }
        PHANTOM_ITEM_RESPONSE => {
            if let Ok(msg) = gp.parse_proto::<pb::PhantomItemResponse>() {
                let echoes: Vec<Echo> = msg
                    .phantom_item_list
                    .iter()
                    .map(|i| tables.echo_from_item(i))
                    .collect();
                if !echoes.is_empty() {
                    store.upsert_echoes(echoes);
                    sections.push("echoes");
                }
                for equip in &msg.equip_info {
                    store.apply_equip_info(
                        equip.role_id as i64,
                        &equip
                            .phantom_item_incr_id
                            .iter()
                            .map(|v| *v as i64)
                            .collect::<Vec<_>>(),
                    );
                }
                if !msg.equip_info.is_empty() {
                    sections.push("echoes");
                }
            }
        }
        PHANTOM_ITEM_UPDATE_NOTIFY => {
            if let Ok(msg) = gp.parse_proto::<pb::PhantomItemUpdateNotify>() {
                let echoes: Vec<Echo> = msg
                    .update_info
                    .iter()
                    .map(|i| tables.echo_from_item(i))
                    .collect();
                if !echoes.is_empty() {
                    store.upsert_echoes(echoes);
                    sections.push("echoes");
                }
            }
        }
        PHANTOM_ITEM_ADD_NOTIFY => {
            if let Ok(msg) = gp.parse_proto::<pb::PhantomItemAddNotify>() {
                let echoes: Vec<Echo> = msg
                    .phantom_item_list
                    .iter()
                    .map(|i| tables.echo_from_item(i))
                    .collect();
                if !echoes.is_empty() {
                    store.upsert_echoes(echoes);
                    sections.push("echoes");
                }
            }
        }
        PHANTOM_ITEM_REMOVE_NOTIFY => {
            if let Ok(msg) = gp.parse_proto::<pb::PhantomItemRemoveNotify>() {
                // Removal is not part of the model; ignore.
                let _ = msg;
            }
        }
        PHANTOM_LEVEL_UP_RESPONSE => {
            if let Ok(msg) = gp.parse_proto::<pb::PhantomLevelUpResponse>() {
                if msg.error_code == pb::ErrorCode::Success as i32 {
                    if let Some(item) = msg.update_info.as_ref() {
                        store.upsert_echoes(vec![tables.echo_from_item(item)]);
                        sections.push("echoes");
                    }
                }
            }
        }
        PHANTOM_EQUIP_INFO_NOTIFY => {
            if let Ok(msg) = gp.parse_proto::<pb::PhantomEquipInfoNotify>() {
                for equip in &msg.equip_info {
                    store.apply_equip_info(
                        equip.role_id as i64,
                        &equip
                            .phantom_item_incr_id
                            .iter()
                            .map(|v| *v as i64)
                            .collect::<Vec<_>>(),
                    );
                }
                if !msg.equip_info.is_empty() {
                    sections.push("echoes");
                }
            }
        }
        WEAPON_ITEM_RESPONSE => {
            if let Ok(msg) = gp.parse_proto::<pb::WeaponItemResponse>() {
                let weapons: Vec<Weapon> = msg.weapon_item_list.iter().map(weapon_item).collect();
                if !weapons.is_empty() {
                    store.upsert_weapons(weapons);
                    sections.push("weapons");
                }
            }
        }
        WEAPON_ALL_INFO_NOTIFY => {
            if let Ok(msg) = gp.parse_proto::<pb::WeaponAllInfoNotify>() {
                let weapons: Vec<Weapon> = msg.all_weapon.iter().map(one_weapon_item).collect();
                if !weapons.is_empty() {
                    store.upsert_weapons(weapons);
                    sections.push("weapons");
                }
            }
        }
        WEAPON_ADD_NOTIFY => {
            if let Ok(msg) = gp.parse_proto::<pb::WeaponAddNotify>() {
                if let Some(info) = msg.weapon_info.as_ref() {
                    store.upsert_weapons(vec![one_weapon_item(info)]);
                    sections.push("weapons");
                }
            }
        }
        WEAPON_ITEM_ADD_NOTIFY => {
            if let Ok(msg) = gp.parse_proto::<pb::WeaponItemAddNotify>() {
                let weapons: Vec<Weapon> = msg.weapon_item_list.iter().map(weapon_item).collect();
                if !weapons.is_empty() {
                    store.upsert_weapons(weapons);
                    sections.push("weapons");
                }
            }
        }
        WEAPON_LEVEL_UP_RESPONSE => {
            if let Ok(msg) = gp.parse_proto::<pb::WeaponLevelUpResponse>() {
                if msg.error_code == pb::ErrorCode::Success as i32
                    && store.patch_weapon(msg.inc_id as i64, Some(msg.weapon_level), None, None)
                {
                    sections.push("weapons");
                }
            }
        }
        WEAPON_BREACH_RESPONSE => {
            if let Ok(msg) = gp.parse_proto::<pb::WeaponBreachResponse>() {
                if msg.error_code == pb::ErrorCode::Success as i32
                    && store.patch_weapon(msg.inc_id as i64, None, Some(msg.weapon_breach), None)
                {
                    sections.push("weapons");
                }
            }
        }
        WEAPON_RESON_UP_RESPONSE => {
            if let Ok(msg) = gp.parse_proto::<pb::WeaponResonUpResponse>() {
                if msg.error_code == pb::ErrorCode::Success as i32
                    && store.patch_weapon(msg.inc_id as i64, None, None, Some(msg.reaon_level))
                {
                    sections.push("weapons");
                }
            }
        }
        EQUIP_TAKE_ON_RESPONSE => {
            if let Ok(msg) = gp.parse_proto::<pb::EquipTakeOnResponse>() {
                if msg.error_code == pb::ErrorCode::Success as i32
                    && apply_weapon_equip_data(&mut store, &msg.data_list)
                {
                    sections.push("weapons");
                }
            }
        }
        EQUIP_TAKE_ON_NOTIFY => {
            if let Ok(msg) = gp.parse_proto::<pb::EquipTakeOnNotify>() {
                if apply_weapon_equip_data(&mut store, &msg.data_list) {
                    sections.push("weapons");
                }
            }
        }
        PLAYER_BASIC_INFO_GET_RESPONSE => {
            if let Ok(msg) = gp.parse_proto::<pb::PlayerBasicInfoGetResponse>() {
                if let Some(details) = msg.info.as_ref() {
                    store.upsert_player(player_details(details));
                    sections.push("player");
                }
            }
        }
        PB_ITEM_LOCK_REQUEST => {
            // Lock/unlock of an item; for echoes this is the overlay asking
            // which echo is on screen. Non-echo items simply resolve to None.
            if let Ok(msg) = gp.parse_proto::<pb::ItemLockRequest>() {
                if msg.incr_id != 0 {
                    locked_echo = store.echo(msg.incr_id as i64);
                }
            }
        }
        _ => {}
    }

    drop(store);

    if let Some(echo) = locked_echo {
        crate::account::emit_echo_detected(app, &echo);
    }

    if !sections.is_empty() {
        mark_pending(app, &sections);
    }
}

/// Apply `EquipTakeOn*` rows: `EquipPos::Weapon` rows carry the equipped
/// weapon's incr id per role, with `0` meaning unequipped.
fn apply_weapon_equip_data(store: &mut AccountStore, data: &[pb::RoleLoadEquipData]) -> bool {
    let mut changed = false;
    for equip in data {
        if equip.pos != pb::EquipPos::Weapon as i32 {
            continue;
        }
        let incr_id = (equip.equip_inc_id != 0).then_some(equip.equip_inc_id as i64);
        if store.apply_weapon_equip(equip.role_id as i64, incr_id) {
            changed = true;
        }
    }
    changed
}

fn role_to_resonator(role: &pb::RoleInfo) -> Resonator {
    // Sequence level arrives in `ResonantChainGroupIndex` (1..=6; 0 = none).
    // The `Reson` array is never populated by the live server, so it is not
    // used at all.
    let chain = role.resonant_chain_group_index.clamp(0, 6);
    let skills = role
        .skills
        .iter()
        .map(|s| SkillNode {
            id: s.key as i64,
            level: s.value,
        })
        .collect();
    Resonator {
        id: role.role_id as i64,
        name: role.name.clone(),
        level: role.level,
        breakthrough: role.breakthrough,
        chain,
        skills,
    }
}

fn weapon_item(item: &pb::WeaponItem) -> Weapon {
    Weapon {
        incr_id: item.incr_id as i64,
        item_id: item.id as i64,
        level: item.weapon_level,
        breach: item.weapon_breach,
        rank: item.weapon_reson_level,
        equipped_by: (item.role_id != 0).then_some(item.role_id as i64),
    }
}

fn one_weapon_item(item: &pb::OneWeaponItemInfo) -> Weapon {
    Weapon {
        incr_id: item.inc_id as i64,
        item_id: 0,
        level: item.weapon_level,
        breach: item.weapon_breach,
        rank: item.weapon_reson_level,
        equipped_by: (item.role_id != 0).then_some(item.role_id as i64),
    }
}

fn player_details(details: &pb::PlayerDetails) -> PlayerInfo {
    PlayerInfo {
        player_id: details.player_id as i64,
        name: details.name.clone(),
        level: details.level,
        world_level: details.cur_world_level,
        signature: (!details.signature.is_empty()).then(|| details.signature.clone()),
    }
}

/// Mark sections dirty; the debounce thread flushes them into one event.
fn mark_pending(app: &AppHandle, sections: &[&str]) {
    if let Some(state) = app.try_state::<SnifferState>() {
        state.mark_pending(sections);
    }
}

pub fn stat_key_from_str(value: &str) -> Option<StatKey> {
    Some(match value {
        "hpFlat" => StatKey::HpFlat,
        "hpPercent" => StatKey::HpPercent,
        "atkFlat" => StatKey::AtkFlat,
        "atkPercent" => StatKey::AtkPercent,
        "defFlat" => StatKey::DefFlat,
        "defPercent" => StatKey::DefPercent,
        "critRate" => StatKey::CritRate,
        "critDmg" => StatKey::CritDmg,
        "energyRegen" => StatKey::EnergyRegen,
        "basicAtk" => StatKey::BasicAtk,
        "heavyAtk" => StatKey::HeavyAtk,
        "resonanceSkill" => StatKey::ResonanceSkill,
        "resonanceLiberation" => StatKey::ResonanceLiberation,
        "healingBonus" => StatKey::HealingBonus,
        "aero" => StatKey::Aero,
        "glacio" => StatKey::Glacio,
        "electro" => StatKey::Electro,
        "fusion" => StatKey::Fusion,
        "spectro" => StatKey::Spectro,
        "havoc" => StatKey::Havoc,
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percent_and_flat_scaling() {
        let tables = ExtractTables {
            main_props: [(5002i64, StatKey::CritDmg)].into_iter().collect(),
            sub_props: [(1i64, StatKey::HpFlat), (11i64, StatKey::CritRate)]
                .into_iter()
                .collect(),
            ..Default::default()
        };
        // critDmg raw 4400 -> 44.0%
        let crit = tables
            .echo_prop(
                &pb::PhantomPropInfo {
                    phantom_prop_id: 5002,
                    value: 4400,
                },
                true,
            )
            .unwrap();
        assert_eq!(crit.value, 44.0);
        assert_eq!(crit.raw, 4400);

        // hpFlat raw 2280 stays 2280
        let hp = tables
            .echo_prop(
                &pb::PhantomPropInfo {
                    phantom_prop_id: 1,
                    value: 2280,
                },
                false,
            )
            .unwrap();
        assert_eq!(hp.value, 2280.0);

        // critRate raw 630 -> 6.3%
        let cr = tables
            .echo_prop(
                &pb::PhantomPropInfo {
                    phantom_prop_id: 11,
                    value: 630,
                },
                false,
            )
            .unwrap();
        assert_eq!(cr.value, 6.3);
    }

    #[test]
    fn role_chain_comes_from_group_index() {
        // The live server sends the sequence level only in
        // `ResonantChainGroupIndex`; the legacy `Reson` array is never sent.
        let role = pb::RoleInfo {
            role_id: 1608,
            level: 90,
            breakthrough: 6,
            resonant_chain_group_index: 6,
            ..Default::default()
        };
        let resonator = role_to_resonator(&role);
        assert_eq!(resonator.chain, 6);

        // A sparse payload with no chain field maps to 0 (the store keeps the
        // previous value monotonic).
        let sparse = pb::RoleInfo {
            role_id: 1608,
            level: 90,
            ..Default::default()
        };
        assert_eq!(role_to_resonator(&sparse).chain, 0);
    }
}
