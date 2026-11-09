//! Read the public Settings JSON export without treating it as an internal store.
use crate::model::*;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum BackupPart {
    Resonators,
    Weapons,
    Echoes,
    Map,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManualMark {
    pub collected: bool,
    pub updated_at: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Document {
    version: u32,
    player: Option<PlayerInfo>,
    resonators: Option<Vec<ExportResonator>>,
    weapons: Option<Vec<ExportWeapon>>,
    echoes: Option<Vec<ExportEcho>>,
    map: Option<BackupMap>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportSkill {
    node_id: i64,
    level: i32,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportResonator {
    resonator_id: i64,
    level: i32,
    breakthrough: i32,
    chain: i32,
    skills: Vec<ExportSkill>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportWeapon {
    instance_id: i64,
    item_id: i64,
    level: i32,
    breach: i32,
    rank: i32,
    equipped_by_resonator_id: Option<i64>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportStat {
    stat_id: i64,
    stat_key: StatKey,
    value: f64,
    raw_value: i64,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
enum MarkState {
    None,
    Locked,
    MarkedForDiscard,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportEcho {
    instance_id: i64,
    item_id: i64,
    monster_id: i64,
    echo_set_id: i32,
    level: i32,
    mark_state: MarkState,
    #[serde(default = "one")]
    stack_count: i32,
    main_stats: Vec<ExportStat>,
    sub_stats: Vec<ExportStat>,
    equipped_by_resonator_id: Option<i64>,
    slot_index: Option<u8>,
    source: EchoSource,
}
fn one() -> i32 {
    1
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupMap {
    pub profile: Option<ProfileIdentity>,
    pub player_id: i64,
    pub exploration: ExplorationSnapshot,
    pub manual_marks: BTreeMap<String, ManualMark>,
}

pub struct Backup {
    pub player: Option<PlayerInfo>,
    pub resonators: Option<Vec<Resonator>>,
    pub weapons: Option<Vec<Weapon>>,
    pub echoes: Option<Vec<Echo>>,
    pub map: Option<BackupMap>,
}

#[derive(Serialize)]
pub struct PartSummary {
    pub part: BackupPart,
    pub count: usize,
}

fn require(ok: bool, message: &str) -> Result<(), String> {
    if ok {
        Ok(())
    } else {
        Err(message.into())
    }
}
fn distinct(ids: impl Iterator<Item = i64>) -> bool {
    let mut seen = HashSet::new();
    ids.into_iter().all(|id| seen.insert(id))
}
fn role(id: Option<i64>) -> bool {
    id.is_none_or(|id| id > 0)
}
fn stats(values: Vec<ExportStat>, manual: bool) -> Result<Vec<EchoProp>, String> {
    values
        .into_iter()
        .map(|value| {
            let canonical = value.raw_value as f64
                / if value.stat_key.is_percent() {
                    100.0
                } else {
                    1.0
                };
            require(
                (value.stat_id > 0 || (manual && value.stat_id == 0))
                    && value.raw_value >= 0
                    && value.value.is_finite()
                    && value.value >= 0.0
                    && (if manual && !value.stat_key.is_percent() {
                        value.value.round() == value.raw_value as f64
                    } else {
                        (canonical - value.value).abs() < 0.00001
                    }),
                "An Echo stat has invalid or inconsistent values.",
            )?;
            Ok(EchoProp {
                prop_id: value.stat_id,
                key: value.stat_key,
                raw: value.raw_value,
                value: value.value,
            })
        })
        .collect()
}

impl Backup {
    pub fn parse(json: &str) -> Result<Self, String> {
        require(
            json.len() <= 32 * 1024 * 1024,
            "Choose an export smaller than 32 MB.",
        )?;
        let doc: Document = serde_json::from_str(json.trim_start_matches('\u{feff}'))
            .map_err(|error| format!("Invalid Mornye export: {error}"))?;
        require(
            doc.version == 1,
            "This Mornye export version is not supported.",
        )?;
        let resonators = doc
            .resonators
            .map(|rows| {
                rows.into_iter()
                    .map(|row| {
                        require(
                            row.resonator_id > 0
                                && (1..=90).contains(&row.level)
                                && (0..=6).contains(&row.breakthrough)
                                && (0..=6).contains(&row.chain),
                            "A resonator has invalid IDs or levels.",
                        )?;
                        require(
                            row.skills
                                .iter()
                                .all(|node| node.node_id > 0 && (0..=20).contains(&node.level)),
                            "A skill node is invalid.",
                        )?;
                        Ok(Resonator {
                            id: row.resonator_id,
                            name: String::new(),
                            level: row.level,
                            breakthrough: row.breakthrough,
                            chain: row.chain,
                            skills: row
                                .skills
                                .into_iter()
                                .map(|node| SkillNode {
                                    id: node.node_id,
                                    level: node.level,
                                })
                                .collect(),
                        })
                    })
                    .collect::<Result<Vec<_>, String>>()
            })
            .transpose()?;
        let weapons = doc
            .weapons
            .map(|rows| {
                rows.into_iter()
                    .map(|row| {
                        require(
                            row.instance_id > 0
                                && row.item_id > 0
                                && (1..=90).contains(&row.level)
                                && (0..=6).contains(&row.breach)
                                && (1..=5).contains(&row.rank)
                                && role(row.equipped_by_resonator_id),
                            "A weapon has invalid IDs or levels.",
                        )?;
                        Ok(Weapon {
                            incr_id: row.instance_id,
                            item_id: row.item_id,
                            level: row.level,
                            breach: row.breach,
                            rank: row.rank,
                            equipped_by: row.equipped_by_resonator_id,
                        })
                    })
                    .collect::<Result<Vec<_>, String>>()
            })
            .transpose()?;
        let echoes = doc
            .echoes
            .map(|rows| {
                rows.into_iter()
                    .map(|row| {
                        require(
                            row.instance_id != 0
                                && (row.source == EchoSource::Manual) == (row.instance_id < 0)
                                && row.item_id > 0
                                && row.monster_id > 0
                                && row.echo_set_id > 0
                                && (0..=25).contains(&row.level)
                                && row.stack_count > 0
                                && role(row.equipped_by_resonator_id)
                                && row.slot_index.is_none_or(|slot| slot <= 4),
                            "An Echo has invalid IDs, levels, or equipment.",
                        )?;
                        require(
                            row.main_stats.len() <= 2 && row.sub_stats.len() <= 5,
                            "An Echo has too many stats.",
                        )?;
                        Ok(Echo {
                            incr_id: row.instance_id,
                            item_id: row.item_id,
                            monster_id: row.monster_id,
                            set_id: row.echo_set_id,
                            level: row.level,
                            func_value: match row.mark_state {
                                MarkState::None => 0,
                                MarkState::Locked => 1,
                                MarkState::MarkedForDiscard => 2,
                            },
                            stack_count: row.stack_count,
                            main_props: stats(row.main_stats, row.source == EchoSource::Manual)?,
                            sub_props: stats(row.sub_stats, row.source == EchoSource::Manual)?,
                            equipped_by: row.equipped_by_resonator_id,
                            slot: row.slot_index,
                            source: row.source,
                        })
                    })
                    .collect::<Result<Vec<_>, String>>()
            })
            .transpose()?;
        let backup = Self {
            player: doc.player,
            resonators,
            weapons,
            echoes,
            map: doc.map,
        };
        require(
            !backup.parts().is_empty(),
            "This file contains no Mornye account data or map progress.",
        )?;
        require(
            distinct(backup.resonators.iter().flatten().map(|row| row.id))
                && distinct(backup.weapons.iter().flatten().map(|row| row.incr_id))
                && distinct(backup.echoes.iter().flatten().map(|row| row.incr_id)),
            "The export contains duplicate instance or resonator IDs.",
        )?;
        let echo_slots: Vec<_> = backup
            .echoes
            .iter()
            .flatten()
            .filter_map(|e| e.equipped_by.zip(e.slot))
            .collect();
        require(
            echo_slots.iter().collect::<HashSet<_>>().len() == echo_slots.len(),
            "Multiple Echoes occupy the same equipment slot.",
        )?;
        require(
            distinct(
                backup
                    .weapons
                    .iter()
                    .flatten()
                    .filter_map(|w| w.equipped_by),
            ),
            "Multiple weapons are equipped by the same resonator.",
        )?;
        backup.player_id()?;
        if let Some(map) = &backup.map {
            require(
                map.manual_marks.keys().all(|key| valid_map_key(key)),
                "The export contains an invalid map marker key.",
            )?;
            require(
                map.exploration.rewards.iter().all(|(key, e)| {
                    *key == format!("{}:{}", e.map_id, e.entity_id)
                        && e.map_id > 0
                        && e.entity_id > 0
                        && [
                            "reward-response",
                            "tree-snapshot",
                            "tree-update",
                            "observed",
                        ]
                        .contains(&e.source.as_str())
                }),
                "The export contains invalid map evidence.",
            )?;
        }
        Ok(backup)
    }

    /// All positive identities in a file must name the same player.
    pub fn player_id(&self) -> Result<Option<i64>, String> {
        let ids = [
            self.player.as_ref().map(|p| p.player_id),
            self.map.as_ref().map(|m| m.player_id),
            self.map.as_ref().map(|m| m.exploration.player_id),
            self.map
                .as_ref()
                .and_then(|m| m.profile.as_ref().map(|p| p.player_id)),
        ];
        require(
            ids.iter().flatten().all(|id| *id >= 0),
            "Invalid player ID in export.",
        )?;
        let mut known = ids.into_iter().flatten().filter(|id| *id > 0);
        let first = known.next();
        require(
            known.all(|id| Some(id) == first),
            "The export mixes data from different players.",
        )?;
        Ok(first)
    }

    pub fn parts(&self) -> Vec<PartSummary> {
        let mut parts = Vec::new();
        if let Some(rows) = &self.resonators {
            parts.push(PartSummary {
                part: BackupPart::Resonators,
                count: rows.len(),
            });
        }
        if let Some(rows) = &self.weapons {
            parts.push(PartSummary {
                part: BackupPart::Weapons,
                count: rows.len(),
            });
        }
        if let Some(rows) = &self.echoes {
            parts.push(PartSummary {
                part: BackupPart::Echoes,
                count: rows.len(),
            });
        }
        if let Some(map) = &self.map {
            parts.push(PartSummary {
                part: BackupPart::Map,
                count: map
                    .exploration
                    .rewards
                    .keys()
                    .chain(map.manual_marks.keys())
                    .collect::<HashSet<_>>()
                    .len(),
            });
        }
        parts
    }

    pub fn merge(
        &self,
        current: &AccountSnapshot,
        parts: &[BackupPart],
    ) -> Result<AccountSnapshot, String> {
        require(
            !parts.is_empty()
                && parts
                    .iter()
                    .all(|part| self.parts().iter().any(|p| p.part == *part)),
            "Choose data types included in the export.",
        )?;
        let uid = current.profile.as_ref().map_or(0, |p| p.player_id);
        require(
            self.player_id()?.is_none_or(|id| id == uid),
            "The export belongs to a different player profile.",
        )?;
        let mut next = current.clone();
        if next.player.as_ref().is_none_or(|p| p.name.is_empty()) {
            if let Some(player) = self.player.as_ref().filter(|p| p.player_id == uid) {
                next.player = Some(player.clone());
            }
        }
        if parts.contains(&BackupPart::Resonators) {
            merge_rows(
                &mut next.resonators,
                self.resonators.as_deref().unwrap_or_default(),
                |r| r.id,
            );
        }
        if parts.contains(&BackupPart::Weapons) {
            let rows = self.weapons.as_deref().unwrap_or_default();
            let roles: HashSet<_> = rows.iter().filter_map(|w| w.equipped_by).collect();
            for weapon in &mut next.weapons {
                if weapon.equipped_by.is_some_and(|id| roles.contains(&id)) {
                    weapon.equipped_by = None;
                }
            }
            merge_rows(&mut next.weapons, rows, |r| r.incr_id);
        }
        if parts.contains(&BackupPart::Echoes) {
            let rows = self.echoes.as_deref().unwrap_or_default();
            let slots: HashSet<_> = rows
                .iter()
                .filter_map(|e| e.equipped_by.zip(e.slot))
                .collect();
            for echo in &mut next.echoes {
                if echo
                    .equipped_by
                    .zip(echo.slot)
                    .is_some_and(|slot| slots.contains(&slot))
                {
                    echo.equipped_by = None;
                    echo.slot = None;
                }
            }
            merge_rows(&mut next.echoes, rows, |r| r.incr_id);
        }
        if parts.contains(&BackupPart::Map) {
            let map = self.map.as_ref().unwrap();
            next.exploration.player_id = uid;
            if next.exploration.scene.is_none() {
                next.exploration.scene = map.exploration.scene.clone();
            }
            for (key, evidence) in &map.exploration.rewards {
                if next.exploration.rewards.get(key).is_none_or(|old| {
                    let collected = |e: &RewardEvidence| {
                        matches!(e.source.as_str(), "reward-response" | "tree-update")
                    };
                    if collected(old) != collected(evidence) {
                        collected(evidence)
                    } else {
                        old.observed_at < evidence.observed_at
                    }
                }) {
                    next.exploration
                        .rewards
                        .insert(key.clone(), evidence.clone());
                }
            }
        }
        Ok(next)
    }
}

fn valid_map_key(key: &str) -> bool {
    key.split_once(':').is_some_and(|(map, entity)| {
        map.parse::<i32>().is_ok_and(|n| n > 0) && entity.parse::<i32>().is_ok_and(|n| n > 0)
    })
}
fn merge_rows<T: Clone>(current: &mut Vec<T>, imported: &[T], key: impl Fn(&T) -> i64) {
    let mut positions: HashMap<_, _> = current
        .iter()
        .enumerate()
        .map(|(index, row)| (key(row), index))
        .collect();
    for row in imported {
        if let Some(index) = positions.get(&key(row)) {
            current[*index] = row.clone();
        } else {
            positions.insert(key(row), current.len());
            current.push(row.clone());
        }
    }
}

pub fn merge_marks(
    mut current: BTreeMap<String, ManualMark>,
    imported: &BTreeMap<String, ManualMark>,
) -> BTreeMap<String, ManualMark> {
    for (key, mark) in imported {
        if current
            .get(key)
            .is_none_or(|old| old.updated_at < mark.updated_at)
        {
            current.insert(key.clone(), mark.clone());
        }
    }
    current
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value};
    const FIXTURE: &str = include_str!("../../../../src/lib/fixtures/account-export.json");
    const PARTS: &[BackupPart] = &[
        BackupPart::Resonators,
        BackupPart::Weapons,
        BackupPart::Echoes,
        BackupPart::Map,
    ];

    fn fixture() -> Value {
        serde_json::from_str(FIXTURE).unwrap()
    }
    fn account() -> AccountSnapshot {
        let mut account = AccountSnapshot::default();
        account.profile =
            Some(serde_json::from_value(fixture()["map"]["profile"].clone()).unwrap());
        account
    }

    #[test]
    fn public_export_restores_raw_stats_equipment_stacks_sources_and_map() {
        let backup = Backup::parse(FIXTURE).unwrap();
        let next = backup.merge(&account(), PARTS).unwrap();
        assert_eq!(next.player.unwrap().name, "Yumeo");
        assert_eq!(next.resonators[0].skills[0].id, 3);
        assert_eq!(next.weapons[0].equipped_by, Some(1604));
        assert_eq!(next.echoes[0].stack_count, 2);
        assert_eq!(next.echoes[0].main_props[0].raw, 4400);
        assert_eq!(next.echoes[0].sub_props[0].value, 8.7);
        assert_eq!(next.echoes[1].source, EchoSource::Manual);
        assert_eq!(next.echoes[1].func_value, 2);
        assert_eq!(next.echoes[1].slot, Some(1));
        assert_eq!(next.echoes[1].main_props[0].prop_id, 0);
        assert_eq!(next.echoes[1].sub_props[0].value, 60.5);
        assert_eq!(next.exploration.scene.unwrap().map_id, 8);
        assert_eq!(next.exploration.rewards["8:3"].source, "tree-snapshot");
        let marks = merge_marks(BTreeMap::new(), &backup.map.unwrap().manual_marks);
        assert!(!marks["8:1"].collected);
        assert!(marks["8:2"].collected);
    }

    #[test]
    fn selected_empty_and_omitted_parts_do_not_delete_existing_data() {
        let full = Backup::parse(FIXTURE).unwrap();
        let current = full.merge(&account(), PARTS).unwrap();
        let partial = Backup::parse(r#"{"version":1,"echoes":[]}"#).unwrap();
        let next = partial.merge(&current, &[BackupPart::Echoes]).unwrap();
        assert_eq!(
            serde_json::to_value(&current).unwrap(),
            serde_json::to_value(&next).unwrap()
        );
        assert!(partial.merge(&current, &[BackupPart::Weapons]).is_err());
        assert!(partial.merge(&current, &[]).is_err());
        let selected = full.merge(&account(), &[BackupPart::Echoes]).unwrap();
        assert!(selected.weapons.is_empty());
        assert!(selected.exploration.rewards.is_empty());
    }

    #[test]
    fn rejects_malformed_exports_and_mixed_player_ids_before_restore() {
        for bad in [
            "{}",
            "{",
            r#"{"version":2,"echoes":[]}"#,
            r#"{"version":1,"weapons":{}}"#,
        ] {
            assert!(Backup::parse(bad).is_err());
        }
        for (path, value) in [
            ("/map/playerId", json!(999)),
            ("/map/exploration/playerId", json!(999)),
            ("/echoes/0/mainStats/0/rawValue", json!(123)),
            ("/echoes/0/slotIndex", json!(8)),
            ("/echoes/0/source", json!("manual")),
            ("/echoes/1/slotIndex", json!(0)),
            ("/echoes/0/stackCount", json!(0)),
            ("/weapons/0/rank", json!(9)),
            ("/resonators/0/level", json!(-1)),
        ] {
            let mut doc = fixture();
            *doc.pointer_mut(path).unwrap() = value;
            assert!(Backup::parse(&doc.to_string()).is_err(), "accepted {path}");
        }
        let backup = Backup::parse(FIXTURE).unwrap();
        let mut other = account();
        other.profile.as_mut().unwrap().player_id = 999;
        assert!(backup.merge(&other, PARTS).is_err());
        assert_eq!(other.echoes.len(), 0);
    }

    #[test]
    fn map_merge_keeps_newer_false_marks_and_meaningful_collection_evidence() {
        let backup = Backup::parse(FIXTURE).unwrap();
        let mut current = account();
        current.exploration.rewards.insert(
            "8:1".into(),
            RewardEvidence {
                map_id: 8,
                entity_id: 1,
                source: "tree-update".into(),
                observed_at: 50,
            },
        );
        current.exploration.rewards.insert(
            "8:3".into(),
            RewardEvidence {
                map_id: 8,
                entity_id: 3,
                source: "reward-response".into(),
                observed_at: 5,
            },
        );
        let next = backup.merge(&current, &[BackupPart::Map]).unwrap();
        assert_eq!(next.exploration.rewards["8:1"].observed_at, 50);
        assert_eq!(next.exploration.rewards["8:3"].source, "reward-response");
        let current = BTreeMap::from([(
            "8:2".into(),
            ManualMark {
                collected: false,
                updated_at: 60,
            },
        )]);
        let merged = merge_marks(current, &backup.map.as_ref().unwrap().manual_marks);
        assert!(!merged["8:2"].collected);
        assert_eq!(merged["8:2"].updated_at, 60);
        assert!(!merged["8:1"].collected);
        let repeated = backup.merge(&next, &[BackupPart::Map]).unwrap();
        assert_eq!(
            serde_json::to_value(next).unwrap(),
            serde_json::to_value(repeated).unwrap()
        );
    }

    #[test]
    fn restoring_equipment_clears_conflicts_and_stale_overrides_on_reload() {
        let dir = std::env::temp_dir().join(format!(
            "mornye-backup-{}-{}",
            std::process::id(),
            crate::store::now_iso8601().replace(':', "-")
        ));
        let mut store = crate::store::AccountStore::load(dir.clone());
        let backup = Backup::parse(FIXTURE).unwrap();
        let initial = backup.merge(&account(), PARTS).unwrap();
        store.restore_backup(initial, &[]).unwrap();
        store.set_echo_override(-1, Some(999), Some(4));
        let mut displaced = backup.echoes.as_ref().unwrap()[0].clone();
        displaced.incr_id = 99;
        store.upsert_echoes(vec![displaced]);
        let mut weapon = backup.weapons.as_ref().unwrap()[0].clone();
        weapon.incr_id = 99;
        store.upsert_weapons(vec![weapon]);
        let next = backup.merge(store.snapshot(), PARTS).unwrap();
        store.restore_backup(next, &[-1, 10]).unwrap();
        let reloaded = crate::store::AccountStore::load(dir.clone());
        let echoes = &reloaded.snapshot().echoes;
        assert_eq!(
            echoes.iter().find(|e| e.incr_id == -1).unwrap().slot,
            Some(1)
        );
        assert_eq!(
            echoes.iter().find(|e| e.incr_id == 99).unwrap().equipped_by,
            None
        );
        assert_eq!(
            reloaded
                .snapshot()
                .weapons
                .iter()
                .find(|w| w.incr_id == 99)
                .unwrap()
                .equipped_by,
            None
        );
        std::fs::remove_dir_all(dir).unwrap();
    }
}
