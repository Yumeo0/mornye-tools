//! Explicit inventory marks, separate from the upgrader's automatic discard guard.
use anyhow::{ensure, Result};
use serde::{Deserialize, Serialize};

use crate::echo_upgrade::UpgradeEcho;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EchoMark {
    None,
    Locked,
    Discarded,
}

impl EchoMark {
    pub fn func_value(self) -> i32 {
        match self {
            Self::None => 0,
            Self::Locked => 1,
            Self::Discarded => 2,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MarkEcho {
    pub incr_id: i32,
    pub item_id: i32,
    pub func_value: i32,
    pub stack_count: i32,
}

pub(crate) struct MarkRequest {
    pub request: &'static str,
    pub response: &'static str,
    pub oper: i32,
}

pub(crate) fn plan_mark(
    current: &UpgradeEcho,
    expected: &MarkEcho,
    mark: EchoMark,
) -> Result<Option<MarkRequest>> {
    ensure!(
        expected.incr_id > 0
            && expected.item_id > 0
            && expected.stack_count > 0
            && (0..=2).contains(&expected.func_value),
        "Choose a captured echo with a valid mark"
    );
    ensure!(
        current.incr_id == expected.incr_id
            && current.item_id == expected.item_id
            && current.func_value == expected.func_value
            && current.stack_count == expected.stack_count,
        "Echo mark or stack changed; review its current state before marking it"
    );
    if current.func_value == mark.func_value() {
        return Ok(None);
    }
    // Setting either mark also replaces the opposite mark, just like the client.
    let locking = mark == EchoMark::Locked || (mark == EchoMark::None && current.func_value == 1);
    Ok(Some(MarkRequest {
        request: if locking {
            "ItemLockRequest"
        } else {
            "ItemDisuseRequest"
        },
        response: if locking {
            "ItemLockResponse"
        } else {
            "ItemDisuseResponse"
        },
        oper: if mark == EchoMark::None { 2 } else { 1 },
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stale_marks_stack_changes_and_invalid_echoes_cannot_be_overwritten() {
        let expected = MarkEcho {
            incr_id: 21,
            item_id: 60000015,
            func_value: 0,
            stack_count: 3,
        };
        let current = UpgradeEcho {
            incr_id: 21,
            item_id: 60000015,
            stack_count: 3,
            ..Default::default()
        };
        for changed in [
            UpgradeEcho {
                incr_id: 22,
                ..current.clone()
            },
            UpgradeEcho {
                item_id: 60000014,
                ..current.clone()
            },
            UpgradeEcho {
                func_value: 1,
                ..current.clone()
            },
            UpgradeEcho {
                stack_count: 2,
                ..current.clone()
            },
        ] {
            assert!(plan_mark(&changed, &expected, EchoMark::Discarded).is_err());
        }
        for invalid in [
            MarkEcho {
                incr_id: -1,
                ..expected.clone()
            },
            MarkEcho {
                func_value: 3,
                ..expected.clone()
            },
            MarkEcho {
                stack_count: 0,
                ..expected.clone()
            },
        ] {
            assert!(plan_mark(&current, &invalid, EchoMark::Locked).is_err());
        }
        // Explicit marking permits a stack and equipped/previously locked items.
        assert!(plan_mark(
            &UpgradeEcho {
                equipped: true,
                ..current
            },
            &expected,
            EchoMark::Locked
        )
        .unwrap()
        .is_some());
    }
}
