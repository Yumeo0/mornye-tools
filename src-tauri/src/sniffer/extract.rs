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

use crate::account::model::{
    Echo, EchoProp, EchoSource, PlayerInfo, Resonator, SkillNode, StatKey, Weapon,
};
use crate::account::store::AccountStore;
use crate::account::AccountState;
use crate::sniffer::{FuncValueChange, SnifferState};

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
/// Equipping one echo; splits its stack when it was part of one.
pub const PHANTOM_PUT_ON_RESPONSE: u16 = 16317;
/// The "auto equip" recommendation; may split and merge several stacks.
pub const PHANTOM_AUTO_PUT_RESPONSE: u16 = 19223;
/// Stat re-roll of an echo; splits its stack when it was part of one.
pub const PHANTOM_POLISH_RESPONSE: u16 = 16484;
/// Applying a saved echo loadout; may split and merge several stacks.
pub const USE_PHANTOM_EQUIP_GROUP_RESPONSE: u16 = 21750;
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
/// Server push for an item's mark state (lock/discard) change. The overlay
/// triggers it on purpose (see `press_echo_toggle`) to learn which echo is on
/// screen and to keep every echo's `FuncValue` current.
pub const ITEM_FUNC_VALUE_UPDATE_NOTIFY: u16 = 23784;

/// Every message id [`handle_packet`] acts on. Anything else returns before
/// the account store lock is taken: the vast majority of decoded traffic
/// (combat, scene sync) never touches the store, and blocking the capture
/// loop on that mutex risks overflowing the socket buffer - a single lost
/// frame permanently stalls the passive KCP mirror.
const HANDLED_MSG_IDS: &[u16] = &[
    PB_GET_ROLE_LIST_RESPONSE,
    PB_GET_ROLE_LIST_NOTIFY,
    PB_ROLE_ACTIVE_NOTIFY,
    PB_UP_LEVEL_ROLE_RESPONSE,
    PB_ROLE_EXP_NOTIFY,
    PB_ROLE_SKILL_LEVEL_NOTIFY,
    PB_UP_LEVEL_SKILL_RESPONSE,
    RESONANT_CHAIN_UNLOCK_RESPONSE,
    ROLE_CHANGE_NOTIFY,
    ROLE_SKILL_QUICK_LEVEL_UP_RESPONSE,
    PHANTOM_ITEM_RESPONSE,
    PHANTOM_ITEM_UPDATE_NOTIFY,
    PHANTOM_ITEM_ADD_NOTIFY,
    PHANTOM_ITEM_REMOVE_NOTIFY,
    PHANTOM_EQUIP_INFO_NOTIFY,
    PHANTOM_LEVEL_UP_RESPONSE,
    PHANTOM_PUT_ON_RESPONSE,
    PHANTOM_AUTO_PUT_RESPONSE,
    PHANTOM_POLISH_RESPONSE,
    USE_PHANTOM_EQUIP_GROUP_RESPONSE,
    WEAPON_ITEM_RESPONSE,
    WEAPON_ALL_INFO_NOTIFY,
    WEAPON_ADD_NOTIFY,
    WEAPON_ITEM_ADD_NOTIFY,
    WEAPON_LEVEL_UP_RESPONSE,
    WEAPON_BREACH_RESPONSE,
    WEAPON_RESON_UP_RESPONSE,
    EQUIP_TAKE_ON_RESPONSE,
    EQUIP_TAKE_ON_NOTIFY,
    PLAYER_BASIC_INFO_GET_RESPONSE,
    ITEM_FUNC_VALUE_UPDATE_NOTIFY,
];

fn is_handled(msg_id: u16) -> bool {
    HANDLED_MSG_IDS.contains(&msg_id)
}

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
            func_value: item.func_value,
            // The game stacks identical echoes into one entry; a packet that
            // omits the field (0) means a single echo.
            stack_count: item.stack_count.max(1),
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
            source: EchoSource::Sniffer,
        }
    }

    pub fn tables_loaded(&self) -> bool {
        self.known
    }
}

/// Handle one decoded game packet, updating the account store and marking the
/// changed sections for the debounced `account-updated` event.
pub fn handle_packet(app: &AppHandle, gp: &spectrum::game::GamePacket) {
    // High-frequency traffic (combat, scene sync) never touches the store;
    // skip it before taking the lock so the capture loop stays responsive.
    if !is_handled(gp.msg_id) {
        return;
    }

    let tables = app.state::<SnifferState>().extract_tables();
    let account = app.state::<AccountState>();
    let mut store = match account.store.lock() {
        Ok(s) => s,
        Err(_) => return,
    };

    let mut sections: Vec<&'static str> = Vec::new();
    // Echo mark change from an `ItemFuncValueUpdateNotify`: recorded for the
    // overlay's toggle (it needs the pre-press value) and emitted once the
    // store lock is free.
    let mut func_value_change: Option<FuncValueChange> = None;
    let mut detected_echo: Option<Echo> = None;
    // A mark update for an instance the store has never seen; logged once the
    // lock is free (the identification round trip cannot restore its mark).
    let mut unknown_func_value_id: Option<i64> = None;
    // Echoes whose stats changed in place (upgrades, tuning); the overlay
    // refreshes its card from these without another key-press round-trip.
    let mut updated_echoes: Vec<Echo> = Vec::new();
    // Both halves of a stack split from a level-up/polish response; the
    // overlay follows the operated half (it may have a new instance id).
    let mut split_event: Option<(Echo, Option<Echo>)> = None;

    match gp.msg_id {
        PB_GET_ROLE_LIST_RESPONSE | PB_GET_ROLE_LIST_NOTIFY => {
            if gp.msg_id == PB_GET_ROLE_LIST_RESPONSE {
                if let Some(msg) = parse_msg::<pb::PbGetRoleListResponse>(app, gp) {
                    let list: Vec<Resonator> = msg.role_list.iter().map(role_to_resonator).collect();
                    if !list.is_empty() {
                        store.upsert_resonators(list);
                        sections.push("resonators");
                    }
                }
            } else if let Some(msg) = parse_msg::<pb::PbGetRoleListNotify>(app, gp) {
                let list: Vec<Resonator> = msg.role_list.iter().map(role_to_resonator).collect();
                if !list.is_empty() {
                    store.upsert_resonators(list);
                    sections.push("resonators");
                }
            }
        }
        PB_ROLE_ACTIVE_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::PbRoleActiveNotify>(app, gp) {
                if let Some(role) = msg.role.as_ref() {
                    store.upsert_resonators(vec![role_to_resonator(role)]);
                    sections.push("resonators");
                }
            }
        }
        PB_UP_LEVEL_ROLE_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::PbUpLevelRoleResponse>(app, gp) {
                if msg.code == pb::ErrorCode::Success as i32
                    && store.patch_resonator_level(msg.role_id as i64, msg.level)
                {
                    sections.push("resonators");
                }
            }
        }
        PB_ROLE_EXP_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::PbRoleExpNotify>(app, gp) {
                if store.patch_resonator_level(msg.role_id as i64, msg.level) {
                    sections.push("resonators");
                }
            }
        }
        PB_ROLE_SKILL_LEVEL_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::PbRoleSkillLevelNotify>(app, gp) {
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
            if let Some(msg) = parse_msg::<pb::PbUpLevelSkillResponse>(app, gp) {
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
            if let Some(msg) = parse_msg::<pb::ResonantChainUnlockResponse>(app, gp) {
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
            if let Some(msg) = parse_msg::<pb::RoleChangeNotify>(app, gp) {
                if let Some(role) = msg.role_info.as_ref() {
                    store.upsert_resonators(vec![role_to_resonator(role)]);
                    sections.push("resonators");
                }
            }
        }
        ROLE_SKILL_QUICK_LEVEL_UP_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::RoleSkillQuickLevelUpResponse>(app, gp) {
                if msg.error_code == pb::ErrorCode::Success as i32 {
                    if let Some(role) = msg.role_info.as_ref() {
                        store.upsert_resonators(vec![role_to_resonator(role)]);
                        sections.push("resonators");
                    }
                }
            }
        }
        PHANTOM_ITEM_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::PhantomItemResponse>(app, gp) {
                let echoes: Vec<Echo> = msg
                    .phantom_item_list
                    .iter()
                    .map(|i| tables.echo_from_item(i))
                    .collect();
                if !echoes.is_empty() {
                    store.upsert_echoes(echoes);
                    sections.push("echoes");
                }
                if apply_equip_list(&mut store, &msg.equip_info) {
                    sections.push("echoes");
                }
            }
        }
        PHANTOM_ITEM_UPDATE_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::PhantomItemUpdateNotify>(app, gp) {
                let echoes: Vec<Echo> = msg
                    .update_info
                    .iter()
                    .map(|i| tables.echo_from_item(i))
                    .collect();
                if !echoes.is_empty() {
                    let incr_ids: Vec<i64> = echoes.iter().map(|e| e.incr_id).collect();
                    store.upsert_echoes(echoes);
                    updated_echoes.extend(incr_ids.into_iter().filter_map(|id| store.echo(id)));
                    sections.push("echoes");
                }
            }
        }
        PHANTOM_ITEM_ADD_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::PhantomItemAddNotify>(app, gp) {
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
            if let Some(msg) = parse_msg::<pb::PhantomItemRemoveNotify>(app, gp) {
                // Removal is not part of the model; ignore.
                let _ = msg;
            }
        }
        PHANTOM_LEVEL_UP_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::PhantomLevelUpResponse>(app, gp) {
                if msg.error_code == pb::ErrorCode::Success as i32 {
                    // Leveling an echo that sits in a stack splits the stack;
                    // both halves must be upserted or the remainder's count
                    // (and possibly its new instance id) goes stale.
                    let (changed, updated, split) = apply_update_with_split(
                        &tables,
                        &mut store,
                        msg.update_info.as_ref(),
                        msg.stack_split_info.as_ref(),
                        std::iter::empty(),
                    );
                    if changed {
                        sections.push("echoes");
                    }
                    updated_echoes.extend(updated);
                    split_event = split;
                }
            }
        }
        PHANTOM_POLISH_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::PhantomPolishResponse>(app, gp) {
                if msg.error_code == pb::ErrorCode::Success as i32 {
                    let (changed, updated, split) = apply_update_with_split(
                        &tables,
                        &mut store,
                        msg.update_info.as_ref(),
                        msg.stack_split_info.as_ref(),
                        msg.stack_merge_infos.iter(),
                    );
                    if changed {
                        sections.push("echoes");
                    }
                    updated_echoes.extend(updated);
                    split_event = split;
                }
            }
        }
        PHANTOM_PUT_ON_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::PhantomPutOnResponse>(app, gp) {
                if msg.error_code == pb::ErrorCode::Success as i32 {
                    let mut changed = apply_stack_ops(
                        &tables,
                        &mut store,
                        msg.stack_split_infos.iter(),
                        msg.stack_merge_infos.iter(),
                    );
                    if apply_equip_list(&mut store, &msg.equip_info_list) {
                        changed = true;
                    }
                    if changed {
                        sections.push("echoes");
                    }
                }
            }
        }
        PHANTOM_AUTO_PUT_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::PhantomAutoPutResponse>(app, gp) {
                if msg.error_code == pb::ErrorCode::Success as i32 {
                    let mut changed = apply_stack_ops(
                        &tables,
                        &mut store,
                        msg.stack_split_infos.iter(),
                        msg.stack_merge_infos.iter(),
                    );
                    if apply_equip_list(&mut store, &msg.equip_info_list) {
                        changed = true;
                    }
                    if changed {
                        sections.push("echoes");
                    }
                }
            }
        }
        USE_PHANTOM_EQUIP_GROUP_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::UsePhantomEquipGroupResponse>(app, gp) {
                if msg.error_code == pb::ErrorCode::Success as i32 {
                    let mut changed = apply_stack_ops(
                        &tables,
                        &mut store,
                        msg.stack_split_infos.iter(),
                        msg.stack_merge_infos.iter(),
                    );
                    if apply_equip_list(&mut store, &msg.equip_info_list) {
                        changed = true;
                    }
                    if changed {
                        sections.push("echoes");
                    }
                }
            }
        }
        PHANTOM_EQUIP_INFO_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::PhantomEquipInfoNotify>(app, gp) {
                if apply_equip_list(&mut store, &msg.equip_info) {
                    sections.push("echoes");
                }
            }
        }
        WEAPON_ITEM_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::WeaponItemResponse>(app, gp) {
                let weapons: Vec<Weapon> = msg.weapon_item_list.iter().map(weapon_item).collect();
                if !weapons.is_empty() {
                    store.upsert_weapons(weapons);
                    sections.push("weapons");
                }
            }
        }
        WEAPON_ALL_INFO_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::WeaponAllInfoNotify>(app, gp) {
                let weapons: Vec<Weapon> = msg.all_weapon.iter().map(one_weapon_item).collect();
                if !weapons.is_empty() {
                    store.upsert_weapons(weapons);
                    sections.push("weapons");
                }
            }
        }
        WEAPON_ADD_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::WeaponAddNotify>(app, gp) {
                if let Some(info) = msg.weapon_info.as_ref() {
                    store.upsert_weapons(vec![one_weapon_item(info)]);
                    sections.push("weapons");
                }
            }
        }
        WEAPON_ITEM_ADD_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::WeaponItemAddNotify>(app, gp) {
                let weapons: Vec<Weapon> = msg.weapon_item_list.iter().map(weapon_item).collect();
                if !weapons.is_empty() {
                    store.upsert_weapons(weapons);
                    sections.push("weapons");
                }
            }
        }
        WEAPON_LEVEL_UP_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::WeaponLevelUpResponse>(app, gp) {
                if msg.error_code == pb::ErrorCode::Success as i32
                    && store.patch_weapon(msg.inc_id as i64, Some(msg.weapon_level), None, None)
                {
                    sections.push("weapons");
                }
            }
        }
        WEAPON_BREACH_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::WeaponBreachResponse>(app, gp) {
                if msg.error_code == pb::ErrorCode::Success as i32
                    && store.patch_weapon(msg.inc_id as i64, None, Some(msg.weapon_breach), None)
                {
                    sections.push("weapons");
                }
            }
        }
        WEAPON_RESON_UP_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::WeaponResonUpResponse>(app, gp) {
                if msg.error_code == pb::ErrorCode::Success as i32
                    && store.patch_weapon(msg.inc_id as i64, None, None, Some(msg.reaon_level))
                {
                    sections.push("weapons");
                }
            }
        }
        EQUIP_TAKE_ON_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::EquipTakeOnResponse>(app, gp) {
                if msg.error_code == pb::ErrorCode::Success as i32
                    && apply_weapon_equip_data(&mut store, &msg.data_list)
                {
                    sections.push("weapons");
                }
            }
        }
        EQUIP_TAKE_ON_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::EquipTakeOnNotify>(app, gp) {
                if apply_weapon_equip_data(&mut store, &msg.data_list) {
                    sections.push("weapons");
                }
            }
        }
        PLAYER_BASIC_INFO_GET_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::PlayerBasicInfoGetResponse>(app, gp) {
                if let Some(details) = msg.info.as_ref() {
                    store.upsert_player(player_details(details));
                    sections.push("player");
                }
            }
        }
        ITEM_FUNC_VALUE_UPDATE_NOTIFY => {
            // Mark state (lock/discard) of an item changed; for echoes this is
            // how the overlay learns which echo its key press toggled. Non-echo
            // items simply resolve to None.
            if let Some(msg) = parse_msg::<pb::ItemFuncValueUpdateNotify>(app, gp) {
                if msg.incr_id != 0 {
                    let incr_id = msg.incr_id as i64;
                    if let Some(previous) = store.echo(incr_id).map(|e| e.func_value) {
                        if let Some(echo) = store.set_echo_func_value(incr_id, msg.func_value) {
                            sections.push("echoes");
                            func_value_change = Some(FuncValueChange {
                                incr_id,
                                previous,
                                current: msg.func_value,
                            });
                            detected_echo = Some(echo);
                        }
                    } else {
                        // The store has never seen this instance (e.g. a
                        // stack-split response was lost): the echo cannot be
                        // rendered and the identifying key press that provoked
                        // the notify will not get its mark restored.
                        unknown_func_value_id = Some(incr_id);
                    }
                }
            }
        }
        _ => {}
    }

    drop(store);

    if let Some(change) = func_value_change {
        app.state::<SnifferState>().record_func_value_change(change);
    }

    if let Some(incr_id) = unknown_func_value_id {
        app.state::<SnifferState>()
            .log(format!("func value update for unknown echo {incr_id} (ignored)"));
    }

    if !updated_echoes.is_empty() {
        app.state::<SnifferState>().record_echo_update();
    }
    for echo in updated_echoes {
        crate::account::emit_echo_updated(app, &echo);
    }

    if let Some((operated, remainder)) = split_event {
        crate::account::emit_echo_split(app, &operated, remainder.as_ref());
    }

    if let Some(echo) = detected_echo {
        crate::account::emit_echo_detected(app, &echo);
    }

    if !sections.is_empty() {
        mark_pending(app, &sections);
    }
}

/// Parse a handled message's payload, making decode failures visible instead
/// of silently dropping the whole message (e.g. when the pinned
/// `protos.proto` drifts behind a game update, a failing
/// `PhantomItemResponse` would otherwise lose echoes with no trace).
fn parse_msg<T>(app: &AppHandle, gp: &spectrum::game::GamePacket) -> Option<T>
where
    T: spectrum::prost::Message + Default,
{
    match gp.parse_proto::<T>() {
        Ok(msg) => Some(msg),
        Err(e) => {
            app.state::<SnifferState>()
                .record_decode_failure(gp.msg_id, gp.get_msg_name(), &e.to_string());
            None
        }
    }
}

/// Apply `RolePhantomEquipInfo` rows (per-role equipment snapshots). Returns
/// whether any rows were present.
fn apply_equip_list(store: &mut AccountStore, list: &[pb::RolePhantomEquipInfo]) -> bool {
    if list.is_empty() {
        return false;
    }
    for equip in list {
        store.apply_equip_info(
            equip.role_id as i64,
            &equip
                .phantom_item_incr_id
                .iter()
                .map(|v| *v as i64)
                .collect::<Vec<_>>(),
        );
    }
    true
}

/// Apply the stack split/merge rows carried by echo operation responses
/// (level-up, equip, polish, loadout). Both halves of a split are full items
/// and are upserted: the remainder keeps its shrunken `StackCount` (possibly
/// under a new instance id) and the operated echo its own state. Ids absorbed
/// by a merge are removed before the representative is upserted with the
/// grown count. Returns whether the store changed.
fn apply_stack_ops<'a>(
    tables: &ExtractTables,
    store: &mut AccountStore,
    splits: impl Iterator<Item = &'a pb::PhantomStackSplitInfo>,
    merges: impl Iterator<Item = &'a pb::PhantomStackMergeInfo>,
) -> bool {
    let mut echoes: Vec<Echo> = Vec::new();
    let mut merged_ids: Vec<i64> = Vec::new();
    for split in splits {
        for item in split.operate_item.iter().chain(split.remainder_item.iter()) {
            echoes.push(tables.echo_from_item(item));
        }
    }
    for merge in merges {
        for item in merge.representative_item.iter() {
            echoes.push(tables.echo_from_item(item));
        }
        if merge.merged_incr_id != 0 {
            merged_ids.push(merge.merged_incr_id as i64);
        }
    }
    let mut changed = false;
    // Removals run before the upsert so a degenerate payload naming the same
    // id as both merged and representative still ends with it stored.
    for id in merged_ids {
        if store.remove_merged_echo(id) {
            changed = true;
        }
    }
    if !echoes.is_empty() {
        store.upsert_echoes(echoes);
        changed = true;
    }
    changed
}

/// Shared shape of `PhantomLevelUpResponse` / `PhantomPolishResponse`: upsert
/// the operated item, then apply the stack operations that came with it.
/// Returns whether the store changed, the echoes the overlay should refresh,
/// and - when the operation split a stack - both halves as stored, so the
/// overlay can follow the operated half under its (possibly new) instance id.
/// When the response carries only the split, the operated half is the echo
/// that was leveled/polished.
fn apply_update_with_split<'a>(
    tables: &ExtractTables,
    store: &mut AccountStore,
    update_info: Option<&pb::PhantomItem>,
    split: Option<&'a pb::PhantomStackSplitInfo>,
    merges: impl Iterator<Item = &'a pb::PhantomStackMergeInfo>,
) -> (bool, Vec<Echo>, Option<(Echo, Option<Echo>)>) {
    let mut updated = Vec::new();
    if let Some(item) = update_info {
        let echo = tables.echo_from_item(item);
        let incr_id = echo.incr_id;
        store.upsert_echoes(vec![echo]);
        if let Some(stored) = store.echo(incr_id) {
            updated.push(stored);
        }
    }
    let changed =
        apply_stack_ops(tables, store, split.into_iter(), merges) || update_info.is_some();
    // Read the halves back from the store so equipment and overrides are
    // already applied.
    let mut split_halves = None;
    if let Some(operate_item) = split.and_then(|s| s.operate_item.as_ref()) {
        if let Some(operated) = store.echo(operate_item.incr_id as i64) {
            if update_info.is_none() {
                updated.push(operated.clone());
            }
            let remainder = split
                .and_then(|s| s.remainder_item.as_ref())
                .map(|i| i.incr_id as i64)
                .and_then(|id| store.echo(id));
            split_halves = Some((operated, remainder));
        }
    }
    (changed, updated, split_halves)
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
    fn handled_msg_ids_cover_every_const() {
        // Guards the early-return in `handle_packet`: every message id with a
        // match arm must be registered, or its packets are dropped unseen.
        for id in [
            PB_GET_ROLE_LIST_RESPONSE,
            PB_GET_ROLE_LIST_NOTIFY,
            PB_ROLE_ACTIVE_NOTIFY,
            PB_UP_LEVEL_ROLE_RESPONSE,
            PB_ROLE_EXP_NOTIFY,
            PB_ROLE_SKILL_LEVEL_NOTIFY,
            PB_UP_LEVEL_SKILL_RESPONSE,
            RESONANT_CHAIN_UNLOCK_RESPONSE,
            ROLE_CHANGE_NOTIFY,
            ROLE_SKILL_QUICK_LEVEL_UP_RESPONSE,
            PHANTOM_ITEM_RESPONSE,
            PHANTOM_ITEM_UPDATE_NOTIFY,
            PHANTOM_ITEM_ADD_NOTIFY,
            PHANTOM_ITEM_REMOVE_NOTIFY,
            PHANTOM_EQUIP_INFO_NOTIFY,
            PHANTOM_LEVEL_UP_RESPONSE,
            PHANTOM_PUT_ON_RESPONSE,
            PHANTOM_AUTO_PUT_RESPONSE,
            PHANTOM_POLISH_RESPONSE,
            USE_PHANTOM_EQUIP_GROUP_RESPONSE,
            WEAPON_ITEM_RESPONSE,
            WEAPON_ALL_INFO_NOTIFY,
            WEAPON_ADD_NOTIFY,
            WEAPON_ITEM_ADD_NOTIFY,
            WEAPON_LEVEL_UP_RESPONSE,
            WEAPON_BREACH_RESPONSE,
            WEAPON_RESON_UP_RESPONSE,
            EQUIP_TAKE_ON_RESPONSE,
            EQUIP_TAKE_ON_NOTIFY,
            PLAYER_BASIC_INFO_GET_RESPONSE,
            ITEM_FUNC_VALUE_UPDATE_NOTIFY,
        ] {
            assert!(
                is_handled(id),
                "message id {id} has a match arm but is missing from HANDLED_MSG_IDS"
            );
        }
    }

    #[test]
    fn stack_count_normalizes_to_at_least_one() {
        let tables = ExtractTables::default();
        // A packet that omits `StackCount` (0) means a single echo.
        let single = tables.echo_from_item(&pb::PhantomItem {
            incr_id: 1,
            stack_count: 0,
            ..Default::default()
        });
        assert_eq!(single.stack_count, 1);
        let stacked = tables.echo_from_item(&pb::PhantomItem {
            incr_id: 2,
            stack_count: 51,
            ..Default::default()
        });
        assert_eq!(stacked.stack_count, 51);
    }

    #[test]
    fn stack_ops_upsert_split_halves_and_drop_merged_ids() {
        let dir = std::env::temp_dir().join(format!("mny-extract-stack-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let mut store = AccountStore::load(dir.clone());
        let tables = ExtractTables::default();

        // A stack of 51 (id 100) and a loose echo (id 200).
        store.upsert_echoes(vec![
            tables.echo_from_item(&pb::PhantomItem {
                incr_id: 100,
                stack_count: 51,
                ..Default::default()
            }),
            tables.echo_from_item(&pb::PhantomItem {
                incr_id: 200,
                ..Default::default()
            }),
        ]);

        // Operating on one copy splits the stack: the operated echo stays at
        // id 100 with count 1, the remainder moves to a new id with count 50.
        let split = pb::PhantomStackSplitInfo {
            operate_item: Some(pb::PhantomItem {
                incr_id: 100,
                phantom_level: 1,
                stack_count: 1,
                ..Default::default()
            }),
            operate_before_count: 51,
            remainder_item: Some(pb::PhantomItem {
                incr_id: 300,
                stack_count: 50,
                ..Default::default()
            }),
        };
        assert!(apply_stack_ops(
            &tables,
            &mut store,
            std::iter::once(&split),
            std::iter::empty()
        ));
        assert_eq!(store.echo(100).unwrap().stack_count, 1);
        assert_eq!(store.echo(100).unwrap().level, 1);
        assert_eq!(store.echo(300).unwrap().stack_count, 50);

        // Merging the loose echo into the remainder drops id 200 and grows
        // the representative.
        let merge = pb::PhantomStackMergeInfo {
            merged_incr_id: 200,
            representative_item: Some(pb::PhantomItem {
                incr_id: 300,
                stack_count: 51,
                ..Default::default()
            }),
        };
        assert!(apply_stack_ops(
            &tables,
            &mut store,
            std::iter::empty(),
            std::iter::once(&merge)
        ));
        assert!(store.echo(200).is_none());
        assert_eq!(store.echo(300).unwrap().stack_count, 51);
        assert_eq!(store.snapshot().echoes.len(), 2);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn update_with_split_returns_both_halves_for_the_overlay() {
        let dir = std::env::temp_dir().join(format!("mny-extract-split-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let mut store = AccountStore::load(dir.clone());
        let tables = ExtractTables::default();

        // A stack of 51 (id 100); leveling one copy moves it to a new id and
        // leaves the remainder under the old one.
        store.upsert_echoes(vec![tables.echo_from_item(&pb::PhantomItem {
            incr_id: 100,
            stack_count: 51,
            ..Default::default()
        })]);
        let split = pb::PhantomStackSplitInfo {
            operate_item: Some(pb::PhantomItem {
                incr_id: 500,
                phantom_level: 1,
                stack_count: 1,
                ..Default::default()
            }),
            operate_before_count: 51,
            remainder_item: Some(pb::PhantomItem {
                incr_id: 100,
                stack_count: 50,
                ..Default::default()
            }),
        };

        let (changed, updated, halves) = apply_update_with_split(
            &tables,
            &mut store,
            None,
            Some(&split),
            std::iter::empty(),
        );
        assert!(changed);
        // Without `UpdateInfo`, the operated half is the overlay's refresh
        // target and the split payload.
        assert_eq!(
            updated.iter().map(|e| e.incr_id).collect::<Vec<_>>(),
            vec![500]
        );
        let (operated, remainder) = halves.expect("split halves reported");
        assert_eq!(operated.incr_id, 500);
        assert_eq!(operated.level, 1);
        let remainder = remainder.expect("remainder stored");
        assert_eq!(remainder.incr_id, 100);
        assert_eq!(remainder.stack_count, 50);
        let _ = std::fs::remove_dir_all(&dir);
    }

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
