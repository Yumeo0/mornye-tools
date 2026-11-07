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
		[1, "SP_IconMap_Task_01_UI"],
		[2, "SP_IconMap_Task_02_UI"],
		[3, "SP_IconMap_Task_03_UI"],
		[9, "SP_IconMap_Task_10_UI"],
		[10, "SP_IconMap_Task_14_UI"],
		[16, "SP_IconMap_Task_17_1_UI"],
		[17, "SP_IconMap_Task_18_UI"],
	] as const) {
		const quests = catalog.allQuests.filter((quest) => quest.type === type);
		expect(quests.length).toBeGreaterThan(0);
		expect(quests.every((quest) => quest.icon.endsWith(`/${icon}.webp`))).toBe(
			true,
		);
	}
	for (const icon of new Set(catalog.allQuests.map((quest) => quest.icon))) {
		expect(
			await Bun.file(
				new URL(`../../../public${icon}`, import.meta.url),
			).exists(),
		).toBe(true);
	}
});
