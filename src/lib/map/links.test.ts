import { expect, test } from "bun:test";
import { chestChallengeIndex, obtainedThrough } from "./links";
import type { MapCatalog, MapRequirement, MapReward } from "./types";

test("reverse challenge links use all catalog markers, deduplicate chest keys and reject stale or cross-map links", () => {
	const chest = { key: "8:1", mapId: 8, kind: "chest" } as MapReward;
	const parent = {
		key: "8:2",
		mapId: 8,
		kind: "exploration",
		chestKeys: ["8:1", "8:1", "8:missing"],
	} as MapReward;
	const foreign = { ...parent, key: "906:2", mapId: 906 };
	const links = chestChallengeIndex([chest, parent, foreign]);
	expect(links.get(chest.key)).toEqual([parent]);
	expect(links.has("8:missing")).toBe(false);
});

test("Heron Wetland chest is obtained through Stygian Lacrimosa with the Exploration Quest icon", async () => {
	const catalog: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const chest = catalog.rewards.find((reward) => reward.key === "8:138000371");
	if (!chest) throw new Error("Missing example chest");
	const sources = obtainedThrough(
		chest,
		chestChallengeIndex(catalog.rewards).get(chest.key) ?? [],
	);
	expect(sources).toHaveLength(1);
	expect(sources[0]).toMatchObject({
		kind: "quest",
		quest: {
			id: 118000002,
			name: "Stygian Lacrimosa",
			type: 9,
			typeName: "Exploration Quests",
			icon: "/map/icons/SP_IconMap_Task_10_UI.webp",
		},
	});
	expect(
		catalog.rewards.some(
			(reward) => reward.name === "Device Activation Challenge",
		),
	).toBe(false);
});

test("obtained-through sources hide only gameplay covered by a quest and retain independent challenges", () => {
	const quest = { id: 100, name: "Quest", playIds: [10] };
	const chest = {
		key: "8:1",
		mapId: 8,
		kind: "chest",
		questLinks: [quest, quest],
	} as MapReward;
	const covered = {
		key: "8:2",
		mapId: 8,
		owner: 10,
		kind: "exploration",
	} as MapReward;
	const independent = { ...covered, key: "8:3", owner: 20 };
	expect(obtainedThrough(chest, [covered, independent])).toEqual([
		{ kind: "quest", quest },
		{ kind: "challenge", reward: independent },
	]);
	expect(obtainedThrough({ ...chest, questLinks: [] }, [independent])).toEqual([
		{ kind: "challenge", reward: independent },
	]);
	expect(obtainedThrough(independent, [])).toEqual([]);
});

test("the chest at 27056, 294876 lists only Race Challenge", async () => {
	const catalog: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const chest = catalog.rewards.find((reward) => reward.key === "8:146000929");
	if (!chest) throw new Error("Missing race reward chest");
	expect([Math.round(chest.x), Math.round(chest.y)]).toEqual([27056, 294876]);
	const sources = obtainedThrough(
		chest,
		chestChallengeIndex(catalog.rewards).get(chest.key) ?? [],
	);
	expect(sources).toHaveLength(1);
	expect(sources[0]).toMatchObject({
		kind: "challenge",
		reward: { name: "Race Challenge" },
	});
});

test("the chest at -17179, 290042 shows the linked Gulpuff challenge without repeating its activation", async () => {
	const catalog: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const chest = catalog.rewards.find((reward) => reward.key === "8:142004291");
	if (!chest) throw new Error("Missing Gulpuff reward chest");
	const sources = obtainedThrough(
		chest,
		chestChallengeIndex(catalog.rewards).get(chest.key) ?? [],
	);
	expect(sources).toHaveLength(1);
	expect(sources[0]).toMatchObject({
		kind: "challenge",
		reward: { key: "8:142004258", name: "Echo Challenge: Gulpuff" },
	});
});

test("linked challenge steps are removed from sequences while other targets and requirements stay", () => {
	const challenge = {
		key: "8:2",
		mapId: 8,
		kind: "exploration",
		owner: null,
		name: "Echo Challenge: Gulpuff",
	} as MapReward;
	const activation: MapRequirement = {
		action: "activate",
		targets: [{ name: challenge.name, count: 1, entityKey: challenge.key }],
	};
	const other: MapRequirement = {
		action: "activate",
		targets: [{ name: challenge.name, count: 1, entityKey: "8:3" }],
	};
	const destruction: MapRequirement = {
		action: "destroy",
		targets: [{ name: "Tree Trunk", count: 3 }],
	};
	const chest = {
		key: "8:1",
		mapId: 8,
		kind: "chest",
		requirements: [
			{ action: "sequence", requirements: [activation, destruction] },
			other,
			{ ...activation, action: "complete" },
		],
	} as MapReward;
	expect(obtainedThrough(chest, [challenge])).toEqual([
		{ kind: "challenge", reward: challenge },
		{ kind: "requirement", requirement: destruction, step: 0 },
		{ kind: "requirement", requirement: other, step: 1 },
	]);
	expect(chest.requirements).toHaveLength(3);
});

test("challenge deduplication preserves alternative routes, counts and targets without native identity", () => {
	const challenge = {
		key: "8:2",
		mapId: 8,
		kind: "exploration",
		owner: null,
		name: "Challenge",
	} as MapReward;
	const activation: MapRequirement = {
		action: "activate",
		targets: [{ name: challenge.name, count: 1, entityKey: challenge.key }],
	};
	const destruction: MapRequirement = {
		action: "destroy",
		targets: [{ name: "Tree Trunk", count: 3 }],
	};
	const requirements: MapRequirement[] = [
		{ action: "any", requirements: [activation, destruction] },
		{ action: "atLeast", requirements: [activation, destruction], count: 1 },
		{
			action: "activate",
			targets: [{ name: challenge.name, count: 2, entityKey: challenge.key }],
		},
		{ action: "activate", targets: [{ name: challenge.name, count: 1 }] },
	];
	const chest = {
		key: "8:1",
		mapId: 8,
		kind: "chest",
		requirements,
	} as MapReward;
	expect(obtainedThrough(chest, [challenge]).slice(1)).toEqual(
		requirements.map((requirement, step) => ({
			kind: "requirement",
			requirement,
			step,
		})),
	);
});

test("requirements are retained when their linked challenge is hidden by a quest", () => {
	const challenge = {
		key: "8:2",
		mapId: 8,
		kind: "exploration",
		owner: 10,
		name: "Challenge",
	} as MapReward;
	const requirement: MapRequirement = {
		action: "activate",
		targets: [{ name: challenge.name, count: 1, entityKey: challenge.key }],
	};
	const quest = { id: 1, name: "Quest", playIds: [10] };
	const chest = {
		key: "8:1",
		mapId: 8,
		kind: "chest",
		questLinks: [quest],
		requirements: [requirement],
	} as MapReward;
	expect(obtainedThrough(chest, [challenge])).toEqual([
		{ kind: "quest", quest },
		{ kind: "requirement", requirement, step: 0 },
	]);
});

test("generic sources remain when no named challenge exists, and titled sources stay distinct", () => {
	const chest = { key: "8:1", mapId: 8, kind: "chest" } as MapReward;
	const generic = {
		key: "8:2",
		mapId: 8,
		kind: "exploration",
		name: "Challenge Project",
		owner: null,
	} as MapReward;
	const named = { ...generic, key: "8:3", name: "Race Challenge" };
	const titled = { ...generic, key: "8:4", title: "A named objective" };
	expect(obtainedThrough(chest, [generic])).toEqual([
		{ kind: "challenge", reward: generic },
	]);
	expect(obtainedThrough(chest, [generic, { ...named, mapId: 906 }])).toEqual([
		{ kind: "challenge", reward: generic },
	]);
	expect(obtainedThrough(chest, [generic, named, titled])).toEqual([
		{ kind: "challenge", reward: named },
		{ kind: "challenge", reward: titled },
	]);
});

test("compiled chest quests have published native icons for their quest types", async () => {
	const catalog: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const quests = catalog.rewards.flatMap((reward) => reward.questLinks ?? []);
	for (const [type, icon] of [
		[1, "SP_IconMap_Task_01_UI"],
		[2, "SP_IconMap_Task_02_UI"],
		[3, "SP_IconMap_Task_03_UI"],
		[9, "SP_IconMap_Task_10_UI"],
	] as const) {
		const entries = quests.filter((quest) => quest.type === type);
		expect(entries.length).toBeGreaterThan(0);
		expect(
			entries.every((quest) => quest.icon === `/map/icons/${icon}.webp`),
		).toBe(true);
	}
	for (const icon of new Set(quests.map((quest) => quest.icon))) {
		if (!icon) throw new Error("Quest missing type icon");
		expect(
			await Bun.file(
				new URL(`../../../public${icon}`, import.meta.url),
			).exists(),
		).toBe(true);
	}
});
