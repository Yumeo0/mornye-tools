import { expect, test } from "bun:test";
import data from "../../configs/progression.json";
import type { ProgressionCatalog } from "./types";

const catalog: ProgressionCatalog = data;

test("quest catalog includes the player-facing quest types beyond the map's side quests", () => {
	const types = new Set(catalog.allQuests.map((quest) => quest.type));
	for (const type of [1, 2, 3, 4, 7, 9, 10, 15, 16, 17])
		expect(types.has(type)).toBe(true);
	expect(types.has(100)).toBe(false);
	expect(new Set(catalog.allQuests.map((quest) => quest.id)).size).toBe(
		catalog.allQuests.length,
	);
	expect(catalog.allQuests.every((quest) => quest.name.trim().length > 0)).toBe(
		true,
	);
	const sideQuests = catalog.allQuests.filter((quest) => quest.type === 2);
	expect(sideQuests.map((quest) => quest.id).sort((a, b) => a - b)).toEqual(
		catalog.quests.map((quest) => quest.id).sort((a, b) => a - b),
	);
});

test("quest catalog uses native type icons and publishes every referenced image", async () => {
	for (const [type, icon] of [
		[1, "task-01"],
		[2, "task-02"],
		[3, "task-03"],
		[9, "task-10"],
		[10, "task-14"],
		[16, "task-17-1"],
		[17, "task-18"],
	] as const) {
		const quests = catalog.allQuests.filter((quest) => quest.type === type);
		expect(quests.length).toBeGreaterThan(0);
		expect(
			quests.every((quest) => quest.icon === `/icons/map/${icon}.webp`),
		).toBe(true);
	}
	for (const icon of new Set(catalog.allQuests.map((quest) => quest.icon))) {
		expect(
			await Bun.file(
				new URL(`../../../public${icon}`, import.meta.url),
			).exists(),
		).toBe(true);
	}
});
