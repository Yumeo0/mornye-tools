import { expect, test } from "bun:test";
import {
	challengeChestLinks,
	questChestLinks,
} from "../../../scripts/map-challenge-rewards";
import type { MapReward } from "./types";

const reward = (
	key: string,
	kind: MapReward["kind"],
	owner: number | null,
): MapReward =>
	({
		key,
		mapId: Number(key.split(":")[0]),
		entityId: Number(key.split(":")[1]),
		kind,
		owner,
	}) as MapReward;

test("challenge chest links use ownership and explicit references, deduplicate and stay map-scoped", () => {
	const rewards = [
		reward("8:1", "exploration", 10),
		reward("8:2", "chest", 10),
		reward("8:3", "chest", null),
		reward("8:4", "casket", 10),
		reward("8:5", "chest", 20),
		reward("906:2", "chest", 10),
		reward("8:6", "exploration", null),
		reward("8:7", "exploration", 10),
	];
	const links = challengeChestLinks(rewards, new Set(["8:1", "8:6"]), [
		{
			id: 10,
			mapId: 8,
			references: [
				"e_8_2",
				"e_8_3",
				"e_8_3",
				"e_8_4",
				"e_906_2",
				"e_8_999",
				"invalid",
			],
		},
	]);
	expect([...links]).toEqual([["8:1", ["8:2", "8:3"]]]);
	expect(rewards.every((reward) => reward.chestKeys === undefined)).toBe(true);
});

test("published challenges link existing chests without adding duplicate placements", async () => {
	const catalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const rewards = catalog.rewards as MapReward[];
	const byKey = new Map(rewards.map((reward) => [reward.key, reward]));
	expect(byKey.get("8:106002998")?.chestKeys).toEqual(["8:106003041"]);
	let linked = 0;
	for (const challenge of rewards) {
		for (const key of challenge.chestKeys ?? []) {
			const chest = byKey.get(key);
			expect(chest?.kind).toBe("chest");
			expect(chest?.mapId).toBe(challenge.mapId);
			linked++;
		}
	}
	expect(linked).toBeGreaterThan(0);
	expect(byKey.size).toBe(rewards.length);
});

test("quest chest links follow explicit native references, deduplicate, and never infer from proximity or quest prerequisites", () => {
	const rewards = [
		reward("8:1", "exploration", 10),
		reward("8:2", "chest", 10),
		reward("8:3", "chest", null),
		reward("906:2", "chest", 10),
	];
	const links = questChestLinks(
		rewards,
		[{ id: 10, mapId: 8, references: ["e_8_2", "e_906_2"] }],
		[
			{
				id: 100,
				name: "World quest",
				references: ["l_8_10", "e_8_3", "e_8_3", "q_200", "e_8_999"],
			},
			{ id: 200, name: "Other quest", references: ["e_906_2"] },
			{ id: 300, name: "", references: ["e_8_2"] },
		],
	);
	expect(links.get("8:2")).toEqual([
		{ id: 100, name: "World quest", playIds: [10] },
	]);
	expect(links.get("8:3")).toEqual([{ id: 100, name: "World quest" }]);
	expect(links.get("906:2")).toEqual([{ id: 200, name: "Other quest" }]);
	expect(links.has("8:1")).toBe(false);
});
