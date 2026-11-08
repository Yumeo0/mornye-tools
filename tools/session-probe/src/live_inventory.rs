//! Connection-local protocol state. Never reads or writes a profile snapshot.
use anyhow::{ensure, Context, Result};
use prost_reflect::{DynamicMessage, Value};
use std::collections::HashMap;

use crate::{
    schema::{integer, Schema},
    wire::Packet,
};

#[derive(Default)]
pub(crate) struct LiveInventory {
    pub echoes: Option<DynamicMessage>,
    pub items: Option<DynamicMessage>,
    material_revisions: HashMap<i32, u64>,
    revision: u64,
    invalid: bool,
}

fn rows(message: &DynamicMessage, field: &str) -> Vec<DynamicMessage> {
    match message.get_field_by_name(field).as_deref() {
        Some(Value::List(values)) => values
            .iter()
            .filter_map(Value::as_message)
            .cloned()
            .collect(),
        Some(Value::Message(value)) if message.has_field_by_name(field) => vec![value.clone()],
        _ => Vec::new(),
    }
}

fn ids(message: &DynamicMessage, field: &str) -> Vec<i32> {
    match message.get_field_by_name(field).as_deref() {
        Some(Value::List(values)) => values.iter().filter_map(Value::as_i32).collect(),
        _ => Vec::new(),
    }
}

fn remove(snapshot: &mut DynamicMessage, field: &str, key: &str, removed: &[i32]) -> Result<()> {
    let mut values = rows(snapshot, field);
    values.retain(|value| !integer(value, key).is_ok_and(|id| removed.contains(&id)));
    snapshot.set_field_by_name(
        field,
        Value::List(values.into_iter().map(Value::Message).collect()),
    );
    Ok(())
}

fn upsert(
    snapshot: &mut DynamicMessage,
    field: &str,
    key: &str,
    incoming: Vec<DynamicMessage>,
) -> Result<()> {
    let mut values = rows(snapshot, field);
    for item in incoming {
        let id = integer(&item, key)?;
        if let Some(previous) = values
            .iter_mut()
            .find(|value| integer(value, key).ok() == Some(id))
        {
            *previous = item;
        } else {
            values.push(item);
        }
    }
    snapshot.set_field_by_name(
        field,
        Value::List(values.into_iter().map(Value::Message).collect()),
    );
    Ok(())
}

impl LiveInventory {
    pub fn ensure_valid(&self) -> Result<()> {
        ensure!(
            !self.invalid,
            "Live inventory could not be reconciled; reconnect before upgrading"
        );
        Ok(())
    }

    pub fn ingest(&mut self, schema: &Schema, packet: &Packet) -> Result<()> {
        let result = self.apply(schema, packet);
        if result.is_err() {
            self.invalid = true;
        }
        result
    }

    fn apply(&mut self, schema: &Schema, packet: &Packet) -> Result<()> {
        const NAMES: &[&str] = &[
            "PhantomItemResponse",
            "NormalItemResponse",
            "PhantomItemUpdateNotify",
            "PhantomItemAddNotify",
            "PhantomItemRemoveNotify",
            "PhantomEquipInfoNotify",
            "ItemFuncValueUpdateNotify",
            "NormalItemAddNotify",
            "NormalItemUpdateNotify",
            "NormalItemRemoveNotify",
            "PhantomLevelUpResponse",
            "PhantomIdentifyResponse",
            "PhantomPolishResponse",
            "PhantomPutOnResponse",
            "PhantomAutoPutResponse",
            "UsePhantomEquipGroupResponse",
        ];
        let Some(name) = NAMES
            .iter()
            .copied()
            .find(|name| schema.id(name).ok() == Some(packet.message))
        else {
            return Ok(());
        };
        ensure!(
            if name.ends_with("Notify") {
                matches!(packet.kind, 4 | 20)
            } else {
                matches!(packet.kind, 2 | 18)
            },
            "Unexpected frame type for live inventory message {name}"
        );
        let message = schema.decode(name, &packet.payload)?;
        // A rejected operation is still reported by Session::request, but must
        // not update inventory from default/partial response fields.
        if schema.ensure_success(name, &message).is_err() {
            return Ok(());
        }
        match name {
            "PhantomItemResponse" => self.echoes = Some(message),
            "NormalItemResponse" => {
                let mut changed_ids = self.material_revisions.keys().copied().collect::<Vec<_>>();
                changed_ids.extend(
                    rows(&message, "NormalItemList")
                        .iter()
                        .map(|item| integer(item, "Id"))
                        .collect::<Result<Vec<_>>>()?,
                );
                self.items = Some(message);
                self.note_material_updates(changed_ids)?;
            }
            "NormalItemAddNotify" | "NormalItemUpdateNotify" => {
                let incoming = rows(&message, "NormalItemList");
                let changed_ids = incoming
                    .iter()
                    .map(|item| integer(item, "Id"))
                    .collect::<Result<Vec<_>>>()?;
                if let Some(snapshot) = &mut self.items {
                    upsert(snapshot, "NormalItemList", "Id", incoming)?;
                    self.note_material_updates(changed_ids)?;
                }
            }
            "NormalItemRemoveNotify" => {
                let removed = ids(&message, "NormalItemIdList");
                if let Some(snapshot) = &mut self.items {
                    remove(snapshot, "NormalItemList", "Id", &removed)?;
                    self.note_material_updates(removed)?;
                }
            }
            _ => {
                let Some(snapshot) = &mut self.echoes else {
                    return Ok(());
                };
                match name {
                    "PhantomItemAddNotify" => upsert(
                        snapshot,
                        "PhantomItemList",
                        "IncrId",
                        rows(&message, "PhantomItemList"),
                    )?,
                    "PhantomItemRemoveNotify" => remove(
                        snapshot,
                        "PhantomItemList",
                        "IncrId",
                        &ids(&message, "PhantomItemIncrIdList"),
                    )?,
                    "ItemFuncValueUpdateNotify" => {
                        let id = integer(&message, "IncrId")?;
                        let mut items = rows(snapshot, "PhantomItemList");
                        if let Some(item) = items
                            .iter_mut()
                            .find(|item| integer(item, "IncrId").ok() == Some(id))
                        {
                            item.set_field_by_name(
                                "FuncValue",
                                Value::I32(integer(&message, "FuncValue")?),
                            );
                        }
                        snapshot.set_field_by_name(
                            "PhantomItemList",
                            Value::List(items.into_iter().map(Value::Message).collect()),
                        );
                    }
                    _ => {
                        // Match the shared account converter: split/merge rows
                        // precede authoritative UpdateInfo and equipment rows.
                        for split in rows(&message, "StackSplitInfo")
                            .into_iter()
                            .chain(rows(&message, "StackSplitInfos"))
                        {
                            let mut items = rows(&split, "OperateItem");
                            items.extend(rows(&split, "RemainderItem"));
                            upsert(snapshot, "PhantomItemList", "IncrId", items)?;
                        }
                        let merges = rows(&message, "StackMergeInfos");
                        let removed = merges
                            .iter()
                            .map(|row| integer(row, "MergedIncrId"))
                            .collect::<Result<Vec<_>>>()?;
                        remove(snapshot, "PhantomItemList", "IncrId", &removed)?;
                        for merge in merges {
                            upsert(
                                snapshot,
                                "PhantomItemList",
                                "IncrId",
                                rows(&merge, "RepresentativeItem"),
                            )?;
                        }
                        let updates = rows(&message, "UpdateInfo")
                            .into_iter()
                            .filter(|item| {
                                !integer(item, "IncrId").is_ok_and(|id| removed.contains(&id))
                            })
                            .collect();
                        upsert(snapshot, "PhantomItemList", "IncrId", updates)?;
                        let mut equip = rows(&message, "EquipInfo");
                        equip.extend(rows(&message, "EquipInfoList"));
                        upsert(snapshot, "EquipInfo", "RoleId", equip)?;
                    }
                }
            }
        }
        Ok(())
    }

    fn note_material_updates(&mut self, ids: Vec<i32>) -> Result<()> {
        self.revision = self
            .revision
            .checked_add(1)
            .context("Inventory revision exhausted")?;
        for id in ids {
            self.material_revisions.insert(id, self.revision);
        }
        Ok(())
    }

    /// Per-item revisions distinguish authoritative updates from stale counts.
    /// Refunds may leave a count unchanged or higher after a successful upgrade.
    pub fn material_revision(&self, id: i32) -> Result<u64> {
        self.ensure_valid()?;
        Ok(self.material_revisions.get(&id).copied().unwrap_or(0))
    }

    pub fn material_count(&self, id: i32) -> Result<i32> {
        self.ensure_valid()?;
        let snapshot = self
            .items
            .as_ref()
            .context("Materials have not been synchronized on this connection")?;
        Ok(rows(snapshot, "NormalItemList")
            .iter()
            .find(|item| integer(item, "Id").ok() == Some(id))
            .map(|item| integer(item, "Count"))
            .transpose()?
            .unwrap_or(0))
    }

    pub fn echo_count(&self, id: i32) -> Result<i32> {
        self.ensure_valid()?;
        let snapshot = self
            .echoes
            .as_ref()
            .context("Echoes have not been synchronized on this connection")?;
        Ok(rows(snapshot, "PhantomItemList")
            .iter()
            .find(|item| integer(item, "IncrId").ok() == Some(id))
            .map(|item| integer(item, "StackCount").map(|count| count.max(1)))
            .transpose()?
            .unwrap_or(0))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use prost::Message;
    use serde_json::json;

    fn feed(inventory: &mut LiveInventory, name: &str, fields: serde_json::Value) {
        let schema = Schema::load().unwrap();
        inventory
            .ingest(
                &schema,
                &Packet {
                    kind: if name.ends_with("Notify") { 4 } else { 2 },
                    rpc: None,
                    message: schema.id(name).unwrap(),
                    payload: schema.message(name, &fields).unwrap().encode_to_vec(),
                },
            )
            .unwrap();
    }

    #[test]
    fn material_revisions_require_fresh_updates_for_each_spent_item_and_accept_refunds() {
        let mut inventory = LiveInventory::default();
        feed(
            &mut inventory,
            "NormalItemResponse",
            json!({"NormalItemList": [{"Id": 1, "Count": 10}, {"Id": 2, "Count": 20}]}),
        );
        let initial = inventory.material_revision(1).unwrap();
        feed(
            &mut inventory,
            "NormalItemUpdateNotify",
            json!({"NormalItemList": [{"Id": 2, "Count": 15}]}),
        );
        assert_eq!(inventory.material_revision(1).unwrap(), initial);
        assert!(inventory.material_revision(2).unwrap() > initial);
        // A refund can offset or exceed the cost. Freshness, rather than
        // a predicted net count, confirms these authoritative updates.
        for count in [10, 13] {
            let before = inventory.material_revision(1).unwrap();
            feed(
                &mut inventory,
                "NormalItemUpdateNotify",
                json!({"NormalItemList": [{"Id": 1, "Count": count}]}),
            );
            assert!(inventory.material_revision(1).unwrap() > before);
            assert_eq!(inventory.material_count(1).unwrap(), count);
        }
        let before = inventory.material_revision(1).unwrap();
        feed(
            &mut inventory,
            "NormalItemRemoveNotify",
            json!({"NormalItemIdList": [1]}),
        );
        assert!(inventory.material_revision(1).unwrap() > before);
        assert_eq!(inventory.material_count(1).unwrap(), 0);
        // An authoritative full snapshot also confirms absent items as zero.
        let before = inventory.material_revision(2).unwrap();
        feed(&mut inventory, "NormalItemResponse", json!({}));
        assert!(inventory.material_revision(2).unwrap() > before);
        assert_eq!(inventory.material_count(2).unwrap(), 0);
    }

    #[test]
    fn tracks_absolute_material_counts_echo_changes_equipment_and_marks() {
        let mut inventory = LiveInventory::default();
        assert!(inventory.material_count(1).is_err());
        feed(
            &mut inventory,
            "NormalItemResponse",
            json!({"NormalItemList": [{"Id": 1, "Count": 10}]}),
        );
        feed(
            &mut inventory,
            "NormalItemUpdateNotify",
            json!({"NormalItemList": [{"Id": 1, "Count": 6}]}),
        );
        feed(
            &mut inventory,
            "NormalItemAddNotify",
            json!({"NormalItemList": [{"Id": 2, "Count": 3}]}),
        );
        assert_eq!(inventory.material_count(1).unwrap(), 6);
        assert_eq!(inventory.material_count(2).unwrap(), 3);
        feed(
            &mut inventory,
            "NormalItemRemoveNotify",
            json!({"NormalItemIdList": [1]}),
        );
        assert_eq!(inventory.material_count(1).unwrap(), 0);
        feed(
            &mut inventory,
            "PhantomItemResponse",
            json!({"PhantomItemList": [{"Id": 60000015, "IncrId": 20, "StackCount": 3}]}),
        );
        feed(
            &mut inventory,
            "PhantomItemUpdateNotify",
            json!({"UpdateInfo": [{"Id": 60000015, "IncrId": 20, "StackCount": 2, "PhantomExp": 42}]}),
        );
        feed(
            &mut inventory,
            "ItemFuncValueUpdateNotify",
            json!({"IncrId": 20, "FuncValue": 1}),
        );
        feed(
            &mut inventory,
            "PhantomEquipInfoNotify",
            json!({"EquipInfo": [{"RoleId": 1, "PhantomItemIncrId": [20]}]}),
        );
        let snapshot = inventory.echoes.as_ref().unwrap();
        let item = rows(snapshot, "PhantomItemList").pop().unwrap();
        assert_eq!(integer(&item, "FuncValue").unwrap(), 1);
        assert_eq!(integer(&item, "PhantomExp").unwrap(), 42);
        assert_eq!(inventory.echo_count(20).unwrap(), 2);
        assert_eq!(
            ids(&rows(snapshot, "EquipInfo")[0], "PhantomItemIncrId"),
            [20]
        );
        feed(
            &mut inventory,
            "PhantomItemAddNotify",
            json!({"PhantomItemList": [{"Id": 60000015, "IncrId": 21}]}),
        );
        feed(
            &mut inventory,
            "PhantomItemRemoveNotify",
            json!({"PhantomItemIncrIdList": [20]}),
        );
        assert_eq!(inventory.echo_count(20).unwrap(), 0);
        assert_eq!(inventory.echo_count(21).unwrap(), 1);
        // Explicitly empty equipment rows clear that role's previous selection.
        feed(
            &mut inventory,
            "PhantomEquipInfoNotify",
            json!({"EquipInfo": [{"RoleId": 1}]}),
        );
        assert!(ids(
            &rows(inventory.echoes.as_ref().unwrap(), "EquipInfo")[0],
            "PhantomItemIncrId"
        )
        .is_empty());
    }

    #[test]
    fn confirmed_updates_follow_splits_and_merges_without_resurrecting_consumed_echoes() {
        let mut inventory = LiveInventory::default();
        feed(
            &mut inventory,
            "PhantomItemResponse",
            json!({"PhantomItemList": [{"Id": 60000015, "IncrId": 20, "StackCount": 3}]}),
        );
        feed(
            &mut inventory,
            "PhantomLevelUpResponse",
            json!({
                "StackSplitInfo": {"OperateItem": {"Id": 60000015, "IncrId": 21}, "RemainderItem": {"Id": 60000015, "IncrId": 20, "StackCount": 2}},
                "UpdateInfo": {"Id": 60000015, "IncrId": 21, "PhantomLevel": 5, "PhantomSubProp": [{"PhantomPropId": 1, "Value": 630}]}
            }),
        );
        assert_eq!(inventory.echo_count(20).unwrap(), 2);
        assert_eq!(inventory.echo_count(21).unwrap(), 1);
        assert_eq!(
            integer(
                &rows(inventory.echoes.as_ref().unwrap(), "PhantomItemList")[1],
                "PhantomLevel"
            )
            .unwrap(),
            5
        );
        feed(
            &mut inventory,
            "PhantomIdentifyResponse",
            json!({"ErrorCode": 1, "UpdateInfo": {"IncrId": 21, "PhantomLevel": 0}}),
        );
        assert_eq!(
            integer(
                &rows(inventory.echoes.as_ref().unwrap(), "PhantomItemList")[1],
                "PhantomLevel"
            )
            .unwrap(),
            5
        );
        feed(
            &mut inventory,
            "PhantomPolishResponse",
            json!({
                "UpdateInfo": {"Id": 60000015, "IncrId": 21, "PhantomLevel": 5},
                "StackMergeInfos": {"MergedIncrId": 21, "RepresentativeItem": {"Id": 60000015, "IncrId": 20, "StackCount": 3}}
            }),
        );
        assert_eq!(inventory.echo_count(20).unwrap(), 3);
        assert_eq!(inventory.echo_count(21).unwrap(), 0);
        // Missing optional operation fields must not create an instance zero.
        feed(&mut inventory, "PhantomPutOnResponse", json!({}));
        assert_eq!(inventory.echo_count(0).unwrap(), 0);
    }

    #[test]
    fn invalid_updates_block_future_plans_until_reconnect() {
        let mut inventory = LiveInventory::default();
        let schema = Schema::load().unwrap();
        assert!(inventory
            .ingest(
                &schema,
                &Packet {
                    kind: 4,
                    rpc: None,
                    message: schema.id("NormalItemUpdateNotify").unwrap(),
                    payload: vec![0xff],
                }
            )
            .is_err());
        assert!(inventory.ensure_valid().is_err());
    }
}
