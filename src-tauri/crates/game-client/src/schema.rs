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
        let ids = crate::message_id::ALL
            .iter()
            .map(|&(name, id)| (name.to_owned(), id))
            .collect();
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
                    if code == 200099
                        && matches!(name, "PhantomLevelUpResponse" | "PhantomIdentifyResponse")
                    {
                        bail!("Not enough items for the echo upgrade. Check Shell Credits, tuners, and fodder in Inventory (server code {code}).");
                    }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_generated_id_has_a_schema_and_resolves_by_name() {
        let schema = Schema::load().unwrap();
        let mut seen = std::collections::HashSet::new();
        for &(name, id) in crate::message_id::ALL {
            assert!(seen.insert(id), "duplicate packet ID for {name}");
            assert_eq!(schema.id(name).unwrap(), id);
            assert!(
                schema.pool.get_message_by_name(name).is_some(),
                "schema absent for {name}"
            );
        }
    }
}
