//! Ordered in-game formation edit requests.
use anyhow::{ensure, Result};
use serde_json::json;
use std::collections::HashSet;

#[derive(Debug)]
pub struct TeamUpdate {
    pub id: i32,
    pub name: String,
    pub role_ids: Vec<i32>,
    pub current_role: i32,
    pub is_current: bool,
}

impl TeamUpdate {
    pub fn validate(&self) -> Result<()> {
        ensure!(self.id > 0, "Choose a synced team");
        ensure!(
            (1..=3).contains(&self.role_ids.len()),
            "Choose one to three Resonators"
        );
        let mut ids = HashSet::new();
        ensure!(
            self.role_ids.iter().all(|id| *id > 0 && ids.insert(*id)),
            "Choose distinct owned Resonators"
        );
        ensure!(
            self.role_ids.contains(&self.current_role),
            "The active Resonator must belong to the team"
        );
        Ok(())
    }

    pub(crate) fn fields(&self) -> serde_json::Value {
        json!({"Formations": [{
            "FormationId": self.id, "Name": self.name, "RoleIds": self.role_ids,
            "CurRole": self.current_role, "IsCurrent": self.is_current
        }]})
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn teams_require_one_to_three_distinct_members_and_a_valid_active_role() {
        let mut team = TeamUpdate {
            id: 1,
            name: "Tower".into(),
            role_ids: vec![1503, 1505],
            current_role: 1503,
            is_current: true,
        };
        assert!(team.validate().is_ok());
        for roles in [
            vec![],
            vec![1503, 1503],
            vec![0],
            vec![1503, 1505, 1404, 1204],
        ] {
            team.role_ids = roles;
            assert!(team.validate().is_err());
        }
    }
}
