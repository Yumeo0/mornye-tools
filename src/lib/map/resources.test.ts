import { expect, test } from "bun:test";
import { resourceUsageLookup } from "../../../scripts/map-resources";
import { itemType } from "./collection";
import { groupItemRows, isItemVisible, summarizeItems } from "./filters";
import type { MapCatalog, MapReward, ResourceUsage } from "./types";

test("native item tags distinguish upgrades from cooking, medicine and crafting ingredients", () => {
	const tags = [6, 7, 8, 11, 12, 13, 14, 22, 42, 45, 26, 44, 43, 46];
	const usage = resourceUsageLookup(
		tags.map((tag) => ({ Id: tag, ShowTypes: [tag] })),
		[
			...tags.map((tag) => ({ Id: tag + 100, DropPreview: [{ Key: tag }] })),
			{ Id: 200, DropPreview: [{ Key: 26 }, { Key: 45 }] },
			{ Id: 201, DropPreview: [{ Key: 999 }] },
			{ Id: 202, DropPreview: [] },
		],
	);
	for (const tag of tags.slice(0, 10)) expect(usage(tag + 100)).toBe("upgrade");
	for (const tag of tags.slice(10)) expect(usage(tag + 100)).toBe("other");
	expect(usage(200)).toBe("upgrade");
	for (const id of [201, 202, 999]) expect(usage(id)).toBe("other");
});

test("resource sections support separate toggles and searches while preserving saved item keys", () => {
	const upgrade = {
		kind: "collection",
		name: "Pecok Flower",
		icon: "/flower.webp",
		resourceUsage: "upgrade",
	} as MapReward;
	const ingredient = {
		...upgrade,
		name: "Pearl Leaf",
		resourceUsage: "other",
	} as MapReward;
	const chest = {
		...upgrade,
		kind: "chest",
		name: "Supply Chest",
	} as MapReward;
	const rows = summarizeItems(
		[chest, ingredient, upgrade, upgrade].map((reward) => ({
			reward,
			state: "remaining",
		})),
	);
	const sections = groupItemRows(rows);
	expect(sections.map((section) => section.label)).toEqual([
		"Supply chests",
		"Upgrade materials",
		"Other resources",
	]);
	expect(sections[1].rows).toMatchObject([
		{ type: itemType(upgrade), total: 2, collected: 0, remaining: 0 },
	]);
	expect(sections[2].rows).toMatchObject([
		{ type: itemType(ingredient), total: 1 },
	]);
	const overrides = Object.fromEntries(
		sections[1].rows.map((row) => [row.type, true]),
	);
	expect(isItemVisible(overrides, sections[1].rows[0])).toBe(true);
	expect(isItemVisible(overrides, sections[2].rows[0])).toBe(false);
	expect(groupItemRows(rows, "upgrade").map((section) => section.id)).toEqual([
		"collection:upgrade",
	]);
	expect(groupItemRows(rows, "Resources")).toHaveLength(2);
	expect(groupItemRows(rows, " PEARL ")[0].rows).toHaveLength(1);
	expect(groupItemRows(rows, "missing")).toEqual([]);
});

test("corrected native resource artwork retains unambiguous saved visibility", () => {
	const [row] = summarizeItems([
		{
			reward: {
				kind: "collection",
				name: "Creeping Torchpine",
				icon: "/native-cone.png",
			} as MapReward,
			state: "remaining",
		},
	]);
	const oldKey = "collection:Creeping Torchpine:/old-tree.png";
	expect(isItemVisible({ [oldKey]: true }, row)).toBe(true);
	expect(isItemVisible({ [oldKey]: false }, row)).toBe(false);
	expect(isItemVisible({ [oldKey]: true, [row.type]: false }, row)).toBe(false);
	expect(
		isItemVisible(
			{ [oldKey]: true, "collection:Creeping Torchpine:/other.png": false },
			row,
		),
	).toBe(false);
	expect(
		isItemVisible({ "collection:Other Plant:/old-tree.png": true }, row),
	).toBe(false);
});

test("published resource placements have consistent usage for every filter type", async () => {
	const catalog: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const resources = catalog.rewards.filter(
		(reward) => reward.kind === "collection",
	);
	expect(
		resources.every((resource) =>
			["upgrade", "other"].includes(resource.resourceUsage ?? ""),
		),
	).toBe(true);
	const usageByType = new Map<string, Set<ResourceUsage | undefined>>();
	for (const resource of resources) {
		const type = itemType(resource);
		const usages = usageByType.get(type) ?? new Set();
		usages.add(resource.resourceUsage);
		usageByType.set(type, usages);
	}
	for (const usages of usageByType.values()) expect(usages.size).toBe(1);
	for (const [name, usage] of [
		["Pecok Flower", "upgrade"],
		["Pavo Plum", "upgrade"],
		["Rimewisp", "upgrade"],
		["Bloom of Hearkening", "upgrade"],
		["Pearl Leaf", "other"],
		["Bird Egg", "other"],
		["Creeping Torchpine", "other"],
	]) {
		const matches = resources.filter((reward) => reward.name === name);
		expect(matches.length).toBeGreaterThan(0);
		expect(matches.every((reward) => reward.resourceUsage === usage)).toBe(
			true,
		);
	}
});
