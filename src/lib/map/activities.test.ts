import { describe, expect, test } from "bun:test";
import {
	type ActivityEntity,
	type ActivityPlay,
	ADDITIONAL_MARKERS,
	additionalActivityMarkers,
} from "../../../scripts/map-activities";
import { ghzsPosition, matchGhzsExport } from "./ghzs";
import type { MapCatalog } from "./types";

const entity = (
	id: number,
	overrides: Partial<ActivityEntity> = {},
): ActivityEntity => ({
	key: `8:${id}`,
	mapId: 8,
	entityId: id,
	type: "LevelPlay",
	blueprint: "Gameplay102",
	title: "",
	rewardId: 0,
	owner: null,
	packId: 0,
	...overrides,
});
const play = (
	id: number,
	entityId: number,
	overrides: Partial<ActivityPlay> = {},
): ActivityPlay => ({
	id,
	mapId: 8,
	entityId,
	type: "Riddle",
	internalName: "",
	title: "",
	children: [],
	packId: 0,
	...overrides,
});
describe("additional map activities", () => {
	test("official map starts win over controllers, aliases deduplicate and foreign maps cannot match", () => {
		const result = additionalActivityMarkers(
			[
				entity(157900000),
				entity(157900001),
				entity(2, { mapId: 903, key: "903:2" }),
			],
			[play(157900004, 157900001, { type: "Challenge", degree: 22 })],
			[
				{
					mapId: 8,
					entityId: 157900000,
					playId: 157900004,
					title: "Dream Patrol: Twin Swords of Light",
				},
				{
					mapId: 8,
					entityId: 157900000,
					playId: 157900004,
					title: "Dream Patrol",
				},
				{ mapId: 903, entityId: 2, playId: 157900004, title: "Dream Patrol" },
			],
		);
		expect([...result.markers.keys()]).toEqual(["8:157900000"]);
		expect(result.markers.get("8:157900000")?.title).toBe(
			"Dream Patrol: Twin Swords of Light",
		);
		expect([...result.playIds]).toEqual([157900004]);
	});
	test("musicfly activities exclude duplicate sound discs, decorative palettes and packed variants", () => {
		const result = additionalActivityMarkers(
			[
				entity(135902327),
				entity(135900982, {
					type: "Disc",
					blueprint: "Gameplay_SoundDesign2",
					title: "Musicfly",
					owner: 135900019,
				}),
				entity(2, { title: "Overflowing Palette", type: "SimpleInteract" }),
				entity(3),
				entity(4, { packId: 50 }),
			],
			[
				play(135900019, 135902327, { type: "MonsterTreasure", degree: 25 }),
				play(2, 3, { degree: 20, packId: 50 }),
				play(3, 4, { degree: 20 }),
			],
			[],
		);
		expect([...result.markers.keys()]).toEqual(["8:135902327"]);
		expect(result.markers.get("8:135902327")?.name).toBe("Musicfly");
	});
	test("graph categories cover races, palettes, patrols, brothers and both Cindertide phases", () => {
		const ds = [20, 22, 23, 25, 36, 37, 39, 40, 47, 48];
		const result = additionalActivityMarkers(
			ds.map((d) => entity(d)),
			ds.map((d) => play(d, d, { degree: d })),
			[],
		);
		expect([...result.markers.values()].map((x) => x.name)).toEqual([
			"Overflowing Palette",
			"Dream Patrol",
			"Three Brothers",
			"Musicfly",
			"Ace Wings",
			"Boat Racing",
			"Flash Dodge",
			"Dream Patrol",
			"Dream of Cindertides",
			"Dream of Cindertides",
		]);
	});
	test("SpecialElite contributes one encounter rather than every monster or ordinary elite spawn", () => {
		const result = additionalActivityMarkers(
			[
				entity(142900000),
				entity(1, { type: "Monster" }),
				entity(2, { type: "Monster" }),
			],
			[
				play(142900004, 142900000, {
					type: "SpecialElite",
					children: ["e_8_1", "e_8_2"],
				}),
			],
			[],
		);
		expect([...result.markers.keys()]).toEqual(["8:142900000"]);
		expect(result.markers.get("8:142900000")?.name).toBe("Elite Monster");
	});
	test("crab altars reuse the reward chest's native key", () => {
		const result = additionalActivityMarkers(
			[
				entity(170700511),
				entity(170700513, { type: "TreasureBox", owner: 170700006 }),
			],
			[
				play(170700006, 170700511, {
					internalName: "螃蟹祭坛1-岛1",
					children: ["e_8_170700513"],
				}),
			],
			[],
		);
		expect([...result.markers.keys()]).toEqual(["8:170700513"]);
		expect(result.markers.get("8:170700513")?.name).toBe("Crab Chest");
	});
	test("mimics exclude quest actors and lore excludes generic investigation loot", () => {
		const result = additionalActivityMarkers(
			[
				entity(1, { type: "Monster", blueprint: "branch2.0_Monster187" }),
				entity(2, {
					type: "Monster",
					blueprint: "branch2.0_Monster187",
					owner: 100,
				}),
				entity(3, {
					type: "Collect",
					blueprint: "Treasure035",
					rewardId: 2210,
				}),
				entity(142800006, {
					type: "Collect",
					blueprint: "Treasure035",
					rewardId: 45042,
				}),
				entity(111901591, {
					type: "Collect",
					blueprint: "Gameplay603",
					rewardId: 45075,
				}),
			],
			[play(100, 100, { type: "Quest" })],
			[],
		);
		expect([...result.markers.keys()]).toEqual([
			"8:1",
			"8:142800006",
			"8:111901591",
		]);
		expect([...result.markers.values()].map((x) => x.name)).toEqual([
			"Mimic Chest",
			"Book fragments/records",
			"Book fragments/records",
		]);
	});
	test("standalone Moments Scattered to the Wind map aliases deduplicate", () => {
		const m = {
			mapId: 8,
			entityId: 183750074,
			playId: 0,
			title: "Moments Scattered to the Wind",
		};
		expect(
			additionalActivityMarkers([entity(183750074)], [], [m, m]).markers.size,
		).toBe(1);
	});
	test("published catalog covers every family with unique native keys and claim rules", async () => {
		const catalog: MapCatalog = await Bun.file(
			new URL("../../../public/map/catalog.json", import.meta.url),
		).json();
		const rules = await Bun.file(
			new URL("../../configs/map_rules.json", import.meta.url),
		).json();
		const keys = new Set(rules.rewardKeys);
		expect(new Set(catalog.rewards.map((r) => r.key)).size).toBe(
			catalog.rewards.length,
		);
		for (const { name } of Object.values(ADDITIONAL_MARKERS)) {
			const rows = catalog.rewards.filter((r) => r.name === name);
			expect(rows.length, name).toBeGreaterThan(0);
			expect(
				rows.every((r) => r.kind === "exploration" && keys.has(r.key)),
				name,
			).toBe(true);
			for (const icon of new Set(rows.map((r) => r.icon))) {
				expect(
					await Bun.file(
						new URL(`../../../public${icon}`, import.meta.url),
					).exists(),
					icon,
				).toBe(true);
			}
		}
	});
	test("GHZS imports recognize every added category", async () => {
		const catalog: MapCatalog = await Bun.file(
			new URL("../../../public/map/catalog.json", import.meta.url),
		).json();
		const coordinates: [number, number] = [
			2.180259769681356, -9.464721679687502,
		];
		const pos = ghzsPosition("", coordinates);
		if (!pos) throw new Error("Missing Huanglong alignment");
		for (const { name } of Object.values(ADDITIONAL_MARKERS)) {
			const original = catalog.rewards.find((r) => r.name === name);
			if (!original) throw new Error(`Missing ${name}`);
			const reward = {
				...original,
				...pos,
			};
			const [row] = matchGhzsExport(
				{
					format: "mornye-ghzs",
					version: 1,
					markedIds: ["pin"],
					points: [{ id: "pin", map: "", category: name, coordinates }],
				},
				{ ...catalog, rewards: [reward] },
			);
			expect(row.reward?.key, name).toBe(reward.key);
		}
	});
});
