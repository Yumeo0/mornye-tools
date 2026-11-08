import { expect, test } from "bun:test";
import { challengeGraphEvidence } from "../../../scripts/map-challenge-evidence";
import { graphChallengeMarker } from "../../../scripts/map-exploration";
import { ghzsPosition, matchGhzsExport } from "./ghzs";
import { obtainedThrough } from "./links";
import type { MapCatalog } from "./types";

test("legacy generic progress imports still resolve renamed challenge categories", async () => {
	const catalog: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const coordinates: [number, number] = [2.180259769681356, -9.464721679687502];
	const position = ghzsPosition("", coordinates);
	if (!position) throw new Error("Missing map alignment");
	for (const key of [
		"8:32000002",
		"8:136002387",
		"8:134750482",
		"8:161900119",
	]) {
		const original = catalog.rewards.find((reward) => reward.key === key);
		if (!original) throw new Error(`Missing ${key}`);
		const reward = { ...original, ...position };
		const [row] = matchGhzsExport(
			{
				format: "mornye-ghzs",
				version: 1,
				markedIds: ["pin"],
				points: [
					{ id: "pin", map: "", category: "Challenge Project", coordinates },
				],
			},
			{ ...catalog, rewards: [reward] },
		);
		expect(row.reward?.key).toBe(key);
	}
});

test("only explicit challenge failure timers count as timed evidence; waits and camera durations do not", () => {
	const evidence = challengeGraphEvidence(
		[
			{
				Key: "10_1",
				Data: {
					Type: "Action",
					Actions: [{ Name: "Wait", Params: { Time: 20 } }],
					TidTip: "shoot",
				},
			},
			{
				Key: "20_1",
				Data: {
					Type: "QuestFailed",
					FailedCondition: {
						Timer: { Time: 20, TimerType: "CountDownChallenge" },
					},
					TidTip: "timed",
				},
			},
		],
		new Map([
			["shoot", "Hit all the targets"],
			["timed", "Hit all shooting targets within 20s"],
		]),
	);
	expect(evidence.get(10)).toEqual({
		texts: ["Hit all the targets"],
		timed: false,
	});
	expect(evidence.get(20)?.timed).toBe(true);
	expect(
		graphChallengeMarker("", [], ["Gameplay055"], evidence.get(10))?.name,
	).toBe("Shooting Challenge");
	expect(
		graphChallengeMarker("", [], ["Gameplay055"], evidence.get(20))?.name,
	).toBe("Timed Shooting Challenge");
});

test("named objectives outrank broad mechanisms and ambiguous internal helpers stay generic", () => {
	expect(
		graphChallengeMarker('Time-limited "Moon Shooter"', [], ["Gameplay055"], {
			texts: [],
			timed: true,
		})?.name,
	).toBe("Moon Shooter");
	expect(
		graphChallengeMarker("Let's Play Hide and Seek - II", []),
	).toMatchObject({
		name: "Hide and Seek",
		title: "Let's Play Hide and Seek - II",
	});
	expect(
		graphChallengeMarker("", [], ["Gameplay098", "Gameplay_Branch1.1_3"], {
			texts: [],
			timed: false,
		}),
	).toBeNull();
});

test("reported target stands retain IDs and chests and use the available timer evidence", async () => {
	const catalog: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	expect(
		catalog.rewards.find((reward) => reward.key === "8:32000002"),
	).toMatchObject({ name: "Shooting Challenge", chestKeys: ["8:142700060"] });
	expect(
		catalog.rewards.find((reward) => reward.key === "8:136002387"),
	).toMatchObject({
		name: "Timed Shooting Challenge",
		chestKeys: ["8:136002386"],
	});
	expect(catalog.rewards.some((reward) => reward.name === "Rift Runner")).toBe(
		false,
	);
});

test("excluded side-quest and event activities cannot reappear as map markers or claim keys", async () => {
	const catalog: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const rules = await Bun.file(
		new URL("../../configs/map_rules.json", import.meta.url),
	).json();
	const names = new Set([
		"Moon Shooter",
		"Device Activation Challenge",
		"Rescue Challenge",
		"Motorcycle Race",
		"Hua Lielang Duel",
		"Hide and Seek",
		"Inferno Rider Challenge",
		"Swim, Gulpuff, Swim",
	]);
	expect(catalog.rewards.some((reward) => names.has(reward.name))).toBe(false);
	for (const key of [
		"8:32850005",
		"8:32850006",
		"8:32850007",
		"8:123700149",
		"8:123700150",
		"8:123700151",
		"8:135001791",
		"8:135001796",
		"8:135001797",
		"8:135001809",
		"8:138000155",
		"8:138700185",
		"8:138700143",
		"8:146000950",
		"8:138000105",
		"8:138000162",
		"8:138000198",
		"8:135001748",
		"8:226700147",
		"8:226700148",
		"906:226701762",
		"906:226701763",
		"906:226701764",
		"8:133002745",
		"8:11000212",
		"8:11000215",
		"8:11000220",
		"8:122006313",
		"8:32850004",
		"8:123700053",
	]) {
		expect(catalog.rewards.some((reward) => reward.key === key)).toBe(false);
		expect(rules.rewardKeys).not.toContain(key);
	}
});

test("Heron Wetland obelisks use their native group and chest, separate from the crate's Blobfly", async () => {
	const catalog: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	expect(
		catalog.rewards.find((reward) => reward.key === "8:118001239"),
	).toMatchObject({
		name: "Training Dummies",
		icon: "/icons/map/activity-navigation-10.webp",
		x: 40974.87,
		y: 289725.96,
		chestKeys: ["8:118001243"],
	});
	expect(
		catalog.rewards.find((reward) => reward.key === "8:138000765"),
	).toMatchObject({ name: "Blobfly", owner: 138700000 });
	expect(
		catalog.rewards.find((reward) => reward.key === "8:118001243"),
	).toMatchObject({ kind: "chest", name: "Supply Chest · Standard" });
});

test("the chest at 28606, 274142 links to its obelisk controller without a duplicate requirement", async () => {
	const catalog: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const challenge = catalog.rewards.find(
		(reward) => reward.key === "8:118004465",
	);
	const chest = catalog.rewards.find((reward) => reward.key === "8:146000314");
	if (!challenge || !chest)
		throw new Error("Missing obelisk challenge or chest");
	expect(challenge).toMatchObject({
		kind: "exploration",
		name: "Training Dummies",
		x: 27928.32,
		y: 273763.75,
		chestKeys: [chest.key],
	});
	expect(obtainedThrough(chest, [challenge])).toEqual([
		{ kind: "challenge", reward: challenge },
	]);
});
