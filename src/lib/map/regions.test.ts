import { describe, expect, test } from "bun:test";
import {
	compileMapRegions,
	type RegionArea,
} from "../../../scripts/map-regions";
import {
	containsDestination,
	destinationAt,
	flattenDestinations,
} from "./regions";

const area = (
	id: number,
	country: number,
	map: number,
	parent: number,
	level = 0,
): RegionArea => ({
	AreaId: id,
	CountryId: country,
	MapConfigId: map,
	Father: parent,
	Level: level,
	Title: `area-${id}`,
	SortIndex: id,
});
const countries = [
	{
		Id: 1,
		Title: "Huanglong",
		Icon: "/TabIcon/SP_IconHuanglong.SP_IconHuanglong",
		SortIndex: 2,
	},
	{
		Id: 3,
		Title: "Rinascita",
		Icon: "/TabIcon/SP_IconLinaxita.SP_IconLinaxita",
		SortIndex: 1,
	},
];

describe("region navigation", () => {
	test("splits the overworld by nation and keeps separate maps out of their parents' bounds", () => {
		const areas = [
			area(1, 1, 8, 0, 1),
			area(35, 1, 8, 1),
			area(3, 1, 8, 35, 2),
			area(24, 3, 8, 1),
			area(16, 3, 8, 24, 2),
			area(27, 3, 902, 24, 2),
		];
		const text = new Map(areas.map((row) => [row.Title, row.Title]));
		const regions = compileMapRegions(
			areas,
			countries,
			[
				{ mapId: 8, areaId: 3, x: -10, y: -10 },
				{ mapId: 8, areaId: 3, x: 10, y: 10 },
				{ mapId: 8, areaId: 16, x: 1000, y: 1000 },
				{ mapId: 8, areaId: 16, x: 2000, y: 2000 },
				{ mapId: 902, areaId: 27, x: -5000, y: -5000 },
			],
			text,
		);
		expect(
			regions.map((region) => region.destinations.map((item) => item.id)),
		).toEqual([["8:35"], ["8:24", "902:27"]]);
		expect(regions[0].destinations[0].children.map((item) => item.id)).toEqual([
			"8:3",
		]);
		expect(regions[1].destinations[0].children.map((item) => item.id)).toEqual([
			"8:16",
		]);
		expect(destinationAt(regions, 8, { x: 1500, y: 1500 })?.id).toBe("8:24");
		expect(destinationAt(regions, 8, { x: 0, y: 0 })?.id).toBe("8:35");
		expect(regions[1].destinations[0].bounds).toEqual({
			left: 1000,
			top: 1000,
			right: 2000,
			bottom: 2000,
		});
		expect(destinationAt(regions, 902)?.id).toBe("902:27");
		expect(destinationAt(regions, 999)).toBeNull();
	});

	test("stops at districts while including deeper areas in their bounds", () => {
		const areas = [
			area(35, 1, 8, 0),
			area(3, 1, 8, 35, 2),
			area(301, 1, 8, 3, 3),
		];
		const regions = compileMapRegions(
			areas,
			countries,
			[
				{ mapId: 8, areaId: 35, x: -100, y: -100 },
				{ mapId: 8, areaId: 35, x: 100, y: 100 },
				{ mapId: 8, areaId: 301, x: 1, y: 1 },
				{ mapId: 8, areaId: 301, x: 2, y: 2 },
			],
			new Map(areas.map((row) => [row.Title, row.Title])),
		);
		const root = regions[0].destinations[0];
		expect(root.children[0].children).toEqual([]);
		expect(root.children[0].bounds).toEqual({
			left: 1,
			top: 1,
			right: 2,
			bottom: 2,
		});
		expect(flattenDestinations([root]).map((item) => item.id)).toEqual([
			"8:35",
			"8:3",
		]);
		expect(destinationAt(regions, 8, { x: 1.5, y: 1.5 })?.id).toBe("8:3");
		expect(containsDestination(root, "8:3")).toBe(true);
		expect(containsDestination(root, "8:301")).toBe(false);
		expect(containsDestination(root, "902:27")).toBe(false);
	});

	test("includes Honami-style map roots even when their area level is 5", () => {
		const areas = [
			area(40, 1, 910, 0, 2),
			area(37, 1, 907, 40, 5),
			area(36020, 1, 907, 37, 4),
		];
		const regions = compileMapRegions(
			areas,
			countries,
			[{ mapId: 907, areaId: 36020, x: 20, y: 30 }],
			new Map(areas.map((row) => [row.Title, row.Title])),
		);
		expect(regions[0].destinations.map((item) => item.id)).toEqual(["907:37"]);
	});

	test("ignores malformed positions and terminates cyclic ancestry", () => {
		const areas = [area(10, 1, 8, 11), area(11, 1, 8, 10)];
		expect(
			compileMapRegions(
				areas,
				countries,
				[
					{ mapId: 8, areaId: 10, x: Number.NaN, y: 0 },
					{ mapId: 8, areaId: 10, x: 0, y: 0 },
				],
				new Map(areas.map((row) => [row.Title, row.Title])),
			),
		).toEqual([]);
	});
});
