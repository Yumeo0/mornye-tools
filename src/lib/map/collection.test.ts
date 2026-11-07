import { describe, expect, test } from "bun:test";
import {
	collectionState,
	itemLabel,
	itemType,
	markRewards,
	parseManualMarks,
} from "./collection";
import { matchesMapVisibility, summarizeItems } from "./filters";
import type { ExplorationSnapshot, MapReward } from "./types";

const reward = {
	key: "906:938700793",
	mapId: 906,
	entityId: 938700793,
} as MapReward;
const snapshot = (): ExplorationSnapshot => ({
	playerId: 1,
	scene: null,
	rewards: {},
});

test("Tidal Heritage labels recognize the yellow asset as gold", () => {
	const heritage: MapReward = {
		...reward,
		kind: "heritage",
		name: "Tidal Heritage",
		icon: "/map/icons/gg/tidal-yellow.png",
	};
	for (const [file, color] of [
		["tidal-yellow.png", "Gold"],
		["tidal-gold.png", "Gold"],
		["tidal-purple.png", "Purple"],
		["tidal-blue.png", "Blue"],
	]) {
		expect(itemLabel({ ...heritage, icon: `/map/icons/gg/${file}` })).toBe(
			`Tidal Heritage · ${color}`,
		);
	}
});

describe("reward collection state", () => {
	test("without evidence a reward is not collected", () => {
		expect(collectionState(reward, snapshot(), {})).toEqual({
			state: "remaining",
			at: null,
		});
	});
	test("successful reward responses and live claim updates are collected", () => {
		const live = snapshot();
		live.rewards[reward.key] = {
			mapId: 906,
			entityId: 938700793,
			source: "reward-response",
			observedAt: 10,
		};
		expect(collectionState(reward, live, {})).toEqual({
			state: "collected",
			at: 10,
		});
		live.rewards[reward.key].source = "tree-update";
		expect(collectionState(reward, live, {})).toEqual({
			state: "collected",
			at: 10,
		});
	});
	test("spawn and snapshot evidence never claim a collection", () => {
		const weak = snapshot();
		weak.rewards[reward.key] = {
			mapId: 906,
			entityId: 938700793,
			source: "observed",
			observedAt: 10,
		};
		expect(collectionState(reward, weak, {})).toEqual({
			state: "remaining",
			at: null,
		});
		weak.rewards[reward.key].source = "tree-snapshot";
		expect(collectionState(reward, weak, {}).state).toBe("remaining");
	});
	test("gathering resources are never collected, live or by hand", () => {
		const resource = { ...reward, kind: "collection" } as MapReward;
		const live = snapshot();
		live.rewards[reward.key] = {
			mapId: 906,
			entityId: 938700793,
			source: "reward-response",
			observedAt: 10,
		};
		expect(collectionState(resource, live, {})).toEqual({
			state: "remaining",
			at: null,
		});
		expect(
			collectionState(resource, snapshot(), {
				[reward.key]: { collected: true, updatedAt: 5 },
			}),
		).toEqual({ state: "remaining", at: null });
	});
	test("the later toggle wins in either direction, live or by hand", () => {
		const live = snapshot();
		live.rewards[reward.key] = {
			mapId: 906,
			entityId: 938700793,
			source: "reward-response",
			observedAt: 10,
		};
		// A hand-set "not collected" after the live detection un-collects it.
		expect(
			collectionState(reward, live, {
				[reward.key]: { collected: false, updatedAt: 11 },
			}),
		).toEqual({ state: "remaining", at: 11 });
		// An older hand-set value defers to the newer live detection.
		expect(
			collectionState(reward, live, {
				[reward.key]: { collected: false, updatedAt: 9 },
			}),
		).toEqual({ state: "collected", at: 10 });
		// And a live event after a manual toggle re-collects it.
		expect(
			collectionState(reward, live, {
				[reward.key]: { collected: false, updatedAt: 10 },
			}),
		).toEqual({ state: "collected", at: 10 });
		expect(
			collectionState(reward, snapshot(), {
				[reward.key]: { collected: true, updatedAt: 5 },
			}),
		).toEqual({ state: "collected", at: 5 });
	});
});

describe("manual mark persistence", () => {
	test("only reward keys with a complete mark survive parsing", () => {
		expect(
			parseManualMarks({
				"906:938700793": { collected: true, updatedAt: 12 },
				nope: { collected: true, updatedAt: 12 },
				"906:1": { collected: "yes", updatedAt: 12 },
				"906:2": { collected: false, updatedAt: Number.NaN },
			}),
		).toEqual({ "906:938700793": { collected: true, updatedAt: 12 } });
		expect(parseManualMarks(null)).toEqual({});
		expect(parseManualMarks([1])).toEqual({});
	});
});

test("bulk marks collect and uncollect mixed rewards without changing other marks or resources", () => {
	const live = snapshot();
	live.rewards[reward.key] = {
		mapId: reward.mapId,
		entityId: reward.entityId,
		source: "reward-response",
		observedAt: 500,
	};
	const other = { ...reward, key: "906:2" };
	const resource = { ...reward, key: "906:3", kind: "collection" } as MapReward;
	const existing = { "906:4": { collected: true, updatedAt: 1 } };
	const rewards = [reward, other, resource];
	const collected = markRewards(existing, rewards, true, live, 100);
	expect(collectionState(reward, live, collected).state).toBe("collected");
	expect(collectionState(other, live, collected).state).toBe("collected");
	expect(collected[resource.key]).toBeUndefined();
	expect(collected["906:4"]).toEqual(existing["906:4"]);
	expect(existing).toEqual({ "906:4": { collected: true, updatedAt: 1 } });
	const uncollected = markRewards(collected, rewards, false, live, 101);
	expect(collectionState(reward, live, uncollected).state).toBe("remaining");
	expect(collectionState(other, live, uncollected).state).toBe("remaining");
	expect(live.rewards[reward.key].observedAt).toBe(500);
});

test("flight variants share one filter, keeping individual detail names and other Echo challenges separate", () => {
	const flights = [
		{
			...reward,
			kind: "exploration",
			name: "Echo Challenge: Flight II",
			icon: "/map/icons/SP_IconMap_Play_23_UI.webp",
		},
		{
			...reward,
			kind: "exploration",
			name: "Echo Challenge: Flight VII",
			icon: "/map/icons/SP_IconMap_Activity_13_UI.webp",
		},
	] as MapReward[];
	const gulpuff = { ...flights[0], name: "Echo Challenge: Gulpuff" };
	expect(itemType(flights[0])).toBe(itemType(flights[1]));
	expect(itemType(gulpuff)).not.toBe(itemType(flights[0]));
	const rows = summarizeItems([
		{ reward: flights[0], state: "collected" },
		{ reward: flights[1], state: "remaining" },
		{ reward: gulpuff, state: "remaining" },
	]);
	expect(rows).toHaveLength(2);
	expect(
		rows.find((row) => row.label === "Echo Challenge: Flight"),
	).toMatchObject({ total: 2, collected: 1, remaining: 1 });
	expect(itemLabel(flights[0])).toBe("Echo Challenge: Flight II");
});

test("Tactical Holograms share one filter while detail names stay specific", () => {
	const holograms = [
		{
			...reward,
			kind: "exploration",
			name: "Tactical Hologram: Crownless",
			icon: "boss1",
		},
		{
			...reward,
			kind: "exploration",
			name: "Tactical Hologram: Inferno Rider",
			icon: "boss2",
		},
		{
			...reward,
			kind: "exploration",
			name: "Overlord Challenge",
			icon: "boss3",
		},
	] as MapReward[];
	const rows = summarizeItems(
		holograms.map((reward) => ({ reward, state: "remaining" })),
	);
	expect(rows).toHaveLength(1);
	expect(rows[0]).toMatchObject({ label: "Tactical Holograms", total: 3 });
	expect(itemLabel(holograms[0])).toBe("Tactical Hologram: Crownless");
});

test("repeatable combat locations ignore progress and never enter collection totals or bulk saves", () => {
	const nest = {
		...reward,
		kind: "combat",
		name: "Nightmare Nest",
	} as MapReward;
	const live = snapshot();
	live.rewards[nest.key] = {
		mapId: nest.mapId,
		entityId: nest.entityId,
		source: "reward-response",
		observedAt: 10,
	};
	const marks = { [nest.key]: { collected: true, updatedAt: 20 } };
	expect(collectionState(nest, live, marks)).toEqual({
		state: "remaining",
		at: null,
	});
	expect(markRewards({}, [nest], true, live)).toEqual({});
	const marker = { reward: nest, state: "remaining" as const };
	expect(summarizeItems([marker])[0]).toMatchObject({
		kind: "combat",
		total: 1,
		collected: 0,
		remaining: 0,
	});
	for (const visibility of ["all", "remaining", "collected"] as const)
		expect(matchesMapVisibility(marker, visibility)).toBe(true);
	expect(
		matchesMapVisibility({ reward, state: "remaining" }, "collected"),
	).toBe(false);
});
