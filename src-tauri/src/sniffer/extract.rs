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

// Message ids from `data/wuwa-protos/packetIds.json`. The macro declares the
// consts and the early-bail-out table from one list, so a new protocol message
// is registered exactly once.
macro_rules! protocol_message_ids {
    ($(
        $(#[$doc:meta])*
        $name:ident = $id:literal,
    )*) => {
        $( $(#[$doc])* pub const $name: u16 = $id; )*

        /// Every message id [`handle_packet`] acts on. Anything else returns
        /// before the account store lock is taken: the vast majority of
        /// decoded traffic (combat, scene sync) never touches the store, and
        /// blocking the capture loop on that mutex risks overflowing the
        /// socket buffer - a single lost frame permanently stalls the passive
        /// KCP mirror. The match arms use these consts, so listing an id here
        /// is what registers it for the early bail-out.
        const HANDLED_MSG_IDS: &[u16] = &[$($name),*];
    };
}

protocol_message_ids! {
    PB_GET_ROLE_LIST_RESPONSE = 25557,
    PB_GET_ROLE_LIST_NOTIFY = 18368,
    PB_ROLE_ACTIVE_NOTIFY = 27050,
    PB_UP_LEVEL_ROLE_RESPONSE = 17222,
    PB_ROLE_EXP_NOTIFY = 27992,
    PB_ROLE_SKILL_LEVEL_NOTIFY = 17396,
    PB_UP_LEVEL_SKILL_RESPONSE = 17988,
    RESONANT_CHAIN_UNLOCK_RESPONSE = 29448,
    ROLE_CHANGE_NOTIFY = 28197,
    ROLE_SKILL_QUICK_LEVEL_UP_RESPONSE = 18822,
    PHANTOM_ITEM_RESPONSE = 26275,
    PHANTOM_ITEM_UPDATE_NOTIFY = 28162,
    PHANTOM_ITEM_ADD_NOTIFY = 17848,
    PHANTOM_EQUIP_INFO_NOTIFY = 15372,
    PHANTOM_LEVEL_UP_RESPONSE = 22489,
    /// Equipping one echo; splits its stack when it was part of one.
    PHANTOM_PUT_ON_RESPONSE = 16317,
    /// The "auto equip" recommendation; may split and merge several stacks.
    PHANTOM_AUTO_PUT_RESPONSE = 19223,
    /// Stat re-roll of an echo; splits its stack when it was part of one.
    PHANTOM_POLISH_RESPONSE = 16484,
    /// Applying a saved echo loadout; may split and merge several stacks.
    USE_PHANTOM_EQUIP_GROUP_RESPONSE = 21750,
    WEAPON_ITEM_RESPONSE = 27089,
    WEAPON_ALL_INFO_NOTIFY = 19780,
    WEAPON_ADD_NOTIFY = 18560,
    WEAPON_ITEM_ADD_NOTIFY = 24339,
    WEAPON_LEVEL_UP_RESPONSE = 21842,
    WEAPON_BREACH_RESPONSE = 24159,
    WEAPON_RESON_UP_RESPONSE = 24490,
    EQUIP_TAKE_ON_RESPONSE = 28184,
    EQUIP_TAKE_ON_NOTIFY = 28760,
    PLAYER_BASIC_INFO_GET_RESPONSE = 22549,
    /// Server push for an item's mark state (lock/discard) change. The overlay
    /// supervisor triggers it on purpose (see `overlay::toggle_echo_mark`) to
    /// learn which echo is on screen and to keep every echo's `FuncValue`
    /// current.
    ITEM_FUNC_VALUE_UPDATE_NOTIFY = 23784,
}

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
        if let Ok(entries) =
            crate::config::load_json_resource::<Vec<EchoCatalogEntry>>(app, "echo_data.json")
        {
            for entry in entries {
                if let Some(monster_id) = entry.monster_id {
                    tables.item_to_monster.insert(entry.echo_id, monster_id);
                }
            }
        }
        if let Ok(props) =
            crate::config::load_json_resource::<EchoPropsFile>(app, "echo_props.json")
        {
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
        let table = if main {
            &self.main_props
        } else {
            &self.sub_props
        };
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
    crate::sniffer::progression::handle(app, gp);
    crate::sniffer::world::handle(app, gp);
    crate::sniffer::position::handle(app, gp);
    crate::sniffer::teams::handle(app, gp);

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
        PB_GET_ROLE_LIST_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::PbGetRoleListResponse>(app, gp) {
                upsert_resonators(
                    &mut store,
                    &mut sections,
                    msg.role_list.iter().map(role_to_resonator),
                );
            }
        }
        PB_GET_ROLE_LIST_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::PbGetRoleListNotify>(app, gp) {
                upsert_resonators(
                    &mut store,
                    &mut sections,
                    msg.role_list.iter().map(role_to_resonator),
                );
            }
        }
        PB_ROLE_ACTIVE_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::PbRoleActiveNotify>(app, gp) {
                upsert_resonators(
                    &mut store,
                    &mut sections,
                    msg.role.iter().map(role_to_resonator),
                );
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
                merge_skill(
                    &mut store,
                    &mut sections,
                    msg.role_id,
                    msg.skill_info.as_ref(),
                );
            }
        }
        PB_UP_LEVEL_SKILL_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::PbUpLevelSkillResponse>(app, gp) {
                if msg.code == pb::ErrorCode::Success as i32 {
                    merge_skill(
                        &mut store,
                        &mut sections,
                        msg.role_id,
                        msg.skill_info.as_ref(),
                    );
                }
            }
        }
        RESONANT_CHAIN_UNLOCK_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::ResonantChainUnlockResponse>(app, gp) {
                if msg.err_code == pb::ErrorCode::Success as i32
                    && store
                        .raise_resonator_chain(msg.role_id as i64, msg.resonant_chain_group_index)
                {
                    sections.push("resonators");
                }
            }
        }
        ROLE_CHANGE_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::RoleChangeNotify>(app, gp) {
                upsert_resonators(
                    &mut store,
                    &mut sections,
                    msg.role_info.iter().map(role_to_resonator),
                );
            }
        }
        ROLE_SKILL_QUICK_LEVEL_UP_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::RoleSkillQuickLevelUpResponse>(app, gp) {
                if msg.error_code == pb::ErrorCode::Success as i32 {
                    upsert_resonators(
                        &mut store,
                        &mut sections,
                        msg.role_info.iter().map(role_to_resonator),
                    );
                }
            }
        }
        PHANTOM_ITEM_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::PhantomItemResponse>(app, gp) {
                upsert_echoes(
                    &mut store,
                    &mut sections,
                    msg.phantom_item_list
                        .iter()
                        .map(|i| tables.echo_from_item(i)),
                );
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
                upsert_echoes(
                    &mut store,
                    &mut sections,
                    msg.phantom_item_list
                        .iter()
                        .map(|i| tables.echo_from_item(i)),
                );
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
                apply_operation_response(
                    msg.error_code,
                    &tables,
                    &mut store,
                    &mut sections,
                    &msg.stack_split_infos,
                    &msg.stack_merge_infos,
                    &msg.equip_info_list,
                );
            }
        }
        PHANTOM_AUTO_PUT_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::PhantomAutoPutResponse>(app, gp) {
                apply_operation_response(
                    msg.error_code,
                    &tables,
                    &mut store,
                    &mut sections,
                    &msg.stack_split_infos,
                    &msg.stack_merge_infos,
                    &msg.equip_info_list,
                );
            }
        }
        USE_PHANTOM_EQUIP_GROUP_RESPONSE => {
            if let Some(msg) = parse_msg::<pb::UsePhantomEquipGroupResponse>(app, gp) {
                apply_operation_response(
                    msg.error_code,
                    &tables,
                    &mut store,
                    &mut sections,
                    &msg.stack_split_infos,
                    &msg.stack_merge_infos,
                    &msg.equip_info_list,
                );
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
                upsert_weapons(
                    &mut store,
                    &mut sections,
                    msg.weapon_item_list.iter().map(weapon_item),
                );
            }
        }
        WEAPON_ALL_INFO_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::WeaponAllInfoNotify>(app, gp) {
                upsert_weapons(
                    &mut store,
                    &mut sections,
                    msg.all_weapon.iter().map(one_weapon_item),
                );
            }
        }
        WEAPON_ADD_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::WeaponAddNotify>(app, gp) {
                upsert_weapons(
                    &mut store,
                    &mut sections,
                    msg.weapon_info.iter().map(one_weapon_item),
                );
            }
        }
        WEAPON_ITEM_ADD_NOTIFY => {
            if let Some(msg) = parse_msg::<pb::WeaponItemAddNotify>(app, gp) {
                upsert_weapons(
                    &mut store,
                    &mut sections,
                    msg.weapon_item_list.iter().map(weapon_item),
                );
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
        app.state::<SnifferState>().log(format!(
            "func value update for unknown echo {incr_id} (ignored)"
        ));
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
            app.state::<SnifferState>().record_decode_failure(
                gp.msg_id,
                gp.get_msg_name(),
                &e.to_string(),
            );
            None
        }
    }
}

/// Upsert a resonator list/snapshot and mark the section when it carried
/// entries. Single-role payloads pass the `Option`'s iterator (0 or 1 items).
fn upsert_resonators(
    store: &mut AccountStore,
    sections: &mut Vec<&'static str>,
    roles: impl IntoIterator<Item = Resonator>,
) {
    let list: Vec<Resonator> = roles.into_iter().collect();
    if !list.is_empty() {
        store.upsert_resonators(list);
        sections.push("resonators");
    }
}

/// Upsert a weapon list/snapshot and mark the section when it carried entries.
fn upsert_weapons(
    store: &mut AccountStore,
    sections: &mut Vec<&'static str>,
    weapons: impl IntoIterator<Item = Weapon>,
) {
    let list: Vec<Weapon> = weapons.into_iter().collect();
    if !list.is_empty() {
        store.upsert_weapons(list);
        sections.push("weapons");
    }
}

/// Upsert an echo list/snapshot and mark the section when it carried entries.
fn upsert_echoes(
    store: &mut AccountStore,
    sections: &mut Vec<&'static str>,
    echoes: impl IntoIterator<Item = Echo>,
) {
    let list: Vec<Echo> = echoes.into_iter().collect();
    if !list.is_empty() {
        store.upsert_echoes(list);
        sections.push("echoes");
    }
}

/// Merge one skill level row (`skill_info` of the skill notify/response) into
/// its resonator; payloads without the row are ignored.
fn merge_skill(
    store: &mut AccountStore,
    sections: &mut Vec<&'static str>,
    role_id: i32,
    skill: Option<&pb::ArrayIntInt>,
) {
    if let Some(skill) = skill {
        if store.merge_resonator_skill(role_id as i64, skill.key as i64, skill.value) {
            sections.push("resonators");
        }
    }
}

/// Shared body of the echo-operation responses (`PhantomPutOnResponse`,
/// `PhantomAutoPutResponse`, `UsePhantomEquipGroupResponse`): the stack
/// split/merge rows, then the equipment snapshot. Error responses are ignored.
#[allow(clippy::too_many_arguments)]
fn apply_operation_response(
    error_code: i32,
    tables: &ExtractTables,
    store: &mut AccountStore,
    sections: &mut Vec<&'static str>,
    splits: &[pb::PhantomStackSplitInfo],
    merges: &[pb::PhantomStackMergeInfo],
    equip_list: &[pb::RolePhantomEquipInfo],
) {
    if error_code == pb::ErrorCode::Success as i32
        && apply_echo_operation(tables, store, splits.iter(), merges.iter(), equip_list)
    {
        sections.push("echoes");
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

/// Apply one full echo-operation response (`PhantomPutOnResponse`,
/// `PhantomAutoPutResponse`, `UsePhantomEquipGroupResponse`): the stack
/// split/merge rows, then the equipment snapshot. The caller checks the
/// response error code. Returns whether the store changed.
fn apply_echo_operation<'a>(
    tables: &ExtractTables,
    store: &mut AccountStore,
    splits: impl Iterator<Item = &'a pb::PhantomStackSplitInfo>,
    merges: impl Iterator<Item = &'a pb::PhantomStackMergeInfo>,
    equip_list: &[pb::RolePhantomEquipInfo],
) -> bool {
    let mut changed = apply_stack_ops(tables, store, splits, merges);
    if apply_equip_list(store, equip_list) {
        changed = true;
    }
    changed
}

/// Shared shape of `PhantomLevelUpResponse` / `PhantomPolishResponse`: apply
/// the stack operations that came with the response, then upsert the operated
/// item. `UpdateInfo` is the authoritative post-operation state while the
/// split's `OperateItem` is a pre-operation snapshot (a level-up of one copy
/// of a stack carries it at level 0 right next to the leveled `UpdateInfo`),
/// so it must not be the last write for the operated id. The exception is a
/// polish whose merge consumed the operated echo: an `UpdateInfo` naming a
/// merged id is transitional and would resurrect the dead instance.
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
    let merges: Vec<&pb::PhantomStackMergeInfo> = merges.collect();
    let consumed_by_merge = update_info.is_some_and(|item| {
        merges.iter().any(|merge| {
            merge.merged_incr_id != 0 && merge.merged_incr_id as i64 == item.incr_id as i64
        })
    });
    let changed = apply_stack_ops(tables, store, split.into_iter(), merges.into_iter())
        || update_info.is_some();
    let mut updated = Vec::new();
    if let Some(item) = update_info.filter(|_| !consumed_by_merge) {
        let echo = tables.echo_from_item(item);
        let incr_id = echo.incr_id;
        store.upsert_echoes(vec![echo]);
        if let Some(stored) = store.echo(incr_id) {
            updated.push(stored);
        }
    }
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
    fn handled_message_ids_are_unique() {
        // The consts and `HANDLED_MSG_IDS` come from one `protocol_message_ids!`
        // invocation, so a match arm always registers its id; this guards the
        // one thing the macro cannot: two protocol messages sharing an id.
        let mut seen = std::collections::HashSet::new();
        for id in HANDLED_MSG_IDS {
            assert!(
                seen.insert(*id),
                "message id {id} is listed twice in protocol_message_ids!"
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

        let (changed, updated, halves) =
            apply_update_with_split(&tables, &mut store, None, Some(&split), std::iter::empty());
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
    fn update_info_wins_over_stale_split_operate_item() {
        // Replay of a captured `PhantomLevelUpResponse` for one copy of a
        // 13-stack: `UpdateInfo` carries the operated echo at level 5 while
        // the split's `OperateItem` is a pre-operation snapshot at level 0
        // under the *same* instance id (the remainder moved to a new id).
        // The stale snapshot must not be the last write, or the store and the
        // overlay's split event keep showing the un-upgraded echo.
        let dir = std::env::temp_dir().join(format!("mny-extract-stale-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let mut store = AccountStore::load(dir.clone());
        let tables = ExtractTables::default();

        store.upsert_echoes(vec![tables.echo_from_item(&pb::PhantomItem {
            incr_id: 24972,
            stack_count: 13,
            ..Default::default()
        })]);

        let leveled = pb::PhantomItem {
            incr_id: 24972,
            phantom_level: 5,
            phantom_exp: 1600,
            stack_count: 1,
            ..Default::default()
        };
        let split = pb::PhantomStackSplitInfo {
            operate_item: Some(pb::PhantomItem {
                incr_id: 24972,
                phantom_level: 0,
                stack_count: 1,
                ..Default::default()
            }),
            operate_before_count: 13,
            remainder_item: Some(pb::PhantomItem {
                incr_id: 24973,
                phantom_level: 0,
                stack_count: 12,
                ..Default::default()
            }),
        };

        let (changed, updated, halves) = apply_update_with_split(
            &tables,
            &mut store,
            Some(&leveled),
            Some(&split),
            std::iter::empty(),
        );
        assert!(changed);
        // The refresh target is the leveled echo, not the stale snapshot.
        assert_eq!(updated.len(), 1);
        assert_eq!(updated[0].incr_id, 24972);
        assert_eq!(updated[0].level, 5);
        let (operated, remainder) = halves.expect("split halves reported");
        assert_eq!(operated.incr_id, 24972);
        assert_eq!(operated.level, 5);
        assert_eq!(operated.stack_count, 1);
        let remainder = remainder.expect("remainder stored");
        assert_eq!(remainder.incr_id, 24973);
        assert_eq!(remainder.stack_count, 12);
        assert_eq!(remainder.level, 0);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn merged_update_info_is_not_resurrected() {
        // A polish whose result merged the operated echo into another stack:
        // `UpdateInfo` names the consumed instance and must not be stored
        // after the merge removed it.
        let dir = std::env::temp_dir().join(format!("mny-extract-merged-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let mut store = AccountStore::load(dir.clone());
        let tables = ExtractTables::default();

        store.upsert_echoes(vec![
            tables.echo_from_item(&pb::PhantomItem {
                incr_id: 100,
                ..Default::default()
            }),
            tables.echo_from_item(&pb::PhantomItem {
                incr_id: 200,
                stack_count: 3,
                ..Default::default()
            }),
        ]);

        let polished = pb::PhantomItem {
            incr_id: 100,
            phantom_level: 1,
            stack_count: 1,
            ..Default::default()
        };
        let merge = pb::PhantomStackMergeInfo {
            merged_incr_id: 100,
            representative_item: Some(pb::PhantomItem {
                incr_id: 200,
                stack_count: 4,
                ..Default::default()
            }),
        };

        let (changed, updated, halves) = apply_update_with_split(
            &tables,
            &mut store,
            Some(&polished),
            None,
            std::iter::once(&merge),
        );
        assert!(changed);
        assert!(updated.is_empty());
        assert!(halves.is_none());
        assert!(store.echo(100).is_none());
        assert_eq!(store.echo(200).unwrap().stack_count, 4);
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
