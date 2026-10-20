//! Server-authoritative quests and achievements. There are no UI mutation commands.
use std::collections::HashMap;

use spectrum::game::{proto as pb, GamePacket};
use tauri::{AppHandle, Manager};

use super::SnifferState;
use crate::account::model::{
    AchievementEntry, AchievementSnapshot, ProgressionSnapshot, QuestSnapshot,
};
use crate::account::AccountState;

#[derive(Default)]
pub struct ProgressionCapture {
    player: i64,
    trees: HashMap<i64, i32>,
}

fn achievement(entry: pb::AchievementEntry) -> (i32, AchievementEntry) {
    (
        entry.id,
        AchievementEntry {
            finished_at: entry.finish_time,
            claimed: entry.is_receive,
            current: entry.progress.map(|progress| progress.cur_progress),
            target: entry.progress.map(|progress| progress.total_progress),
        },
    )
}

impl ProgressionCapture {
    pub fn handles(id: u16) -> bool {
        matches!(
            id,
            15380
                | 17000
                | 23759
                | 24620
                | 28378
                | 27985
                | 18896
                | 20398
                | 26649
                | 25834
                | 23250
                | 21082
                | 28476
                | 29250
        )
    }

    fn node(
        &self,
        snapshot: &mut QuestSnapshot,
        owner: i32,
        tree: i64,
        node: i32,
        active: bool,
    ) -> bool {
        if i64::from(owner) != self.player {
            return false;
        }
        let Some(quest) = self.trees.get(&tree) else {
            return false;
        };
        let nodes = snapshot.active_nodes.entry(*quest).or_default();
        if active {
            nodes.insert(node)
        } else {
            nodes.remove(&node)
        }
    }

    pub fn apply(
        &mut self,
        gp: &GamePacket,
        snapshot: &mut ProgressionSnapshot,
        at: u64,
    ) -> Result<bool, spectrum::prost::DecodeError> {
        if gp.msg_id == 15380 {
            let message = gp.parse_proto::<pb::BasicInfoNotify>()?;
            if message.id <= 0 {
                return Ok(false);
            }
            self.player = i64::from(message.id);
            self.trees.clear();
            if snapshot.player_id != self.player {
                *snapshot = ProgressionSnapshot::default();
            }
            snapshot.player_id = self.player;
            // Quest availability is session-dependent. Rebuild it from this login's lists.
            snapshot.quests = QuestSnapshot::default();
            return Ok(true);
        }
        // Quest and achievement lists carry no owner. Require a captured identity;
        // never attach another login's packets to the account loaded from disk.
        if self.player == 0 || snapshot.player_id != self.player {
            return Ok(false);
        }
        match gp.msg_id {
            23759 => {
                let message = gp.parse_proto::<pb::QuestListNotify>()?;
                snapshot.quests.states = message
                    .quests
                    .into_iter()
                    .filter(|q| (0..=3).contains(&q.status))
                    .map(|q| (q.quest_id, q.status))
                    .collect();
                snapshot.quests.list_synced_at = Some(at);
            }
            24620 => {
                let message = gp.parse_proto::<pb::QuestReadyListNotify>()?;
                for id in message.quest_id {
                    snapshot.quests.available_ids.insert(id);
                    snapshot.quests.states.entry(id).or_insert(1);
                }
            }
            17000 => {
                let message = gp.parse_proto::<pb::QuestFinishListNotify>()?;
                for id in message.quest_id {
                    snapshot.quests.completed_ids.insert(id);
                    snapshot.quests.states.insert(id, 3);
                    snapshot.quests.available_ids.remove(&id);
                    snapshot.quests.active_nodes.remove(&id);
                }
                snapshot.quests.completed_synced_at = Some(at);
            }
            28378 => {
                let message = gp.parse_proto::<pb::QuestStateUpdateNotify>()?;
                if !(0..=4).contains(&message.state) {
                    return Ok(false);
                }
                let quests = &mut snapshot.quests;
                if message.state == 4 {
                    quests.states.remove(&message.quest_id);
                } else {
                    quests.states.insert(message.quest_id, message.state);
                }
                if message.state == 3 {
                    quests.completed_ids.insert(message.quest_id);
                }
                if message.state == 1 {
                    quests.available_ids.insert(message.quest_id);
                } else {
                    quests.available_ids.remove(&message.quest_id);
                }
                if message.state != 2 {
                    quests.active_nodes.remove(&message.quest_id);
                }
            }
            27985 => {
                let message = gp.parse_proto::<pb::BehaviorTreeInfoNotify>()?;
                let mut changed = false;
                for tree in message.tree_infos {
                    if tree.bt_type != 1 || i64::from(tree.tree_owner_id) != self.player {
                        continue;
                    }
                    self.trees.insert(tree.tree_inc_id, tree.blackboard_id);
                    snapshot.quests.active_nodes.insert(
                        tree.blackboard_id,
                        tree.nodes
                            .into_iter()
                            .filter(|(_, node)| node.status == 2)
                            .map(|(id, _)| id)
                            .collect(),
                    );
                    changed = true;
                }
                return Ok(changed);
            }
            18896 => {
                let message = gp.parse_proto::<pb::UpdateNodeStatusNotify>()?;
                return Ok(self.node(
                    &mut snapshot.quests,
                    message.tree_owner_id,
                    message.tree_inc_id,
                    message.node_id,
                    message.status == 2,
                ));
            }
            20398 => {
                let message = gp.parse_proto::<pb::UpdateChildQuestNodeStatusNotify>()?;
                return Ok(self.node(
                    &mut snapshot.quests,
                    message.tree_owner_id,
                    message.tree_inc_id,
                    message.node_id,
                    (1..=3).contains(&message.status),
                ));
            }
            26649 => {
                let message = gp.parse_proto::<pb::AchievementInfoResponse>()?;
                snapshot.achievements = AchievementSnapshot {
                    synced_at: Some(at),
                    updated_at: Some(at),
                    entries: message
                        .achievement_group_info_list
                        .into_iter()
                        .flat_map(|group| group.achievement_entry_list)
                        .map(achievement)
                        .collect(),
                    finished_count: message.finish_count,
                    star_count: message.star_count,
                };
            }
            25834 => {
                let message = gp.parse_proto::<pb::AchievementProgressNotify>()?;
                let Some(entry) = message.achievement_entry else {
                    return Ok(false);
                };
                let (id, entry) = achievement(entry);
                snapshot.achievements.entries.insert(id, entry);
                snapshot.achievements.updated_at = Some(at);
            }
            23250 => {
                let message = gp.parse_proto::<pb::AchievementListProgressNotify>()?;
                snapshot
                    .achievements
                    .entries
                    .extend(message.achievement_entry_list.into_iter().map(achievement));
                snapshot.achievements.updated_at = Some(at);
            }
            21082 => {
                let message = gp.parse_proto::<pb::AchievementUpdateResponse>()?;
                if message.error_code != pb::ErrorCode::Success as i32 {
                    return Ok(false);
                }
                snapshot
                    .achievements
                    .entries
                    .extend(message.achievement_entry_list.into_iter().map(achievement));
                snapshot.achievements.updated_at = Some(at);
            }
            28476 => {
                let message = gp.parse_proto::<pb::AchievementCountChangeNotify>()?;
                snapshot.achievements.finished_count = message.finish_count;
                snapshot.achievements.star_count = message.star_count;
                snapshot.achievements.updated_at = Some(at);
            }
            29250 => {
                let message = gp.parse_proto::<pb::MulAchievementReceiveResponse>()?;
                if message.error_code != pb::ErrorCode::Success as i32 {
                    return Ok(false);
                }
                for id in message.achievement_ids {
                    if let Some(entry) = snapshot.achievements.entries.get_mut(&id) {
                        entry.claimed = true;
                    }
                }
                snapshot.achievements.updated_at = Some(at);
            }
            _ => return Ok(false),
        }
        Ok(true)
    }
}

pub fn handle(app: &AppHandle, gp: &GamePacket) {
    if !ProgressionCapture::handles(gp.msg_id) {
        return;
    }
    let state = app.state::<SnifferState>();
    if !state.capturing.load(std::sync::atomic::Ordering::SeqCst) {
        return;
    }
    let account = app.state::<AccountState>();
    let mut capture = state.progression.lock();
    let Ok(mut store) = account.store.lock() else {
        return;
    };
    match capture.apply(gp, store.progression_mut(), super::now_ms()) {
        Ok(true) => state.mark_pending(&["progression"]),
        Ok(false) => {}
        Err(error) => state.record_decode_failure(gp.msg_id, gp.get_msg_name(), &error.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use spectrum::prost::Message;

    /// Optional integration check against a local PCAP; never touches account.json.
    #[test]
    #[ignore = "requires MORNYE_TEST_CAPTURE and MORNYE_TEST_OUTPUT"]
    fn replay_capture() {
        let path = std::env::var("MORNYE_TEST_CAPTURE").expect("capture path");
        let output = std::env::var("MORNYE_TEST_OUTPUT").expect("output path");
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap();
        let key = std::fs::read_to_string(root.join("data/client_private_key.pem")).unwrap();
        let mut transport = spectrum::Sniffer::new(key);
        let mut capture = ProgressionCapture::default();
        let mut snapshot = ProgressionSnapshot::default();
        let mut reader = pcap_file::pcap::PcapReader::new(std::io::BufReader::new(
            std::fs::File::open(path).unwrap(),
        ))
        .unwrap();
        while let Some(record) = reader.next_packet() {
            let record = record.unwrap();
            let Ok(packets) = transport.receive_packet(record.data.to_vec()) else {
                continue;
            };
            for packet in packets {
                if let spectrum::Packet::GamePacket(Ok(packet)) = packet {
                    if ProgressionCapture::handles(packet.msg_id) {
                        capture
                            .apply(&packet, &mut snapshot, record.timestamp.as_millis() as u64)
                            .unwrap();
                    }
                }
            }
        }
        assert!(snapshot.quests.list_synced_at.is_some());
        assert!(snapshot.quests.completed_synced_at.is_some());
        assert!(snapshot.achievements.synced_at.is_some());
        assert!(!snapshot.quests.completed_ids.is_empty());
        assert!(!snapshot.achievements.entries.is_empty());
        std::fs::write(output, serde_json::to_string(&snapshot).unwrap()).unwrap();
        println!("Replay: {} completed quest IDs, {} achievement entries, {} game achievements completed", snapshot.quests.completed_ids.len(), snapshot.achievements.entries.len(), snapshot.achievements.finished_count);
    }

    fn packet<T: Message>(id: u16, message: T) -> GamePacket {
        GamePacket {
            size: 0,
            msg_type: 0,
            seq_no: 0,
            rpc_id: None,
            msg_id: id,
            crc: 0,
            raw_msg: message.encode_to_vec(),
            timestamp: std::time::SystemTime::now(),
        }
    }
    fn login(capture: &mut ProgressionCapture, snapshot: &mut ProgressionSnapshot, player: i32) {
        capture
            .apply(
                &packet(
                    15380,
                    pb::BasicInfoNotify {
                        id: player,
                        ..Default::default()
                    },
                ),
                snapshot,
                1,
            )
            .unwrap();
    }
    #[test]
    fn login_snapshot_completion_delta_and_relogin_are_authoritative() {
        let mut capture = ProgressionCapture::default();
        let mut snapshot = ProgressionSnapshot::default();
        let finish = packet(
            17000,
            pb::QuestFinishListNotify {
                quest_id: vec![1, 2],
            },
        );
        assert!(!capture.apply(&finish, &mut snapshot, 0).unwrap());
        login(&mut capture, &mut snapshot, 10);
        capture.apply(&finish, &mut snapshot, 2).unwrap();
        assert_eq!(snapshot.quests.completed_ids.len(), 2);
        capture
            .apply(
                &packet(17000, pb::QuestFinishListNotify { quest_id: vec![3] }),
                &mut snapshot,
                3,
            )
            .unwrap();
        assert_eq!(snapshot.quests.completed_ids.len(), 3);
        capture
            .apply(
                &packet(
                    28378,
                    pb::QuestStateUpdateNotify {
                        quest_id: 2,
                        state: 2,
                    },
                ),
                &mut snapshot,
                4,
            )
            .unwrap();
        assert_eq!(snapshot.quests.states.get(&2), Some(&2));
        capture
            .apply(
                &packet(
                    28378,
                    pb::QuestStateUpdateNotify {
                        quest_id: 4,
                        state: 4,
                    },
                ),
                &mut snapshot,
                5,
            )
            .unwrap();
        assert!(!snapshot.quests.completed_ids.contains(&4));
        login(&mut capture, &mut snapshot, 10);
        capture
            .apply(
                &packet(17000, pb::QuestFinishListNotify { quest_id: vec![3] }),
                &mut snapshot,
                6,
            )
            .unwrap();
        assert_eq!(
            snapshot
                .quests
                .completed_ids
                .into_iter()
                .collect::<Vec<_>>(),
            vec![3]
        );
    }
    #[test]
    fn other_players_and_levelplay_trees_cannot_become_quest_objectives() {
        let mut capture = ProgressionCapture::default();
        let mut snapshot = ProgressionSnapshot::default();
        login(&mut capture, &mut snapshot, 10);
        let tree = |owner, kind, instance| pb::TreeInfo {
            tree_owner_id: owner,
            bt_type: kind,
            tree_inc_id: instance,
            blackboard_id: 42,
            nodes: [(
                5,
                pb::NodeInfo {
                    status: 2,
                    ..Default::default()
                },
            )]
            .into(),
            ..Default::default()
        };
        capture
            .apply(
                &packet(
                    27985,
                    pb::BehaviorTreeInfoNotify {
                        tree_infos: vec![tree(99, 1, 100), tree(10, 2, 200), tree(10, 1, 300)],
                    },
                ),
                &mut snapshot,
                2,
            )
            .unwrap();
        assert_eq!(capture.trees.len(), 1);
        assert!(snapshot.quests.active_nodes[&42].contains(&5));
        capture
            .apply(
                &packet(
                    20398,
                    pb::UpdateChildQuestNodeStatusNotify {
                        tree_owner_id: 10,
                        tree_inc_id: 300,
                        node_id: 5,
                        status: 4,
                    },
                ),
                &mut snapshot,
                3,
            )
            .unwrap();
        assert!(!snapshot.quests.active_nodes[&42].contains(&5));
    }
    #[test]
    fn achievement_snapshots_and_deltas_preserve_unknown_coverage_and_account_identity() {
        let mut capture = ProgressionCapture::default();
        let mut snapshot = ProgressionSnapshot::default();
        login(&mut capture, &mut snapshot, 10);
        let entry = |id, finish_time, is_receive| pb::AchievementEntry {
            id,
            finish_time,
            is_receive,
            progress: Some(pb::AchievementProgress {
                cur_progress: 1,
                total_progress: 10,
            }),
        };
        capture
            .apply(
                &packet(
                    25834,
                    pb::AchievementProgressNotify {
                        achievement_entry: Some(entry(1, 0, false)),
                    },
                ),
                &mut snapshot,
                2,
            )
            .unwrap();
        assert_eq!(snapshot.achievements.synced_at, None);
        assert_eq!(snapshot.achievements.entries[&1].finished_at, 0);
        capture
            .apply(
                &packet(
                    26649,
                    pb::AchievementInfoResponse {
                        achievement_group_info_list: vec![pb::AchievementGroupInfo {
                            achievement_group_entry: None,
                            achievement_entry_list: vec![entry(2, 123, false)],
                        }],
                        finish_count: 1,
                        star_count: 1,
                    },
                ),
                &mut snapshot,
                3,
            )
            .unwrap();
        assert!(!snapshot.achievements.entries.contains_key(&1));
        assert_eq!(snapshot.achievements.entries[&2].finished_at, 123);
        assert!(!snapshot.achievements.entries[&2].claimed);
        capture
            .apply(
                &packet(
                    25834,
                    pb::AchievementProgressNotify {
                        achievement_entry: Some(entry(2, 123, true)),
                    },
                ),
                &mut snapshot,
                4,
            )
            .unwrap();
        assert!(snapshot.achievements.entries[&2].claimed);
        login(&mut capture, &mut snapshot, 11);
        assert!(snapshot.achievements.entries.is_empty());
    }
}
