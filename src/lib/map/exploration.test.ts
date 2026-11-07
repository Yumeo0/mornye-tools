import { describe, expect, test } from "bun:test";
import {
	challengeMapMarkers,
	challengeMarkerKeys,
	explorationMarkerFor as classifyExploration,
	graphChallengeMarker,
	referencedChallengeOwners,
} from "../../../scripts/map-exploration";
import { collectionState, itemLabel } from "./collection";
import { isItemVisible, summarizeItems } from "./filters";
import { nativeCategories } from "./test-fixtures/native-categories";
import { EMPTY_EXPLORATION, type MapReward } from "./types";

const explorationMarkerFor: typeof classifyExploration = (
	type,
	blueprint,
	degree,
	title,
) => classifyExploration(type, blueprint, degree, title, nativeCategories);

describe("exploration placements", () => {
	test("recognizes exploration progress actors outside collectible entity families", () => {
		expect(explorationMarkerFor("Animal", "Animal032", 7, "")?.name).toBe(
			"Blobfly",
		);
		expect(
			explorationMarkerFor("Destructible", "Gameplay_CXS_4", 16, "Windchimer")
				?.name,
		).toBe("Windchimer");
		expect(
			explorationMarkerFor("PhysicsSwing", "Gameplay_CXS_14", 16, "Windchimer")
				?.name,
		).toBe("Windchimer");
		expect(
			explorationMarkerFor("Monster", "Monster139", 17, "Water Beetle")?.name,
		).toBe("Frostbug");
		expect(
			explorationMarkerFor("SimpleInteract", "SceneObj102", 9, "")?.name,
		).toBe("Viewpoint");
	});

	test("includes the Mutterfly swarm without duplicating its foundation or quest props", () => {
		expect(
			explorationMarkerFor("FollowTrack", "Gameplay111", undefined, "")?.name,
		).toBe("Mutterfly");
		expect(
			explorationMarkerFor(
				"FollowTrackFoundation",
				"Gameplay112",
				undefined,
				"",
			),
		).toBeNull();
		expect(
			explorationMarkerFor(
				"FollowTrack",
				"branch3.5_247_Gameplay1",
				undefined,
				"",
			),
		).toBeNull();
	});

	test("recognizes challenge devices while excluding unnamed scenery", () => {
		expect(
			explorationMarkerFor(
				"ChallengeInteract",
				"Gameplay200",
				undefined,
				"Simulation Training Device",
			)?.name,
		).toBe("Race Challenge");
		expect(
			explorationMarkerFor("ChallengeInteract", "NPC_Scenery", undefined, ""),
		).toBeNull();
	});

	test("uses one interaction device per challenge and keeps other maps separate", () => {
		const plays = [
			{
				LevelPlayId: 1,
				Data: { Type: "Challenge", LevelId: 8, LevelPlayEntityId: 100 },
			},
			{
				LevelPlayId: 2,
				Data: { Type: "Challenge", LevelId: 906, LevelPlayEntityId: 100 },
			},
			{
				LevelPlayId: 3,
				Data: { Type: "Quest", LevelId: 8, LevelPlayEntityId: 101 },
			},
		];
		expect([
			...challengeMarkerKeys(plays, [
				{ key: "8:200", mapId: 8, owner: 1 },
				{ key: "8:201", mapId: 8, owner: 1 },
				{ key: "8:202", mapId: 8, owner: 2 },
				{ key: "8:203", mapId: 8, owner: 3 },
				{ key: "8:204", mapId: 8, owner: null },
			]),
		]).toEqual(["8:200", "906:100"]);
	});

	test("exploration filters start hidden and support per-account completion marks", () => {
		const reward: MapReward = {
			key: "8:123",
			mapId: 8,
			entityId: 123,
			x: 10,
			y: 20,
			z: 30,
			kind: "exploration",
			name: "Windchimer",
			icon: "/map/icons/SP_IconMap_Play_12_UI.webp",
			blueprint: "Gameplay_CXS_4",
			area: "Mt. Firmament",
			owner: null,
			refresh: "Unknown",
			hidden: false,
			underground: null,
		};
		const [row] = summarizeItems([{ reward, state: "remaining" }]);
		expect(row.label).toContain("Bell");
		expect(isItemVisible({}, row)).toBe(false);
		expect(isItemVisible({ [row.type]: true }, row)).toBe(true);
		expect(isItemVisible({ [row.type]: false }, row)).toBe(false);
		expect(itemLabel({ ...reward, name: "Frostbug" })).toContain("Worm");
		expect(collectionState(reward, EMPTY_EXPLORATION, {})).toEqual({
			state: "remaining",
			at: null,
		});
		expect(
			collectionState(reward, EMPTY_EXPLORATION, {
				[reward.key]: { collected: true, updatedAt: 100 },
			}),
		).toEqual({ state: "collected", at: 100 });
	});
});

test("challenge metadata follows native entity or play links without crossing maps", () => {
	const resolve = challengeMapMarkers([
		{
			mapId: 8,
			entityId: 938850996,
			playId: 166850018,
			title: "[Echo Challenge: Flight II]",
			icon: "SP_IconMap_Play_23_UI",
		},
		{
			mapId: 8,
			entityId: 123,
			playId: 0,
			title: "Overdash Club",
			icon: "SP_IconMap_Activity_01_UI",
		},
		{ mapId: 8, entityId: 124, playId: 5, title: "", icon: "unused" },
	]);
	expect(resolve(8, 166850402, 166850018)).toEqual({
		name: "Echo Challenge: Flight II",
		icon: "SP_IconMap_Play_23_UI",
	});
	expect(resolve(906, 166850402, 166850018)).toBeUndefined();
	expect(resolve(8, 123, 166850018)?.name).toBe("Overdash Club");
	expect(resolve(8, 124, 5)).toBeUndefined();
	expect(resolve(8, 999, null)).toBeUndefined();
});

test("published Flight II uses the game's name and icon at its original device position", async () => {
	const catalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const flight = catalog.rewards.find(
		(reward: MapReward) => reward.key === "8:166850402",
	);
	expect(flight).toMatchObject({
		name: "Echo Challenge: Flight II",
		icon: "/map/icons/SP_IconMap_Play_23_UI.webp",
		x: 1113250,
		y: 1123110,
		owner: 166850018,
	});
	expect(
		catalog.rewards.filter((reward: MapReward) => reward.key === "8:938850996"),
	).toHaveLength(0);
});

test("Tacet fields and nests occupy an untracked category without the duplicate Central Plains marker", async () => {
	const catalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const rewards = catalog.rewards as MapReward[];
	const locations = rewards.filter((reward) =>
		/^(Tacet Fields?|Tacet Discord Nest|Nightmare Nest)/.test(reward.name),
	);
	expect(locations.length).toBeGreaterThan(0);
	expect(locations.every((reward) => reward.kind === "combat")).toBe(true);
	expect(
		rewards.some(
			(reward) =>
				reward.key === "8:200000001" ||
				reward.name === "Tacet Field: Central Plains",
		),
	).toBe(false);
	expect(rewards.find((reward) => reward.key === "8:110000749")?.kind).toBe(
		"combat",
	);
});

test("missing challenge owners resolve only through unambiguous references on the same map", () => {
	const owners = referencedChallengeOwners([
		{
			id: 10,
			mapId: 8,
			type: "HighSpeedMovement",
			references: ["e_8_1", "e_8_1", "e_8_2", "e_906_3", "l_8_4"],
		},
		{ id: 20, mapId: 8, type: "Challenge", references: ["e_8_2"] },
		{ id: 30, mapId: 8, type: "Quest", references: ["e_8_4"] },
	]);
	expect([...owners]).toEqual([["8:1", 10]]);
});

test("expired event challenges are absent and the Septimont flight device resolves through its graph", async () => {
	const catalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const rewards = catalog.rewards as MapReward[];
	expect(
		rewards.some((reward) => /Weather Forecast|Rift Runner/.test(reward.name)),
	).toBe(false);
	expect(rewards.find((reward) => reward.key === "8:938850000")).toMatchObject({
		name: "Echo Challenge: Flight I",
		icon: "/map/icons/SP_IconMap_Play_23_UI.webp",
		x: 1082872.25,
		y: 1040358,
		owner: 938850000,
	});
});

test("combat training devices use the combat category and their native hovering emblem", async () => {
	expect(
		explorationMarkerFor(
			"ChallengeInteract",
			"Gameplay205",
			undefined,
			"Simulation Training Device",
		),
	).toMatchObject({
		name: "Combat Challenge",
		icon: "Mod_Logo_18003",
		iconUrl: "/map/icons/combat-challenge.svg",
	});
	const catalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const marker = (catalog.rewards as MapReward[]).find(
		(reward) => reward.key === "8:136905699",
	);
	expect(marker).toMatchObject({
		name: "Combat Challenge",
		x: 234476,
		y: 283758,
		icon: "/map/icons/combat-challenge.svg",
		chestKeys: ["8:136905701"],
	});
	expect(catalog.icons).toContain("/map/icons/combat-challenge.svg");
	expect(
		await Bun.file(
			new URL(
				"../../../public/map/icons/combat-challenge.svg",
				import.meta.url,
			),
		).exists(),
	).toBe(true);
});

test("Vitreum Dancer devices resolve their native name and icon", async () => {
	expect(
		explorationMarkerFor(
			"ChallengeInteract",
			"Gameplay_LNXT_Daoling",
			undefined,
			"Simulation Training Device",
		),
	).toMatchObject({
		name: "Tactical Hologram: Vitreum Dancer",
		icon: "SP_IconMap_Play_17_UI",
	});
	const catalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	expect(
		(catalog.rewards as MapReward[]).find(
			(reward) => reward.key === "8:161900119",
		),
	).toMatchObject({
		name: "Tactical Hologram: Vitreum Dancer",
		icon: "/map/icons/SP_IconMap_Play_17_UI.webp",
		owner: 161900014,
	});
});

test("race and ski challenges use their in-world emblems and expired Overdash events stay excluded", async () => {
	expect(
		explorationMarkerFor(
			"ChallengeInteract",
			"Gameplay200",
			undefined,
			"Simulation Training Device",
		),
	).toMatchObject({ name: "Race Challenge", icon: "Mod_Logo_18001" });
	expect(
		explorationMarkerFor(
			"ChallengeInteract",
			"Gameplay207",
			undefined,
			"Tactical Hologram: Ski",
		),
	).toMatchObject({ name: "Ski Challenge", icon: "Mod_Logo_18004" });
	const catalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const rewards = catalog.rewards as MapReward[];
	expect(rewards.find((reward) => reward.key === "8:136904880")).toMatchObject({
		name: "Race Challenge",
		icon: "/map/icons/race-challenge.svg",
		x: 250043.89,
		y: 298698.96,
		chestKeys: ["8:136904883"],
	});
	expect(rewards.find((reward) => reward.key === "8:133900566")).toMatchObject({
		name: "Ski Challenge",
		icon: "/map/icons/ski-challenge.svg",
		x: 269710,
		y: 350377,
	});
	expect(rewards.some((reward) => reward.name === "Overdash Club")).toBe(false);
	for (const name of ["race-challenge", "ski-challenge"]) {
		expect(catalog.icons).toContain(`/map/icons/${name}.svg`);
		expect(
			await Bun.file(
				new URL(`../../../public/map/icons/${name}.svg`, import.meta.url),
			).exists(),
		).toBe(true);
	}
});

test("shooting training devices use their own category and native floating emblem", async () => {
	expect(
		explorationMarkerFor(
			"ChallengeInteract",
			"Gameplay204",
			undefined,
			"Simulation Training Device",
		),
	).toMatchObject({ name: "Shooting Challenge", icon: "Mod_Logo_18002" });
	const catalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	expect(
		(catalog.rewards as MapReward[]).find(
			(reward) => reward.key === "8:146000521",
		),
	).toMatchObject({
		name: "Shooting Challenge",
		icon: "/map/icons/shooting-challenge.svg",
		x: 73930,
		y: 289250,
		chestKeys: ["8:146000522"],
	});
	expect(catalog.icons).toContain("/map/icons/shooting-challenge.svg");
	expect(
		await Bun.file(
			new URL(
				"../../../public/map/icons/shooting-challenge.svg",
				import.meta.url,
			),
		).exists(),
	).toBe(true);
});

test("graph-based shooting and tower challenges use explicit titles and defense devices", () => {
	expect(graphChallengeMarker("Timed shooting challenge", [])?.name).toBe(
		"Timed Shooting Challenge",
	);
	expect(graphChallengeMarker("Objective Defense Challenge", [])?.name).toBe(
		"Challenge Tower",
	);
	expect(graphChallengeMarker("", ["Gameplay081"])?.name).toBe(
		"Challenge Tower",
	);
	expect(graphChallengeMarker("Protect Lenie", ["Gameplay081"])?.name).toBe(
		"Protect Lenie",
	);
	expect(graphChallengeMarker("", ["Monster004"])).toBeNull();
});

test("reported graph controllers retain IDs and linked reward chests when renamed", async () => {
	const catalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const rewards = catalog.rewards as MapReward[];
	expect(rewards.find((reward) => reward.key === "8:32000106")).toMatchObject({
		name: "Timed Shooting Challenge",
		x: 14492.9,
		y: -31312.18,
		chestKeys: ["8:122005290"],
	});
	expect(rewards.find((reward) => reward.key === "8:136800082")).toMatchObject({
		name: "Challenge Tower",
		icon: "/map/icons/SP_IconMap_Activity_08_UI.webp",
		x: 91987.16,
		y: -88173.61,
		chestKeys: ["8:136800083"],
	});
});

test("Desorock's moving-platform target challenge joins the timed shooting category", async () => {
	expect(
		graphChallengeMarker("Shooting Target - Desorock Highland", [
			"Gameplay059",
			"Gameplay369",
		])?.name,
	).toBe("Timed Shooting Challenge");
	expect(
		graphChallengeMarker("Shooting Target - Desorock Highland", []),
	).toBeNull();
	const catalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	expect(
		(catalog.rewards as MapReward[]).find(
			(reward) => reward.key === "8:109006114",
		),
	).toMatchObject({
		name: "Timed Shooting Challenge",
		icon: "/map/icons/shooting-challenge.svg",
		x: -36372,
		y: 2353,
		chestKeys: ["8:109006727"],
	});
});

test("state-matching strike mechanisms classify as obelisk challenges through native graph references", async () => {
	expect(graphChallengeMarker("", [], ["Gameplay051"])?.name).toBe(
		"Training Dummies",
	);
	expect(graphChallengeMarker("", ["Gameplay051"])?.name).toBe(
		"Training Dummies",
	);
	expect(graphChallengeMarker("", [], ["Gameplay104"])).toBeNull();
	const catalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	expect(
		(catalog.rewards as MapReward[]).find(
			(reward) => reward.key === "8:109005776",
		),
	).toMatchObject({
		name: "Training Dummies",
		icon: "/map/icons/SP_IconMap_Activity_Navigation_10_UI.webp",
		x: -54024,
		y: -48996,
		chestKeys: ["8:109005775"],
	});
});

test("obelisk puzzles can reference their strike mechanisms directly without a group actor", async () => {
	expect(graphChallengeMarker("", [], ["Gameplay050"])?.name).toBe(
		"Training Dummies",
	);
	expect(graphChallengeMarker("", ["Gameplay050"])?.name).toBe(
		"Training Dummies",
	);
	const catalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	expect(
		(catalog.rewards as MapReward[]).find(
			(reward) => reward.key === "8:123001096",
		),
	).toMatchObject({
		name: "Training Dummies",
		x: -64442.97,
		y: 30373.71,
		chestKeys: ["8:123001091"],
	});
});
