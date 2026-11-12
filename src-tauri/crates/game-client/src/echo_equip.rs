//! Equip one ordered optimizer build, preserving the selected main echo.
use anyhow::{ensure, Context, Result};
use prost_reflect::{DynamicMessage, Value};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

use crate::schema::integer;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EquipEcho {
    pub incr_id: i32,
    pub item_id: i32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UnequipEcho {
    pub incr_id: i32,
    pub item_id: i32,
    pub role_id: i32,
    pub slot: i32,
}

impl UnequipEcho {
    pub fn validate(&self) -> Result<()> {
        ensure!(
            self.incr_id > 0 && self.item_id > 0 && self.role_id > 0,
            "Choose an equipped captured echo"
        );
        ensure!(
            (0..5).contains(&self.slot),
            "The echo's equipped slot is unknown"
        );
        Ok(())
    }
}

pub fn validate(role_id: i32, echoes: &[EquipEcho]) -> Result<()> {
    ensure!(role_id > 0, "Choose an owned resonator");
    ensure!(echoes.len() == 5, "Choose a complete five-echo build");
    let mut ids = HashSet::new();
    ensure!(
        echoes
            .iter()
            .all(|echo| echo.incr_id > 0 && echo.item_id > 0 && ids.insert(echo.incr_id)),
        "Choose five distinct captured echoes"
    );
    Ok(())
}

/// The server may split a stack and return new instance IDs. Its slot order
/// is authoritative; do not predict equipment by mutating a local profile.
pub(crate) fn confirmed_ids(response: &DynamicMessage, role_id: i32) -> Result<Vec<i32>> {
    let ids = equipment_ids(response, "EquipInfoList", role_id)?;
    let mut distinct = HashSet::new();
    ensure!(
        ids.len() == 5 && ids.iter().all(|id| *id > 0 && distinct.insert(*id)),
        "The server did not confirm five distinct equipped echoes"
    );
    Ok(ids)
}

pub(crate) fn equipment_ids(
    response: &DynamicMessage,
    field: &str,
    role_id: i32,
) -> Result<Vec<i32>> {
    let info = response
        .get_field_by_name(field)
        .context("Missing equipment confirmation")?;
    let role = info
        .as_list()
        .context("Invalid equipment confirmation")?
        .iter()
        .filter_map(Value::as_message)
        .find(|role| integer(role, "RoleId").ok() == Some(role_id))
        .context("The server did not confirm the selected resonator's build")?;
    let values = role
        .get_field_by_name("PhantomItemIncrId")
        .context("Missing equipped echoes")?;
    let ids = values
        .as_list()
        .context("Invalid equipped echoes")?
        .iter()
        .map(|value| value.as_i32().context("Invalid echo instance ID"))
        .collect::<Result<Vec<_>>>()?;
    let mut distinct = HashSet::new();
    ensure!(
        ids.len() <= 5
            && ids
                .iter()
                .all(|id| *id >= 0 && (*id == 0 || distinct.insert(*id))),
        "Invalid equipped echo slots"
    );
    Ok(ids)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schema::Schema;
    use serde_json::json;

    #[test]
    fn only_complete_distinct_captured_builds_are_valid() {
        let mut echoes: Vec<_> = (1..=5)
            .map(|id| EquipEcho {
                incr_id: id,
                item_id: 60000015,
            })
            .collect();
        assert!(validate(1503, &echoes).is_ok());
        assert!(validate(0, &echoes).is_err());
        assert!(validate(1503, &echoes[..4]).is_err());
        echoes[4].incr_id = 1;
        assert!(validate(1503, &echoes).is_err());
        echoes[4].incr_id = -1;
        assert!(validate(1503, &echoes).is_err());
    }

    #[test]
    fn unequip_requires_a_captured_instance_and_a_valid_slot() {
        let expected = UnequipEcho {
            incr_id: 1,
            item_id: 60000015,
            role_id: 1503,
            slot: 0,
        };
        assert!(expected.validate().is_ok());
        for slot in [-1, 5] {
            assert!(UnequipEcho {
                slot,
                ..expected.clone()
            }
            .validate()
            .is_err());
        }
        assert!(UnequipEcho {
            incr_id: 0,
            ..expected
        }
        .validate()
        .is_err());
    }

    #[test]
    fn equipment_confirmation_keeps_main_slot_and_new_split_ids() {
        let schema = Schema::load().unwrap();
        let response = schema
            .message(
                "PhantomAutoPutResponse",
                &json!({
                    "EquipInfoList": [
                        {"RoleId": 1504, "PhantomItemIncrId": [9]},
                        {"RoleId": 1503, "PhantomItemIncrId": [51, 2, 3, 4, 5]}
                    ]
                }),
            )
            .unwrap();
        assert_eq!(
            confirmed_ids(&response, 1503).unwrap(),
            vec![51, 2, 3, 4, 5]
        );
        assert!(confirmed_ids(&response, 1504).is_err());
        assert!(confirmed_ids(&response, 1505).is_err());
        let request = schema
            .message(
                "PhantomAutoPutRequest",
                &json!({
                    "RoleId": 1503, "PhantomItemIncrId": [1, 2, 3, 4, 5]
                }),
            )
            .unwrap();
        assert_eq!(integer(&request, "RoleId").unwrap(), 1503);
    }
}
