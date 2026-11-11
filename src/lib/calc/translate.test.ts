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

test("main echoes resolve abbreviated engine names by game ID and match owned inventory", () => {
	const catalog = getCatalog();
	const expected = [
		[6000199, "Reminiscence: Threnodian - Voidborne Construct"],
		[6000225, "Reminiscence: Suhsin the Inevitable"],
		[6000201, "Reminiscence - Nightmare: Adam Smasher"],
		[6000121, "The False Sovereign"],
	] as const;
	for (const [id, name] of expected) {
		const species = echoData.find((echo) => echo.monster_id === id)!;
		const owned = toEchoInstance({
			incrId: id,
			itemId: species.echo_id,
			monsterId: id,
			setId: species.echo_sets[0].id,
			level: 25,
			funcValue: 0,
			stackCount: 1,
			source: "manual",
			mainProps: [{ key: "critRate", value: 22, raw: 2200, propId: 0 }],
			subProps: [],
		}).instance!;
		expect(owned).toBeDefined();
		const profiles = catalog.teams.filter((team) =>
			team.members.some((m) => m.mainEcho.engineId === id),
		);
		expect(profiles.length).toBeGreaterThan(0);
		for (const profile of profiles) {
			const member = profile.members.find((m) => m.mainEcho.engineId === id)!;
			expect(member.mainEcho.typeId).toBe(owned.typeId);
			expect(member.mainEcho.name).toBe(name);
			expect(
				profile.errors.some((error) => error.includes("game catalog mapping")),
			).toBe(false);
		}
	}
	expect(
		catalog.teams
			.flatMap((team) => team.errors)
			.filter((error) => error.includes("game catalog mapping")),
	).toEqual([]);
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

test("unowned teammates default to authored weapons and rotation stats while preserving overrides", () => {
	const profile = getCatalog().teams.find(
		(p) => !p.errors.length && p.members.some((m) => m.name === "Shorekeeper"),
	)!;
	const shorekeeper = profile.members.find((m) => m.name === "Shorekeeper")!;
	expect(shorekeeper.defaultWeapon).toEqual({ id: 21050036, rank: 1 });
	const before = JSON.stringify(profile);
	const translated = teamBuilds(EMPTY_ACCOUNT, profile);
	expect(translated.errors).toEqual([]);
	for (const [i, build] of translated.members.entries()) {
		expect(build.weaponId).toBe(profile.members[i].defaultWeapon.id);
		expect(build.weaponRank).toBe(profile.members[i].defaultWeapon.rank);
		expect(build.echoSource).toBe("rotation");
		expect(build.echoes).toEqual([]);
	}
	const alternate = shorekeeper.weapons.find(
		(w) => w.id !== shorekeeper.defaultWeapon.id,
	)!;
	const edited = teamBuilds(EMPTY_ACCOUNT, profile, {
		[shorekeeper.characterId]: {
			weaponItemId: alternate.id,
			weaponRank: alternate.ranks.at(-1),
			echoSource: "equipped", // stale saved setting from another profile state
		},
	});
	const build = edited.members.find(
		(m) => m.characterId === shorekeeper.characterId,
	)!;
	expect(build.weaponId).toBe(alternate.id);
	expect(build.weaponRank).toBe(alternate.ranks.at(-1)!);
	expect(build.echoSource).toBe("rotation");
	expect(JSON.stringify(profile)).toBe(before);
});

test("unowned targets can search inventory; owned teammates default to rotation with an equipped override", () => {
	const { profile } = makeFixture(getCatalog());
	const target = profile.members[2];
	const weapon = target.weapons[0];
	const snapshot = {
		...EMPTY_ACCOUNT,
		resonators: [
			{
				id: target.characterId,
				name: target.name,
				level: 90,
				chain: 0,
				breakthrough: 6,
				skills: [],
			},
		],
		weapons: [
			{
				incrId: 1,
				itemId: weapon.id,
				level: 90,
				breach: 6,
				rank: 3,
				equippedBy: target.characterId,
			},
		],
	};
	const translated = teamBuilds(snapshot, profile, {}, target.characterId);
	expect(translated.errors).toEqual([]);
	expect(translated.members.map((m) => m.echoSource)).toEqual([
		"rotation",
		"rotation",
		"equipped",
	]);
	expect(translated.members[2].weaponId).toBe(weapon.id);
	expect(translated.members[2].weaponRank).toBe(3);
	expect(teamBuilds(snapshot, profile).members[2].echoSource).toBe("rotation");
	expect(
		teamBuilds(snapshot, profile, {
			[target.characterId]: { echoSource: "equipped" },
		}).members[2].echoSource,
	).toBe("equipped");
	const unownedTarget = teamBuilds(
		snapshot,
		profile,
		{},
		profile.members[0].characterId,
	);
	expect(unownedTarget.errors).toEqual([]);
	expect(unownedTarget.members[0].echoSource).toBe("equipped");
	expect(unownedTarget.members[0].echoes).toEqual([]);
	expect(unownedTarget.members[0].weaponId).toBe(
		profile.members[0].defaultWeapon.id,
	);
});
