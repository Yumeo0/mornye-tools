use anyhow::{anyhow, bail, Context, Result};
use prost_reflect::{DescriptorPool, DynamicMessage, Value};
use serde_json::Value as Json;
use std::collections::HashMap;

#[derive(Clone)]
pub struct Schema {
    pool: DescriptorPool,
    ids: HashMap<String, u16>,
}

impl Schema {
    pub fn load() -> Result<Self> {
        let pool = DescriptorPool::decode(
            include_bytes!(concat!(env!("OUT_DIR"), "/protocol.bin")).as_ref(),
        )?;
        let names: HashMap<String, String> =
            serde_json::from_str(include_str!("../../../data/wuwa-protos/packetIds.json"))?;
        let ids = names
            .into_iter()
            .map(|(id, name)| Ok((name, id.parse()?)))
            .collect::<Result<_>>()?;
        Ok(Self { pool, ids })
    }

    pub fn id(&self, name: &str) -> Result<u16> {
        self.ids
            .get(name)
            .copied()
            .ok_or_else(|| anyhow!("message ID absent for {name}"))
    }

    pub fn message(&self, name: &str, json: &Json) -> Result<DynamicMessage> {
        let descriptor = self
            .pool
            .get_message_by_name(name)
            .with_context(|| format!("schema absent for {name}"))?;
        // Deserializer errors can include rejected string values (including tokens).
        // Never propagate their contents into terminal output.
        DynamicMessage::deserialize(descriptor, json.clone()).map_err(|_| {
            anyhow!(
                "invalid {name} fields; use exact field names/types from the pinned protos.proto"
            )
        })
    }

    pub fn decode(&self, name: &str, bytes: &[u8]) -> Result<DynamicMessage> {
        let descriptor = self
            .pool
            .get_message_by_name(name)
            .with_context(|| format!("schema absent for {name}"))?;
        DynamicMessage::decode(descriptor, bytes)
            .map_err(|_| anyhow!("invalid {name} protobuf response"))
    }

    pub fn ensure_success(&self, name: &str, message: &DynamicMessage) -> Result<()> {
        for field in ["Code", "ErrorCode", "ErrCode"] {
            if let Some(value) = message.get_field_by_name(field) {
                let code = match value.as_ref() {
                    Value::EnumNumber(n) | Value::I32(n) => *n,
                    _ => bail!("unexpected error-code field type in {name}"),
                };
                if code != 0 {
                    // Only the numeric result; other response fields may be secrets.
                    bail!("{name} rejected the request (code {code})");
                }
            }
        }
        Ok(())
    }
}

pub fn integer(message: &DynamicMessage, field: &str) -> Result<i32> {
    match message.get_field_by_name(field).as_deref() {
        Some(Value::I32(value)) => Ok(*value),
        _ => bail!("missing or invalid {field} field"),
    }
}
