//! Unified, game-ID-based account model.
//!
//! This is the single structured store fed exclusively by the packet sniffer
//! (`sniffer::extract`). Names are presentation only; identity is always a game
//! id (role id, incr id, item id, monster id, set id).

use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct QuestSnapshot {
    pub list_synced_at: Option<u64>,
    pub completed_synced_at: Option<u64>,
    pub states: BTreeMap<i32, i32>,
    pub completed_ids: BTreeSet<i32>,
    pub available_ids: BTreeSet<i32>,
    pub active_nodes: BTreeMap<i32, BTreeSet<i32>>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AchievementEntry {
    pub finished_at: u32,
    pub claimed: bool,
    pub current: Option<i32>,
    pub target: Option<i32>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AchievementSnapshot {
    pub synced_at: Option<u64>,
    pub updated_at: Option<u64>,
    pub entries: BTreeMap<i32, AchievementEntry>,
    pub finished_count: i32,
    pub star_count: i32,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ProgressionSnapshot {
    pub player_id: i64,
    pub quests: QuestSnapshot,
    pub achievements: AchievementSnapshot,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorationSnapshot {
    pub player_id: i64,
    pub scene: Option<ExplorationScene>,
    #[serde(default)]
    pub rewards: BTreeMap<String, RewardEvidence>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorationScene {
    pub map_id: i32,
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RewardEvidence {
    pub map_id: i32,
    pub entity_id: i32,
    pub source: String,
    pub observed_at: u64,
}

/// Current schema version of `account.json`.
pub const STORE_VERSION: u32 = 1;

/// Stat key in the calculator's echo scope. Values carried by [`EchoProp`] use
/// display units (percent -> value/100, flat -> raw).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum StatKey {
    HpFlat,
    HpPercent,
    AtkFlat,
    AtkPercent,
    DefFlat,
    DefPercent,
    CritRate,
    CritDmg,
    EnergyRegen,
    BasicAtk,
    HeavyAtk,
    ResonanceSkill,
    ResonanceLiberation,
    HealingBonus,
    Aero,
    Glacio,
    Electro,
    Fusion,
    Spectro,
    Havoc,
}

impl StatKey {
    /// Whether the stat is expressed as a percentage in the calculator core.
    pub fn is_percent(self) -> bool {
        matches!(
            self,
            StatKey::HpPercent
                | StatKey::AtkPercent
                | StatKey::DefPercent
                | StatKey::CritRate
                | StatKey::CritDmg
                | StatKey::EnergyRegen
                | StatKey::BasicAtk
                | StatKey::HeavyAtk
                | StatKey::ResonanceSkill
                | StatKey::ResonanceLiberation
                | StatKey::HealingBonus
                | StatKey::Aero
                | StatKey::Glacio
                | StatKey::Electro
                | StatKey::Fusion
                | StatKey::Spectro
                | StatKey::Havoc
        )
    }
}

/// One echo main/sub property with both the lossless raw game value and the
/// calculator display value.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EchoProp {
    /// Game property id (`PhantomPropId`).
    pub prop_id: i64,
    pub key: StatKey,
    /// Raw game value (percent props are fixed-point x100).
    pub raw: i64,
    /// Calculator display unit (percent -> raw/100, flat -> raw).
    pub value: f64,
}

/// A skill node level carried by a resonator.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillNode {
    pub id: i64,
    pub level: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerInfo {
    pub player_id: i64,
    pub name: String,
    pub level: i32,
    pub world_level: i32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub signature: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Resonator {
    pub id: i64,
    #[serde(default)]
    pub name: String,
    pub level: i32,
    pub breakthrough: i32,
    /// Resonant chain / sequence level (0..=6).
    pub chain: i32,
    #[serde(default)]
    pub skills: Vec<SkillNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Weapon {
    pub incr_id: i64,
    pub item_id: i64,
    pub level: i32,
    pub breach: i32,
    pub rank: i32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub equipped_by: Option<i64>,
}

/// Where an echo came from: the packet sniffer or a manual entry.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EchoSource {
    /// Captured from the game's traffic (the default for existing stores).
    #[default]
    Sniffer,
    /// Entered by hand in the UI; user-owned and removable.
    Manual,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Echo {
    /// Game instance id (stable identity).
    pub incr_id: i64,
    /// Inventory `ItemId` (packet payload).
    pub item_id: i64,
    /// Calculator id (`MonsterId`).
    pub monster_id: i64,
    /// `FetterGroupId` (sonata set id).
    pub set_id: i32,
    pub level: i32,
    /// Item mark state (`PhantomItem.FuncValue`): 0 = none, 1 = locked,
    /// 2 = discard-marked.
    #[serde(default)]
    pub func_value: i32,
    /// How many identical echoes this entry represents
    /// (`PhantomItem.StackCount`). The game stacks duplicates of the same
    /// species into one inventory entry and splits the stack when one copy is
    /// operated on (level-up, equip, polish). Always >= 1; stores written
    /// before stacking was captured default to 1.
    #[serde(default = "default_stack_count")]
    pub stack_count: i32,
    #[serde(default)]
    pub main_props: Vec<EchoProp>,
    #[serde(default)]
    pub sub_props: Vec<EchoProp>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub equipped_by: Option<i64>,
    /// Slot index within the equipped set; `0` is the main echo.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub slot: Option<u8>,
    /// Where the echo came from; manual entries are user-owned.
    #[serde(default)]
    pub source: EchoSource,
}

impl Echo {
    /// `func_value` of an echo marked for discard.
    pub const FUNC_VALUE_DISCARD: i32 = 2;
}

/// Legacy `account.json` entries predate stack capture and mean "one echo".
fn default_stack_count() -> i32 {
    1
}

/// A saved in-game formation captured by the sniffer.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedTeam {
    pub id: i32,
    #[serde(default)]
    pub name: String,
    pub role_ids: Vec<i64>,
    #[serde(default)]
    pub is_current: bool,
}

/// The full account store persisted to `account.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountSnapshot {
    pub version: u32,
    pub updated_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub player: Option<PlayerInfo>,
    #[serde(default)]
    pub resonators: Vec<Resonator>,
    #[serde(default)]
    pub weapons: Vec<Weapon>,
    #[serde(default)]
    pub echoes: Vec<Echo>,
    #[serde(default)]
    pub teams: Vec<SavedTeam>,
    #[serde(default)]
    pub exploration: ExplorationSnapshot,
    #[serde(default)]
    pub progression: ProgressionSnapshot,
}

impl Default for AccountSnapshot {
    fn default() -> Self {
        Self {
            version: STORE_VERSION,
            updated_at: String::new(),
            player: None,
            resonators: Vec::new(),
            weapons: Vec::new(),
            echoes: Vec::new(),
            teams: Vec::new(),
            exploration: Default::default(),
            progression: Default::default(),
        }
    }
}

/// A user adjustment that must always win over packet data.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EchoOverride {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub equipped_by: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub slot: Option<u8>,
}

/// The user-writable overrides file. This is the only account data the UI may
/// change directly.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Overrides {
    /// `incr_id` (string key) -> override.
    #[serde(default)]
    pub echoes: std::collections::BTreeMap<String, EchoOverride>,
}
