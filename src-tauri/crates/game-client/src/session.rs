use anyhow::{bail, ensure, Context, Result};
use prost::Message;
use prost_reflect::{DynamicMessage, Value};
use rand::RngCore;
use serde::Serialize;
use serde_json::json;
use std::{
    collections::HashSet,
    fs,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::{Duration, Instant},
};

use crate::{
    config::{byte_from_hex, Config},
    schema::{integer, Schema},
    wire::{Connection, Packet},
};

#[derive(Serialize)]
pub struct Inventory {
    pub player_id: i32,
    pub normal_items: DynamicMessage,
    pub echoes: DynamicMessage,
    pub weapons: DynamicMessage,
    pub characters: DynamicMessage,
}

pub struct Session {
    connection: Connection,
    schema: Schema,
    config: Config,
    cancelled: Arc<AtomicBool>,
    next_rpc: u16,
    expected_player_id: Option<i32>,
    player_id: Option<i32>,
    identity_confirmed: bool,
    next_heartbeat: Option<Instant>,
    heartbeat_rpcs: HashSet<u16>,
    record_ids: HashSet<u16>,
    received: Vec<ReceivedPacket>,
    received_bytes: usize,
    inventory: crate::live_inventory::LiveInventory,
}

/// Only explicitly requested data messages are retained; authentication packets stay private.
pub struct ReceivedPacket {
    pub message_id: u16,
    pub kind: u8,
    pub rpc_id: Option<u16>,
    pub payload: Vec<u8>,
}

impl Session {
    fn send_request(&mut self, name: &str, message: &DynamicMessage) -> Result<u16> {
        ensure!(
            !self.cancelled.load(Ordering::Relaxed),
            "connection cancelled"
        );
        let rpc = self.next_rpc;
        self.next_rpc = self.next_rpc.checked_add(1).context("RPC IDs exhausted")?;
        self.connection
            .send(1, rpc, self.schema.id(name)?, &message.encode_to_vec())?;
        Ok(rpc)
    }

    fn tick(&mut self) -> Result<Option<Packet>> {
        ensure!(
            !self.cancelled.load(Ordering::Relaxed),
            "connection cancelled"
        );
        if self
            .next_heartbeat
            .is_some_and(|deadline| Instant::now() >= deadline)
        {
            ensure!(
                self.heartbeat_rpcs.len() < 3,
                "server stopped acknowledging heartbeats"
            );
            let message = self.schema.message("HeartbeatRequest", &json!({}))?;
            let rpc = self.send_request("HeartbeatRequest", &message)?;
            self.heartbeat_rpcs.insert(rpc);
            self.next_heartbeat =
                Some(Instant::now() + Duration::from_secs(self.config.heartbeat_seconds));
        }
        let Some(packet) = self.connection.poll()? else {
            return Ok(None);
        };
        // The wire decoder rejects exception envelopes before their opaque
        // body can reach protobuf decoding or account recording.
        if packet.message == self.schema.id("LogoutNotify")? {
            let message = self.schema.decode("LogoutNotify", &packet.payload)?;
            self.schema.ensure_success("LogoutNotify", &message)?;
            bail!("server logged the player out");
        }
        let identity_message = if packet.message == self.schema.id("LoginNotify")? {
            Some("LoginNotify")
        } else if packet.message == self.schema.id("BasicInfoNotify")? {
            Some("BasicInfoNotify")
        } else {
            None
        };
        if let Some(name) = identity_message {
            ensure!(
                matches!(packet.kind, 4 | 20),
                "{name} has an unexpected frame type"
            );
            let message = self.schema.decode(name, &packet.payload)?;
            let player_id = integer(&message, "Id")?;
            ensure!(
                player_id > 0
                    && self.expected_player_id.is_none_or(|id| id == player_id)
                    && self.player_id.is_none_or(|id| id == player_id),
                "server authenticated a different player ID; refusing inventory export"
            );
            self.player_id = Some(player_id);
            self.identity_confirmed = true;
        }
        if packet.message == self.schema.id("HeartbeatResponse")? {
            ensure!(
                matches!(packet.kind, 2 | 18)
                    && packet
                        .rpc
                        .is_some_and(|rpc| self.heartbeat_rpcs.remove(&rpc)),
                "unexpected heartbeat response RPC"
            );
        }
        self.inventory.ingest(&self.schema, &packet)?;
        if self.record_ids.contains(&packet.message) {
            self.received_bytes += packet.payload.len();
            ensure!(
                self.received_bytes <= 16 * 1024 * 1024 && self.received.len() < 8192,
                "account synchronization queue exceeded its limit"
            );
            self.received.push(ReceivedPacket {
                message_id: packet.message,
                kind: packet.kind,
                rpc_id: packet.rpc,
                payload: packet.payload.clone(),
            });
        }
        Ok(Some(packet))
    }

    fn request(
        &mut self,
        name: &str,
        response: &str,
        message: &DynamicMessage,
    ) -> Result<DynamicMessage> {
        let rpc = self.send_request(name, message)?;
        let response_id = self.schema.id(response)?;
        let deadline = Instant::now() + self.config.timeout();
        while Instant::now() < deadline {
            let Some(packet) = self.tick().with_context(|| format!("{name} failed"))? else {
                continue;
            };
            if packet.message != response_id {
                continue;
            }
            ensure!(
                matches!(packet.kind, 2 | 18) && packet.rpc == Some(rpc),
                "{response} has an unexpected frame type or RPC ID"
            );
            let result = self.schema.decode(response, &packet.payload)?;
            self.schema.ensure_success(response, &result)?;
            return Ok(result);
        }
        bail!("timed out waiting for {response}; authentication, client version, or session setup may be unsupported")
    }

    fn confirm_identity(&mut self) -> Result<()> {
        let deadline = Instant::now() + self.config.timeout();
        while !self.identity_confirmed && Instant::now() < deadline {
            self.tick()?;
        }
        ensure!(
            self.identity_confirmed,
            "no matching player identity notification arrived; refusing unverified inventory export"
        );
        Ok(())
    }

    pub fn player_id(&self) -> i32 {
        self.player_id.unwrap_or_default()
    }

    /// Poll the live connection, handling heartbeats, logout and identity checks.
    pub fn keep_alive(&mut self) -> Result<()> {
        self.tick().map(|_| ())
    }

    pub fn drain_packets(&mut self) -> Vec<ReceivedPacket> {
        self.received_bytes = 0;
        std::mem::take(&mut self.received)
    }

    /// Plan from this connection's inventory, including confirmed live updates.
    pub fn plan_echo_upgrade(
        &mut self,
        incr_id: i32,
        target: i32,
        protected: &[i32],
    ) -> Result<crate::echo_upgrade::UpgradePlan> {
        self.plan_echo_upgrade_with_policy(incr_id, target, protected, &Default::default())
    }

    pub fn plan_echo_upgrade_with_policy(
        &mut self,
        incr_id: i32,
        target: i32,
        protected: &[i32],
        policy: &crate::echo_upgrade::MaterialPolicy,
    ) -> Result<crate::echo_upgrade::UpgradePlan> {
        policy.validate()?;
        self.synchronize_echo_inventory()?;
        let echoes = self
            .inventory
            .echoes
            .as_ref()
            .context("Missing echo snapshot")?;
        let items = self
            .inventory
            .items
            .as_ref()
            .context("Missing material snapshot")?;
        let mut equipped = HashSet::new();
        if let Some(info) = echoes.get_field_by_name("EquipInfo") {
            if let Some(roles) = info.as_list() {
                for role in roles.iter().filter_map(Value::as_message) {
                    if let Some(ids) = role.get_field_by_name("PhantomItemIncrId") {
                        if let Some(ids) = ids.as_list() {
                            for id in ids {
                                if let Value::I32(id) = id {
                                    equipped.insert(*id);
                                }
                            }
                        }
                    }
                }
            }
        }
        let echo_list = echoes
            .get_field_by_name("PhantomItemList")
            .context("Missing echoes")?;
        let all_echoes = echo_list
            .as_list()
            .context("Invalid echoes")?
            .iter()
            .filter_map(Value::as_message)
            .map(|echo| upgrade_echo_state(echo, &equipped))
            .collect::<Result<Vec<_>>>()?;
        let echo = all_echoes
            .iter()
            .find(|echo| echo.incr_id == incr_id)
            .context("Echo is no longer in the connected account")?;
        let item_list = items
            .get_field_by_name("NormalItemList")
            .context("Missing materials")?;
        let inventory = item_list
            .as_list()
            .context("Invalid materials")?
            .iter()
            .filter_map(Value::as_message)
            .map(|item| Ok((integer(item, "Id")?, integer(item, "Count")?)))
            .collect::<Result<_>>()?;
        crate::echo_upgrade::plan_with_policy(
            echo,
            target,
            &inventory,
            &all_echoes,
            &protected.iter().copied().collect(),
            policy,
        )
    }

    /// Revalidate the reviewed cost before the sole mutation. A lost response is
    /// never retried: the server may already have consumed the materials.
    pub fn upgrade_echo(
        &mut self,
        approved: &crate::echo_upgrade::UpgradePlan,
        protected: &[i32],
    ) -> Result<crate::echo_upgrade::UpgradePlan> {
        self.upgrade_echo_with_policy(approved, protected, &Default::default())
    }

    pub fn upgrade_echo_with_policy(
        &mut self,
        approved: &crate::echo_upgrade::UpgradePlan,
        protected: &[i32],
        policy: &crate::echo_upgrade::MaterialPolicy,
    ) -> Result<crate::echo_upgrade::UpgradePlan> {
        let current = self.plan_echo_upgrade_with_policy(
            approved.incr_id,
            approved.target_level,
            protected,
            policy,
        )?;
        ensure!(
            &current == approved,
            "Echo or material costs changed; review a new upgrade preview"
        );
        let (request_name, response_name, fields) = if current.target_level == current.from_level {
            (
                "PhantomIdentifyRequest",
                "PhantomIdentifyResponse",
                json!({"IncrId": current.incr_id, "Count": current.identify_count}),
            )
        } else {
            (
                "PhantomLevelUpRequest",
                "PhantomLevelUpResponse",
                json!({
                    "IncId": current.incr_id,
                    "ConsumeList": current.materials.iter().map(|m| json!({"ItemId": m.id, "Count": m.count}))
                        .chain(current.echo_materials.iter().map(|m| json!({"IncId": m.incr_id, "ItemId": m.item_id, "Count": m.count}))).collect::<Vec<_>>(),
                    "IdentifyCount": current.identify_count
                }),
            )
        };
        let request = self.schema.message(request_name, &fields)?;
        let material_revisions = current
            .materials
            .iter()
            .chain(&current.tuners)
            .map(|cost| Ok((cost.id, self.inventory.material_revision(cost.id)?)))
            .collect::<Result<Vec<_>>>()?;
        let expected_echoes = current
            .echo_materials
            .iter()
            .map(|cost| {
                Ok((
                    cost.incr_id,
                    self.inventory.echo_count(cost.incr_id)? - cost.count,
                ))
            })
            .collect::<Result<Vec<_>>>()?;
        let response = self.request(request_name, response_name, &request)?;
        let update = response
            .get_field_by_name("UpdateInfo")
            .context("Upgrade response missing echo; refresh before continuing")?;
        let updated = update.as_message().context("Invalid upgraded echo")?;
        ensure!(
            integer(updated, "Id")? == current.item_id
                && integer(updated, "PhantomLevel")? == current.result_level,
            "Server returned an unexpected upgraded echo; refresh before continuing"
        );
        let substats = updated
            .get_field_by_name("PhantomSubProp")
            .context("Missing tuned substats")?;
        ensure!(
            substats.as_list().is_some_and(
                |p| p.len() == current.from_sub_props.len() + current.identify_count as usize
            ),
            "Server did not confirm the expected substat count; refresh before continuing"
        );
        // The operated copy may have a new instance ID after a stack split.
        let mut result = current;
        result.incr_id = integer(updated, "IncrId")?;
        // Success requires fresh notifications for every spent material. Tuned
        // echo fodder refunds tuners (observed live: 10 spent, 3 returned), so
        // before-minus-cost is not the authoritative final count. Keep the
        // server's counts, including refunds, instead of predicting net costs.
        let deadline = Instant::now() + self.config.timeout();
        loop {
            let items_confirmed = material_revisions.iter().all(|(id, revision)| {
                self.inventory
                    .material_revision(*id)
                    .is_ok_and(|current| current > *revision)
                    && self
                        .inventory
                        .material_count(*id)
                        .is_ok_and(|count| count >= 0)
            });
            let echoes_confirmed = expected_echoes
                .iter()
                .all(|(id, count)| self.inventory.echo_count(*id).ok() == Some(*count));
            if items_confirmed && echoes_confirmed {
                break;
            }
            ensure!(
                Instant::now() < deadline,
                "Inventory did not confirm material consumption; no upgrade will be retried"
            );
            self.tick()?;
        }
        Ok(result)
    }

    /// Mark a failed target only after checking its current state and equipment.
    pub fn discard_echo(
        &mut self,
        expected: &crate::echo_upgrade::DiscardEcho,
    ) -> Result<crate::echo_upgrade::DiscardResult> {
        use crate::echo_upgrade::{discard_guard, DiscardResult};
        ensure!(expected.incr_id > 0, "Choose a captured echo to mark");
        let current = self.echo_for_discard(expected.incr_id)?;
        if let Some(reason) = discard_guard(&current, expected)? {
            return Ok(DiscardResult {
                marked: false,
                reason: Some(reason),
            });
        }
        if current.func_value != 2 {
            self.request(
                "ItemDisuseRequest",
                "ItemDisuseResponse",
                &self.schema.message(
                    "ItemDisuseRequest",
                    &json!({"IncrId": expected.incr_id, "Oper": 1}),
                )?,
            )?;
            let deadline = Instant::now() + self.config.timeout();
            loop {
                if self.cached_echo(expected.incr_id)?.func_value == 2 {
                    break;
                }
                ensure!(
                    Instant::now() < deadline,
                    "Discard mark was not confirmed; no marking request will be retried"
                );
                self.tick()?;
            }
        }
        Ok(DiscardResult {
            marked: true,
            reason: None,
        })
    }

    /// Set an explicit inventory mark, confirming the authoritative notification.
    pub fn mark_echo(
        &mut self,
        expected: &crate::echo_mark::MarkEcho,
        mark: crate::echo_mark::EchoMark,
    ) -> Result<i32> {
        ensure!(expected.incr_id > 0, "Choose a captured echo to mark");
        self.synchronize_echo_inventory()?;
        let current = self.cached_echo(expected.incr_id)?;
        if let Some(plan) = crate::echo_mark::plan_mark(&current, expected, mark)? {
            self.request(
                plan.request,
                plan.response,
                &self.schema.message(
                    plan.request,
                    &json!({"IncrId":expected.incr_id, "Oper":plan.oper}),
                )?,
            )?;
            let deadline = Instant::now() + self.config.timeout();
            loop {
                if self.cached_echo(expected.incr_id)?.func_value == mark.func_value() {
                    break;
                }
                ensure!(
                    Instant::now() < deadline,
                    "Echo mark was not confirmed; no marking request will be retried"
                );
                self.tick()?;
            }
        }
        Ok(mark.func_value())
    }

    fn echo_for_discard(&mut self, incr_id: i32) -> Result<crate::echo_upgrade::UpgradeEcho> {
        self.synchronize_echo_inventory()?;
        self.cached_echo(incr_id)
    }

    fn cached_echo(&self, incr_id: i32) -> Result<crate::echo_upgrade::UpgradeEcho> {
        let inventory = self
            .inventory
            .echoes
            .as_ref()
            .context("Missing echo snapshot")?;
        let mut equipped = HashSet::new();
        if let Some(info) = inventory.get_field_by_name("EquipInfo") {
            for role in info
                .as_list()
                .context("Invalid echo equipment")?
                .iter()
                .filter_map(Value::as_message)
            {
                if let Some(ids) = role.get_field_by_name("PhantomItemIncrId") {
                    for id in ids.as_list().context("Invalid equipped echo IDs")? {
                        if let Value::I32(id) = id {
                            equipped.insert(*id);
                        }
                    }
                }
            }
        }
        let list = inventory
            .get_field_by_name("PhantomItemList")
            .context("Missing echoes")?;
        let echo = list
            .as_list()
            .context("Invalid echoes")?
            .iter()
            .filter_map(Value::as_message)
            .find(|item| integer(item, "IncrId").ok() == Some(incr_id))
            .context("Echo is no longer in the connected account")?;
        upgrade_echo_state(echo, &equipped)
    }

    /// Read-only snapshots used by the desktop account store. Login notifications
    /// arriving while requests are outstanding remain in the same ordered queue.
    /// Own-player details arrive in BasicInfoNotify/PlayerAttrNotify. The public
    /// PlayerBasicInfoGetRequest explicitly rejects self-lookups (400003).
    pub fn synchronize(&mut self) -> Result<()> {
        for (request, response, fields) in [
            ("NormalItemRequest", "NormalItemResponse", json!({})),
            ("PhantomItemRequest", "PhantomItemResponse", json!({})),
            ("WeaponItemRequest", "WeaponItemResponse", json!({})),
            ("PbGetRoleListRequest", "PbGetRoleListResponse", json!({})),
            (
                "GetFormationDataRequest",
                "GetFormationDataResponse",
                json!({}),
            ),
            (
                "AchievementInfoRequest",
                "AchievementInfoResponse",
                json!({}),
            ),
        ] {
            self.request(request, response, &self.schema.message(request, &fields)?)?;
        }
        Ok(())
    }

    pub fn synchronize_echo_inventory(&mut self) -> Result<()> {
        self.inventory.ensure_valid()?;
        for (request, response) in [
            ("PhantomItemRequest", "PhantomItemResponse"),
            ("NormalItemRequest", "NormalItemResponse"),
        ] {
            let missing = if request == "PhantomItemRequest" {
                self.inventory.echoes.is_none()
            } else {
                self.inventory.items.is_none()
            };
            if missing {
                self.request(
                    request,
                    response,
                    &self.schema.message(request, &json!({}))?,
                )?;
            }
        }
        // Inventory snapshots are initialization RPCs. Use an acknowledged
        // heartbeat to process the ordered update stream before reviewing or
        // executing a plan, rather than fetching the same snapshots again.
        let rpc = self.send_request(
            "HeartbeatRequest",
            &self.schema.message("HeartbeatRequest", &json!({}))?,
        )?;
        self.heartbeat_rpcs.insert(rpc);
        let deadline = Instant::now() + self.config.timeout();
        while self.heartbeat_rpcs.contains(&rpc) {
            ensure!(
                Instant::now() < deadline,
                "Timed out waiting for live inventory updates"
            );
            self.tick()?;
        }
        Ok(())
    }

    pub fn disconnect(&mut self) {
        if let Ok(id) = self.schema.id("ExitGamePush") {
            let _ = self.connection.send(4, 0, id, &[]);
        }
    }
}

impl Drop for Session {
    fn drop(&mut self) {
        self.disconnect();
    }
}

fn upgrade_echo_state(
    echo: &DynamicMessage,
    equipped: &HashSet<i32>,
) -> Result<crate::echo_upgrade::UpgradeEcho> {
    let incr_id = integer(echo, "IncrId")?;
    Ok(crate::echo_upgrade::UpgradeEcho {
        incr_id,
        item_id: integer(echo, "Id")?,
        level: integer(echo, "PhantomLevel")?,
        exp: integer(echo, "PhantomExp")?,
        func_value: integer(echo, "FuncValue")?,
        stack_count: integer(echo, "StackCount")?.max(1),
        equipped: equipped.contains(&incr_id),
        sub_props: echo
            .get_field_by_name("PhantomSubProp")
            .context("Missing substats")?
            .as_list()
            .context("Invalid substats")?
            .iter()
            .filter_map(Value::as_message)
            .map(|p| Ok((integer(p, "PhantomPropId")?, integer(p, "Value")?)))
            .collect::<Result<_>>()?,
    })
}

fn session_key(response: &DynamicMessage, config: &Config) -> Result<[u8; 32]> {
    let bytes = response
        .get_field_by_name("Key")
        .context("key response missing Key")?;
    let Value::Bytes(bytes) = bytes.as_ref() else {
        bail!("invalid session key response");
    };
    // Current observed protocol: 32 ASCII hex characters, used as the AES key
    // bytes themselves, not decoded into a 16-byte value.
    if bytes.len() == 32 && bytes.iter().all(u8::is_ascii_hexdigit) {
        return Ok(bytes.as_ref().try_into().unwrap());
    }
    let path = config.private_key_file.as_ref().context(
        "server returned a different key format; RSA exchange requires private_key_file",
    )?;
    use rsa::pkcs1::DecodeRsaPrivateKey;
    let pem = fs::read_to_string(path).context("could not read private key")?;
    let key = rsa::RsaPrivateKey::from_pkcs1_pem(&pem)
        .map_err(|_| anyhow::anyhow!("invalid RSA private key"))?;
    let bytes = key
        .decrypt(rsa::Pkcs1v15Encrypt, bytes)
        .map_err(|_| anyhow::anyhow!("RSA session key decryption failed"))?;
    bytes
        .as_slice()
        .try_into()
        .map_err(|_| anyhow::anyhow!("server returned a session key with an unsupported length"))
}

fn ensure_not_queued(name: &str, message: &DynamicMessage) -> Result<()> {
    ensure!(
        integer(message, "ClientWaitingMode")? == 0,
        "{name} placed the client in a login queue; queue handling is not implemented"
    );
    Ok(())
}

pub fn connect(config: &Config, schema: &Schema, cancelled: Arc<AtomicBool>) -> Result<Session> {
    connect_recording(config, schema, cancelled, &[])
}

pub fn connect_recording(
    config: &Config,
    schema: &Schema,
    cancelled: Arc<AtomicBool>,
    record_ids: &[u16],
) -> Result<Session> {
    ensure!(!cancelled.load(Ordering::Relaxed), "connection cancelled");
    config.validate(schema)?;
    let prepared = crate::auth::prepare(config)?;
    let config = &prepared;
    ensure!(!cancelled.load(Ordering::Relaxed), "connection cancelled");
    config.validate(schema)?;
    let login = schema.message("LoginRequest", &config.login)?;
    let expected_player_id = config.expected_player_id;
    let handshake_trace = format!("{:032x}", rand::random::<u128>());
    eprintln!("Opening a separate UDP/KCP connection...");
    let connection = Connection::connect(
        &config.gateway,
        byte_from_hex(&config.handshake_request_hex)?,
        byte_from_hex(&config.handshake_response_hex)?,
        config.handshake_format,
        &handshake_trace,
        config.timeout(),
    )?;
    let mut session = Session {
        connection,
        schema: schema.clone(),
        config: config.clone(),
        cancelled,
        next_rpc: 1,
        expected_player_id,
        player_id: None,
        identity_confirmed: false,
        next_heartbeat: None,
        heartbeat_rpcs: HashSet::new(),
        record_ids: record_ids.iter().copied().collect(),
        received: Vec::new(),
        received_bytes: 0,
        inventory: Default::default(),
    };

    eprintln!("Exchanging session keys...");
    let mut random = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut random);
    let trace: String = random.iter().map(|byte| format!("{byte:02x}")).collect();
    let key_request = schema.message(
        "ProtoKeyRequest",
        &json!({"IsLogin": true, "TraceId": trace}),
    )?;
    let response = session.request("ProtoKeyRequest", "ProtoKeyResponse", &key_request)?;
    session.connection.key = Some(session_key(&response, config)?);

    eprintln!("Authenticating the supplied game login token...");
    let response = session.request("LoginRequest", "LoginResponse", &login)?;
    ensure_not_queued("LoginResponse", &response)?;
    session.next_heartbeat = Some(Instant::now() + Duration::from_secs(config.heartbeat_seconds));

    eprintln!("Starting the game session...");
    let enter = schema.message("EnterGameRequest", &config.enter_game)?;
    let response = session.request("EnterGameRequest", "EnterGameResponse", &enter)?;
    ensure_not_queued("EnterGameResponse", &response)?;
    session.confirm_identity()?;

    Ok(session)
}

pub fn run(config: &Config, schema: &Schema) -> Result<Inventory> {
    let mut session = connect(config, schema, Arc::new(AtomicBool::new(false)))?;

    eprintln!("Requesting materials, echoes, weapons, and characters...");
    let mut fetch = |request, response| -> Result<DynamicMessage> {
        session.request(request, response, &schema.message(request, &json!({}))?)
    };
    let normal_items = fetch("NormalItemRequest", "NormalItemResponse")?;
    let echoes = fetch("PhantomItemRequest", "PhantomItemResponse")?;
    let weapons = fetch("WeaponItemRequest", "WeaponItemResponse")?;
    let characters = fetch("PbGetRoleListRequest", "PbGetRoleListResponse")?;
    let inventory = Inventory {
        player_id: session
            .player_id
            .context("player identity was not confirmed")?,
        normal_items,
        echoes,
        weapons,
        characters,
    };
    Ok(inventory)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{net::UdpSocket, thread};

    #[derive(Clone, Copy, PartialEq)]
    enum Scenario {
        Success,
        RejectedLogin,
        WrongPlayer,
        BasicInfo,
        WrongBasicInfo,
        WrongRpc,
        MissingInventory,
        Persistent,
        Synchronize,
        Upgrade,
        RejectedUpgrade,
        ExceptionUpgrade,
        StaleUpgrade,
        LostUpgrade,
        MissingConsumption,
        UnrelatedConsumption,
        TuneOnly,
        FeedUpgrade,
        ProtectedFeed,
        ChangedFeed,
        Discard,
        RejectedDiscard,
        LostDiscard,
        MissingDiscardMark,
        LockedDiscard,
        EquippedDiscard,
        StackedDiscard,
        StaleDiscard,
        AlreadyDiscard,
        ManualMark {
            from: i32,
            to: i32,
            error: i32,
            notify: bool,
            respond: bool,
        },
    }

    impl Scenario {
        fn live_inventory(self) -> bool {
            matches!(
                self,
                Self::Upgrade
                    | Self::RejectedUpgrade
                    | Self::ExceptionUpgrade
                    | Self::StaleUpgrade
                    | Self::LostUpgrade
                    | Self::MissingConsumption
                    | Self::UnrelatedConsumption
                    | Self::TuneOnly
                    | Self::FeedUpgrade
                    | Self::ProtectedFeed
                    | Self::ChangedFeed
                    | Self::Discard
                    | Self::RejectedDiscard
                    | Self::LostDiscard
                    | Self::MissingDiscardMark
                    | Self::LockedDiscard
                    | Self::EquippedDiscard
                    | Self::StackedDiscard
                    | Self::StaleDiscard
                    | Self::AlreadyDiscard
                    | Self::ManualMark { .. }
            )
        }
    }

    fn fixture(gateway: String) -> Config {
        serde_json::from_value(json!({
            "gateway": gateway,
            "handshake_request_hex": "41",
            "handshake_response_hex": "42",
            "timeout_seconds": 3,
            "heartbeat_seconds": 1,
            "expected_player_id": 123,
            "login": { "Id": 123, "Account": "test-account", "Token": "never-print-this-token", "AppVersion": "test", "LauncherVersion": "test", "ResourceVersion": "test" }
        })).unwrap()
    }

    fn serve(socket: UdpSocket, scenario: Scenario) -> Result<usize> {
        let schema = Schema::load()?;
        socket.set_read_timeout(Some(Duration::from_secs(5)))?;
        let mut handshake = [0u8; 64];
        let (len, peer) = socket.recv_from(&mut handshake)?;
        ensure!(
            len == 39 && handshake[..3] == [0x41, 0, 32],
            "unexpected test handshake"
        );
        ensure!(
            handshake[3..35].iter().all(u8::is_ascii_hexdigit),
            "invalid handshake trace"
        );
        ensure!(
            u32::from_le_bytes(handshake[35..39].try_into().unwrap())
                == crc32fast::hash(&handshake[..35]),
            "invalid handshake CRC"
        );
        let mut reply = [0u8; 13];
        reply[0] = 0x42;
        reply[1..5].copy_from_slice(&77u32.to_le_bytes());
        socket.send_to(&reply, peer)?;
        socket.connect(peer)?;
        let mut connection = Connection::established(socket, 77)?;
        let key = *b"0123456789abcdef0123456789abcdef";
        let mut steps = vec![
            ("ProtoKeyRequest", "ProtoKeyResponse", json!({})),
            ("LoginRequest", "LoginResponse", json!({})),
            ("EnterGameRequest", "EnterGameResponse", json!({})),
            (
                "NormalItemRequest",
                "NormalItemResponse",
                json!({"NormalItemList": [{"Id": 1, "Count": 42}]}),
            ),
            (
                "PhantomItemRequest",
                "PhantomItemResponse",
                json!({"PhantomItemList": [{"Id": 2, "IncrId": 20, "PhantomLevel": 5}]}),
            ),
            (
                "WeaponItemRequest",
                "WeaponItemResponse",
                json!({"WeaponItemList": [{"Id": 3, "IncrId": 30}]}),
            ),
            (
                "PbGetRoleListRequest",
                "PbGetRoleListResponse",
                json!({"RoleList": [{"RoleId": 4, "Level": 90}]}),
            ),
        ];
        if scenario == Scenario::Synchronize {
            steps.extend([
                (
                    "GetFormationDataRequest",
                    "GetFormationDataResponse",
                    json!({}),
                ),
                (
                    "AchievementInfoRequest",
                    "AchievementInfoResponse",
                    json!({}),
                ),
            ]);
        }
        if matches!(
            scenario,
            Scenario::Upgrade
                | Scenario::RejectedUpgrade
                | Scenario::ExceptionUpgrade
                | Scenario::StaleUpgrade
                | Scenario::LostUpgrade
                | Scenario::MissingConsumption
                | Scenario::UnrelatedConsumption
                | Scenario::TuneOnly
                | Scenario::FeedUpgrade
                | Scenario::ProtectedFeed
                | Scenario::ChangedFeed
        ) {
            steps.truncate(3);
            {
                let level = if scenario == Scenario::TuneOnly { 5 } else { 0 };
                let mut echo_list = vec![
                    json!({"Id": 60000015, "IncrId": 20, "PhantomLevel": level, "StackCount": 3}),
                ];
                if matches!(
                    scenario,
                    Scenario::FeedUpgrade | Scenario::ProtectedFeed | Scenario::ChangedFeed
                ) {
                    echo_list.push(
                        json!({"Id": 60000015, "IncrId": 40, "PhantomLevel": if scenario == Scenario::FeedUpgrade {20} else {5}, "FuncValue": 2, "PhantomSubProp": [{"PhantomPropId": 1, "Value": 630}]}),
                    );
                }
                steps.extend([
                    ("PhantomItemRequest", "PhantomItemResponse", json!({"PhantomItemList": echo_list})),
                    ("NormalItemRequest", "NormalItemResponse", json!({"NormalItemList": [{"Id": 36000001, "Count": 100}, {"Id": 36000014, "Count": 100}]})),
                ]);
            }
            if !matches!(scenario, Scenario::StaleUpgrade | Scenario::ChangedFeed) {
                steps.push((
                    if scenario == Scenario::TuneOnly { "PhantomIdentifyRequest" } else { "PhantomLevelUpRequest" },
                    if scenario == Scenario::TuneOnly { "PhantomIdentifyResponse" } else { "PhantomLevelUpResponse" },
                    json!({
                        "ErrorCode": if scenario == Scenario::RejectedUpgrade { 200099 } else { 0 },
                        "UpdateInfo": {"Id": 60000015, "IncrId": if scenario == Scenario::TuneOnly {20} else {21}, "PhantomLevel": if scenario == Scenario::FeedUpgrade {17} else {5}, "PhantomSubProp": [{"PhantomPropId": 1, "Value": 630}]},
                        "StackSplitInfo": {
                            "OperateItem": {"Id": 60000015, "IncrId": 21, "PhantomLevel": if scenario == Scenario::FeedUpgrade {17} else {5}},
                            "RemainderItem": {"Id": 60000015, "IncrId": 20, "StackCount": 2}
                        }
                    }),
                ));
            }
        }
        if matches!(
            scenario,
            Scenario::Discard
                | Scenario::RejectedDiscard
                | Scenario::LostDiscard
                | Scenario::MissingDiscardMark
                | Scenario::LockedDiscard
                | Scenario::EquippedDiscard
                | Scenario::StackedDiscard
                | Scenario::StaleDiscard
                | Scenario::AlreadyDiscard
        ) {
            steps.truncate(3);
            let snapshot = |marked| {
                json!({
                    "PhantomItemList": [{"Id": 60000015, "IncrId": 21, "PhantomLevel": 5,
                        "StackCount": if scenario == Scenario::StackedDiscard {2} else {1},
                        "FuncValue": if scenario == Scenario::LockedDiscard {1} else if marked {2} else {0},
                        "PhantomSubProp": [{"PhantomPropId": 1, "Value": if scenario == Scenario::StaleDiscard {870} else {630}}]}],
                    "EquipInfo": if scenario == Scenario::EquippedDiscard {vec![json!({"RoleId": 1, "PhantomItemIncrId": [21]})]} else {vec![]}
                })
            };
            steps.push((
                "PhantomItemRequest",
                "PhantomItemResponse",
                snapshot(scenario == Scenario::AlreadyDiscard),
            ));
            steps.push(("NormalItemRequest", "NormalItemResponse", json!({})));
            if matches!(
                scenario,
                Scenario::Discard
                    | Scenario::LockedDiscard
                    | Scenario::RejectedDiscard
                    | Scenario::LostDiscard
                    | Scenario::MissingDiscardMark
            ) {
                steps.push((
                    "ItemDisuseRequest",
                    "ItemDisuseResponse",
                    json!({"ErrCode": if scenario == Scenario::RejectedDiscard {1} else {0}}),
                ));
            }
        }
        if let Scenario::ManualMark {
            from, to, error, ..
        } = scenario
        {
            steps.truncate(3);
            steps.push((
                "PhantomItemRequest",
                "PhantomItemResponse",
                json!({
                    "PhantomItemList":[{"Id":60000015,"IncrId":21,"StackCount":3,"FuncValue":from}],
                    "EquipInfo":[{"RoleId":1,"PhantomItemIncrId":[21]}]
                }),
            ));
            steps.push(("NormalItemRequest", "NormalItemResponse", json!({})));
            if from != to {
                let locking = to == 1 || (to == 0 && from == 1);
                steps.push((
                    if locking {
                        "ItemLockRequest"
                    } else {
                        "ItemDisuseRequest"
                    },
                    if locking {
                        "ItemLockResponse"
                    } else {
                        "ItemDisuseResponse"
                    },
                    json!({"ErrCode":error}),
                ));
            }
        }
        let mut index = 0;
        let mut heartbeat_count = 0;
        let mut inventory_requests = HashSet::new();
        let mut delayed: Option<(Instant, u16, Vec<u8>)> = None;
        let deadline = Instant::now() + Duration::from_secs(8);
        while Instant::now() < deadline {
            if delayed
                .as_ref()
                .is_some_and(|(due, _, _)| Instant::now() >= *due)
            {
                let (_, rpc, payload) = delayed.take().unwrap();
                connection.send(2, rpc, schema.id("NormalItemResponse")?, &payload)?;
            }
            let Some(packet) = connection.poll()? else {
                continue;
            };
            if packet.message == schema.id("ExitGamePush")? {
                ensure!(
                    packet.kind == 4
                        && index >= 3
                        && (scenario.live_inventory()
                            || matches!(
                                scenario,
                                Scenario::Persistent
                                    | Scenario::MissingInventory
                                    | Scenario::Synchronize
                                    | Scenario::LostUpgrade
                                    | Scenario::LostDiscard
                            )),
                    "unexpected disconnect in mock session"
                );
                return Ok(heartbeat_count);
            }
            ensure!(packet.kind == 1, "client did not send request packet");
            let rpc = packet.rpc.context("request missing RPC ID")?;
            if packet.message == schema.id("HeartbeatRequest")? {
                heartbeat_count += 1;
                // The second barrier revalidates the preview using live updates.
                // No second inventory snapshot request is accepted by this mock.
                if heartbeat_count == 2 && scenario == Scenario::StaleUpgrade {
                    let update = schema.message(
                        "PhantomItemUpdateNotify",
                        &json!({"UpdateInfo": [{
                            "Id": 60000015, "IncrId": 20, "PhantomLevel": 1, "StackCount": 3
                        }]}),
                    )?;
                    connection.send(
                        4,
                        0,
                        schema.id("PhantomItemUpdateNotify")?,
                        &update.encode_to_vec(),
                    )?;
                }
                if heartbeat_count == 2 && scenario == Scenario::ChangedFeed {
                    let update = schema.message(
                        "ItemFuncValueUpdateNotify",
                        &json!({"IncrId": 40, "FuncValue": 0}),
                    )?;
                    connection.send(
                        4,
                        0,
                        schema.id("ItemFuncValueUpdateNotify")?,
                        &update.encode_to_vec(),
                    )?;
                }
                connection.send(2, rpc, schema.id("HeartbeatResponse")?, &[])?;
                if scenario == Scenario::MissingInventory && heartbeat_count >= 4 {
                    return Ok(heartbeat_count);
                }
                continue;
            }
            if scenario.live_inventory()
                && [
                    schema.id("PhantomItemRequest")?,
                    schema.id("NormalItemRequest")?,
                ]
                .contains(&packet.message)
                && !inventory_requests.insert(packet.message)
            {
                // Reproduce the reported server behavior independently of
                // encode(): a complete 14-byte type-3 exception envelope.
                connection.send_test_frame(&[11, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])?;
                bail!("upgrader repeated an inventory initialization request");
            }
            // Real servers reject public-profile lookups for the authenticated
            // player. Keep this in the sync mock so adding the self-query back
            // reproduces the reported 400003 failure instead of passing tests.
            if scenario == Scenario::Synchronize
                && packet.message == schema.id("PlayerBasicInfoGetRequest")?
            {
                let request = schema.decode("PlayerBasicInfoGetRequest", &packet.payload)?;
                ensure!(
                    integer(&request, "Id")? == 123,
                    "unexpected public profile lookup"
                );
                let response =
                    schema.message("PlayerBasicInfoGetResponse", &json!({"ErrorCode": 400003}))?;
                connection.send(
                    2,
                    rpc,
                    schema.id("PlayerBasicInfoGetResponse")?,
                    &response.encode_to_vec(),
                )?;
                continue;
            }
            ensure!(
                scenario != Scenario::Persistent || index < 3,
                "persistent connection must not request inventory"
            );
            let (name, response, json) =
                steps.get(index).context("unexpected request after sync")?;
            ensure!(
                packet.message == schema.id(name)?,
                "unexpected request in mock session"
            );
            let request = schema.decode(name, &packet.payload)?;
            if index == 0 {
                let trace = request.get_field_by_name("TraceId").unwrap();
                ensure!(
                    trace
                        .as_str()
                        .is_some_and(|s| s.len() == 32 && s.bytes().all(|b| b.is_ascii_hexdigit())),
                    "invalid fresh session trace"
                );
                let mut message = schema.message(response, &json!({}))?;
                message.set_field_by_name("Key", Value::Bytes(key.to_vec().into()));
                connection.send(2, rpc, schema.id(response)?, &message.encode_to_vec())?;
                connection.key = Some(key);
            } else if index == 1 {
                ensure!(
                    matches!(integer(&request, "Id")?, 0 | 123),
                    "incorrect login ID"
                );
                ensure!(
                    request.get_field_by_name("Token").unwrap().as_str()
                        == Some("never-print-this-token"),
                    "incorrect token serialization"
                );
                let code = if scenario == Scenario::RejectedLogin {
                    1
                } else {
                    0
                };
                let result = schema.message(
                    response,
                    &json!({"Code": code, "ReconnectToken": "do-not-export-reconnect-token"}),
                )?;
                let reply_rpc = if scenario == Scenario::WrongRpc {
                    rpc + 1
                } else {
                    rpc
                };
                connection.send(2, reply_rpc, schema.id(response)?, &result.encode_to_vec())?;
                if matches!(scenario, Scenario::RejectedLogin | Scenario::WrongRpc) {
                    return Ok(heartbeat_count);
                }
                let id = if matches!(scenario, Scenario::WrongPlayer | Scenario::WrongBasicInfo) {
                    456
                } else {
                    123
                };
                let name = if matches!(
                    scenario,
                    Scenario::BasicInfo | Scenario::WrongBasicInfo | Scenario::Synchronize
                ) {
                    "BasicInfoNotify"
                } else {
                    "LoginNotify"
                };
                let fields = if scenario == Scenario::Synchronize {
                    json!({"Id": id, "Attributes": [
                        {"Key": 7, "ValueType": 1, "StringValue": "Rover"},
                        {"Key": 0, "Int32Value": 80}
                    ]})
                } else {
                    json!({"Id": id})
                };
                let notify = schema.message(name, &fields)?;
                connection.send(4, 0, schema.id(name)?, &notify.encode_to_vec())?;
                if matches!(scenario, Scenario::WrongPlayer | Scenario::WrongBasicInfo) {
                    return Ok(heartbeat_count);
                }
            } else if *name == "PhantomIdentifyRequest" {
                ensure!(
                    integer(&request, "IncrId")? == 20 && integer(&request, "Count")? == 1,
                    "Tuning must reveal exactly one substat"
                );
                let mut fields = json.clone();
                fields.as_object_mut().unwrap().remove("StackSplitInfo");
                connection.send(
                    2,
                    rpc,
                    schema.id(response)?,
                    &schema.message(response, &fields)?.encode_to_vec(),
                )?;
            } else if *name == "PhantomLevelUpRequest" {
                ensure!(
                    integer(&request, "IncId")? == 20 && integer(&request, "IdentifyCount")? == 1,
                    "incorrect upgrade target or unexpected tuning"
                );
                let fields = serde_json::to_value(&request)?;
                ensure!(
                    fields["ConsumeList"].as_array().unwrap().len() == 1,
                    "unexpected extra upgrade materials"
                );
                if scenario == Scenario::FeedUpgrade {
                    ensure!(
                        fields["ConsumeList"][0]["IncId"] == 40
                            && fields["ConsumeList"][0]["Count"] == 1,
                        "Wrong discard echo consumed or tubes spent with covering fodder"
                    );
                } else {
                    ensure!(
                        fields["ConsumeList"][0]["ItemId"] == 36000001
                            && fields["ConsumeList"][0]["Count"] == 9,
                        "incorrect upgrade materials"
                    );
                }
                if scenario != Scenario::LostUpgrade {
                    if scenario == Scenario::ExceptionUpgrade {
                        // Deliberately opaque exception fixture, independent
                        // of the normal-response encoder. Its body stays private.
                        let mut frame = vec![25, 0, 0, 3];
                        frame.extend(b"never-print-this-token!!");
                        connection.send_test_frame(&frame)?;
                    } else {
                        connection.send(
                            2,
                            rpc,
                            schema.id(response)?,
                            &schema.message(response, json)?.encode_to_vec(),
                        )?;
                    }
                }
            } else if matches!(*name, "ItemLockRequest" | "ItemDisuseRequest")
                && matches!(scenario, Scenario::ManualMark { .. })
            {
                let Scenario::ManualMark {
                    to,
                    error,
                    notify,
                    respond,
                    ..
                } = scenario
                else {
                    unreachable!()
                };
                ensure!(
                    integer(&request, "IncrId")? == 21
                        && integer(&request, "Oper")? == if to == 0 { 2 } else { 1 },
                    "manual marking must use the selected stack and explicit set/clear operation"
                );
                if respond {
                    connection.send(
                        2,
                        rpc,
                        schema.id(response)?,
                        &schema.message(response, json)?.encode_to_vec(),
                    )?;
                }
                if notify && error == 0 {
                    connection.send(
                        4,
                        0,
                        schema.id("ItemFuncValueUpdateNotify")?,
                        &schema
                            .message(
                                "ItemFuncValueUpdateNotify",
                                &json!({"IncrId":21,"FuncValue":to}),
                            )?
                            .encode_to_vec(),
                    )?;
                }
            } else if *name == "ItemDisuseRequest" {
                ensure!(
                    integer(&request, "IncrId")? == 21 && integer(&request, "Oper")? == 1,
                    "discard must target only the selected copy and set disuse explicitly"
                );
                if scenario != Scenario::LostDiscard {
                    connection.send(
                        2,
                        rpc,
                        schema.id(response)?,
                        &schema.message(response, json)?.encode_to_vec(),
                    )?;
                }
            } else if index == 3 && *name == "NormalItemRequest" {
                if scenario != Scenario::MissingInventory {
                    // Force a heartbeat while an inventory RPC is outstanding.
                    delayed = Some((
                        Instant::now() + Duration::from_millis(1200),
                        rpc,
                        schema.message(response, json)?.encode_to_vec(),
                    ));
                }
            } else {
                connection.send(
                    2,
                    rpc,
                    schema.id(response)?,
                    &schema.message(response, json)?.encode_to_vec(),
                )?;
            }
            if matches!(*name, "PhantomLevelUpRequest" | "PhantomIdentifyRequest")
                && !matches!(
                    scenario,
                    Scenario::LostUpgrade
                        | Scenario::RejectedUpgrade
                        | Scenario::ExceptionUpgrade
                        | Scenario::MissingConsumption
                )
            {
                let update = schema.message("NormalItemUpdateNotify", &json!({"NormalItemList": [
                    {"Id": 36000001, "Count": if matches!(scenario, Scenario::TuneOnly | Scenario::FeedUpgrade) {100} else {91}},
                    {"Id": 36000014, "Count": if scenario == Scenario::FeedUpgrade {93} else {90}}
                ]}))?;
                let update = if scenario == Scenario::UnrelatedConsumption {
                    // Fresh counts for one spent resource and an unrelated
                    // item must not confirm the missing tuner update.
                    schema.message(
                        "NormalItemUpdateNotify",
                        &json!({"NormalItemList": [
                            {"Id": 36000001, "Count": 91},
                            {"Id": 36000002, "Count": 100}
                        ]}),
                    )?
                } else {
                    update
                };
                connection.send(
                    4,
                    0,
                    schema.id("NormalItemUpdateNotify")?,
                    &update.encode_to_vec(),
                )?;
                if scenario == Scenario::FeedUpgrade {
                    let remove = schema.message(
                        "PhantomItemRemoveNotify",
                        &json!({"PhantomItemIncrIdList": [40]}),
                    )?;
                    connection.send(
                        4,
                        0,
                        schema.id("PhantomItemRemoveNotify")?,
                        &remove.encode_to_vec(),
                    )?;
                }
            }
            if *name == "ItemDisuseRequest"
                && matches!(scenario, Scenario::Discard | Scenario::LockedDiscard)
            {
                let mark = schema.message(
                    "ItemFuncValueUpdateNotify",
                    &json!({"IncrId": 21, "FuncValue": 2}),
                )?;
                connection.send(
                    4,
                    0,
                    schema.id("ItemFuncValueUpdateNotify")?,
                    &mark.encode_to_vec(),
                )?;
            }
            index += 1;
            if index == steps.len()
                && !scenario.live_inventory()
                && !matches!(
                    scenario,
                    Scenario::Synchronize | Scenario::LostUpgrade | Scenario::LostDiscard
                )
            {
                return Ok(heartbeat_count);
            }
        }
        Ok(heartbeat_count)
    }

    fn mock(scenario: Scenario) -> (Result<Inventory>, usize) {
        let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
        // Keep the endpoint bound until the client reads the final notification.
        // Otherwise Linux can report ICMP connection refused after serve exits,
        // masking the player/RPC validation this fixture is meant to exercise.
        let _socket_guard = socket.try_clone().unwrap();
        let config = fixture(socket.local_addr().unwrap().to_string());
        let server = thread::spawn(move || serve(socket, scenario));
        let result = run(&config, &Schema::load().unwrap());
        // A timed-out client stops sending heartbeats; shorten the mock's
        // lifetime by using its own bounded deadline rather than blocking recv.
        let heartbeats = server.join().unwrap().unwrap();
        (result, heartbeats)
    }

    #[test]
    fn explicit_marks_support_all_transitions_and_stacks_and_require_server_confirmation() {
        use crate::echo_mark::{EchoMark, MarkEcho};
        for (from, to, error, notify, respond) in [
            (0, 1, 0, true, true),
            (0, 2, 0, true, true),
            (1, 0, 0, true, true),
            (2, 0, 0, true, true),
            (1, 2, 0, true, true),
            (2, 1, 0, true, true),
            (0, 0, 0, false, true),
            (1, 1, 0, false, true),
            (2, 2, 0, false, true),
            (0, 1, 1, false, true),
            (0, 2, 0, false, true),
            (1, 0, 0, false, false),
        ] {
            let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
            let config = fixture(socket.local_addr().unwrap().to_string());
            let server = thread::spawn(move || {
                serve(
                    socket,
                    Scenario::ManualMark {
                        from,
                        to,
                        error,
                        notify,
                        respond,
                    },
                )
            });
            let mut session = connect(
                &config,
                &Schema::load().unwrap(),
                Arc::new(AtomicBool::new(false)),
            )
            .unwrap();
            let mark = match to {
                1 => EchoMark::Locked,
                2 => EchoMark::Discarded,
                _ => EchoMark::None,
            };
            let result = session.mark_echo(
                &MarkEcho {
                    incr_id: 21,
                    item_id: 60000015,
                    func_value: from,
                    stack_count: 3,
                },
                mark,
            );
            if error != 0 {
                assert!(result.unwrap_err().to_string().contains("code 1"));
            } else if !respond {
                assert!(result.unwrap_err().to_string().contains("timed out"));
            } else if from != to && !notify {
                assert!(result
                    .unwrap_err()
                    .to_string()
                    .contains("mark was not confirmed"));
            } else {
                assert_eq!(result.unwrap(), to);
                assert_eq!(session.cached_echo(21).unwrap().func_value, to);
            }
            drop(session);
            server.join().unwrap().unwrap();
        }
    }

    #[test]
    fn discard_uses_the_active_session_verifies_the_mark_and_preserves_protected_echoes() {
        for scenario in [
            Scenario::Discard,
            Scenario::RejectedDiscard,
            Scenario::LostDiscard,
            Scenario::MissingDiscardMark,
            Scenario::LockedDiscard,
            Scenario::EquippedDiscard,
            Scenario::StackedDiscard,
            Scenario::StaleDiscard,
            Scenario::AlreadyDiscard,
        ] {
            let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
            let config = fixture(socket.local_addr().unwrap().to_string());
            let server = thread::spawn(move || serve(socket, scenario));
            let mut session = connect(
                &config,
                &Schema::load().unwrap(),
                Arc::new(AtomicBool::new(false)),
            )
            .unwrap();
            let result = session.discard_echo(&crate::echo_upgrade::DiscardEcho {
                incr_id: 21,
                item_id: 60000015,
                level: 5,
                sub_props: vec![(1, 630)],
            });
            match scenario {
                Scenario::Discard | Scenario::LockedDiscard | Scenario::AlreadyDiscard => {
                    assert!(result.unwrap().marked);
                    assert_eq!(session.cached_echo(21).unwrap().func_value, 2);
                }
                Scenario::EquippedDiscard | Scenario::StackedDiscard => {
                    let result = result.unwrap();
                    assert!(!result.marked);
                    assert!(result.reason.is_some());
                }
                Scenario::StaleDiscard => {
                    assert!(result.unwrap_err().to_string().contains("changed"))
                }
                Scenario::RejectedDiscard => {
                    assert!(result.unwrap_err().to_string().contains("code 1"))
                }
                Scenario::LostDiscard => {
                    assert!(result.unwrap_err().to_string().contains("timed out"))
                }
                Scenario::MissingDiscardMark => {
                    let error = format!("{:#}", result.unwrap_err());
                    assert!(error.contains("Discard mark was not confirmed"), "{error}");
                }
                _ => unreachable!(),
            }
            drop(session);
            server.join().unwrap().unwrap();
        }
    }

    #[test]
    fn real_udp_kcp_session_fetches_all_inventory_and_keeps_heartbeats_alive() {
        let (result, heartbeats) = mock(Scenario::BasicInfo);
        let inventory = result.unwrap();
        let json = serde_json::to_value(&inventory).unwrap();
        assert_eq!(json["player_id"], 123);
        assert_eq!(json["normal_items"]["NormalItemList"][0]["Count"], 42);
        assert_eq!(json["echoes"]["PhantomItemList"][0]["IncrId"], 20);
        assert_eq!(json["weapons"]["WeaponItemList"][0]["IncrId"], 30);
        assert_eq!(json["characters"]["RoleList"][0]["RoleId"], 4);
        assert!(heartbeats > 0);
        let output = serde_json::to_string(&inventory).unwrap();
        assert!(!output.contains("never-print-this-token"));
        assert!(!output.contains("do-not-export-reconnect-token"));
    }

    #[test]
    fn persistent_session_keeps_heartbeats_and_cancels_without_inventory_requests() {
        let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
        let config = fixture(socket.local_addr().unwrap().to_string());
        let server = thread::spawn(move || serve(socket, Scenario::Persistent));
        let cancelled = Arc::new(AtomicBool::new(false));
        let mut session = connect(&config, &Schema::load().unwrap(), cancelled.clone()).unwrap();
        assert_eq!(session.player_id(), 123);
        let until = Instant::now() + Duration::from_millis(1250);
        while Instant::now() < until {
            session.keep_alive().unwrap();
        }
        cancelled.store(true, Ordering::Relaxed);
        assert!(session.keep_alive().is_err());
        drop(session);
        assert!(server.join().unwrap().unwrap() > 0);
    }

    #[test]
    fn desktop_sync_uses_login_details_not_a_rejected_self_lookup_and_stays_connected() {
        let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
        let config = fixture(socket.local_addr().unwrap().to_string());
        let schema = Schema::load().unwrap();
        let record_ids: Vec<_> = [
            "BasicInfoNotify",
            "NormalItemResponse",
            "PhantomItemResponse",
            "WeaponItemResponse",
            "PbGetRoleListResponse",
            "GetFormationDataResponse",
            "AchievementInfoResponse",
        ]
        .iter()
        .map(|name| schema.id(name).unwrap())
        .collect();
        let server = thread::spawn(move || serve(socket, Scenario::Synchronize));
        let mut session = connect_recording(
            &config,
            &schema,
            Arc::new(AtomicBool::new(false)),
            &record_ids,
        )
        .unwrap();
        session.synchronize().unwrap();
        let packets = session.drain_packets();
        assert_eq!(
            packets.iter().map(|p| p.message_id).collect::<Vec<_>>(),
            record_ids
        );
        let own = schema
            .decode("BasicInfoNotify", &packets[0].payload)
            .unwrap();
        assert_eq!(integer(&own, "Id").unwrap(), 123);
        assert_eq!(
            serde_json::to_value(&own).unwrap()["Attributes"][0]["StringValue"],
            "Rover"
        );
        let until = Instant::now() + Duration::from_millis(1250);
        while Instant::now() < until {
            session.keep_alive().unwrap();
        }
        drop(session);
        assert!(server.join().unwrap().unwrap() > 0);
    }

    #[test]
    fn cancelled_connect_sends_no_handshake() {
        let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
        socket
            .set_read_timeout(Some(Duration::from_millis(50)))
            .unwrap();
        let config = fixture(socket.local_addr().unwrap().to_string());
        assert!(connect(
            &config,
            &Schema::load().unwrap(),
            Arc::new(AtomicBool::new(true))
        )
        .is_err());
        assert!(socket.recv_from(&mut [0u8; 64]).is_err());
    }

    #[test]
    fn upgrade_uses_existing_session_revalidates_materials_and_tracks_the_split_copy() {
        for scenario in [
            Scenario::Upgrade,
            Scenario::RejectedUpgrade,
            Scenario::ExceptionUpgrade,
            Scenario::StaleUpgrade,
            Scenario::LostUpgrade,
            Scenario::MissingConsumption,
            Scenario::UnrelatedConsumption,
            Scenario::TuneOnly,
            Scenario::FeedUpgrade,
            Scenario::ProtectedFeed,
            Scenario::ChangedFeed,
        ] {
            let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
            let config = fixture(socket.local_addr().unwrap().to_string());
            let schema = Schema::load().unwrap();
            let id = schema
                .id(if scenario == Scenario::TuneOnly {
                    "PhantomIdentifyResponse"
                } else {
                    "PhantomLevelUpResponse"
                })
                .unwrap();
            let server = thread::spawn(move || serve(socket, scenario));
            let mut session = connect_recording(
                &config,
                &schema,
                Arc::new(AtomicBool::new(false)),
                &[id, schema.id("PhantomLevelUpRequest").unwrap()],
            )
            .unwrap();
            let protected = if scenario == Scenario::ProtectedFeed {
                vec![20, 40]
            } else {
                vec![20]
            };
            if scenario == Scenario::Upgrade {
                // Desktop synchronizes before the upgrader opens.
                session.synchronize_echo_inventory().unwrap();
            }
            let preview = session.plan_echo_upgrade(20, 5, &protected).unwrap();
            let result = session.upgrade_echo(&preview, &protected);
            match scenario {
                Scenario::Upgrade
                | Scenario::FeedUpgrade
                | Scenario::ProtectedFeed
                | Scenario::TuneOnly => {
                    let confirmed = result.unwrap();
                    assert_eq!(
                        confirmed.incr_id,
                        if scenario == Scenario::TuneOnly {
                            20
                        } else {
                            21
                        }
                    );
                    assert_eq!(
                        session
                            .drain_packets()
                            .iter()
                            .filter(|p| p.message_id == id)
                            .count(),
                        1
                    );
                    session.synchronize_echo_inventory().unwrap();
                    let next = session
                        .plan_echo_upgrade(
                            confirmed.incr_id,
                            if scenario == Scenario::FeedUpgrade {
                                17
                            } else {
                                10
                            },
                            &protected,
                        )
                        .unwrap();
                    assert_eq!(
                        next.from_level,
                        if scenario == Scenario::FeedUpgrade {
                            17
                        } else {
                            5
                        }
                    );
                    if scenario == Scenario::FeedUpgrade {
                        assert_eq!(confirmed.target_level, 5);
                        assert_eq!(confirmed.result_level, 17);
                        assert!(confirmed.materials.is_empty());
                        assert_eq!(next.exp, 0);
                        assert_eq!(next.identify_count, 1);
                        assert!(next.echo_materials.is_empty());
                    }
                    assert_eq!(next.from_sub_props, [(1, 630)]);
                    assert_eq!(
                        session.inventory.material_count(36000014).unwrap(),
                        if scenario == Scenario::FeedUpgrade {
                            93
                        } else {
                            90
                        }
                    );
                    assert_eq!(session.inventory.echo_count(0).unwrap(), 0);
                }
                Scenario::RejectedUpgrade => {
                    let error = format!("{:#}", result.unwrap_err());
                    assert!(error.contains("Not enough items"), "{error}");
                    assert!(error.contains("Inventory"), "{error}");
                    assert!(error.contains("200099"), "{error}");
                }
                Scenario::ExceptionUpgrade => {
                    let error = format!("{:#}", result.unwrap_err());
                    assert!(error.contains("PhantomLevelUpRequest failed"), "{error}");
                    assert!(error.contains("RPC exception"), "{error}");
                    assert!(error.contains("frame 3, length 28"), "{error}");
                    assert!(!error.contains("never-print-this-token"));
                    assert!(!session
                        .drain_packets()
                        .iter()
                        .any(|p| matches!(p.kind, 3 | 19)));
                }
                Scenario::StaleUpgrade | Scenario::ChangedFeed => {
                    let error = format!("{:#}", result.unwrap_err());
                    assert!(error.contains("changed"), "{error}");
                }
                Scenario::LostUpgrade => {
                    assert!(format!("{:#}", result.unwrap_err()).contains("timed out"))
                }
                Scenario::MissingConsumption | Scenario::UnrelatedConsumption => {
                    let error = format!("{:#}", result.unwrap_err());
                    assert!(
                        error.contains("did not confirm material consumption"),
                        "{error}"
                    );
                }
                _ => unreachable!(),
            }
            drop(session);
            server.join().unwrap().unwrap();
        }
    }

    #[test]
    fn refuses_login_rejection_wrong_player_and_wrong_rpc() {
        for (scenario, expected) in [
            (Scenario::RejectedLogin, "code 1"),
            (Scenario::WrongPlayer, "different player"),
            (Scenario::WrongBasicInfo, "different player"),
            (Scenario::WrongRpc, "RPC ID"),
        ] {
            let (result, _) = mock(scenario);
            let error = result.err().expect("session should fail");
            assert!(format!("{error:#}").contains(expected), "{error:#}");
        }
    }

    #[test]
    fn email_password_http_flow_feeds_the_game_session_and_learns_player_identity() {
        let socket = UdpSocket::bind("127.0.0.1:0").unwrap();
        let port = socket.local_addr().unwrap().port();
        let server = thread::spawn(move || serve(socket, Scenario::Success));
        let config = crate::auth::tests::prepare_with_mock(port, None).unwrap();
        assert_eq!(config.login["Id"], 0);
        let inventory = run(&config, &Schema::load().unwrap()).unwrap();
        assert_eq!(inventory.player_id, 123);
        let output = serde_json::to_string(&inventory).unwrap();
        assert!(!output.contains("password123!"));
        assert!(!output.contains("sdk-account-token"));
        assert!(!output.contains("never-print-this-token"));
        server.join().unwrap().unwrap();
    }

    #[test]
    fn missing_inventory_times_out_without_returning_partial_results() {
        let (result, _) = mock(Scenario::MissingInventory);
        assert!(format!("{:#}", result.err().unwrap()).contains("NormalItemResponse"));
    }

    #[test]
    fn configuration_and_diagnostics_do_not_expose_tokens() {
        let schema = Schema::load().unwrap();
        let secret = "never-print-this-token";
        let error = schema
            .message("LoginRequest", &json!({"Id": secret}))
            .unwrap_err();
        assert!(!format!("{error:#}").contains(secret));
        assert!(schema
            .message("LoginRequest", &json!({"NotAField": secret}))
            .is_err());
        let rejected = schema
            .message(
                "LoginResponse",
                &json!({"Code": 1, "ReconnectToken": secret}),
            )
            .unwrap();
        let error = schema
            .ensure_success("LoginResponse", &rejected)
            .unwrap_err();
        assert!(!format!("{error:#}").contains(secret));
    }

    #[test]
    fn rsa_session_key_uses_the_bundled_protocol_key_without_exporting_it() {
        use rsa::pkcs1::DecodeRsaPrivateKey;
        let mut config = fixture("127.0.0.1:1".into());
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../../data/client_private_key.pem");
        let private =
            rsa::RsaPrivateKey::from_pkcs1_pem(&fs::read_to_string(&path).unwrap()).unwrap();
        let expected = *b"0123456789abcdef0123456789abcdef";
        let encrypted = rsa::RsaPublicKey::from(&private)
            .encrypt(&mut rand::thread_rng(), rsa::Pkcs1v15Encrypt, &expected)
            .unwrap();
        let schema = Schema::load().unwrap();
        let mut response = schema.message("ProtoKeyResponse", &json!({})).unwrap();
        response.set_field_by_name("Key", Value::Bytes(encrypted.into()));
        assert!(session_key(&response, &config).is_err());
        config.private_key_file = Some(path);
        assert_eq!(session_key(&response, &config).unwrap(), expected);
    }
}
