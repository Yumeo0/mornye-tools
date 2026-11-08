//! One-stage plans from fresh server inventory. Selected targets cannot be fodder.
use anyhow::{ensure, Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Tables {
    credits_per_exp: f64,
    echo_exp_return: f64,
    items: HashMap<i32, (i32, i32)>,
    levels: HashMap<i32, Vec<i32>>,
    materials: Vec<Material>,
    limits: HashMap<i32, i32>,
    tuning: HashMap<i32, Tuning>,
}
#[derive(Deserialize)]
struct Tuning {
    slots: Vec<i32>,
    materials: Vec<MaterialCost>,
    credits: i32,
}
#[derive(Deserialize)]
struct Material {
    id: i32,
    exp: i32,
}

#[derive(Clone, Debug, Default)]
pub struct UpgradeEcho {
    pub incr_id: i32,
    pub item_id: i32,
    pub level: i32,
    pub exp: i32,
    pub sub_props: Vec<(i32, i32)>,
    pub func_value: i32,
    pub stack_count: i32,
    pub equipped: bool,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct MaterialCost {
    pub id: i32,
    pub count: i32,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct EchoMaterialCost {
    pub incr_id: i32,
    pub item_id: i32,
    pub count: i32,
    pub exp: i32,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct MaterialPolicy {
    pub discard_echoes: bool,
    pub exp_material_ids: Vec<i32>,
}
impl Default for MaterialPolicy {
    fn default() -> Self {
        Self {
            discard_echoes: true,
            exp_material_ids: vec![36000001, 36000002, 36000003, 36000004],
        }
    }
}
impl MaterialPolicy {
    pub fn validate(&self) -> Result<()> {
        ensure!(
            self.exp_material_ids.len() <= 4
                && self
                    .exp_material_ids
                    .iter()
                    .all(|id| (36000001..=36000004).contains(id)),
            "Choose valid EXP tube rarities"
        );
        Ok(())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DiscardEcho {
    pub incr_id: i32,
    pub item_id: i32,
    pub level: i32,
    pub sub_props: Vec<(i32, i32)>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DiscardResult {
    pub marked: bool,
    pub reason: Option<String>,
}

pub fn discard_guard(current: &UpgradeEcho, expected: &DiscardEcho) -> Result<Option<String>> {
    ensure!(
        current.incr_id == expected.incr_id
            && current.item_id == expected.item_id
            && current.level == expected.level
            && current.sub_props == expected.sub_props,
        "Echo changed before discard marking; review its current substats"
    );
    Ok(if current.func_value == 1 {
        Some("Locked echo kept its mark.".into())
    } else if current.equipped {
        Some("Equipped echo kept its mark.".into())
    } else if current.stack_count > 1 {
        Some("Unsplit stack kept its mark; only one copy was selected.".into())
    } else {
        None
    })
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct UpgradePlan {
    pub incr_id: i32,
    pub item_id: i32,
    pub from_level: i32,
    pub from_exp: i32,
    pub from_sub_props: Vec<(i32, i32)>,
    pub target_level: i32,
    pub materials: Vec<MaterialCost>,
    pub echo_materials: Vec<EchoMaterialCost>,
    pub exp: i32,
    pub max_credits: i32,
    pub identify_count: i32,
    pub tuners: Vec<MaterialCost>,
}

fn feed_exp(tables: &Tables, echo: &UpgradeEcho) -> Option<i32> {
    let (group, quality) = tables.items.get(&echo.item_id)?;
    if echo.level < 0 || echo.level > *tables.limits.get(quality)? || echo.exp < 0 {
        return None;
    }
    let invested = tables
        .levels
        .get(group)?
        .get(..=echo.level as usize)?
        .iter()
        .sum::<i32>()
        + echo.exp;
    Some((f64::from(invested) * tables.echo_exp_return).floor() as i32)
}

pub fn plan(
    echo: &UpgradeEcho,
    target: i32,
    inventory: &HashMap<i32, i32>,
    echoes: &[UpgradeEcho],
    protected: &HashSet<i32>,
) -> Result<UpgradePlan> {
    plan_with_policy(
        echo,
        target,
        inventory,
        echoes,
        protected,
        &MaterialPolicy::default(),
    )
}

pub fn plan_with_policy(
    echo: &UpgradeEcho,
    target: i32,
    inventory: &HashMap<i32, i32>,
    echoes: &[UpgradeEcho],
    protected: &HashSet<i32>,
    policy: &MaterialPolicy,
) -> Result<UpgradePlan> {
    policy.validate()?;
    let tables: Tables =
        serde_json::from_str(include_str!("../../../src/configs/echo_upgrade.json"))?;
    let (group, quality) = tables
        .items
        .get(&echo.item_id)
        .context("Unknown echo item")?;
    let limit = *tables.limits.get(quality).context("Unknown echo quality")?;
    ensure!(
        echo.incr_id > 0
            && echo.level >= 0
            && echo.exp >= 0
            && target >= echo.level
            && target <= limit,
        "Choose a target within this echo's level limit ({limit})"
    );
    ensure!(
        target == echo.level || target == ((echo.level / 5 + 1) * 5).min(limit),
        "Automatic upgrades must proceed one five-level stage at a time"
    );
    let tuning = tables.tuning.get(quality).context("Missing tuning table")?;
    let slots = tuning.slots.iter().filter(|slot| **slot <= target).count();
    let identify_count = i32::from(slots > echo.sub_props.len());
    ensure!(
        target > echo.level || identify_count > 0,
        "Echo has no stage remaining"
    );
    // Finish tuning existing slots before spending EXP to unlock another one.
    ensure!(
        target == echo.level
            || tuning
                .slots
                .iter()
                .filter(|slot| **slot <= echo.level)
                .count()
                <= echo.sub_props.len(),
        "Tune the already unlocked substats before leveling again"
    );
    let tuners: Vec<_> = tuning
        .materials
        .iter()
        .filter(|_| identify_count > 0)
        .cloned()
        .collect();
    for material in &tuners {
        ensure!(
            inventory.get(&material.id).copied().unwrap_or(0) >= material.count,
            "Not enough tuners for the next substat"
        );
    }
    let levels = tables.levels.get(group).context("Missing echo EXP table")?;
    let required = if target == echo.level {
        0
    } else {
        levels
            .get(echo.level as usize + 1..=target as usize)
            .context("Missing target EXP")?
            .iter()
            .sum::<i32>()
            - echo.exp
    };
    ensure!(
        required >= 0 && (target == echo.level || required > 0),
        "Inconsistent echo EXP; refresh the inventory"
    );
    let ceiling = if target == limit {
        i32::MAX
    } else {
        required
            + levels
                .get(target as usize + 1)
                .context("Missing next level")?
            - 1
    };
    let mut remaining = required;
    let mut granted = 0;
    let mut echo_materials = Vec::new();
    let mut feeds: Vec<_> = echoes
        .iter()
        .filter(|item| {
            policy.discard_echoes
                && item.incr_id > 0
                && item.incr_id != echo.incr_id
                && item.func_value == 2
                && !item.equipped
                && !protected.contains(&item.incr_id)
        })
        .filter_map(|item| {
            feed_exp(&tables, item)
                .filter(|exp| *exp > 0)
                .map(|exp| (item, exp))
        })
        .collect();
    feeds.sort_by_key(|(item, exp)| (std::cmp::Reverse(*exp), item.incr_id));
    // Prefer discard-marked echoes. A covering stack avoids trapping smaller
    // feeds in a combination that would overshoot the next five-level stage.
    while remaining > 0 {
        let cover = feeds
            .iter()
            .enumerate()
            .filter_map(|(index, (item, exp))| {
                let count = (remaining + exp - 1) / exp;
                let total = i64::from(count) * i64::from(*exp);
                (count <= item.stack_count.max(1) && total <= i64::from(ceiling - granted))
                    .then_some((index, count, total as i32))
            })
            .min_by_key(|(_, count, total)| (*total, *count));
        let choice = cover.or_else(|| {
            feeds.iter().enumerate().find_map(|(index, (item, exp))| {
                let count = (remaining / exp).min(item.stack_count.max(1));
                (count > 0).then_some((index, count, count * exp))
            })
        });
        let Some((index, count, total)) = choice else {
            break;
        };
        let (item, exp) = feeds.remove(index);
        echo_materials.push(EchoMaterialCost {
            incr_id: item.incr_id,
            item_id: item.item_id,
            count,
            exp,
        });
        remaining -= total;
        granted += total;
    }
    let tubes = |needed: i32| -> Result<(i32, Vec<i32>)> {
        // Tubes have 500-EXP granularity, regardless of the fed echoes' EXP.
        let units = ((needed.max(0) + 499) / 500) as usize;
        let bound = units + 10;
        let mut dp: Vec<Option<Vec<i32>>> = vec![None; bound + 1];
        dp[0] = Some(vec![0; tables.materials.len()]);
        for (index, material) in tables.materials.iter().enumerate() {
            ensure!(
                material.exp > 0 && material.exp % 500 == 0,
                "Unsupported EXP material"
            );
            let step = (material.exp / 500) as usize;
            let count = if policy.exp_material_ids.contains(&material.id) {
                inventory.get(&material.id).copied().unwrap_or(0).max(0) as usize
            } else {
                0
            };
            let previous = dp.clone();
            for (sum, entry) in previous.iter().enumerate() {
                let Some(used) = entry else { continue };
                for n in 1..=count.min((bound - sum) / step) {
                    let next = sum + n * step;
                    let mut candidate = used.clone();
                    candidate[index] = n as i32;
                    if dp[next]
                        .as_ref()
                        .is_none_or(|old| candidate.iter().sum::<i32>() < old.iter().sum())
                    {
                        dp[next] = Some(candidate);
                    }
                }
            }
        }
        (units..=bound)
            .find_map(|n| dp[n].take().map(|v| (n as i32 * 500, v)))
            .context("Not enough discard echo EXP or EXP tubes for the next stage")
    };
    let (tube_exp, counts) = match tubes(remaining) {
        Ok((exp, counts)) if i64::from(granted) + i64::from(exp) <= i64::from(ceiling) => {
            (exp, counts)
        }
        _ => {
            // A discard feed can leave too little room for the available tubes.
            // Retry with tubes alone before rejecting an otherwise valid stage.
            let selection = tubes(required)?;
            granted = 0;
            echo_materials.clear();
            selection
        }
    };
    granted += tube_exp;
    ensure!(
        granted <= ceiling,
        "Available materials would skip a level stage; smaller EXP materials are needed"
    );
    Ok(UpgradePlan {
        incr_id: echo.incr_id,
        item_id: echo.item_id,
        from_level: echo.level,
        from_exp: echo.exp,
        from_sub_props: echo.sub_props.clone(),
        target_level: target,
        materials: tables
            .materials
            .iter()
            .zip(counts)
            .filter(|(_, count)| *count > 0)
            .map(|(material, count)| MaterialCost {
                id: material.id,
                count,
            })
            .collect(),
        echo_materials,
        exp: granted,
        max_credits: (f64::from(granted) * tables.credits_per_exp).ceil() as i32
            + identify_count * tuning.credits,
        identify_count,
        tuners,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn echo(id: i32, level: i32) -> UpgradeEcho {
        UpgradeEcho {
            incr_id: id,
            item_id: 60000015,
            level,
            stack_count: 1,
            ..Default::default()
        }
    }
    fn inventory() -> HashMap<i32, i32> {
        HashMap::from([
            (36000001, 1),
            (36000002, 0),
            (36000003, 2),
            (36000004, 20),
            (36000014, 50),
        ])
    }
    #[test]
    fn combines_all_tube_rarities_and_tunes_exactly_one_substat() {
        let p = plan(&echo(12, 0), 5, &inventory(), &[], &HashSet::new()).unwrap();
        assert_eq!(p.exp, 4500);
        assert_eq!(
            p.materials,
            vec![
                MaterialCost {
                    id: 36000001,
                    count: 1
                },
                MaterialCost {
                    id: 36000003,
                    count: 2
                }
            ]
        );
        assert_eq!(p.identify_count, 1);
        assert_eq!(p.max_credits, 3800);
        let mut partial = echo(12, 4);
        partial.exp = 900;
        assert_eq!(
            plan(&partial, 5, &inventory(), &[], &HashSet::new())
                .unwrap()
                .exp,
            500
        );
    }
    #[test]
    fn discard_feeds_are_revalidated_and_selected_locked_equipped_and_empty_echoes_are_excluded() {
        let mut feed = echo(21, 5);
        feed.func_value = 2;
        let mut equipped = feed.clone();
        equipped.incr_id = 22;
        equipped.equipped = true;
        let mut locked = feed.clone();
        locked.incr_id = 23;
        locked.func_value = 1;
        let mut empty = echo(24, 0);
        empty.func_value = 2;
        let protected = HashSet::from([21]);
        let p = plan(
            &echo(12, 0),
            5,
            &inventory(),
            &[feed.clone(), equipped, locked, empty],
            &protected,
        )
        .unwrap();
        assert!(p.echo_materials.is_empty());
        let p = plan(&echo(12, 0), 5, &inventory(), &[feed], &HashSet::new()).unwrap();
        assert_eq!(p.echo_materials[0].exp, 3300);
        assert_eq!(p.echo_materials[0].count, 1);
        assert_eq!(p.exp, 5300);
    }
    #[test]
    fn material_policy_excludes_disallowed_fodder_without_changing_tuning_costs() {
        let mut feed = echo(21, 5);
        feed.func_value = 2;
        let policy = MaterialPolicy {
            discard_echoes: false,
            exp_material_ids: vec![36000004],
        };
        let p = plan_with_policy(
            &echo(12, 0),
            5,
            &inventory(),
            &[feed.clone()],
            &HashSet::new(),
            &policy,
        )
        .unwrap();
        assert!(p.echo_materials.is_empty());
        assert_eq!(
            p.materials,
            vec![MaterialCost {
                id: 36000004,
                count: 1
            }]
        );
        assert_eq!(
            p.tuners,
            vec![MaterialCost {
                id: 36000014,
                count: 10
            }]
        );
        let none = MaterialPolicy {
            discard_echoes: false,
            exp_material_ids: vec![],
        };
        assert!(plan_with_policy(
            &echo(12, 0),
            5,
            &inventory(),
            &[feed],
            &HashSet::new(),
            &none
        )
        .is_err());
        let p =
            plan_with_policy(&echo(12, 5), 5, &inventory(), &[], &HashSet::new(), &none).unwrap();
        assert!(p.materials.is_empty());
        assert_eq!(p.identify_count, 1);
        assert!(MaterialPolicy {
            discard_echoes: true,
            exp_material_ids: vec![36000014]
        }
        .validate()
        .is_err());
    }
    #[test]
    fn discard_guard_preserves_locks_equipment_and_stacks_and_rejects_stale_substats() {
        let current = echo(20, 5);
        let expected = DiscardEcho {
            incr_id: 20,
            item_id: current.item_id,
            level: 5,
            sub_props: vec![],
        };
        assert!(discard_guard(&current, &expected).unwrap().is_none());
        for protected in [
            UpgradeEcho {
                func_value: 1,
                ..current.clone()
            },
            UpgradeEcho {
                equipped: true,
                ..current.clone()
            },
            UpgradeEcho {
                stack_count: 2,
                ..current.clone()
            },
        ] {
            assert!(discard_guard(&protected, &expected).unwrap().is_some());
        }
        assert!(discard_guard(
            &UpgradeEcho {
                sub_props: vec![(1, 630)],
                ..current
            },
            &expected
        )
        .is_err());
    }
    #[test]
    fn uses_tubes_alone_when_discard_feed_would_force_a_skipped_stage() {
        let mut feed = echo(21, 5);
        feed.func_value = 2;
        let p = plan(
            &echo(12, 0),
            5,
            &HashMap::from([(36000004, 1), (36000014, 10)]),
            &[feed],
            &HashSet::new(),
        )
        .unwrap();
        assert_eq!(p.exp, 5000);
        assert!(p.echo_materials.is_empty());
        assert_eq!(
            p.materials,
            vec![MaterialCost {
                id: 36000004,
                count: 1
            }]
        );
    }
    #[test]
    fn accepts_every_tube_rarity_and_calculates_discard_exp_for_every_echo_rarity() {
        for id in [36000001, 36000002, 36000003, 36000004] {
            let inventory = HashMap::from([(id, 100), (36000014, 10)]);
            let p = plan(&echo(12, 0), 5, &inventory, &[], &HashSet::new()).unwrap();
            assert_eq!(p.materials.len(), 1);
            assert_eq!(p.materials[0].id, id);
        }
        let tables: Tables =
            serde_json::from_str(include_str!("../../../src/configs/echo_upgrade.json")).unwrap();
        for (item_id, expected) in [
            (60000012, 75),
            (60000013, 120),
            (60000014, 240),
            (60000015, 300),
        ] {
            let mut feed = echo(40, 1);
            feed.item_id = item_id;
            assert_eq!(feed_exp(&tables, &feed), Some(expected));
        }
    }
    #[test]
    fn tuning_unlocked_slots_needs_no_exp_and_rejects_missing_tuners_or_skipped_stages() {
        let p = plan(
            &echo(12, 25),
            25,
            &HashMap::from([(36000014, 10)]),
            &[],
            &HashSet::new(),
        )
        .unwrap();
        assert_eq!(p.exp, 0);
        assert_eq!(p.identify_count, 1);
        assert!(p.materials.is_empty());
        assert!(plan(
            &echo(12, 0),
            5,
            &HashMap::from([(36000004, 100)]),
            &[],
            &HashSet::new()
        )
        .is_err());
        assert!(plan(&echo(12, 0), 10, &inventory(), &[], &HashSet::new()).is_err());
        assert!(plan(&echo(12, 5), 10, &inventory(), &[], &HashSet::new()).is_err());
    }
}
