//! Saved in-game formations. Player-scoped notifications carry the actual list;
//! GetFormationDataResponse may be only an empty acknowledgement.

use spectrum::game::{proto as pb, GamePacket};
use tauri::{AppHandle, Manager};

use super::SnifferState;
use crate::account::{model::SavedTeam, store::AccountStore, AccountState};

const BASIC_INFO_NOTIFY: u16 = 15380;
const UPDATE_FORMATION_NOTIFY: u16 = 23626;
const FORMATION_UPDATE_NOTIFY: u16 = 16510;
const GET_FORMATION_DATA_RESPONSE: u16 = 22433;
const FORMATION_RESPONSE: u16 = 18151;
const FORMATION_MODIFY_RESPONSE: u16 = 25309;
const UPDATE_FORMATION_RESPONSE: u16 = 25651;
const FORMATION_SWITCH_CURRENT_RESPONSE: u16 = 15112;

#[derive(Default)]
pub struct TeamCapture {
    /// Identity observed in this capture session, never inferred from disk/co-op.
    player: i64,
}

impl TeamCapture {
    pub fn handles(id: u16) -> bool {
        matches!(
            id,
            BASIC_INFO_NOTIFY
                | UPDATE_FORMATION_NOTIFY
                | FORMATION_UPDATE_NOTIFY
                | GET_FORMATION_DATA_RESPONSE
                | FORMATION_RESPONSE
                | FORMATION_MODIFY_RESPONSE
                | UPDATE_FORMATION_RESPONSE
                | FORMATION_SWITCH_CURRENT_RESPONSE
        )
    }

    pub fn apply(
        &mut self,
        gp: &GamePacket,
        store: &mut AccountStore,
    ) -> Result<bool, spectrum::prost::DecodeError> {
        if gp.msg_id == BASIC_INFO_NOTIFY {
            let message = gp.parse_proto::<pb::BasicInfoNotify>()?;
            if message.id <= 0 {
                return Ok(false);
            }
            self.player = i64::from(message.id);
            // Rebuild on login, so formations from a previous account/session
            // cannot survive just because its new list has fewer slots.
            return Ok(store.replace_teams(Vec::new()));
        }
        if self.player == 0 {
            return Ok(false);
        }
        let mut changed = false;
        match gp.msg_id {
            UPDATE_FORMATION_NOTIFY => {
                let message = gp.parse_proto::<pb::UpdateFormationNotify>()?;
                for player in message.players_formations {
                    if i64::from(player.player_id) != self.player {
                        continue;
                    }
                    for formation in player.formations {
                        changed |= store.upsert_team(SavedTeam {
                            id: formation.formation_id,
                            name: formation.name,
                            role_ids: formation
                                .role_infos
                                .iter()
                                .map(|role| i64::from(role.role_id))
                                .collect(),
                            is_current: formation.is_current,
                        });
                    }
                }
            }
            FORMATION_UPDATE_NOTIFY => {
                let message = gp.parse_proto::<pb::FormationUpdateNotify>()?;
                changed |= store.remove_teams(&message.remove_formation_ids);
                for formation in &message.formation {
                    changed |= store.upsert_team(saved_team(formation));
                }
                if message.formation_id > 0 {
                    changed |= store.set_current_team(message.formation_id);
                }
            }
            GET_FORMATION_DATA_RESPONSE => {
                let message = gp.parse_proto::<pb::GetFormationDataResponse>()?;
                // In live traffic the list arrives via UpdateFormationNotify,
                // followed by this response with no payload at all. It is not
                // an authoritative empty snapshot.
                if message.error_code == pb::ErrorCode::Success as i32
                    && !message.formations.is_empty()
                {
                    changed =
                        store.replace_teams(message.formations.iter().map(saved_team).collect());
                }
            }
            FORMATION_RESPONSE => {
                let message = gp.parse_proto::<pb::FormationResponse>()?;
                if message.error_code == pb::ErrorCode::Success as i32
                    && !message.formation.is_empty()
                {
                    changed =
                        store.replace_teams(message.formation.iter().map(legacy_team).collect());
                }
            }
            UPDATE_FORMATION_RESPONSE => {
                let message = gp.parse_proto::<pb::UpdateFormationResponse>()?;
                if message.error_code == pb::ErrorCode::Success as i32 {
                    if let Some(formation) = message.formation.as_ref() {
                        changed = store.upsert_team(saved_team(formation));
                    }
                }
            }
            FORMATION_MODIFY_RESPONSE => {
                let message = gp.parse_proto::<pb::FormationModifyResponse>()?;
                if message.error_code == pb::ErrorCode::Success as i32 {
                    if let Some(formation) = message.formation.as_ref() {
                        changed = store.upsert_team(legacy_team(formation));
                    }
                }
            }
            FORMATION_SWITCH_CURRENT_RESPONSE => {
                let message = gp.parse_proto::<pb::FormationSwitchCurrentResponse>()?;
                if message.error_code == pb::ErrorCode::Success as i32 {
                    changed = store.set_current_team(message.current_id);
                }
            }
            _ => {}
        }
        Ok(changed)
    }
}

fn saved_team(formation: &pb::FightFormation) -> SavedTeam {
    SavedTeam {
        id: formation.formation_id,
        name: formation.name.clone(),
        role_ids: formation.role_ids.iter().map(|id| i64::from(*id)).collect(),
        is_current: formation.is_current,
    }
}

fn legacy_team(formation: &pb::Formation) -> SavedTeam {
    SavedTeam {
        id: formation.id,
        name: String::new(),
        role_ids: formation.role.iter().map(|id| i64::from(*id)).collect(),
        is_current: formation.is_current,
    }
}

pub fn handle(app: &AppHandle, gp: &GamePacket) {
    if !TeamCapture::handles(gp.msg_id) {
        return;
    }
    let state = app.state::<SnifferState>();
    if !state.capturing.load(std::sync::atomic::Ordering::SeqCst) {
        return;
    }
    let account = app.state::<AccountState>();
    let mut capture = state.teams.lock();
    let Ok(mut store) = account.store.lock() else {
        return;
    };
    match capture.apply(gp, &mut store) {
        Ok(true) => state.mark_pending(&["teams"]),
        Ok(false) => {}
        Err(error) => state.record_decode_failure(gp.msg_id, gp.get_msg_name(), &error.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use spectrum::prost::Message;

    // Role IDs/order observed in session.pcap. Player identity is anonymized.
    const CAPTURED_ROLES: &[&[i32]] = &[
        &[1603, 1606, 1608],
        &[1107, 1601, 1105],
        &[1205, 1304, 1505],
        &[1409, 1102, 1408],
        &[1410, 1509, 1408],
        &[1209, 1509],
    ];

    fn store(name: &str) -> AccountStore {
        let path = std::env::temp_dir().join(format!(
            "mny-teams-{name}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        AccountStore::load(path)
    }

    fn packet<T: Message>(id: u16, message: T) -> GamePacket {
        GamePacket {
            size: 0,
            msg_type: 20,
            seq_no: 0,
            rpc_id: None,
            msg_id: id,
            crc: 0,
            raw_msg: message.encode_to_vec(),
            timestamp: std::time::SystemTime::now(),
        }
    }

    fn login(capture: &mut TeamCapture, store: &mut AccountStore, id: i32) {
        capture
            .apply(
                &packet(
                    BASIC_INFO_NOTIFY,
                    pb::BasicInfoNotify {
                        id,
                        ..Default::default()
                    },
                ),
                store,
            )
            .unwrap();
    }

    fn notification(player_id: i32, roles: &[&[i32]]) -> GamePacket {
        packet(
            UPDATE_FORMATION_NOTIFY,
            pb::UpdateFormationNotify {
                players_formations: vec![pb::PlayerFightFormations {
                    player_id,
                    formations: roles
                        .iter()
                        .enumerate()
                        .map(|(index, ids)| pb::FightFormationNotifyInfo {
                            formation_id: index as i32 + 1,
                            role_infos: ids
                                .iter()
                                .map(|id| pb::FormationRoleInfo {
                                    role_id: *id,
                                    ..Default::default()
                                })
                                .collect(),
                            is_current: index == 0,
                            ..Default::default()
                        })
                        .collect(),
                }],
            },
        )
    }

    #[test]
    fn captured_six_teams_survive_empty_response_acknowledgements() {
        let mut capture = TeamCapture::default();
        let mut store = store("ack");
        login(&mut capture, &mut store, 7);
        assert!(capture
            .apply(&notification(7, CAPTURED_ROLES), &mut store)
            .unwrap());
        assert!(!capture
            .apply(
                &packet(
                    GET_FORMATION_DATA_RESPONSE,
                    pb::GetFormationDataResponse::default()
                ),
                &mut store
            )
            .unwrap());
        assert!(!capture
            .apply(
                &packet(FORMATION_RESPONSE, pb::FormationResponse::default()),
                &mut store
            )
            .unwrap());
        assert_eq!(store.snapshot().teams.len(), 6);
        for (team, ids) in store.snapshot().teams.iter().zip(CAPTURED_ROLES) {
            assert_eq!(
                team.role_ids,
                ids.iter().map(|id| i64::from(*id)).collect::<Vec<_>>()
            );
            assert_eq!(team.is_current, team.id == 1);
        }
    }

    #[test]
    fn notifications_require_this_sessions_player_and_ignore_coop_teams() {
        let mut capture = TeamCapture::default();
        let mut store = store("identity");
        assert!(!capture
            .apply(&notification(7, CAPTURED_ROLES), &mut store)
            .unwrap());
        login(&mut capture, &mut store, 7);
        assert!(!capture
            .apply(&notification(8, CAPTURED_ROLES), &mut store)
            .unwrap());
        capture
            .apply(&notification(7, CAPTURED_ROLES), &mut store)
            .unwrap();
        assert_eq!(store.snapshot().teams.len(), 6);
        login(&mut capture, &mut store, 8);
        assert!(store.snapshot().teams.is_empty());
        assert!(!capture
            .apply(&notification(7, CAPTURED_ROLES), &mut store)
            .unwrap());
    }

    #[test]
    fn partial_notification_updates_preserve_other_teams_and_names() {
        let mut capture = TeamCapture::default();
        let mut store = store("partial");
        login(&mut capture, &mut store, 7);
        capture
            .apply(&notification(7, CAPTURED_ROLES), &mut store)
            .unwrap();
        let updated = packet(
            UPDATE_FORMATION_NOTIFY,
            pb::UpdateFormationNotify {
                players_formations: vec![pb::PlayerFightFormations {
                    player_id: 7,
                    formations: vec![pb::FightFormationNotifyInfo {
                        formation_id: 2,
                        name: "Tower".into(),
                        role_infos: vec![pb::FormationRoleInfo {
                            role_id: 1505,
                            ..Default::default()
                        }],
                        ..Default::default()
                    }],
                }],
            },
        );
        assert!(capture.apply(&updated, &mut store).unwrap());
        assert_eq!(store.snapshot().teams.len(), 6);
        assert_eq!(store.snapshot().teams[1].name, "Tower");
        assert_eq!(store.snapshot().teams[1].role_ids, vec![1505]);
        assert!(store.snapshot().teams[0].is_current);
        assert!(capture
            .apply(
                &packet(
                    FORMATION_UPDATE_NOTIFY,
                    pb::FormationUpdateNotify {
                        remove_formation_ids: vec![2],
                        formation_id: 3,
                        ..Default::default()
                    }
                ),
                &mut store
            )
            .unwrap());
        assert_eq!(store.snapshot().teams.len(), 5);
        assert!(
            store
                .snapshot()
                .teams
                .iter()
                .find(|team| team.id == 3)
                .unwrap()
                .is_current
        );
    }

    #[test]
    fn failed_responses_do_not_overwrite_saved_teams() {
        let mut capture = TeamCapture::default();
        let mut store = store("failed");
        login(&mut capture, &mut store, 7);
        capture
            .apply(&notification(7, CAPTURED_ROLES), &mut store)
            .unwrap();
        let before = store.snapshot().teams.clone();
        assert!(!capture
            .apply(
                &packet(
                    GET_FORMATION_DATA_RESPONSE,
                    pb::GetFormationDataResponse {
                        error_code: 1,
                        formations: vec![pb::FightFormation {
                            formation_id: 99,
                            ..Default::default()
                        }],
                    }
                ),
                &mut store
            )
            .unwrap());
        assert!(!capture
            .apply(
                &packet(
                    FORMATION_SWITCH_CURRENT_RESPONSE,
                    pb::FormationSwitchCurrentResponse {
                        current_id: 2,
                        error_code: 1,
                    }
                ),
                &mut store
            )
            .unwrap());
        assert_eq!(store.snapshot().teams, before);
    }

    /// Uses a local capture without ever opening the app's real account store.
    #[test]
    #[ignore = "requires MORNYE_TEST_CAPTURE; optional MORNYE_TEST_OUTPUT"]
    fn replay_saved_teams() {
        let path = std::env::var("MORNYE_TEST_CAPTURE").expect("capture path");
        let key = std::fs::read_to_string("../data/client_private_key.pem").unwrap();
        let mut transport = spectrum::Sniffer::new(key);
        let mut capture = TeamCapture::default();
        let mut store = store("replay");
        let mut reader = pcap_file::pcap::PcapReader::new(std::io::BufReader::new(
            std::fs::File::open(path).unwrap(),
        ))
        .unwrap();
        let mut notifications = 0;
        while let Some(record) = reader.next_packet() {
            let record = record.unwrap();
            let Ok(packets) = transport.receive_packet(record.data.to_vec()) else {
                continue;
            };
            for packet in packets {
                if let spectrum::Packet::GamePacket(Ok(packet)) = packet {
                    if TeamCapture::handles(packet.msg_id) {
                        if packet.msg_id == UPDATE_FORMATION_NOTIFY {
                            notifications += 1;
                        }
                        capture.apply(&packet, &mut store).unwrap();
                    }
                }
            }
        }
        assert!(
            notifications > 0,
            "capture must contain the saved-team notification"
        );
        assert!(
            !store.snapshot().teams.is_empty(),
            "saved teams must survive the response ACK"
        );
        if let Ok(output) = std::env::var("MORNYE_TEST_OUTPUT") {
            std::fs::write(
                output,
                serde_json::to_vec_pretty(&store.snapshot().teams).unwrap(),
            )
            .unwrap();
        }
        println!(
            "Team replay: {notifications} saved-team notifications, {} teams retained",
            store.snapshot().teams.len()
        );
    }
}
