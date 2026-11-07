import { expect, test } from "bun:test";
import {
	mapRequirements,
	mergeRequirementComponents,
	type RequirementEntity,
	type RequirementNode,
} from "../../../scripts/map-requirements";
import { obtainedThrough, requirementLabel } from "./links";
import type { MapCatalog, MapRequirement, MapReward } from "./types";

const chest = {
	key: "8:99",
	entityId: 99,
	mapId: 8,
	kind: "chest",
	owner: 10,
} as MapReward;
const plays = [{ id: 10, mapId: 8 }];
const entity = (
	id: number,
	overrides: Partial<RequirementEntity> = {},
): RequirementEntity => ({
	key: `8:${id}`,
	entityId: id,
	mapId: 8,
	name: "Honeysuckle",
	action: "collect",
	components: {},
	...overrides,
});
const entities = [
	entity(1),
	entity(2),
	entity(3, { name: "Cruisewing", action: "defeat" }),
	entity(4, { name: "Cruisewing", action: "defeat" }),
	entity(99, { name: "Chest", action: undefined, asleep: true }),
];
const node = (
	id: number,
	type: string,
	data: Record<string, unknown> = {},
	parent = 1,
): RequirementNode => ({
	Key: `10_${id}`,
	Data: { Id: id, Type: type, ParentNodeId: parent, ...data },
});
const awake = [{ Name: "AwakeEntity", Params: { EntityIds: [99] } }];
const kill = (targets: number[]) => ({
	Type: "Kill",
	ExistTargets: targets,
	TargetsToAwake: [],
});
const nodes = [
	node(1, "Sequence", {}, 0),
	node(4, "ChildQuest", { Condition: kill([1, 2, 1]) }),
	node(2, "ChildQuest", {
		Condition: { ...kill([3]), TargetsToAwake: [4, 3] },
		FinishActions: awake,
	}),
	node(3, "QuestSucceed"),
];
const expected: MapRequirement[] = [
	{ action: "collect", targets: [{ name: "Honeysuckle", count: 2 }] },
	{ action: "defeat", targets: [{ name: "Cruisewing", count: 2 }] },
];
const run = (
	graph = nodes,
	placements = entities,
	rewards = [chest],
	text = new Map<string, string>(),
) => mapRequirements(rewards, plays, graph, placements, text);

test("native sequence order and entity types distinguish collecting from defeating and deduplicate targets", () => {
	expect(run().get(chest.key)).toEqual(expected);
});

test("requirements apply to all map reward kinds and do not need gameplay ownership", () => {
	for (const kind of [
		"chest",
		"heritage",
		"casket",
		"exploration",
		"collection",
		"teleport",
	] as const) {
		const reward = { ...chest, kind, owner: null };
		expect(run(nodes, entities, [reward]).get(reward.key)).toEqual(expected);
		expect(
			obtainedThrough({ ...reward, requirements: expected }, []).filter(
				(source) => source.kind === "requirement",
			),
		).toHaveLength(2);
	}
});

test("nested sequences and success actions retain prerequisites", () => {
	const graph = [
		node(1, "Sequence", {}, 0),
		node(5, "Sequence"),
		node(4, "ChildQuest", { Condition: kill([1, 2]) }, 5),
		node(2, "ChildQuest", { Condition: kill([3, 4]) }),
		node(3, "QuestSucceed", { FinishActions: awake }),
	];
	expect(run(graph).get(chest.key)).toEqual(expected);
});

test("missing or cross-map targets cannot silently reduce counts", () => {
	const foreign = entities.map((target) =>
		target.entityId === 2 ? { ...target, mapId: 9, key: "9:2" } : target,
	);
	expect(run(nodes, foreign).size).toBe(0);
	expect(
		run(
			nodes,
			entities.filter((target) => target.entityId !== 2),
		).size,
	).toBe(0);
	expect(run(nodes, entities, [{ ...chest, mapId: 9, key: "9:99" }]).size).toBe(
		0,
	);
});

test("unresolved conditions prevent later steps but preserve rewards unlocked before them", () => {
	const graph = [
		nodes[0],
		{ ...nodes[1], Data: { ...nodes[1].Data, FinishActions: awake } },
		node(2, "ChildQuest", {
			Condition: { Type: "Unknown" },
			FinishActions: [{ Name: "AwakeEntity", Params: { EntityIds: [98] } }],
		}),
	];
	const early = run(
		graph,
		[...entities, entity(98, { asleep: true })],
		[chest, { ...chest, entityId: 98, key: "8:98" }],
	);
	expect(early.get(chest.key)).toEqual(expected.slice(0, 1));
	expect(early.has("8:98")).toBe(false);
});

test("localized objective text covers conditions without a structured renderer", () => {
	const graph = [
		nodes[0],
		node(2, "ChildQuest", {
			Condition: { Type: "Parkour" },
			TidTip: "objective",
			FinishActions: awake,
		}),
	];
	expect(
		run(
			graph,
			entities,
			[chest],
			new Map([["objective", "<b>Reach the finish line</b>"]]),
		).get(chest.key),
	).toEqual([{ action: "objective", text: "Reach the finish line" }]);
	expect(
		run(
			graph,
			entities,
			[chest],
			new Map([["objective", "Complete {0} rounds"]]),
		).size,
	).toBe(0);
});

test("interaction and area conditions produce player instructions", () => {
	const graph = [
		nodes[0],
		node(2, "ChildQuest", {
			Condition: { Type: "DoInteract", AddOptions: [{ EntityId: 1 }] },
		}),
		node(3, "ChildQuest", {
			Condition: { Type: "ReachArea", Pos: { X: 123.2, Y: -456.7 } },
			FinishActions: awake,
		}),
	];
	expect(run(graph).get(chest.key)?.map(requirementLabel)).toEqual([
		"Interact with 1 × Honeysuckle",
		"Reach the area at 123, -457",
	]);
});

test("parallel completion counts preserve alternatives rather than requiring every branch", () => {
	const graph = [
		nodes[0],
		node(5, "ParallelSelect", { Count: 1 }),
		node(6, "ChildQuest", { Condition: kill([1]) }, 5),
		node(7, "ChildQuest", { Condition: kill([3]) }, 5),
		node(3, "QuestSucceed", { FinishActions: awake }),
	];
	const requirements = run(graph).get(chest.key);
	expect(requirements?.[0].action).toBe("any");
	expect(requirements?.map(requirementLabel)).toEqual([
		"Either: Collect 1 × Honeysuckle; or Defeat 1 × Cruisewing",
	]);
});

test("independent unlock routes remain alternatives; an unknown route prevents a false mandatory checklist", () => {
	const graph = [
		node(1, "ParallelSelect", { Count: 1 }, 0),
		node(2, "ChildQuest", { Condition: kill([1]), FinishActions: awake }),
		node(3, "ChildQuest", { Condition: kill([3]), FinishActions: awake }),
	];
	expect(run(graph).get(chest.key)?.[0].action).toBe("any");
	graph[2].Data.Condition = { Type: "Unknown" };
	expect(run(graph).size).toBe(0);
});

const locked = entity(99, {
	name: "Chest",
	action: undefined,
	asleep: false,
	components: {
		EntityStateComponent: {
			LockConfig: { IsInitLock: true, LockType: "Program" },
		},
	},
});
const groupEntity = (
	conditions: Record<string, unknown>[],
	extra = {},
): RequirementEntity =>
	entity(50, {
		name: "Group",
		action: undefined,
		components: {
			EntityGroupComponent: {
				FinishState: { GroupCondition: { Conditions: conditions, ...extra } },
			},
			EntityStateComponent: {
				StateChangeBehaviors: [
					{
						State: "关卡.Common.状态.完成",
						Action: [{ Name: "UnlockEntity", Params: { EntityIds: [99] } }],
					},
				],
			},
		},
	});

test("entity groups unlock ownerless chests through explicit destruction requirements", () => {
	const placements = [
		locked,
		entity(1, { name: "Tree Trunk", action: "destroy" }),
		entity(2, { name: "Tree Trunk", action: "destroy" }),
		groupEntity([
			{ EntityId: 1, IsDead: true },
			{ EntityId: 2, IsDead: true },
		]),
	];
	expect(
		run([], placements, [{ ...chest, owner: null }]).get(chest.key),
	).toEqual([
		{ action: "destroy", targets: [{ name: "Tree Trunk", count: 2 }] },
	]);
});

test("entity state dependencies follow multiple groups and stop at cycles", () => {
	const placements = [
		locked,
		...entities.slice(0, 2),
		groupEntity([{ EntityId: 51, State: "关卡.Common.状态.完成" }]),
		entity(51, {
			components: {
				EntityGroupComponent: {
					FinishState: {
						GroupCondition: {
							Conditions: [
								{ EntityId: 1, IsDead: true },
								{ EntityId: 2, IsDead: true },
							],
						},
					},
				},
			},
		}),
	];
	expect(run([], placements).get(chest.key)).toEqual(expected.slice(0, 1));
	placements[4] = entity(51, {
		components: {
			EntityGroupComponent: {
				FinishState: {
					GroupCondition: {
						Conditions: [{ EntityId: 50, State: "关卡.Common.状态.完成" }],
					},
				},
			},
		},
	});
	expect(run([], placements).size).toBe(0);
});

test("entity group comparisons preserve exact and minimum counts and reject unsupported comparisons", () => {
	const conditions = [
		{ EntityId: 1, IsDead: true },
		{ EntityId: 3, IsDead: true },
	];
	for (const [compare, action] of [
		["Ge", "atLeast"],
		["Eq", "exactly"],
	] as const)
		expect(
			run(
				[],
				[
					locked,
					...entities.slice(0, 4),
					groupEntity(conditions, { Compare: compare, Count: 1 }),
				],
			).get(chest.key)?.[0].action,
		).toBe(action);
	expect(
		run(
			[],
			[
				locked,
				...entities.slice(0, 4),
				groupEntity(conditions, { Compare: "Le", Count: 2 }),
			],
		).size,
	).toBe(0);
});

test("template fields are inherited while overridden arrays replace defaults", () => {
	const defaults = {
		EntityStateComponent: {
			LockConfig: { IsInitLock: true, LockType: "Program" },
			StateChangeBehaviors: [1],
		},
	};
	expect(
		mergeRequirementComponents(defaults, {
			EntityStateComponent: { StateChangeBehaviors: [] },
		}),
	).toEqual({
		EntityStateComponent: {
			LockConfig: { IsInitLock: true, LockType: "Program" },
			StateChangeBehaviors: [],
		},
	});
	expect(defaults.EntityStateComponent.StateChangeBehaviors).toEqual([1]);
});

test("already claiming the same reward cannot become a prerequisite for obtaining it", () => {
	const graph = [
		nodes[0],
		node(2, "ChildQuest", {
			Condition: { Type: "CheckTreasureBeenClaimed", EntityId: 99 },
			FinishActions: awake,
		}),
	];
	expect(run(graph).size).toBe(0);
});

test("unresolved spawn gates cannot be hidden behind a resolved unlock gate", () => {
	const graph = [
		nodes[0],
		node(2, "ChildQuest", {
			Condition: { Type: "Unknown" },
			FinishActions: awake,
		}),
	];
	const placements = [
		{ ...locked, asleep: true },
		...entities.slice(0, 2),
		groupEntity([{ EntityId: 1, IsDead: true }]),
	];
	expect(run(graph, placements).size).toBe(0);
});

test("unconditional spawning preserves known unlock requirements", () => {
	const graph = [nodes[0], node(2, "Action", { Actions: awake })];
	const placements = [
		{ ...locked, asleep: true },
		...entities.slice(0, 2),
		groupEntity([{ EntityId: 1, IsDead: true }]),
	];
	expect(run(graph, placements).get(chest.key)).toEqual([
		{ action: "collect", targets: [{ name: "Honeysuckle", count: 1 }] },
	]);
});

test("an unconditional alternative does not invent mandatory objectives", () => {
	const graph = [
		node(1, "ParallelSelect", { Count: 1 }, 0),
		node(2, "Action", { Actions: awake }),
		node(3, "ChildQuest", { Condition: kill([3]), FinishActions: awake }),
	];
	expect(run(graph).size).toBe(0);
});

test("embedded conditional slots retain their guard before the nested objective", () => {
	const graph = [
		nodes[0],
		node(5, "ConditionSelector", {
			Slots: [
				{
					Condition: {
						Type: 0,
						Conditions: [
							{
								Type: "CompareEntityState",
								EntityId: 1,
								State: "关卡.Common.状态.激活",
								Compare: "Eq",
							},
						],
					},
					Node: {
						Id: 6,
						Type: "ChildQuest",
						Condition: kill([3, 4]),
						FinishActions: awake,
					},
				},
			],
		}),
	];
	expect(run(graph).get(chest.key)?.map(requirementLabel)).toEqual([
		"Activate 1 × Honeysuckle",
		"Defeat 2 × Cruisewing",
	]);
});

test("dynamic targets and missing unlock actions do not produce guessed requirements", () => {
	const graph = structuredClone(nodes);
	graph[1].Data.Condition = { ...kill([1, 2]), PrefabVar: "Dynamic targets" };
	expect(run(graph).size).toBe(0);
	graph[1].Data.Condition = kill([1, 2]);
	graph[2].Data.FinishActions = [];
	expect(run(graph).size).toBe(0);
});

test("both reported chests and non-chest placements publish native requirements in Obtained through", async () => {
	const catalog: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const labels = (key: string) => {
		const reward = catalog.rewards.find((reward) => reward.key === key);
		if (!reward) throw new Error(`Missing ${key}`);
		return obtainedThrough(reward, []).flatMap((source) =>
			source.kind === "requirement"
				? [requirementLabel(source.requirement)]
				: [],
		);
	};
	expect(labels("8:106003361")).toEqual([
		"Collect 6 × Honeysuckle",
		"Defeat 3 × Cruisewing",
	]);
	expect(labels("8:142007162")).toEqual(["Destroy 3 × Tree Trunk"]);
	for (const kind of ["heritage", "casket", "exploration", "collection"]) {
		const reward = catalog.rewards.find(
			(reward) => reward.kind === kind && reward.requirements?.length,
		);
		expect(reward).toBeDefined();
		if (reward) expect(labels(reward.key).length).toBeGreaterThan(0);
	}
});
