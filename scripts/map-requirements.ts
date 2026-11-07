import type {
	MapRequirement,
	MapReward,
	RequirementAction,
} from "../src/lib/map/types";

type Raw = Record<string, unknown>;
// true is an unconditional dependency; null is a dependency we cannot resolve.
type Resolved = MapRequirement | true | null;
const present = (requirements: Resolved[]): MapRequirement[] =>
	requirements.filter(
		(item): item is MapRequirement => typeof item === "object" && item !== null,
	);
const row = (value: unknown): Raw =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Raw)
		: {};
const rows = (value: unknown): Raw[] =>
	Array.isArray(value) ? value.map(row) : [];
const ids = (value: unknown): number[] =>
	Array.isArray(value) ? value.filter(Number.isSafeInteger) : [];

export interface RequirementNode {
	Key: string;
	Data: Raw & { Id: number; Type: string; ParentNodeId: number };
}
export interface RequirementEntity {
	key: string;
	mapId: number;
	entityId: number;
	name: string;
	action?: RequirementAction;
	asleep?: boolean;
	components: Raw;
}
export interface RequirementPlay {
	id: number;
	mapId: number;
	name?: string;
}

/** Components inherit individual fields; an explicit array replaces the template array. */
export function mergeRequirementComponents(defaults: Raw, overrides: Raw): Raw {
	const merged = { ...defaults };
	for (const [key, value] of Object.entries(overrides))
		merged[key] =
			value && typeof value === "object" && !Array.isArray(value)
				? mergeRequirementComponents(row(defaults[key]), row(value))
				: value;
	return merged;
}

function combine(
	action: "all" | "any" | "sequence" | "atLeast" | "exactly",
	requirements: MapRequirement[],
	count?: number,
): MapRequirement | null {
	const items = requirements.flatMap((requirement) =>
		requirement.action === action &&
		"requirements" in requirement &&
		["all", "sequence"].includes(action)
			? requirement.requirements
			: [requirement],
	);
	if (!items.length) return null;
	if (items.length === 1 && (count === undefined || count === 1))
		return items[0];
	return {
		action,
		requirements: items,
		...(count === undefined ? {} : { count }),
	};
}

function aggregate(
	action: "all" | "any" | "sequence" | "atLeast" | "exactly",
	values: Resolved[],
	count?: number,
): Resolved {
	const unconditional = values.filter((value) => value === true).length;
	if (action === "any" && unconditional) return true;
	if (action === "atLeast" && count !== undefined && unconditional >= count)
		return true;
	if (values.some((value) => value === null)) return null;
	const requirements = present(values);
	if (action === "atLeast" || action === "exactly") {
		if (count === undefined) return null;
		const remaining = count - unconditional;
		if (remaining === 0 && !requirements.length) return true;
		if (remaining < 1 || remaining > requirements.length) return null;
		return combine(action, requirements, remaining);
	}
	return combine(action, requirements) ?? true;
}

/** Resolve requirements through state, unlock and spawn dependencies; never infer from distance. */
export function mapRequirements(
	rewards: MapReward[],
	plays: RequirementPlay[],
	nodes: RequirementNode[],
	entities: RequirementEntity[],
	text: ReadonlyMap<string, string> = new Map(),
): Map<string, MapRequirement[]> {
	const byKey = new Map(entities.map((entity) => [entity.key, entity]));
	const byPlay = new Map(plays.map((play) => [play.id, play]));
	const graphs = new Map<number, RequirementNode["Data"][]>();
	for (const node of nodes) {
		const id = Number(node.Key.slice(0, node.Key.lastIndexOf("_")));
		const entries = graphs.get(id) ?? [];
		entries.push(node.Data);
		graphs.set(id, entries);
	}
	type Provider = (seen: Set<string>) => Resolved;
	const providers = new Map<string, Provider[]>();
	const add = (event: string, provider: Provider) => {
		const entries = providers.get(event) ?? [];
		entries.push(provider);
		providers.set(event, entries);
	};
	const eventFor = (key: string, event: string) => `${key}/${event}`;
	const resolve = (event: string, seen: Set<string>): Resolved => {
		if (seen.has(event) || seen.size > 32) return null;
		const next = new Set(seen).add(event);
		const entries = providers.get(event) ?? [];
		if (!entries.length) return null;
		const alternatives = entries.map((provider) => provider(next));
		// Unconditional and unresolved routes have different meanings for a checklist.
		const unique = new Map(
			alternatives.map((item) => [JSON.stringify(item), item]),
		);
		return aggregate("any", [...unique.values()]);
	};
	const target = (mapId: number, id: number) => byKey.get(`${mapId}:${id}`);
	const leaf = (
		entity: RequirementEntity,
		action: RequirementAction,
	): MapRequirement => ({
		action,
		targets: [{ name: entity.name, count: 1, entityKey: entity.key }],
	});
	const deadTargets = (
		mapId: number,
		entityIds: number[],
	): MapRequirement | null => {
		const groups = new Map<RequirementAction, Map<string, number>>();
		for (const id of new Set(entityIds)) {
			const entity = target(mapId, id);
			if (!entity?.name || !entity.action) return null;
			const counts = groups.get(entity.action) ?? new Map<string, number>();
			counts.set(entity.name, (counts.get(entity.name) ?? 0) + 1);
			groups.set(entity.action, counts);
		}
		return combine(
			"all",
			[...groups].map(([action, counts]) => ({
				action,
				targets: [...counts].map(([name, count]) => ({ name, count })),
			})),
		);
	};
	const state = (
		mapId: number,
		id: number,
		value: string,
		seen: Set<string>,
	): Resolved => {
		const entity = target(mapId, id);
		if (!entity) return null;
		const event = eventFor(entity.key, `state:${value}`);
		if (providers.has(event)) return resolve(event, seen);
		if (!entity.name) return null;
		if (value === "关卡.Common.状态.激活") return leaf(entity, "activate");
		if (value === "关卡.Common.状态.完成") return leaf(entity, "complete");
		return null;
	};
	const group = (value: Raw, mapId: number, seen: Set<string>): Resolved => {
		const conditions = rows(value.Conditions);
		if (
			value.Compare !== undefined &&
			!["Eq", "Ge"].includes(String(value.Compare))
		)
			return null;
		const result = conditions.map((check) => {
			if (check.IsDead === true)
				return deadTargets(mapId, [Number(check.EntityId)]);
			if (typeof check.State === "string")
				return state(mapId, Number(check.EntityId), check.State, seen);
			return null;
		});
		if (!result.length) return null;
		if (value.Count === undefined || value.Count === conditions.length) {
			if (conditions.every((check) => check.IsDead === true))
				return deadTargets(
					mapId,
					conditions.map((check) => Number(check.EntityId)),
				);
			return aggregate("all", result);
		}
		if (
			typeof value.Count !== "number" ||
			value.Count < 1 ||
			value.Count > conditions.length
		)
			return null;
		if (value.Compare === "Ge")
			return aggregate("atLeast", result, value.Count);
		if (value.Compare === "Eq")
			return aggregate("exactly", result, value.Count);
		return null;
	};
	const localized = (id: unknown): MapRequirement | null => {
		const value =
			typeof id === "string"
				? text
						.get(id)
						?.replace(/<[^>]*>/g, "")
						.trim()
				: "";
		return value && !value.includes("{")
			? { action: "objective", text: value }
			: null;
	};
	const condition = (
		value: Raw,
		mapId: number,
		seen: Set<string>,
	): Resolved => {
		if (value.Type === "CheckConditionGroup") {
			const checks = rows(row(value.Condition).Conditions);
			return checks.length === 1 ? condition(checks[0], mapId, seen) : null;
		}
		if (typeof value.Type === "number") {
			const checks = rows(value.Conditions);
			return checks.length === 1 ? condition(checks[0], mapId, seen) : null;
		}
		if (value.Type === "Kill") {
			if (
				value.PrefabVar !== undefined ||
				value.EntityDeadPositions !== undefined
			)
				return null;
			return deadTargets(mapId, [
				...ids(value.ExistTargets),
				...ids(value.TargetsToAwake),
			]);
		}
		if (value.Type === "CheckEntityState") return group(value, mapId, seen);
		if (
			value.Type === "CompareEntityState" &&
			(value.Compare === undefined || value.Compare === "Eq")
		)
			return state(mapId, Number(value.EntityId), String(value.State), seen);
		if (value.Type === "CheckTreasureBeenClaimed") {
			const entity = target(mapId, Number(value.EntityId));
			if (entity && seen.has(eventFor(entity.key, "claim"))) return null;
			return entity?.name ? leaf(entity, "collect") : null;
		}
		if (value.Type === "DoInteract") {
			const options = rows(value.AddOptions);
			if (options.length !== 1) return null;
			const option = options[0];
			return (
				localized(row(option.Option).TidContent) ??
				(() => {
					const entity = target(mapId, Number(option.EntityId));
					return entity?.name ? leaf(entity, "interact") : null;
				})()
			);
		}
		if (value.Type === "ReachArea") {
			const position = row(value.Pos);
			return typeof position.X === "number" && typeof position.Y === "number"
				? {
						action: "objective",
						text: `Reach the area at ${Math.round(position.X)}, ${Math.round(position.Y)}`,
					}
				: null;
		}
		if (value.Type === "CheckLevelPlay") {
			const requirements = ids(value.LevelPlayIds).map((id) => {
				const play = byPlay.get(id);
				return play?.mapId === mapId && play.name
					? {
							action: "complete" as const,
							targets: [{ name: play.name, count: 1 }],
						}
					: resolve(`play:${mapId}:${id}`, seen);
			});
			if (!requirements.length) return null;
			const count = Number(value.CompleteNumber);
			return count === requirements.length
				? aggregate("all", requirements)
				: count >= 1 && count < requirements.length
					? aggregate("atLeast", requirements, count)
					: null;
		}
		return null;
	};
	const actions = (values: unknown, mapId: number, prerequisite: Provider) => {
		for (const action of rows(values)) {
			const params = row(action.Params);
			if (action.Name === "AwakeEntity" || action.Name === "UnlockEntity")
				for (const id of ids(params.EntityIds))
					add(
						eventFor(
							`${mapId}:${id}`,
							action.Name === "AwakeEntity" ? "awake" : "unlock",
						),
						prerequisite,
					);
			if (
				action.Name === "ChangeEntityState" &&
				typeof params.State === "string" &&
				params.Type === "Directly"
			)
				add(
					eventFor(`${mapId}:${params.EntityId}`, `state:${params.State}`),
					prerequisite,
				);
		}
	};
	for (const entity of entities) {
		const components = entity.components;
		const entityGroup = row(components.EntityGroupComponent);
		const finish = row(row(entityGroup.FinishState).GroupCondition);
		if (rows(finish.Conditions).length)
			add(eventFor(entity.key, "state:关卡.Common.状态.完成"), (seen) =>
				group(finish, entity.mapId, seen),
			);
		for (const trigger of rows(entityGroup.StateTriggers))
			actions(trigger.SuccessActions, entity.mapId, (seen) =>
				group(row(trigger.GroupCondition), entity.mapId, seen),
			);
		for (const behavior of rows(
			row(components.EntityStateComponent).StateChangeBehaviors,
		)) {
			if (typeof behavior.State !== "string") continue;
			actions(behavior.Action, entity.mapId, (seen) =>
				state(entity.mapId, entity.entityId, String(behavior.State), seen),
			);
		}
	}
	for (const play of plays) {
		const graph = graphs.get(play.id) ?? [];
		const children = new Map<number, RequirementNode["Data"][]>();
		for (const node of graph) {
			const entries = children.get(node.ParentNodeId) ?? [];
			entries.push(node);
			children.set(node.ParentNodeId, entries);
		}
		type Path = Provider[] | null;
		const prerequisite =
			(path: Provider[]): Provider =>
			(seen) => {
				const requirements = path.map((provider) => provider(seen));
				return aggregate("sequence", requirements);
			};
		const walk = (
			node: RequirementNode["Data"],
			before: Path,
			visited: Set<number>,
		): Path => {
			if (visited.has(node.Id) || visited.size > 64) return null;
			const next = new Set(visited).add(node.Id);
			if (before) actions(node.EnterActions, play.mapId, prerequisite(before));
			const nested = children.get(node.Id) ?? [];
			let completed: Path = before;
			if (node.Type === "Sequence") {
				for (const child of nested) completed = walk(child, completed, next);
			} else if (node.Type === "ParallelSelect" || node.Type === "Select") {
				const branches = nested.map((child) => walk(child, before, next));
				const count = node.Type === "Select" ? 1 : Number(node.Count);
				completed =
					before &&
					branches.length &&
					branches.every((branch) => branch !== null) &&
					count >= 1 &&
					count <= branches.length
						? [
								...before,
								(seen) => {
									const requirements = branches.map((branch) =>
										prerequisite((branch ?? []).slice(before.length))(seen),
									);
									return aggregate(
										count === branches.length
											? "all"
											: count === 1
												? "any"
												: "atLeast",
										requirements,
										count === branches.length ? undefined : count,
									);
								},
							]
						: null;
			} else if (node.Type === "ConditionSelector") {
				const slots = rows(node.Slots);
				for (const slot of slots) {
					const embedded = row(slot.Node);
					if (
						typeof embedded.Id !== "number" ||
						typeof embedded.Type !== "string"
					)
						continue;
					const path = before
						? [
								...before,
								(seen: Set<string>) =>
									condition(row(slot.Condition), play.mapId, seen),
							]
						: null;
					const branch = walk(
						{
							...embedded,
							Id: embedded.Id,
							Type: embedded.Type,
							ParentNodeId: node.Id,
						},
						path,
						next,
					);
					completed = slots.length === 1 ? branch : null;
				}
			} else if (node.Type === "ChildQuest" || node.Type === "Condition") {
				completed = before
					? [
							...before,
							(seen) =>
								condition(row(node.Condition), play.mapId, seen) ??
								localized(node.TidTip),
						]
					: null;
			} else if (node.Type === "Action") {
				if (before) actions(node.Actions, play.mapId, prerequisite(before));
			} else if (node.Type === "QuestSucceed") {
				if (before) add(`play:${play.mapId}:${play.id}`, prerequisite(before));
			} else {
				// Lifecycle/failure/decorator branches still contain local unlocks, but cannot complete their parent.
				for (const child of nested) walk(child, before, next);
				completed = null;
			}
			if (completed)
				actions(node.FinishActions, play.mapId, prerequisite(completed));
			return completed;
		};
		for (const root of children.get(0) ?? []) walk(root, [], new Set());
	}
	const result = new Map<string, MapRequirement[]>();
	for (const reward of rewards) {
		const entity = byKey.get(reward.key);
		if (!entity) continue;
		const requirements: MapRequirement[] = [];
		const awake = eventFor(entity.key, "awake");
		const unlock = eventFor(entity.key, "unlock");
		const lock = row(row(entity.components.EntityStateComponent).LockConfig);
		const gates = [
			...(entity.asleep && providers.has(awake) ? [awake] : []),
			...(lock.IsInitLock === true && providers.has(unlock) ? [unlock] : []),
		].map((event) => resolve(event, new Set([eventFor(reward.key, "claim")])));
		if (gates.some((requirement) => requirement === null)) continue;
		requirements.push(...present(gates));
		if (reward.kind === "exploration" && reward.owner !== null) {
			const requirement = resolve(
				`play:${reward.mapId}:${reward.owner}`,
				new Set([eventFor(reward.key, "claim")]),
			);
			if (requirement && requirement !== true) requirements.push(requirement);
		}
		const combined = combine("all", requirements);
		if (combined)
			result.set(
				reward.key,
				combined.action === "sequence" ? combined.requirements : [combined],
			);
	}
	return result;
}
