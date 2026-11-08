//! The active client feeds the same converters and state machines as passive capture.
use super::store::AccountStore;
use crate::sniffer::{
    extract::{self, ExtractTables},
    progression::ProgressionCapture,
    teams::TeamCapture,
    world::WorldCapture,
};
use spectrum::game::{proto as pb, GamePacket};

#[derive(Default)]
pub struct AccountCapture {
    world: WorldCapture,
    progression: ProgressionCapture,
    teams: TeamCapture,
}

impl AccountCapture {
    pub fn message_ids() -> Vec<u16> {
        (0..=u16::MAX)
            .filter(|id| {
                extract::is_handled(*id)
                    || WorldCapture::handles(*id)
                    || ProgressionCapture::handles(*id)
                    || TeamCapture::handles(*id)
            })
            .collect()
    }

    pub fn apply(
        &mut self,
        tables: &ExtractTables,
        store: &mut AccountStore,
        packet: &GamePacket,
    ) -> Result<Vec<&'static str>, String> {
        let player_id = store.snapshot().player.as_ref().map_or(0, |p| p.player_id);
        if packet.msg_id == 15380 {
            let identity = packet
                .parse_proto::<pb::BasicInfoNotify>()
                .map_err(|_| "Could not decode player identity.")?;
            if i64::from(identity.id) != player_id {
                return Err("Account data belongs to a different player.".into());
            }
        }
        let effects = extract::apply_packet(tables, store, packet);
        if !effects.errors.is_empty() {
            return Err(format!(
                "Could not decode account data (message {}).",
                packet.msg_id
            ));
        }
        let mut sections = effects.sections;
        let at = crate::sniffer::now_ms();
        if WorldCapture::handles(packet.msg_id)
            && self
                .world
                .apply(packet, store.exploration_mut(), player_id, at)
                .map_err(|_| "Could not decode exploration data.")?
        {
            sections.push("exploration");
        }
        if ProgressionCapture::handles(packet.msg_id)
            && self
                .progression
                .apply(packet, store.progression_mut(), at)
                .map_err(|_| "Could not decode progression data.")?
        {
            sections.push("progression");
        }
        if TeamCapture::handles(packet.msg_id)
            && self
                .teams
                .apply(packet, store)
                .map_err(|_| "Could not decode team data.")?
        {
            sections.push("teams");
        }
        Ok(sections)
    }
}

/// Adapt a decoded transport payload without depending on the active client.
pub fn game_packet(message_id: u16, kind: u8, rpc_id: Option<u16>, payload: Vec<u8>) -> GamePacket {
    GamePacket {
        size: 0,
        msg_type: kind,
        seq_no: 0,
        rpc_id,
        msg_id: message_id,
        crc: 0,
        raw_msg: payload,
        timestamp: std::time::SystemTime::now(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::account::model::PlayerInfo;
    use spectrum::prost::Message;

    fn packet(id: u16, payload: impl Message) -> GamePacket {
        game_packet(id, 4, None, payload.encode_to_vec())
    }

    struct Fixture(std::path::PathBuf, AccountStore);
    impl Fixture {
        fn new() -> Self {
            let dir = std::env::temp_dir().join(format!(
                "mny-ingest-player-{}-{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
            let mut store = AccountStore::load(dir.clone());
            store.upsert_player(PlayerInfo {
                player_id: 123,
                name: "Old name".into(),
                level: 10,
                world_level: 1,
                head_id: None,
                signature: Some("Old signature".into()),
            });
            Self(dir, store)
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn text(key: pb::PlayerAttrKey, value: &str) -> pb::PlayerAttr {
        pb::PlayerAttr {
            key: key as i32,
            value_type: pb::PlayerAttrType::String as i32,
            value: Some(pb::player_attr::Value::StringValue(value.into())),
        }
    }

    fn number(key: pb::PlayerAttrKey, value: i32) -> pb::PlayerAttr {
        pb::PlayerAttr {
            key: key as i32,
            value_type: pb::PlayerAttrType::Int32 as i32,
            value: Some(pb::player_attr::Value::Int32Value(value)),
        }
    }

    #[test]
    fn active_sync_records_inventory_echoes_weapons_and_identity() {
        let ids = AccountCapture::message_ids();
        for id in [
            22445, // NormalItemResponse
            15755, // NormalItemAddNotify
            20661, // NormalItemUpdateNotify
            29178, // NormalItemRemoveNotify
            26275, // PhantomItemResponse
            27089, // WeaponItemResponse
            25557, // PbGetRoleListResponse
            15380, // BasicInfoNotify
            20778, // PlayerAttrNotify
        ] {
            assert!(ids.contains(&id), "message {id} is not recorded");
        }
    }

    #[test]
    fn own_login_attributes_and_sparse_updates_populate_player_without_public_lookup() {
        let mut fixture = Fixture::new();
        let mut capture = AccountCapture::default();
        let tables = ExtractTables::default();
        let login = packet(
            15380,
            pb::BasicInfoNotify {
                id: 123,
                attributes: vec![
                    text(pb::PlayerAttrKey::Name, "Rover"),
                    text(pb::PlayerAttrKey::Sign, "Hello"),
                    number(pb::PlayerAttrKey::Level, 80),
                    number(pb::PlayerAttrKey::CurWorldLevel, 7),
                    number(pb::PlayerAttrKey::HeadPhoto, 82001402),
                ],
                ..Default::default()
            },
        );
        let sections = capture.apply(&tables, &mut fixture.1, &login).unwrap();
        assert!(sections.contains(&"player"));
        let player = fixture.1.snapshot().player.as_ref().unwrap();
        assert_eq!(player.name, "Rover");
        assert_eq!(player.level, 80);
        assert_eq!(player.world_level, 7);
        assert_eq!(player.head_id, Some(82001402));
        assert_eq!(player.signature.as_deref(), Some("Hello"));

        let update = packet(
            20778,
            pb::PlayerAttrNotify {
                attributes: vec![
                    number(pb::PlayerAttrKey::Level, 81),
                    number(pb::PlayerAttrKey::HeadPhoto, 82011304),
                ],
            },
        );
        assert_eq!(
            capture.apply(&tables, &mut fixture.1, &update).unwrap(),
            vec!["player"]
        );
        // The identity-only fallback is not a zero-valued player snapshot.
        capture
            .apply(
                &tables,
                &mut fixture.1,
                &packet(
                    15380,
                    pb::BasicInfoNotify {
                        id: 123,
                        ..Default::default()
                    },
                ),
            )
            .unwrap();
        fixture.1.save().unwrap();
        let reloaded = AccountStore::load(fixture.0.clone());
        let player = reloaded.snapshot().player.as_ref().unwrap();
        assert_eq!(player.name, "Rover");
        assert_eq!(player.level, 81);
        assert_eq!(player.head_id, Some(82011304));
        assert_eq!(player.world_level, 7);
        assert_eq!(player.signature.as_deref(), Some("Hello"));
    }

    #[test]
    fn wrong_identity_invalid_attributes_and_rejected_public_details_cannot_change_player() {
        let mut fixture = Fixture::new();
        let mut capture = AccountCapture::default();
        let tables = ExtractTables::default();
        let before = serde_json::to_value(fixture.1.snapshot().player.as_ref().unwrap()).unwrap();
        let wrong = packet(
            15380,
            pb::BasicInfoNotify {
                id: 456,
                attributes: vec![text(pb::PlayerAttrKey::Name, "Wrong player")],
                ..Default::default()
            },
        );
        assert!(capture.apply(&tables, &mut fixture.1, &wrong).is_err());
        let invalid = packet(
            20778,
            pb::PlayerAttrNotify {
                attributes: vec![
                    text(pb::PlayerAttrKey::Level, "not an integer"),
                    number(pb::PlayerAttrKey::Name, 42),
                    number(pb::PlayerAttrKey::Coin, 999),
                ],
            },
        );
        assert!(capture
            .apply(&tables, &mut fixture.1, &invalid)
            .unwrap()
            .is_empty());
        let rejected = packet(
            22549,
            pb::PlayerBasicInfoGetResponse {
                error_code: 400003,
                info: Some(pb::PlayerDetails {
                    player_id: 123,
                    name: "Rejected data".into(),
                    ..Default::default()
                }),
            },
        );
        assert!(capture
            .apply(&tables, &mut fixture.1, &rejected)
            .unwrap()
            .is_empty());
        assert_eq!(
            serde_json::to_value(fixture.1.snapshot().player.as_ref().unwrap()).unwrap(),
            before
        );
    }

    #[test]
    fn older_player_snapshots_without_selected_portrait_still_load() {
        let player: PlayerInfo =
            serde_json::from_str(r#"{"playerId":123,"name":"Rover","level":80,"worldLevel":7}"#)
                .unwrap();
        assert_eq!(player.head_id, None);
    }
}
