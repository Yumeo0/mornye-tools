//! Checkpoint plans from fresh inventory. Discard EXP may pass a checkpoint.
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
    Ok(if current.equipped {
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
    /// Expected server level after feeding EXP, which may pass the checkpoint.
    pub result_level: i32,
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
        serde_json::from_str(include_str!("../../../../src/configs/echo_upgrade.json"))?;
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
    // Search all legal discard combinations before spending tubes. Greedy feeds
    // can strand EXP below a stage boundary and incorrectly fall back to tubes.
    let mut groups = std::collections::BTreeMap::<i32, Vec<&UpgradeEcho>>::new();
    for item in echoes {
        if policy.discard_echoes
            && item.incr_id > 0
            && item.incr_id != echo.incr_id
            && item.func_value == 2
            && !item.equipped
            && !protected.contains(&item.incr_id)
        {
            if let Some(exp) = feed_exp(&tables, item).filter(|exp| *exp > 0) {
                groups.entry(exp).or_default().push(item);
            }
        }
    }
    let groups: Vec<_> = groups
        .into_iter()
        .rev()
        .map(|(exp, mut items)| {
            items.sort_by_key(|item| item.incr_id);
            (exp, items)
        })
        .collect();
    // Discard fodder may pass the checkpoint. A minimal covering feed never
    // needs more than one feed's worth of excess, keeping the search bounded.
    let largest = groups.first().map_or(0, |(exp, _)| *exp);
    let bound = if required == 0 || groups.is_empty() {
        0
    } else {
        required.saturating_add(largest.saturating_sub(1)) as usize
    };
    // Immutable predecessor nodes keep reconstruction valid across bounded stacks.
    let mut nodes = vec![(0usize, 0usize, 0i32)];
    let mut reachable = vec![None; bound + 1];
    reachable[0] = Some(0);
    for (index, (exp, items)) in groups.iter().enumerate() {
        let mut count = items
            .iter()
            .fold(0usize, |total, item| {
                total.saturating_add(item.stack_count.max(1) as usize)
            })
            .min(bound / *exp as usize);
        // Binary splitting handles large stacks without enumerating every copy.
        let mut chunk = 1;
        while count > 0 {
            let take = count.min(chunk);
            let weight = take * *exp as usize;
            for sum in (weight..=bound).rev() {
                if reachable[sum].is_none() {
                    if let Some(previous) = reachable[sum - weight] {
                        reachable[sum] = Some(nodes.len());
                        nodes.push((previous, index, take as i32));
                    }
                }
            }
            count -= take;
            chunk *= 2;
        }
    }
    // Compute available tube totals once. Tube EXP is only used to top up a
    // discard combination; zero tube EXP always wins when discards can cover it.
    let tube_bound = ((required + 499) / 500) as usize + 10;
    let mut tubes: Vec<Option<Vec<i32>>> = vec![None; tube_bound + 1];
    tubes[0] = Some(vec![0; tables.materials.len()]);
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
        let previous = tubes.clone();
        for (sum, entry) in previous.iter().enumerate() {
            let Some(used) = entry else { continue };
            for n in 1..=count.min((tube_bound - sum) / step) {
                let next = sum + n * step;
                let mut candidate = used.clone();
                candidate[index] = n as i32;
                if tubes[next]
                    .as_ref()
                    .is_none_or(|old| candidate.iter().sum::<i32>() < old.iter().sum())
                {
                    tubes[next] = Some(candidate);
                }
            }
        }
    }
    let (feed_exp, tube_units) = reachable
        .iter()
        .enumerate()
        .filter(|(_, node)| node.is_some())
        .filter_map(|(sum, _)| {
            let needed = ((required - sum as i32).max(0) + 499) / 500;
            (needed as usize..=tube_bound)
                .find(|units| {
                    tubes[*units].is_some()
                        && (sum > 0 || *units as i64 * 500 <= i64::from(ceiling))
                })
                .map(|units| (sum, units))
        })
        // Save tubes first, then use the least discard EXP that achieves that
        // tube cost. Extra fodder otherwise spends credits and risks losing EXP
        // on a failed checkpoint without saving any tubes.
        .min_by_key(|(sum, units)| (*units, *sum))
        .context("Not enough discard echo EXP or allowed EXP tubes for the next checkpoint")?;
    let counts = tubes[tube_units].take().unwrap();
    let granted = feed_exp as i32 + tube_units as i32 * 500;
    let mut result_level = echo.level;
    let mut remaining_exp = i64::from(echo.exp) + i64::from(granted);
    while result_level < limit {
        let cost = i64::from(
            *levels
                .get(result_level as usize + 1)
                .context("Missing resulting level EXP")?,
        );
        if remaining_exp < cost {
            break;
        }
        remaining_exp -= cost;
        result_level += 1;
    }
    let mut used = vec![0; groups.len()];
    let mut node = reachable[feed_exp].unwrap();
    while node != 0 {
        let (previous, index, count) = nodes[node];
        used[index] += count;
        node = previous;
    }
    let mut echo_materials = Vec::new();
    for ((exp, items), mut count) in groups.into_iter().zip(used) {
        for item in items {
            let take = count.min(item.stack_count.max(1));
            if take > 0 {
                echo_materials.push(EchoMaterialCost {
                    incr_id: item.incr_id,
                    item_id: item.item_id,
                    count: take,
                    exp,
                });
                count -= take;
            }
            if count == 0 {
                break;
            }
        }
    }
    Ok(UpgradePlan {
        incr_id: echo.incr_id,
        item_id: echo.item_id,
        from_level: echo.level,
        from_exp: echo.exp,
        from_sub_props: echo.sub_props.clone(),
        target_level: target,
        result_level,
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
    fn discard_guard_replaces_locks_preserves_equipment_and_stacks_and_rejects_stale_substats() {
        let current = echo(20, 5);
        let expected = DiscardEcho {
            incr_id: 20,
            item_id: current.item_id,
            level: 5,
            sub_props: vec![],
        };
        assert!(discard_guard(&current, &expected).unwrap().is_none());
        assert!(discard_guard(
            &UpgradeEcho {
                func_value: 1,
                ..current.clone()
            },
            &expected
        )
        .unwrap()
        .is_none());
        for protected in [
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
    fn keeps_discard_when_a_tube_alone_has_the_same_tube_cost() {
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
        assert_eq!(p.result_level, 5);
        assert_eq!(p.max_credits, 4000);
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
    fn preserves_extra_fodder_when_it_does_not_reduce_tube_exp() {
        let mut large = echo(21, 5);
        large.func_value = 2;
        let mut small = echo(22, 1);
        small.item_id = 60000012; // Only 75 EXP; cannot save another 500-EXP tube.
        small.func_value = 2;
        let p = plan(
            &echo(12, 0),
            5,
            &HashMap::from([(36000001, 3), (36000014, 10)]),
            &[large, small],
            &HashSet::new(),
        )
        .unwrap();
        assert_eq!(p.exp, 4800);
        assert_eq!(p.result_level, 5);
        assert_eq!(
            p.echo_materials,
            vec![EchoMaterialCost {
                incr_id: 21,
                item_id: 60000015,
                count: 1,
                exp: 3300
            }]
        );
        assert_eq!(
            p.materials,
            vec![MaterialCost {
                id: 36000001,
                count: 3
            }]
        );
    }
    #[test]
    fn one_large_discard_can_unlock_multiple_substats_without_spending_tubes() {
        let feed = UpgradeEcho {
            func_value: 2,
            ..echo(21, 20)
        };
        for inventory in [inventory(), HashMap::from([(36000014, 50)])] {
            let p = plan(
                &echo(12, 0),
                5,
                &inventory,
                std::slice::from_ref(&feed),
                &HashSet::new(),
            )
            .unwrap();
            assert_eq!(p.target_level, 5);
            assert_eq!(p.result_level, 17);
            assert_eq!(p.exp, 59325);
            assert_eq!(p.identify_count, 1);
            assert_eq!(p.echo_materials[0].count, 1);
            assert!(p.materials.is_empty());
            // Extra unlocked slots are tuned separately before any more EXP.
            let updated = UpgradeEcho {
                sub_props: vec![(1, 630)],
                ..echo(12, 17)
            };
            let next = plan(
                &updated,
                17,
                &inventory,
                std::slice::from_ref(&feed),
                &HashSet::new(),
            )
            .unwrap();
            assert_eq!(next.result_level, 17);
            assert_eq!(next.exp, 0);
            assert_eq!(next.identify_count, 1);
            assert!(next.echo_materials.is_empty());
        }
    }
    #[test]
    fn oversized_discard_respects_level_limits_stack_counts_and_protection() {
        let feed = UpgradeEcho {
            func_value: 2,
            stack_count: 100,
            ..echo(21, 25)
        };
        let mut target = echo(12, 0);
        target.item_id = 60000012; // 2-star echo, maximum +10.
        let p = plan(
            &target,
            5,
            &inventory(),
            std::slice::from_ref(&feed),
            &HashSet::new(),
        )
        .unwrap();
        assert_eq!(p.result_level, 10);
        assert_eq!(p.echo_materials[0].count, 1);
        assert!(p.materials.is_empty());
        let p = plan(&echo(12, 0), 5, &inventory(), &[feed], &HashSet::from([21])).unwrap();
        assert_eq!(p.result_level, 5);
        assert!(p.echo_materials.is_empty());
    }
    #[test]
    fn discard_stacks_cover_the_stage_before_any_tubes_are_used() {
        let mut feed = echo(21, 2);
        feed.func_value = 2;
        feed.stack_count = 20;
        let p = plan(&echo(12, 0), 5, &inventory(), &[feed], &HashSet::new()).unwrap();
        assert_eq!(p.exp, 4500);
        assert!(p.materials.is_empty());
        assert_eq!(p.echo_materials[0].count, 6);
    }
    #[test]
    fn uses_the_smallest_sufficient_discard_feed_before_spending_tubes() {
        let small = UpgradeEcho {
            func_value: 2,
            stack_count: 2,
            ..echo(21, 5)
        };
        let large = UpgradeEcho {
            func_value: 2,
            ..echo(22, 20)
        };
        let p = plan(
            &echo(12, 0),
            5,
            &inventory(),
            &[small, large],
            &HashSet::new(),
        )
        .unwrap();
        assert!(p.materials.is_empty());
        assert_eq!(p.exp, 6600);
        assert_eq!(p.echo_materials.len(), 1);
        assert_eq!(p.echo_materials[0].incr_id, 21);
        assert_eq!(p.echo_materials[0].count, 2);
    }
    #[test]
    fn discard_search_matches_exhaustive_small_inventories_without_reusing_copies() {
        let tables: Tables =
            serde_json::from_str(include_str!("../../../../src/configs/echo_upgrade.json"))
                .unwrap();
        for levels in [[1, 4, 5], [2, 3, 6], [5, 6, 7]] {
            let feeds: Vec<_> = levels
                .into_iter()
                .enumerate()
                .map(|(index, level)| UpgradeEcho {
                    func_value: 2,
                    stack_count: 3 - index as i32,
                    ..echo(21 + index as i32, level)
                })
                .collect();
            for basic in [0, 2] {
                for premium in [0, 1] {
                    let mut expected = None;
                    for a in 0..=3 {
                        for b in 0..=2 {
                            for c in 0..=1 {
                                let exp = feeds
                                    .iter()
                                    .zip([a, b, c])
                                    .map(|(feed, count)| feed_exp(&tables, feed).unwrap() * count)
                                    .sum::<i32>();
                                for small in 0..=basic {
                                    for large in 0..=premium {
                                        let tube_exp = small * 500 + large * 5000;
                                        if exp + tube_exp >= 4400
                                            && (exp > 0 || exp + tube_exp <= 6099)
                                        {
                                            let score = (tube_exp, exp);
                                            expected =
                                                Some(expected.map_or(score, |old| {
                                                    std::cmp::min(old, score)
                                                }));
                                        }
                                    }
                                }
                            }
                        }
                    }
                    let p = plan(
                        &echo(12, 0),
                        5,
                        &HashMap::from([(36000001, basic), (36000004, premium), (36000014, 10)]),
                        &feeds,
                        &HashSet::new(),
                    );
                    if let Some(score) = expected {
                        let p = p.unwrap();
                        let exp = p
                            .echo_materials
                            .iter()
                            .map(|cost| cost.exp * cost.count)
                            .sum::<i32>();
                        let tube_exp = p.exp - exp;
                        assert_eq!((tube_exp, exp), score);
                        for cost in p.echo_materials {
                            let stock = feeds
                                .iter()
                                .find(|feed| feed.incr_id == cost.incr_id)
                                .unwrap();
                            assert!(cost.count > 0 && cost.count <= stock.stack_count);
                        }
                    } else {
                        assert!(p.is_err());
                    }
                }
            }
        }
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
            serde_json::from_str(include_str!("../../../../src/configs/echo_upgrade.json"))
                .unwrap();
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
