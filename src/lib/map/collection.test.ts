import { describe, expect, test } from "bun:test";
import { collectionState, parseManualMarks } from "./collection";
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
