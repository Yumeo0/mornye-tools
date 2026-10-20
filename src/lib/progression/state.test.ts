import { describe, expect, test } from "bun:test";
import {
	achievementStatus,
	isAchievementComplete,
	progressionFor,
	questStatus,
	sideQuestMarkers,
} from "./state";
import type { QuestSnapshot, SideQuest } from "./types";

const snapshot = (): QuestSnapshot => ({
	listSyncedAt: null,
	completedSyncedAt: null,
	states: {},
	completedIds: [],
	availableIds: [],
	activeNodes: {},
});
const start = { mapId: 8, x: 10, y: 20, z: 0, area: "Jinzhou" };
const quest: SideQuest = {
	id: 1,
	name: "Side quest",
	description: "",
	start,
	objectives: [
		{ id: 4, text: "Talk to the NPC", points: [{ ...start, x: 100 }] },
	],
	prerequisites: [],
	hiddenAccept: false,
};

describe("synced progression", () => {
	test("a missing quest stays unknown until both login lists arrive", () => {
		const data = snapshot();
		expect(questStatus(1, undefined)).toBe("unknown");
		data.listSyncedAt = 1;
		expect(questStatus(1, data)).toBe("unknown");
		data.completedSyncedAt = 2;
		expect(questStatus(1, data)).toBe("locked");
		data.completedIds = [1];
		expect(questStatus(1, data)).toBe("completed");
	});
	test("a fresh active state takes precedence over historical completion", () => {
		const data = snapshot();
		data.completedIds = [1];
		data.states[1] = 2;
		expect(questStatus(1, data)).toBe("active");
	});
	test("active targets replace acceptance points without guessing an unstarted quest's first node", () => {
		const data = snapshot();
		expect(sideQuestMarkers([quest], data)[0].point.x).toBe(10);
		data.states[1] = 2;
		data.activeNodes[1] = [4];
		expect(sideQuestMarkers([quest], data)[0].point.x).toBe(100);
		expect(sideQuestMarkers([{ ...quest, start: null }], snapshot())).toEqual(
			[],
		);
	});
	test("progress stays visible when the optional player block is missing", () => {
		const progression = {
			playerId: 42,
			quests: snapshot(),
			achievements: {
				syncedAt: 1,
				updatedAt: 1,
				entries: {},
				finishedCount: 0,
				starCount: 0,
			},
		};
		expect(progressionFor({ progression })?.playerId).toBe(42);
		expect(progressionFor({ player: null, progression })?.playerId).toBe(42);
		expect(
			progressionFor({ player: { playerId: 42 }, progression })?.playerId,
		).toBe(42);
		expect(
			progressionFor({ player: { playerId: 7 }, progression }),
		).toBeUndefined();
		expect(progressionFor({})).toBeUndefined();
	});
	test("progress counters alone never assert completion or reward collection", () => {
		const entry = { finishedAt: 0, claimed: false, current: 10, target: 10 };
		expect(achievementStatus(undefined)).toBe("unknown");
		expect(isAchievementComplete(entry)).toBe(false);
		expect(achievementStatus({ ...entry, finishedAt: 123 })).toBe("unclaimed");
		expect(achievementStatus({ ...entry, claimed: true })).toBe("claimed");
	});
});
