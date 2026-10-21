import { describe, expect, test } from "bun:test";
import { collectionState } from "./collection";
import {
	type GhzsExport,
	ghzsPosition,
	matchGhzsExport,
	mergeImportedMarks,
	parseGhzsExport,
} from "./ghzs";
import { EMPTY_EXPLORATION, type MapCatalog, type MapReward } from "./types";

// Public GHZS casket pin and its independently verified game placement in Jinzhou.
const point: GhzsExport["points"][number] = {
	id: "665a17dce397420001d3fe8b",
	map: "",
	category: "Sonance Casket",
	coordinates: [2.180259769681356, -9.464721679687502],
};
const reward: MapReward = {
	key: "8:113000898",
	mapId: 8,
	entityId: 113000898,
	x: -82511.37,
	y: 98770.38,
	z: 4357.3,
	kind: "casket",
	name: "Sonance Casket",
	blueprint: "Gameplay021",
	area: "Loong's Gaze Suburbs",
	icon: "/map/icons/gg/T_IconMst_006_UI.png",
	owner: null,
	refresh: "Unknown",
	hidden: false,
	underground: null,
};
const data = (
	points = [point],
	ids = points.map((point) => point.id),
): GhzsExport => ({
	format: "mornye-ghzs",
	version: 1,
	markedIds: ids,
	points,
});
const catalog = (rewards = [reward]): MapCatalog => ({
	version: "test",
	tileSize: 85000,
	maps: [],
	regions: [],
	icons: [],
	missingTiles: [],
	rewards,
});
/** Inverse of the Huanglong alignment, to place a mark near a game position. */
const pinAt = (x: number, y: number): [number, number] => {
	const lng = (x - 42558.21765097) / 13236.63390182;
	const mercatorY = (y - 127212.32632484) / 13217.36803746;
	const lat =
		(Math.atan(Math.exp((-mercatorY * Math.PI) / 180)) * 360) / Math.PI - 90;
	return [lat, lng];
};

describe("GHZS progress import", () => {
	test("validates format, coordinates, and size and discards unrelated fields", () => {
		expect(
			parseGhzsExport(
				JSON.stringify({ ...data(), token: "must-not-be-retained" }),
			),
		).toEqual(data());
		for (const value of [
			{ ...data(), version: 2 },
			{ ...data(), points: [{ ...point, coordinates: [91, 0] }] },
			{ ...data(), markedIds: [7] },
		])
			expect(() => parseGhzsExport(JSON.stringify(value))).toThrow(
				"invalid GHZS export",
			);
		expect(() => parseGhzsExport("not json")).toThrow("not valid JSON");
		expect(() => parseGhzsExport(" ".repeat(20 * 1024 * 1024 + 1))).toThrow(
			"smaller than 20 MB",
		);
	});

	test("matches a real GHZS pin despite hand-placed coordinate offsets", () => {
		const [row] = matchGhzsExport(data(), catalog());
		expect(row.reward?.key).toBe("8:113000898");
		expect(row.distance).toBeLessThan(450);
		expect(row.reason).toBeUndefined();
	});

	test("does not import unmarked pins or count repeated IDs twice", () => {
		expect(matchGhzsExport(data([point], []), catalog())).toEqual([]);
		const rows = matchGhzsExport(
			data([point, point], [point.id, point.id]),
			catalog(),
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].reward?.key).toBe(reward.key);
	});

	test("reports unsupported maps, categories, missing details and distant pins", () => {
		expect(ghzsPosition("unknown-map", [0, 0])).toBeNull();
		expect(
			matchGhzsExport(
				data([{ ...point, map: "6982e8b4827de100017c256d" }]),
				catalog(),
			)[0].reason,
		).toBe("Unsupported map");
		expect(
			matchGhzsExport(
				data([{ ...point, category: "Echo Monster" }]),
				catalog(),
			)[0].reason,
		).toBe("Unsupported category");
		expect(matchGhzsExport(data([], ["missing"]), catalog())[0].reason).toBe(
			"Missing marker details",
		);
		expect(
			matchGhzsExport(data(), catalog([{ ...reward, x: reward.x + 10000 }]))[0]
				.reason,
		).toBe("No nearby marker");
	});

	test("cannot match a nearby pin on a different physical map or of the wrong type", () => {
		expect(
			matchGhzsExport(data(), catalog([{ ...reward, mapId: 912 }]))[0].reward,
		).toBeUndefined();
		expect(
			matchGhzsExport(
				data(),
				catalog([{ ...reward, kind: "chest", name: "Supply Chest" }]),
			)[0].reward,
		).toBeUndefined();
	});

	test("rejects adjacent alternatives and stacked floors instead of guessing", () => {
		for (const other of [
			{ ...reward, key: "8:2", z: -5000, underground: { layer: 1, floor: -1 } },
			{ ...reward, key: "8:2", x: reward.x + 400 },
		]) {
			const [row] = matchGhzsExport(data(), catalog([reward, other]));
			expect(row.reward).toBeUndefined();
			expect(row.reason).toBe("Ambiguous location");
		}
	});

	test("source IDs sharing a target cannot both claim that placement", () => {
		const rows = matchGhzsExport(
			data([point, { ...point, id: "other-pin" }]),
			catalog(),
		);
		expect(
			rows.every((row) => row.reason === "Ambiguous location" && !row.reward),
		).toBe(true);
	});

	test("a source ID with conflicting locations is not silently assigned to either", () => {
		const second = {
			...point,
			coordinates: [16.688816956180833, 4.004516601562501] as [number, number],
		};
		const other = { ...reward, key: "8:136800153", x: 95550, y: -96596 };
		expect(
			matchGhzsExport(data([point, second]), catalog([reward, other]))[0]
				.reason,
		).toBe("Ambiguous location");
	});

	test("assigns neighbouring marks to separate placements instead of dropping both", () => {
		const left = { ...reward, key: "8:left" };
		const right = { ...reward, key: "8:right", x: reward.x + 700 };
		const rows = matchGhzsExport(
			data([
				{ ...point, coordinates: pinAt(reward.x + 100, reward.y) },
				{
					...point,
					id: "second-pin",
					coordinates: pinAt(reward.x + 200, reward.y),
				},
			]),
			catalog([left, right]),
		);
		expect(rows[0].reward?.key).toBe("8:left");
		expect(rows[1].reward?.key).toBe("8:right");
		expect(rows.every((row) => row.reason === undefined)).toBe(true);
	});

	test("keeps the closer mark and leaves its neighbour unassigned", () => {
		const rows = matchGhzsExport(
			data([
				{ ...point, coordinates: pinAt(reward.x + 100, reward.y) },
				{
					...point,
					id: "second-pin",
					coordinates: pinAt(reward.x + 300, reward.y),
				},
			]),
			catalog(),
		);
		expect(rows[0].reward?.key).toBe(reward.key);
		expect(rows[1].reward).toBeUndefined();
		expect(rows[1].reason).toBe("Ambiguous location");
	});

	test("heritage colors are matched independently and gold accepts yellow artwork", () => {
		const position = ghzsPosition(point.map, point.coordinates);
		if (!position) throw new Error("missing fixture calibration");
		const heritage = {
			...reward,
			...position,
			kind: "heritage" as const,
			name: "Tidal Heritage",
		};
		const rows = matchGhzsExport(
			data([{ ...point, category: "Tidal Heritage-golden" }]),
			catalog([
				{ ...heritage, key: "8:gold", icon: "/map/icons/gg/tidal-yellow.png" },
				{
					...heritage,
					key: "8:purple",
					icon: "/map/icons/gg/tidal-purple.png",
				},
			]),
		);
		expect(rows[0].reward?.key).toBe("8:gold");
	});

	test("merge preserves existing progress, respects newer timestamps and is idempotent", () => {
		const marks = {
			unrelated: { collected: true, updatedAt: 1 },
			[reward.key]: { collected: false, updatedAt: 2000 },
		};
		const next = mergeImportedMarks(marks, [reward], EMPTY_EXPLORATION, 1000);
		expect(next.unrelated).toEqual(marks.unrelated);
		expect(next[reward.key]).toEqual({ collected: true, updatedAt: 2001 });
		expect(marks[reward.key].collected).toBe(false);
		expect(collectionState(reward, EMPTY_EXPLORATION, next).state).toBe(
			"collected",
		);
		expect(mergeImportedMarks(next, [reward], EMPTY_EXPLORATION, 9000)).toEqual(
			next,
		);
	});

	test("merge leaves live-confirmed claims and gathering resources alone", () => {
		const snapshot = {
			...EMPTY_EXPLORATION,
			rewards: {
				[reward.key]: {
					mapId: 8,
					entityId: reward.entityId,
					source: "reward-response" as const,
					observedAt: 3000,
				},
			},
		};
		expect(mergeImportedMarks({}, [reward], snapshot, 1000)).toEqual({});
		expect(
			mergeImportedMarks(
				{},
				[{ ...reward, kind: "collection" }],
				EMPTY_EXPLORATION,
			),
		).toEqual({});
	});
});

// Real public GHZS pins that were already imported once; the alignments in
// `src/configs/ghzs_maps.json` must keep resolving them to these placements.
const calibratedPins: {
	pin: string;
	map: string;
	category: string;
	coordinates: [number, number];
	reward: string;
	maxDistance: number;
}[] = [
	// Avinoleum, western inset.
	{
		pin: "67e7c8a5936aac0001b7ab19",
		map: "67e39c8a14d3aa0001642dad",
		category: "Supply Chest",
		coordinates: [-4.0286587193699095, -2.6861572265625004],
		reward: "903:169750220",
		maxDistance: 400,
	},
	{
		pin: "67e7e1d814d3aa00016443dc",
		map: "67e39c8a14d3aa0001642dad",
		category: "Ace Wings",
		coordinates: [-2.33943758287141, -1.4007568359375002],
		reward: "903:166750038",
		maxDistance: 400,
	},
	// Avinoleum, eastern inset.
	{
		pin: "67e7d20c424ee9000194d36f",
		map: "67e39c8a14d3aa0001642dad",
		category: "Supply Chest",
		coordinates: [-4.565473550710278, 11.804809570312502],
		reward: "903:166750088",
		maxDistance: 400,
	},
	{
		pin: "67e7d189936aac0001b7ab64",
		map: "67e39c8a14d3aa0001642dad",
		category: "Supply Chest",
		coordinates: [-6.779171028142861, 16.116943359375004],
		reward: "903:166750613",
		maxDistance: 400,
	},
	// Vault Underground surface.
	{
		pin: "67aeedaa29e6040001f8162f",
		map: "67ad5792bf0ba9000112ce81",
		category: "Mimic Chest",
		coordinates: [16.268421316265755, 9.359636751320993],
		reward: "902:166700280",
		maxDistance: 300,
	},
	// Vault Underground, depository first floor (layer 37).
	{
		pin: "67adbd64394de90001e5f665",
		map: "67ad5792bf0ba9000112ce81",
		category: "Supply Chest",
		coordinates: [-9.809078052289292, 8.614202335262103],
		reward: "902:122700184",
		maxDistance: 400,
	},
	// Vault Underground, depository third floor (layer 39).
	{
		pin: "67adbf18c379230001fd6d25",
		map: "67ad5792bf0ba9000112ce81",
		category: "Supply Chest",
		coordinates: [-9.959379985779876, 16.155666069747838],
		reward: "902:166700060",
		maxDistance: 300,
	},
	{
		pin: "67aeed8590da0e0001ee4903",
		map: "67ad5792bf0ba9000112ce81",
		category: "Mimic Chest",
		coordinates: [-9.966614855723071, 15.85441972419343],
		reward: "902:166700071",
		maxDistance: 400,
	},
	// Vault Underground, echo depository third floor (layer 44).
	{
		pin: "67adbf6f81e64a00013f9d8b",
		map: "67ad5792bf0ba9000112ce81",
		category: "Supply Chest",
		coordinates: [-3.7986086277695854, 14.817079155411134],
		reward: "902:122700162",
		maxDistance: 300,
	},
	// Vault Underground interior (layer 47).
	{
		pin: "67aeed4b90da0e0001ee48fe",
		map: "67ad5792bf0ba9000112ce81",
		category: "Mimic Chest",
		coordinates: [17.068290381496084, 4.426584466495301],
		reward: "902:166700174",
		maxDistance: 400,
	},
];

test("calibrated insets resolve real GHZS pins on Avinoleum and in the Vault Underground", async () => {
	const live = (await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json()) as MapCatalog;
	const rows = matchGhzsExport(
		{
			format: "mornye-ghzs",
			version: 1,
			markedIds: calibratedPins.map((fixture) => fixture.pin),
			points: calibratedPins.map((fixture) => ({
				id: fixture.pin,
				map: fixture.map,
				category: fixture.category,
				coordinates: fixture.coordinates,
			})),
		},
		live,
	);
	for (const fixture of calibratedPins) {
		const row = rows.find((entry) => entry.id === fixture.pin);
		if (!row) throw new Error(`missing row for ${fixture.pin}`);
		expect(row.reward?.key).toBe(fixture.reward);
		expect(row.reason).toBeUndefined();
		expect(row.distance).toBeLessThanOrEqual(fixture.maxDistance);
	}
});

test("GHZS exporter reads only the current account's IDs and never uploads progress or tokens", async () => {
	const script = await Bun.file(
		new URL("./ghzs-export.js", import.meta.url),
	).text();
	const vm = {
		leafsId: [point.id],
		getLeafsIds: () => [point.id, "unknown-pin"],
		$children: [],
		secretToken: "private-login-value",
	};
	const calls: { url: string; init: RequestInit }[] = [];
	let output: Blob | undefined;
	let downloaded = false;
	const execute = new Function(
		"location",
		"document",
		"fetch",
		"URL",
		"Blob",
		"setTimeout",
		"console",
		script.replace("(async () =>", "return (async () =>"),
	);
	await execute(
		{ hostname: "www.ghzs666.com", pathname: "/wutheringwaves-map" },
		{
			getElementById: () => ({ __vue__: { $children: [vm] } }),
			body: { append: () => {} },
			createElement: () => ({
				click: () => {
					downloaded = true;
				},
				remove: () => {},
			}),
		},
		async (url: string, init: RequestInit) => {
			calls.push({ url, init });
			return {
				ok: true,
				json: async () =>
					url.endsWith("/maps")
						? [{ _id: "second-map" }]
						: [
								{
									resources: [
										{
											name_en: point.category,
											points: [
												{ _id: point.id, coordinates: point.coordinates },
												{ _id: "not-marked", coordinates: [0, 0] },
											],
										},
									],
								},
							],
			};
		},
		{
			createObjectURL: (blob: Blob) => {
				output = blob;
				return "blob:test";
			},
			revokeObjectURL: () => {},
		},
		Blob,
		() => {},
		{
			info: () => {},
			error: (message: string) => {
				throw new Error(message);
			},
		},
	);
	if (!output) throw new Error("export did not produce a file");
	const text = await output.text();
	const result = parseGhzsExport(text);
	expect(downloaded).toBe(true);
	expect(result.markedIds).toEqual([point.id, "unknown-pin"]);
	expect(result.points).toHaveLength(2);
	expect(result.points.map((p) => p.map)).toEqual(["", "second-map"]);
	expect(text).not.toContain("private-login-value");
	expect(calls).toHaveLength(3);
	expect(
		calls.every(
			(call) => !call.init.method && call.init.credentials === "omit",
		),
	).toBe(true);
});
