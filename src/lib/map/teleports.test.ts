import { expect, test } from "bun:test";
import { teleportMarkers } from "../../../scripts/map-teleports";
import { collectionState, markRewards, tracksCollection } from "./collection";
import { groupItemRows, matchesMapVisibility, summarizeItems } from "./filters";
import { EMPTY_EXPLORATION, type MapCatalog, type MapReward } from "./types";

test("teleports use canonical same-map entrances and skip activity, hidden and unrelated marks", () => {
	const teleporters = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((Id) => ({
		Id,
		MapId: 8,
		Type: Id === 1 ? 1 : Id === 2 ? 2 : 3,
		TeleportEntityConfigId: Id * 10,
	}));
	const mark = (id: number, title: string, icon = "SP_IconMap_Play_03_UI") => ({
		MarkId: id,
		MapId: 8,
		InstanceDungeonId: 0,
		EntityConfigId: id * 10,
		MapShow: 3,
		MarkTitle: title,
		UnlockMarkPic: `/Game/${icon}.${icon}`,
	});
	const marks = [
		mark(1, "nexus", "SP_IconMap_CS_01_UI"),
		mark(2, "beacon", "SP_IconMap_CS_02_UI"),
		mark(3, "library"),
		mark(4, "domain", "SP_IconMap_Play_01_UI"),
		mark(5, "weekly", "SP_IconMonsterHead_990_1_UI"),
		mark(6, "event", "SP_IconMap_Activity_04_UI"),
		{ ...mark(7, "library"), MapId: 900 },
		{ ...mark(8, "library"), InstanceDungeonId: 100 },
		{ ...mark(9, "library"), MapShow: 0 },
		mark(10, "Activity_test"),
		{ ...mark(11, "library"), EntityConfigId: 999 }, // Quest-only library copy.
	];
	const markers = teleportMarkers(
		[...teleporters, teleporters[0]],
		marks,
		new Set([5]),
		new Map([
			["nexus", "Resonance Nexus"],
			["beacon", "Port of Riccioli"],
			["library", "The Grand Library"],
			["domain", "Eroded Ruins"],
			["weekly", "Chaotic Juncture"],
			["event", "Alloy Smelt"],
			["Activity_test", "Test Server Training Ground"],
		]),
	);
	expect([...markers.keys()]).toEqual(["8:10", "8:20", "8:30", "8:40", "8:50"]);
	expect(markers.get("8:20")).toMatchObject({
		name: "Resonance Beacon",
		title: "Port of Riccioli",
	});
	expect(markers.get("8:30")?.name).toBe("The Grand Library");
});

test("teleport points have their own filters and stay outside collection status and bulk marks", () => {
	const reward = {
		key: "8:1",
		kind: "teleport",
		name: "Resonance Nexus",
		icon: "/map/icons/SP_IconMap_CS_01_UI.webp",
	} as MapReward;
	const live = {
		...EMPTY_EXPLORATION,
		rewards: {
			[reward.key]: {
				mapId: 8,
				entityId: 1,
				source: "reward-response" as const,
				observedAt: 10,
			},
		},
	};
	expect(tracksCollection(reward)).toBe(false);
	expect(
		collectionState(reward, live, {
			"8:1": { collected: true, updatedAt: 20 },
		}),
	).toEqual({ state: "remaining", at: null });
	expect(markRewards({}, [reward], true, live, 30)).toEqual({});
	for (const visibility of ["remaining", "collected"] as const)
		expect(
			matchesMapVisibility({ reward, state: "remaining" }, visibility),
		).toBe(true);
	const rows = summarizeItems([{ reward, state: "remaining" }]);
	expect(rows[0]).toMatchObject({ total: 1, collected: 0, remaining: 0 });
	expect(groupItemRows(rows, "teleport")[0]).toMatchObject({
		id: "teleport",
		label: "Teleport points",
		rows,
	});
});

test("published teleports include native Nexus, Beacon, domain and library locations without claim keys", async () => {
	const catalog: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const rules = await Bun.file(
		new URL("../../configs/map_rules.json", import.meta.url),
	).json();
	const teleports = catalog.rewards.filter(
		(reward) => reward.kind === "teleport",
	);
	for (const name of [
		"Resonance Nexus",
		"Resonance Beacon",
		"Eroded Ruins",
		"The Grand Library",
	])
		expect(teleports.some((reward) => reward.name === name)).toBe(true);
	expect(
		teleports.find((reward) => reward.name === "Eroded Ruins"),
	).toMatchObject({
		key: "8:142000073",
		x: 6327.97,
		y: 205605.81,
	});
	expect(
		teleports.filter((reward) => reward.name === "The Grand Library"),
	).toMatchObject([{ key: "8:310000543", x: -27408.78, y: 126114.84 }]);
	expect(
		teleports.some((reward) =>
			/Test Server|Rift Runner|Moon Shooter/.test(reward.name),
		),
	).toBe(false);
	const claimKeys = new Set(rules.rewardKeys);
	expect(teleports.every((reward) => !claimKeys.has(reward.key))).toBe(true);
	for (const icon of new Set(teleports.map((reward) => reward.icon)))
		expect(
			await Bun.file(
				new URL(`../../../public${icon}`, import.meta.url),
			).exists(),
		).toBe(true);
});
