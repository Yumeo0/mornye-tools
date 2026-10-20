//! Transient player tracking. Movement never writes account.json.
use std::collections::{HashMap, HashSet};

use serde::Serialize;
use spectrum::game::{proto as pb, GamePacket};
use tauri::{AppHandle, Emitter, Manager, State};

use super::SnifferState;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerPosition {
    pub player_id: i64,
    pub map_id: i32,
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub yaw: Option<f32>,
    pub observed_at: u64,
}

#[derive(Default)]
pub struct PositionTracker {
    player: i64,
    owner: i64,
    map: Option<i32>,
    controlled: i64,
    roles: HashSet<i64>,
    samples: HashMap<i64, pb::MoveReplaySample>,
    switches: HashMap<i64, i64>,
    latest: Option<PlayerPosition>,
    dirty: bool,
}

impl PositionTracker {
    pub fn clear(&mut self) {
        *self = Self {
            dirty: true,
            ..Default::default()
        };
    }

    fn set(&mut self, pos: &pb::Vector, yaw: Option<f32>, at: u64) {
        let Some(map_id) = self.map else { return };
        if ![pos.x, pos.y, pos.z].into_iter().all(f32::is_finite) {
            return;
        }
        self.latest = Some(PlayerPosition {
            player_id: self.player,
            map_id,
            x: pos.x,
            y: pos.y,
            z: pos.z,
            yaw: yaw.filter(|v| v.is_finite()),
            observed_at: at,
        });
        self.dirty = true;
    }

    fn control(&mut self, entity: i64, at: u64) {
        self.controlled = entity;
        self.roles.insert(entity);
        if let Some(sample) = self.samples.get(&entity).cloned() {
            if let Some(pos) = sample.location.as_ref() {
                self.set(pos, sample.rotation.map(|r| r.yaw), at);
            }
        }
    }

    fn movement(&mut self, entities: Vec<pb::MovingEntityData>, at: u64) {
        for e in entities {
            if !self.roles.contains(&e.entity_id)
                || (e.originator != 0 && e.originator != self.player)
            {
                continue;
            }
            let previous = self
                .samples
                .get(&e.entity_id)
                .map_or(f32::NEG_INFINITY, |s| s.time_stamp);
            // Packages batch samples and can be retransmitted/out of order.
            let sample = e
                .move_infos
                .into_iter()
                .filter(|s| {
                    s.location
                        .as_ref()
                        .is_some_and(|p| [p.x, p.y, p.z].into_iter().all(f32::is_finite))
                        && s.time_stamp.is_finite()
                        && s.time_stamp >= previous
                })
                .max_by(|a, b| a.time_stamp.total_cmp(&b.time_stamp));
            if let Some(sample) = sample {
                if e.entity_id == self.controlled {
                    self.set(
                        sample.location.as_ref().unwrap(),
                        sample.rotation.as_ref().map(|r| r.yaw),
                        at,
                    );
                }
                self.samples.insert(e.entity_id, sample);
            }
        }
    }

    fn receive(&mut self, pack: pb::CombatReceivePackNotify, at: u64) {
        for d in pack.data {
            if let Some(pb::combat_receive_data::Message::CombatResponseData(r)) = d.message {
                if let (
                    Some(c),
                    Some(pb::combat_response_data::Message::SwitchRoleResponse(response)),
                ) = (r.combat_common, r.message)
                {
                    if let Some(entity) = self.switches.remove(&c.message_id) {
                        if response.error_code == 0 && c.originator == self.player {
                            self.control(entity, at);
                        }
                    }
                }
            }
        }
    }

    fn handles(id: u16) -> bool {
        matches!(
            id,
            15380
                | 18559
                | 28361
                | 24756
                | 24978
                | 17992
                | 25437
                | 21436
                | 26484
                | 19470
                | 20332
                | 25706
                | 21051
                | 27633
                | 17286
        )
    }

    pub fn apply(&mut self, gp: &GamePacket, at: u64) -> Result<(), spectrum::prost::DecodeError> {
        match gp.msg_id {
            15380 => {
                let m = gp.parse_proto::<pb::BasicInfoNotify>()?;
                self.clear();
                self.player = i64::from(m.id);
                return Ok(());
            }
            18559 => {
                let m = gp.parse_proto::<pb::JoinSceneNotify>()?;
                let player = self.player;
                self.clear();
                self.player = player;
                if player == 0 {
                    return Ok(());
                }
                if let Some(scene) = m.scene_info {
                    self.map = Some(scene.instance_id);
                    self.owner = i64::from(scene.owner_id);
                    if let Some(p) = scene
                        .player_infos
                        .iter()
                        .find(|p| i64::from(p.player_id) == player)
                    {
                        for group in &p.player_scene_group_data {
                            for role in &group.fight_role_infos {
                                self.roles.insert(role.entity_id);
                                if group.group == p.group && role.role_id == p.cur_role {
                                    self.controlled = role.entity_id;
                                }
                            }
                        }
                        if let Some(pos) = &p.location {
                            self.set(pos, p.rotation.as_ref().map(|r| r.yaw), at);
                        }
                    }
                }
                return Ok(());
            }
            28361 => {
                if i64::from(gp.parse_proto::<pb::LeaveSceneNotify>()?.player_id) == self.player {
                    let player = self.player;
                    self.clear();
                    self.player = player;
                }
                return Ok(());
            }
            _ => {}
        }
        if self.map.is_none() || self.player == 0 {
            return Ok(());
        }
        match gp.msg_id {
            24756 => {
                let m = gp.parse_proto::<pb::MovePackagePush>()?;
                if i64::from(m.scene_owner_id) == self.owner {
                    self.movement(m.moving_entities, at);
                }
            }
            24978 => {
                let m = gp.parse_proto::<pb::UdpMovePackagePush>()?;
                if i64::from(m.scene_owner_id) == self.owner {
                    self.movement(m.moving_entities, at);
                }
            }
            17992 => self.movement(
                gp.parse_proto::<pb::MovePackageNotify>()?.moving_entities,
                at,
            ),
            25437 => self.movement(
                gp.parse_proto::<pb::UdpMovePackageNotify>()?
                    .moving_entities,
                at,
            ),
            21436 => {
                let m = gp.parse_proto::<pb::SwitchRoleNotify>()?;
                if i64::from(m.player_id) == self.player && !m.on_stage_without_control {
                    self.control(m.up_entity_id, at);
                }
            }
            26484 => {
                let m = gp.parse_proto::<pb::ChangeControlRoleNotify>()?;
                if i64::from(m.player_id) == self.player {
                    self.control(m.up_id, at);
                    if m.need_set_location {
                        if let Some(p) = m.location {
                            self.set(&p, None, at);
                        }
                    }
                }
            }
            21051 | 27633 => {
                let (player, roles) = if gp.msg_id == 21051 {
                    let m = gp.parse_proto::<pb::UpdatePlayerAllFightRoleNotify>()?;
                    (m.player_id, m.fight_role_infos)
                } else {
                    let m = gp.parse_proto::<pb::ChangePlayerFightRoleNotify>()?;
                    (m.player_id, m.fight_role_infos)
                };
                if i64::from(player) == self.player {
                    for r in roles {
                        self.roles.insert(r.entity_id);
                        if r.is_control {
                            self.control(r.entity_id, at);
                        }
                    }
                }
            }
            17286 => {
                for p in gp
                    .parse_proto::<pb::UpdateSceneGroupDataNotify>()?
                    .player_scene_group_data_list
                {
                    if i64::from(p.player_id) != self.player {
                        continue;
                    }
                    for g in p.player_scene_group_data {
                        for r in g.fight_role_infos {
                            self.roles.insert(r.entity_id);
                            if g.group == p.current_group && r.role_id == g.cur_role {
                                self.control(r.entity_id, at);
                            }
                        }
                    }
                }
            }
            19470 => {
                for d in gp.parse_proto::<pb::CombatSendPackRequest>()?.data {
                    match d.message {
                        Some(pb::combat_send_data::Message::Request(r)) => {
                            if let (
                                Some(c),
                                Some(pb::combat_request_data::Message::SwitchRoleRequest(s)),
                            ) = (r.combat_common, r.message)
                            {
                                if c.originator == self.player
                                    && self.roles.contains(&c.entity_id)
                                    && !s.on_stage_without_control
                                {
                                    if self.switches.len() > 32 {
                                        self.switches.clear();
                                    }
                                    self.switches.insert(c.message_id, c.entity_id);
                                }
                            }
                        }
                        Some(pb::combat_send_data::Message::Push(p)) => {
                            if let Some(
                                pb::combat_push_data::Message::ClientCurrentRoleReportPush(r),
                            ) = p.message
                            {
                                if i64::from(r.player_id) == self.player {
                                    self.control(r.current_entity_id, at);
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
            20332 => {
                if let Some(pack) = gp
                    .parse_proto::<pb::CombatSendPackResponse>()?
                    .receive_pack_notify
                {
                    self.receive(pack, at);
                }
            }
            25706 => self.receive(gp.parse_proto::<pb::CombatReceivePackNotify>()?, at),
            _ => {}
        }
        Ok(())
    }
}

pub fn handle(app: &AppHandle, gp: &GamePacket) {
    if !PositionTracker::handles(gp.msg_id) {
        return;
    }
    let state = app.state::<SnifferState>();
    if !state.capturing.load(std::sync::atomic::Ordering::SeqCst) {
        return;
    }
    let at = super::now_ms();
    let result = state.position.lock().apply(gp, at);
    if let Err(e) = result {
        state.record_decode_failure(gp.msg_id, gp.get_msg_name(), &e.to_string());
    }
}

/// Share the latest sample at most four times a second without losing the last update.
pub fn flush(app: &AppHandle) {
    let state = app.state::<SnifferState>();
    let mut tracker = state.position.lock();
    if tracker.dirty {
        tracker.dirty = false;
        let position = tracker.latest.clone();
        drop(tracker);
        let _ = app.emit("player-position", position);
    }
}

#[tauri::command]
pub fn sniffer_get_player_position(state: State<SnifferState>) -> Option<PlayerPosition> {
    state.position.lock().latest.clone()
}

#[cfg(test)]
mod tests {
    use super::*;
    use spectrum::prost::Message;

    fn packet<T: Message>(id: u16, data: T) -> GamePacket {
        GamePacket {
            size: 0,
            msg_type: 0,
            seq_no: 0,
            rpc_id: None,
            msg_id: id,
            crc: 0,
            raw_msg: data.encode_to_vec(),
            timestamp: std::time::SystemTime::now(),
        }
    }
    fn join(t: &mut PositionTracker, map: i32) {
        t.apply(
            &packet(
                15380,
                pb::BasicInfoNotify {
                    id: 1,
                    ..Default::default()
                },
            ),
            1,
        )
        .unwrap();
        t.apply(
            &packet(
                18559,
                pb::JoinSceneNotify {
                    scene_info: Some(pb::SceneInformation {
                        instance_id: map,
                        owner_id: 1,
                        player_infos: vec![pb::ScenePlayerInformation {
                            player_id: 1,
                            group: 1,
                            cur_role: 1608,
                            location: Some(pb::Vector {
                                x: 7237.,
                                y: -518307.,
                                z: 33606.82,
                            }),
                            player_scene_group_data: vec![pb::PlayerSceneGroupData {
                                group: 1,
                                cur_role: 1608,
                                fight_role_infos: vec![
                                    pb::SceneRoleInformation {
                                        role_id: 1608,
                                        entity_id: 100,
                                        ..Default::default()
                                    },
                                    pb::SceneRoleInformation {
                                        role_id: 1603,
                                        entity_id: 92,
                                        ..Default::default()
                                    },
                                ],
                                ..Default::default()
                            }],
                            ..Default::default()
                        }],
                        ..Default::default()
                    }),
                    ..Default::default()
                },
            ),
            2,
        )
        .unwrap();
    }
    fn sample(time: f32, x: f32) -> pb::MoveReplaySample {
        pb::MoveReplaySample {
            time_stamp: time,
            location: Some(pb::Vector {
                x,
                y: -513064.62,
                z: 35478.996,
            }),
            rotation: Some(pb::Rotator {
                yaw: 90.,
                ..Default::default()
            }),
            ..Default::default()
        }
    }
    fn moving(id: i64, samples: Vec<pb::MoveReplaySample>) -> pb::MovingEntityData {
        pb::MovingEntityData {
            entity_id: id,
            originator: 1,
            move_infos: samples,
            ..Default::default()
        }
    }
    #[test]
    fn tracks_only_controlled_character_and_newest_valid_sample() {
        let mut t = PositionTracker::default();
        join(&mut t, 906);
        t.apply(
            &packet(
                24756,
                pb::MovePackagePush {
                    scene_owner_id: 1,
                    moving_entities: vec![
                        moving(19006, vec![sample(500., 999.)]), // Enemy under local client authority.
                        moving(92, vec![sample(245., 888.)]),    // Inactive party member.
                        moving(
                            100,
                            vec![
                                sample(245., 2652.),
                                sample(244., 1.),
                                sample(246., f32::NAN),
                            ],
                        ),
                    ],
                },
            ),
            10,
        )
        .unwrap();
        let p = t.latest.as_ref().unwrap();
        assert_eq!(
            (p.map_id, p.x, p.yaw, p.observed_at),
            (906, 2652., Some(90.), 10)
        );
        t.movement(vec![moving(100, vec![sample(244., 0.)])], 11);
        assert_eq!(t.latest.as_ref().unwrap().x, 2652.);
        t.apply(
            &packet(
                24978,
                pb::UdpMovePackagePush {
                    scene_owner_id: 2,
                    moving_entities: vec![moving(100, vec![sample(247., 999.)])],
                },
            ),
            12,
        )
        .unwrap();
        assert_eq!(t.latest.as_ref().unwrap().x, 2652.);
    }
    #[test]
    fn combat_switch_requires_matching_success_and_excludes_uncontrolled_qte() {
        let mut t = PositionTracker::default();
        join(&mut t, 906);
        t.movement(vec![moving(92, vec![sample(233., 2602.)])], 3);
        let request = |without_control| {
            packet(
                19470,
                pb::CombatSendPackRequest {
                    data: vec![pb::CombatSendData {
                        message: Some(pb::combat_send_data::Message::Request(
                            pb::CombatRequestData {
                                combat_common: Some(pb::CombatCommon {
                                    message_id: 77,
                                    originator: 1,
                                    entity_id: 92,
                                    ..Default::default()
                                }),
                                message: Some(pb::combat_request_data::Message::SwitchRoleRequest(
                                    pb::SwitchRoleRequest {
                                        role_id: 1603,
                                        on_stage_without_control: without_control,
                                        ..Default::default()
                                    },
                                )),
                                ..Default::default()
                            },
                        )),
                    }],
                    ..Default::default()
                },
            )
        };
        let response = |id, code| {
            packet(
                20332,
                pb::CombatSendPackResponse {
                    receive_pack_notify: Some(pb::CombatReceivePackNotify {
                        data: vec![pb::CombatReceiveData {
                            message: Some(pb::combat_receive_data::Message::CombatResponseData(
                                pb::CombatResponseData {
                                    combat_common: Some(pb::CombatCommon {
                                        message_id: id,
                                        originator: 1,
                                        entity_id: 92,
                                        ..Default::default()
                                    }),
                                    message: Some(
                                        pb::combat_response_data::Message::SwitchRoleResponse(
                                            pb::SwitchRoleResponse {
                                                error_code: code,
                                                ..Default::default()
                                            },
                                        ),
                                    ),
                                    ..Default::default()
                                },
                            )),
                        }],
                    }),
                    ..Default::default()
                },
            )
        };
        t.apply(&request(true), 4).unwrap();
        t.apply(&response(77, 0), 5).unwrap();
        assert_eq!(t.controlled, 100);
        t.apply(&request(false), 6).unwrap();
        t.apply(&response(78, 0), 7).unwrap();
        assert_eq!(t.controlled, 100);
        t.apply(&response(77, 1), 8).unwrap();
        assert_eq!(t.controlled, 100);
        t.apply(&request(false), 9).unwrap();
        t.apply(&response(77, 0), 10).unwrap();
        assert_eq!(t.controlled, 92);
        assert_eq!(t.latest.as_ref().unwrap().x, 2602.);
    }
    #[test]
    fn scene_and_identity_changes_clear_old_entities_and_position() {
        let mut t = PositionTracker::default();
        join(&mut t, 906);
        t.apply(
            &packet(
                28361,
                pb::LeaveSceneNotify {
                    player_id: 2,
                    ..Default::default()
                },
            ),
            3,
        )
        .unwrap();
        assert!(t.latest.is_some());
        t.apply(
            &packet(
                28361,
                pb::LeaveSceneNotify {
                    player_id: 1,
                    ..Default::default()
                },
            ),
            4,
        )
        .unwrap();
        assert!(t.latest.is_none());
        assert!(t.roles.is_empty());
        join(&mut t, 8);
        assert_eq!(t.latest.as_ref().unwrap().map_id, 8);
        t.apply(
            &packet(
                15380,
                pb::BasicInfoNotify {
                    id: 2,
                    ..Default::default()
                },
            ),
            5,
        )
        .unwrap();
        assert!(t.latest.is_none());
        assert_eq!(t.player, 2);
    }

    /// Replays real decrypted traffic without touching the account store.
    #[test]
    #[ignore]
    fn replay_player_position() {
        use spectrum::Sniffer;
        let path = std::env::var("MORNYE_MAP_PCAP").unwrap();
        let pem = std::fs::read_to_string("../data/client_private_key.pem").unwrap();
        let mut sniffer = Sniffer::new(pem);
        let mut reader =
            pcap_file::pcap::PcapReader::new(std::fs::File::open(path).unwrap()).unwrap();
        let mut tracker = PositionTracker::default();
        let mut updates = 0;
        while let Some(packet) = reader.next_packet() {
            let packet = packet.unwrap();
            if let Ok(packets) = sniffer.receive_packet(packet.data.to_vec()) {
                for p in packets {
                    if let spectrum::Packet::GamePacket(Ok(gp)) = p {
                        if PositionTracker::handles(gp.msg_id) {
                            tracker.dirty = false;
                            tracker
                                .apply(&gp, packet.timestamp.as_millis() as u64)
                                .unwrap();
                            if tracker.dirty && tracker.latest.is_some() {
                                updates += 1;
                            }
                        }
                    }
                }
            }
        }
        assert!(updates > 1, "capture must include local movement");
        std::fs::write(
            std::env::var("MORNYE_POSITION_OUT").unwrap(),
            serde_json::to_vec(&serde_json::json!({"updates":updates,"position":tracker.latest}))
                .unwrap(),
        )
        .unwrap();
    }
}
