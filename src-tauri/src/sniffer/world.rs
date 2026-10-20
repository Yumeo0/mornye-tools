//! Scene/reward evidence. Only the sniffer writes this section of account.json.
//! Only successful reward RPCs and exact live claim-check updates record collections.
use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;

use serde::Deserialize;
use spectrum::game::{proto as pb, GamePacket};
use tauri::{AppHandle, Manager};

use super::SnifferState;
use crate::account::{
    model::{ExplorationScene, ExplorationSnapshot, RewardEvidence},
    AccountState,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Rules {
    reward_keys: HashSet<String>,
    claim_checks: HashMap<String, Vec<String>>,
}
static RULES: LazyLock<Rules> = LazyLock::new(|| {
    serde_json::from_str(include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../src/configs/map_rules.json"
    )))
    .expect("compiled map rules")
});

#[derive(Default)]
pub struct WorldCapture {
    player_id: i64,
    map_id: Option<i32>,
    scene_owner: i64,
    entities: HashMap<i64, String>,
    trees: HashMap<i64, i32>,
    pending: HashMap<u16, String>,
}

impl WorldCapture {
    fn record(snapshot: &mut ExplorationSnapshot, key: &str, source: &str, at: u64) -> bool {
        if !RULES.reward_keys.contains(key) {
            return false;
        }
        if !matches!(source, "reward-response" | "tree-update") {
            return false;
        }
        let Some((map, entity)) = key.split_once(':') else {
            return false;
        };
        let (Ok(map_id), Ok(entity_id)) = (map.parse(), entity.parse()) else {
            return false;
        };
        snapshot.rewards.insert(
            key.to_string(),
            RewardEvidence {
                map_id,
                entity_id,
                source: source.into(),
                observed_at: at,
            },
        );
        true
    }

    fn entity(&mut self, e: &pb::EntityPb) {
        if e.config_type != 1 {
            return;
        }
        let Some(map) = self.map_id else {
            return;
        };
        let key = format!("{map}:{}", e.config_id);
        if RULES.reward_keys.contains(&key) {
            self.entities.insert(e.id, key);
        }
    }

    fn claimed_node(
        &self,
        tree: i64,
        node: i32,
        snapshot: &mut ExplorationSnapshot,
        at: u64,
    ) -> bool {
        let Some(graph) = self.trees.get(&tree) else {
            return false;
        };
        let Some(keys) = RULES.claim_checks.get(&format!("{graph}_{node}")) else {
            return false;
        };
        let mut changed = false;
        for key in keys {
            changed |= Self::record(snapshot, key, "tree-update", at);
        }
        changed
    }

    pub fn handles(id: u16) -> bool {
        matches!(
            id,
            15380 | 18559 | 25185 | 17769 | 24443 | 28349 | 27985 | 20398 | 18896
        )
    }

    /// Returns whether persisted exploration changed. Parsing errors remain visible to diagnostics.
    pub fn apply(
        &mut self,
        gp: &GamePacket,
        snapshot: &mut ExplorationSnapshot,
        player_id: i64,
        at: u64,
    ) -> Result<bool, spectrum::prost::DecodeError> {
        if gp.msg_id == 15380 {
            let m = gp.parse_proto::<pb::BasicInfoNotify>()?;
            self.player_id = i64::from(m.id);
            self.map_id = None;
            self.entities.clear();
            self.trees.clear();
            self.pending.clear();
            if snapshot.player_id != self.player_id {
                *snapshot = ExplorationSnapshot::default();
            }
            snapshot.player_id = self.player_id;
            return Ok(true);
        }
        let player_id = if self.player_id != 0 {
            self.player_id
        } else {
            player_id
        };
        if gp.msg_id == 18559 {
            let m = gp.parse_proto::<pb::JoinSceneNotify>()?;
            self.entities.clear();
            self.trees.clear();
            self.pending.clear();
            self.map_id = None;
            let Some(scene) = m.scene_info else {
                return Ok(false);
            };
            self.scene_owner = i64::from(scene.owner_id);
            // Never label the local account's rewards using another player's scene.
            if player_id == 0 || self.scene_owner != player_id {
                snapshot.scene = None;
                return Ok(true);
            }
            if snapshot.player_id != player_id {
                *snapshot = ExplorationSnapshot::default();
            }
            snapshot.player_id = player_id;
            snapshot
                .rewards
                .retain(|_, e| matches!(e.source.as_str(), "reward-response" | "tree-update"));
            self.map_id = Some(scene.instance_id);
            let pos = scene
                .player_infos
                .iter()
                .find(|p| i64::from(p.player_id) == player_id)
                .and_then(|p| p.location.as_ref());
            snapshot.scene = Some(ExplorationScene {
                map_id: scene.instance_id,
                x: pos.map_or(0., |p| p.x),
                y: pos.map_or(0., |p| p.y),
                z: pos.map_or(0., |p| p.z),
            });
            if let Some(aoi) = scene.aoi_data {
                for e in aoi.entities {
                    self.entity(&e);
                }
            }
            return Ok(true);
        }
        if self.map_id.is_none() || self.scene_owner != player_id || snapshot.player_id != player_id
        {
            return Ok(false);
        }
        match gp.msg_id {
            25185 => {
                let m = gp.parse_proto::<pb::EntityAddNotify>()?;
                for e in m.entity_pbs {
                    self.entity(&e);
                }
                return Ok(false);
            }
            17769 => {
                let m = gp.parse_proto::<pb::EntityRemoveNotify>()?;
                for e in m.remove_infos {
                    self.entities.remove(&e.entity_id);
                }
                return Ok(false);
            }
            24443 => {
                let m = gp.parse_proto::<pb::GetRewardTreasureBoxRequest>()?;
                if let (Some(rpc), Some(key)) = (gp.rpc_id, self.entities.get(&m.entity_id)) {
                    // Retain the placement through the removal that precedes the response.
                    if self.pending.len() >= 512 {
                        self.pending.clear();
                    }
                    self.pending.insert(rpc, key.clone());
                }
                return Ok(false);
            }
            28349 => {
                let m = gp.parse_proto::<pb::GetRewardTreasureBoxResponse>()?;
                if let Some(key) = gp.rpc_id.and_then(|rpc| self.pending.remove(&rpc)) {
                    if m.error_code == 0 {
                        return Ok(Self::record(snapshot, &key, "reward-response", at));
                    }
                }
                return Ok(false);
            }
            27985 => {
                let m = gp.parse_proto::<pb::BehaviorTreeInfoNotify>()?;
                for t in m.tree_infos {
                    if t.bt_type != 2 || i64::from(t.tree_owner_id) != player_id {
                        continue;
                    }
                    self.trees.insert(t.tree_inc_id, t.blackboard_id);
                }
                return Ok(false);
            }
            20398 => {
                let m = gp.parse_proto::<pb::UpdateChildQuestNodeStatusNotify>()?;
                if i64::from(m.tree_owner_id) == player_id && (m.status == 4 || m.status == 5) {
                    return Ok(self.claimed_node(m.tree_inc_id, m.node_id, snapshot, at));
                }
            }
            18896 => {
                let m = gp.parse_proto::<pb::UpdateNodeStatusNotify>()?;
                if i64::from(m.tree_owner_id) == player_id && m.status == 4 {
                    return Ok(self.claimed_node(m.tree_inc_id, m.node_id, snapshot, at));
                }
            }
            _ => return Ok(false),
        }
        Ok(false)
    }
}

pub fn handle(app: &AppHandle, gp: &GamePacket) {
    if !WorldCapture::handles(gp.msg_id) {
        return;
    }
    let state = app.state::<SnifferState>();
    if !state.capturing.load(std::sync::atomic::Ordering::SeqCst) {
        return;
    }
    let account = app.state::<AccountState>();
    let mut world = state.world.lock();
    let Ok(mut store) = account.store.lock() else {
        return;
    };
    let player = store.snapshot().player.as_ref().map_or(0, |p| p.player_id);
    let at = super::now_ms();
    match world.apply(gp, store.exploration_mut(), player, at) {
        Ok(true) => state.mark_pending(&["exploration"]),
        Ok(false) => {}
        Err(e) => state.record_decode_failure(gp.msg_id, gp.get_msg_name(), &e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use spectrum::prost::Message;
    fn packet<T: Message>(id: u16, rpc: Option<u16>, data: T) -> GamePacket {
        GamePacket {
            size: 0,
            msg_type: 0,
            seq_no: 0,
            rpc_id: rpc,
            msg_id: id,
            crc: 0,
            raw_msg: data.encode_to_vec(),
            timestamp: std::time::SystemTime::now(),
        }
    }
    #[test]
    fn response_requires_matching_rpc_and_success_even_after_entity_removed() {
        let mut world = WorldCapture {
            map_id: Some(906),
            scene_owner: 1,
            ..Default::default()
        };
        let mut snapshot = ExplorationSnapshot {
            player_id: 1,
            ..Default::default()
        };
        world.entities.insert(19002, "906:938700793".into());
        world
            .apply(
                &packet(
                    24443,
                    Some(957),
                    pb::GetRewardTreasureBoxRequest { entity_id: 19002 },
                ),
                &mut snapshot,
                1,
                100,
            )
            .unwrap();
        world.entities.clear();
        world
            .apply(
                &packet(
                    28349,
                    Some(958),
                    pb::GetRewardTreasureBoxResponse { error_code: 0 },
                ),
                &mut snapshot,
                1,
                101,
            )
            .unwrap();
        assert!(snapshot.rewards.is_empty());
        world
            .apply(
                &packet(
                    28349,
                    Some(957),
                    pb::GetRewardTreasureBoxResponse { error_code: 0 },
                ),
                &mut snapshot,
                1,
                102,
            )
            .unwrap();
        assert_eq!(snapshot.rewards["906:938700793"].source, "reward-response");
    }

    #[test]
    fn failed_rewards_and_other_players_never_confirm_claims() {
        let mut world = WorldCapture {
            map_id: Some(906),
            scene_owner: 1,
            ..Default::default()
        };
        let mut snapshot = ExplorationSnapshot {
            player_id: 1,
            ..Default::default()
        };
        world.pending.insert(5, "906:938700793".into());
        world
            .apply(
                &packet(
                    28349,
                    Some(5),
                    pb::GetRewardTreasureBoxResponse { error_code: 1 },
                ),
                &mut snapshot,
                1,
                1,
            )
            .unwrap();
        assert!(snapshot.rewards.is_empty());
        world.trees.insert(9, 938700033);
        world
            .apply(
                &packet(
                    20398,
                    None,
                    pb::UpdateChildQuestNodeStatusNotify {
                        tree_owner_id: 2,
                        tree_inc_id: 9,
                        node_id: 28,
                        status: 4,
                    },
                ),
                &mut snapshot,
                1,
                2,
            )
            .unwrap();
        assert!(snapshot.rewards.is_empty());
    }

    #[test]
    fn completed_snapshot_is_ignored_but_exact_live_claim_update_is_recorded() {
        let mut world = WorldCapture {
            map_id: Some(906),
            scene_owner: 1,
            ..Default::default()
        };
        let mut snapshot = ExplorationSnapshot {
            player_id: 1,
            ..Default::default()
        };
        let tree = pb::TreeInfo {
            tree_owner_id: 1,
            tree_inc_id: 99,
            bt_type: 2,
            blackboard_id: 938700033,
            nodes: [(
                25,
                pb::NodeInfo {
                    status: 4,
                    extra_info: None,
                },
            )]
            .into(),
            ..Default::default()
        };
        world
            .apply(
                &packet(
                    27985,
                    None,
                    pb::BehaviorTreeInfoNotify {
                        tree_infos: vec![tree],
                    },
                ),
                &mut snapshot,
                1,
                1,
            )
            .unwrap();
        assert!(snapshot.rewards.is_empty());
        world
            .apply(
                &packet(
                    18896,
                    None,
                    pb::UpdateNodeStatusNotify {
                        tree_owner_id: 1,
                        tree_inc_id: 99,
                        node_id: 25,
                        status: 4,
                        ..Default::default()
                    },
                ),
                &mut snapshot,
                1,
                2,
            )
            .unwrap();
        assert_eq!(snapshot.rewards["906:938700789"].source, "tree-update");
        assert_eq!(snapshot.rewards.len(), 1);
    }

    #[test]
    fn unrelated_tree_updates_do_not_schedule_account_writes() {
        let mut world = WorldCapture {
            map_id: Some(906),
            scene_owner: 1,
            ..Default::default()
        };
        let mut snapshot = ExplorationSnapshot {
            player_id: 1,
            ..Default::default()
        };
        world.trees.insert(99, 938700033);
        // Unknown trees/nodes, incomplete nodes and other players are all no-ops.
        for (tree, node, status, owner) in
            [(0, 25, 4, 1), (99, 0, 4, 1), (99, 25, 1, 1), (99, 25, 4, 2)]
        {
            let changed = world
                .apply(
                    &packet(
                        18896,
                        None,
                        pb::UpdateNodeStatusNotify {
                            tree_owner_id: owner,
                            tree_inc_id: tree,
                            node_id: node,
                            status,
                            ..Default::default()
                        },
                    ),
                    &mut snapshot,
                    1,
                    2,
                )
                .unwrap();
            assert!(!changed);
        }
        assert!(snapshot.rewards.is_empty());
    }

    #[test]
    fn login_identity_replaces_stale_account_identity_and_coop_scene_is_ignored() {
        let mut world = WorldCapture::default();
        let mut snapshot = ExplorationSnapshot {
            player_id: 2,
            ..Default::default()
        };
        WorldCapture::record(&mut snapshot, "906:938700793", "reward-response", 1);
        world
            .apply(
                &packet(
                    15380,
                    None,
                    pb::BasicInfoNotify {
                        id: 1,
                        ..Default::default()
                    },
                ),
                &mut snapshot,
                2,
                2,
            )
            .unwrap();
        assert_eq!(snapshot.player_id, 1);
        assert!(snapshot.rewards.is_empty());
        let join = pb::JoinSceneNotify {
            scene_info: Some(pb::SceneInformation {
                owner_id: 2,
                instance_id: 906,
                ..Default::default()
            }),
            ..Default::default()
        };
        world
            .apply(&packet(18559, None, join), &mut snapshot, 2, 3)
            .unwrap();
        assert!(snapshot.scene.is_none());
        assert!(world.map_id.is_none());
    }

    #[test]
    fn spawn_and_snapshot_evidence_cannot_change_live_collections() {
        let mut snapshot = ExplorationSnapshot::default();
        WorldCapture::record(&mut snapshot, "906:150700614", "reward-response", 1);
        WorldCapture::record(&mut snapshot, "906:150700614", "observed", 2);
        assert_eq!(snapshot.rewards["906:150700614"].source, "reward-response");
        WorldCapture::record(&mut snapshot, "906:938700789", "tree-snapshot", 2);
        assert!(!snapshot.rewards.contains_key("906:938700789"));
        WorldCapture::record(&mut snapshot, "906:938700793", "reward-response", 1);
        WorldCapture::record(&mut snapshot, "906:938700793", "observed", 2);
        assert_eq!(snapshot.rewards["906:938700793"].source, "reward-response");
    }
}
