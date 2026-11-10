import { expect, test } from "bun:test";
import echoData from "@/configs/echo_data.json";
import { type Echo, EMPTY_ACCOUNT } from "@/lib/account";
import { makeFixture } from "../../../calculator/fixture";
import { getCatalog } from "./riley/engine.generated.js";
import { teamBuilds, toEchoInstance } from "./translate";

test("actual echo values and owned UIDs translate without generating stats", () => {
	const species = echoData.find(
		(e) => e.echo_name === "Nightmare: Feilian Beringal",
	)!;
	const echo: Echo = {
		incrId: 42,
		itemId: species.echo_id,
		monsterId: species.monster_id!,
		setId: 4,
		level: 0,
		funcValue: 0,
		stackCount: 1,
		source: "manual",
		mainProps: [{ key: "critRate", value: 4.4, raw: 440, propId: 0 }],
		subProps: [],
	};
	const result = toEchoInstance(echo).instance!;
	expect(result.uid).toBe("incr:42");
	expect(result.mainStats).toEqual(echo.mainProps);
	expect(result.substats).toEqual([]);
	expect(result.level).toBe(0);
	expect(toEchoInstance({ ...echo, monsterId: -1 }).error).toBeDefined();
});
test("character/weapon level overrides are absent while chains and refinements remain real", () => {
	const { profile } = makeFixture(getCatalog());
	const snapshot = {
		...EMPTY_ACCOUNT,
		resonators: profile.members.map((m) => ({
			id: m.characterId,
			name: m.name,
			level: 1,
			chain: 0,
			breakthrough: 0,
			skills: [],
		})),
		weapons: profile.members.map((m, i) => ({
			incrId: i,
			itemId: m.weapons[0].id,
			level: 1,
			breach: 0,
			rank: 3,
			equippedBy: m.characterId,
		})),
	};
	const before = JSON.stringify(snapshot);
	const builds = teamBuilds(snapshot, profile);
	expect(builds.members[0].weaponRank).toBe(3);
	expect(builds.members[0].chain).toBe(0);
	expect("level" in builds.members[0]).toBe(false);
	expect(JSON.stringify(snapshot)).toBe(before);
});
