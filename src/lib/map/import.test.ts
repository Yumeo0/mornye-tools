import { expect, test } from "bun:test";
import { collectionState } from "./collection";
import { mergeImportedMarks } from "./ghzs";
import { pendingImportedRewards } from "./import";
import { EMPTY_EXPLORATION, type MapCatalog, type MapReward } from "./types";

const chest: MapReward = {
	key: "8:1",
	entityId: 1,
	mapId: 8,
	kind: "chest",
	name: "Supply chest",
	x: 0,
	y: 0,
	z: 0,
	blueprint: "test",
	area: "test",
	icon: "test",
	owner: null,
	refresh: "Unknown",
	hidden: false,
	underground: null,
};
const sibling = { ...chest, key: "8:2", entityId: 2 };
const challenge: MapReward = {
	...chest,
	key: "8:3",
	entityId: 3,
	kind: "exploration",
	name: "Race Challenge",
	chestKeys: [chest.key, sibling.key],
};
const otherChallenge = { ...challenge, key: "8:4", entityId: 4 };
const catalog = [chest, sibling, challenge, otherChallenge];

test("a chest import includes its direct challenges without collecting sibling rewards", () => {
	expect(
		pendingImportedRewards([chest], catalog, EMPTY_EXPLORATION, {}),
	).toEqual([chest, challenge, otherChallenge]);
});

test("a challenge import includes its reward chests without collecting other linked challenges", () => {
	expect(
		pendingImportedRewards([challenge], catalog, EMPTY_EXPLORATION, {}),
	).toEqual([challenge, chest, sibling]);
	const pending = pendingImportedRewards(
		[challenge, chest, challenge],
		catalog,
		EMPTY_EXPLORATION,
		{},
	);
	expect(new Set(pending.map((reward) => reward.key)).size).toBe(4);
	expect(pending).toHaveLength(4);
	expect(pendingImportedRewards([], catalog, EMPTY_EXPLORATION, {})).toEqual(
		[],
	);
});

test("already collected manual and live matches still supply links while preserving progress", () => {
	const marks = {
		[chest.key]: { collected: true, updatedAt: 42 },
		[challenge.key]: { collected: false, updatedAt: 2000 },
		unrelated: { collected: false, updatedAt: 12 },
	};
	const snapshot = {
		...EMPTY_EXPLORATION,
		rewards: {
			[otherChallenge.key]: {
				mapId: 8,
				entityId: otherChallenge.entityId,
				source: "reward-response" as const,
				observedAt: 3000,
			},
		},
	};
	const pending = pendingImportedRewards([chest], catalog, snapshot, marks);
	expect(pending).toEqual([challenge]);
	const next = mergeImportedMarks(marks, pending, snapshot, 1000);
	expect(next[chest.key]).toEqual(marks[chest.key]);
	expect(next.unrelated).toEqual(marks.unrelated);
	expect(next[challenge.key]).toEqual({ collected: true, updatedAt: 2001 });
	expect(next[otherChallenge.key]).toBeUndefined();
	expect(marks[challenge.key].collected).toBe(false);
	expect(pendingImportedRewards([chest], catalog, snapshot, next)).toEqual([]);
	expect(
		pendingImportedRewards([otherChallenge], catalog, snapshot, next),
	).toEqual([sibling]);
});

test("imports reject stale, cross-map and unsupported links and seeds", () => {
	const foreign = { ...chest, key: "9:1", mapId: 9 };
	const resources = (["collection", "combat", "teleport"] as const).map(
		(kind) => ({ ...chest, key: `8:${kind}`, kind }),
	);
	const invalidLinks = {
		...challenge,
		chestKeys: [
			chest.key,
			chest.key,
			"8:missing",
			foreign.key,
			...resources.map((reward) => reward.key),
		],
	};
	const invalidSource = {
		...resources[0],
		chestKeys: [sibling.key],
	};
	const placements = [chest, sibling, invalidLinks, foreign, ...resources];
	expect(
		pendingImportedRewards([invalidLinks], placements, EMPTY_EXPLORATION, {}),
	).toEqual([invalidLinks, chest]);
	expect(
		pendingImportedRewards(
			[
				{ ...challenge, key: "8:missing" },
				{ ...chest, mapId: 9 },
				invalidSource,
				...resources,
			],
			placements,
			EMPTY_EXPLORATION,
			{},
		),
	).toEqual([]);
});

test("quest membership and proximity do not collect unrelated locations", () => {
	const questLinks = [{ id: 1, name: "Quest", playIds: [10] }];
	const first = { ...chest, questLinks, owner: 10 };
	const nearby = { ...sibling, questLinks, owner: 10 };
	expect(
		pendingImportedRewards([first], [first, nearby], EMPTY_EXPLORATION, {}),
	).toEqual([first]);
});

test("importing the race reward chest also collects the native Race Challenge", async () => {
	const native: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const chest = native.rewards.find((reward) => reward.key === "8:146000929");
	const race = native.rewards.find((reward) => reward.key === "8:146000921");
	if (!chest || !race) throw new Error("Missing race locations");
	const pending = pendingImportedRewards(
		[chest],
		native.rewards,
		EMPTY_EXPLORATION,
		{},
	);
	expect(pending.map((reward) => reward.key)).toContain(race.key);
	const marks = mergeImportedMarks({}, pending, EMPTY_EXPLORATION, 1000);
	expect(collectionState(race, EMPTY_EXPLORATION, marks).state).toBe(
		"collected",
	);
});
