import { expect, test } from "bun:test";
import { EMPTY_OPTIMIZER_FILTERS } from "@/components/optimizer/optimizerOptions";
import echoData from "@/configs/echo_data.json";
import { EMPTY_ACCOUNT } from "@/lib/account";
import { makeFixture } from "../../../calculator/fixture";
import { selectCandidates } from "./optimizer";
import {
	evaluate,
	evaluateFast,
	getCatalog,
	resolveRotationStats,
} from "./riley/engine.generated.js";
import { searchInventory } from "./search";
import { teamBuilds } from "./translate";
import type { Scenario } from "./types";

for (const targetIndex of [0, 2]) {
	test(`unowned ${targetIndex === 0 ? "support" : "DPS"} searches actual account echoes with signature defaults`, async () => {
		const { profile, inventory } = makeFixture(
			getCatalog(),
			5,
			31415,
			targetIndex,
		);
		const target = profile.members[targetIndex];
		const snapshot = {
			...EMPTY_ACCOUNT,
			echoes: inventory.map((e, i) => ({
				incrId: i + 1,
				itemId: echoData.find((s) => s.monster_id === e.typeId)!.echo_id,
				monsterId: e.typeId,
				setId: e.setId,
				level: e.level,
				funcValue: 0,
				stackCount: 1,
				source: "manual" as const,
				mainProps: e.mainStats,
				subProps: e.substats,
			})),
		};
		const before = JSON.stringify(snapshot);
		const builds = teamBuilds(snapshot, profile, {}, target.characterId);
		expect(builds.errors).toEqual([]);
		const pool = selectCandidates(
			snapshot,
			profile,
			builds.members,
			target.characterId,
			EMPTY_OPTIMIZER_FILTERS,
		);
		expect(pool.pool).toHaveLength(5);
		expect(pool.mainCount).toBe(1);
		const scenario = resolveRotationStats(
			{ profileId: profile.id, cycles: 4, members: builds.members },
			target.characterId,
		);
		const searched = scenario.members[targetIndex];
		expect(searched.weaponId).toBe(target.defaultWeapon.id);
		expect(searched.weaponRank).toBe(target.defaultWeapon.rank);
		expect(searched.echoes).toEqual([]);
		expect(searched.echoSource).toBe("equipped");
		const result = await searchInventory(
			{
				scenario,
				targetId: target.characterId,
				objective:
					targetIndex === 0
						? { kind: "teamDamage" }
						: { kind: "memberDamage", characterId: target.characterId },
				inventory: pool.pool,
				mainTypeId: target.mainEcho.typeId,
				resultsLimit: 5,
				budget: 10,
			},
			evaluateFast,
			() => {},
			undefined,
			evaluate,
		);
		expect(result.results).toHaveLength(1);
		expect(new Set(result.results[0].uids)).toEqual(
			new Set(snapshot.echoes.map((e) => `incr:${e.incrId}`)),
		);
		expect(result.results[0].damage).toBeGreaterThan(0);
		expect(result.results[0].stats).toBeDefined();
		expect(result.baseline).toBeNull();
		expect(result.baselineError).toBeNull();
		expect(result.baselineEvaluation).toBeNull();
		expect(JSON.stringify(snapshot)).toBe(before);
	});
}

test("unowned teammates use rotation stats; any target uses account inventory", () => {
	const { profile } = makeFixture(getCatalog());
	const snapshot = {
		...EMPTY_ACCOUNT,
		resonators: profile.members.map((m) => ({
			id: m.characterId,
			name: m.name,
			level: 90,
			chain: 0,
			breakthrough: 6,
			skills: [],
		})),
	};
	const overrides = Object.fromEntries(
		profile.members.map((m) => [
			m.characterId,
			{
				echoSource: "rotation" as const,
				weaponItemId: m.weapons[0].id,
			},
		]),
	);
	const translated = teamBuilds(snapshot, profile, overrides, 1404);
	expect(translated.errors).toEqual([]);
	expect(translated.members.map((m) => m.echoSource)).toEqual([
		"rotation",
		"rotation",
		"equipped",
	]);
	expect(translated.members.every((m) => !m.echoes.length)).toBe(true);
	const unowned = teamBuilds(EMPTY_ACCOUNT, profile, overrides, 1404);
	expect(unowned.errors).toEqual([]);
	expect(unowned.members.map((m) => m.echoSource)).toEqual([
		"rotation",
		"rotation",
		"equipped",
	]);
});

test("reference builds are fixed, isolated, and independent of target equipment", () => {
	const { scenario } = makeFixture(getCatalog());
	for (const m of scenario.members.slice(0, 2)) {
		m.echoSource = "rotation";
		m.echoes = [];
	}
	const before = JSON.stringify(scenario);
	const resolved = resolveRotationStats(scenario, 1404);
	const result = evaluate(resolved);
	expect(result.feasible).toBe(true);
	expect(resolved.members[2]).toEqual(scenario.members[2]);
	expect(resolved.members[0].rotationStats).toBeDefined();
	expect(result.energy.every((e) => e.feasible)).toBe(true);
	const changed = structuredClone(scenario);
	changed.members[2].echoes = [];
	expect(resolveRotationStats(changed, 1404).members.slice(0, 2)).toEqual(
		resolved.members.slice(0, 2),
	);
	expect(evaluateFast(resolved).teamDamage).toBe(result.teamDamage);
	const short = structuredClone(resolved);
	for (const echo of short.members[2].echoes)
		for (const stat of [...echo.mainStats, ...echo.substats])
			if (stat.key === "energyRegen") stat.value = 0;
	const failed = evaluate(short);
	expect(failed.energy.find((e) => e.characterId === 1404)!.feasible).toBe(
		false,
	);
	expect(failed.stats[resolved.members[0].characterId]).toEqual(
		result.stats[resolved.members[0].characterId],
	);
	expect(evaluate(resolved)).toEqual(result);
	expect(JSON.stringify(scenario)).toBe(before);
});

function phrolovaFixture() {
	const catalog = getCatalog();
	const profile = catalog.teams.find(
		(t) =>
			!t.errors.length &&
			t.members.map((m) => m.name).join("/") ===
				"Phrolova/Shorekeeper/Lucilla" &&
			t.members[0].loadoutId === 16081 &&
			t.members[1].mainEcho.name === "Fallacy of No Return" &&
			t.members[2].mainEcho.name === "Bell-Borne Geochelone",
	)!;
	const main = echoData.find(
		(e) => e.monster_id === profile.members[0].mainEcho.typeId,
	)!;
	// Legal, actual-stat 43311 target gear. Only the teammates are theoretical.
	const seed = makeFixture(catalog).scenario.members[2].echoes;
	const ofCost = (cost: number) => [
		...new Map(
			echoData
				.filter(
					(e) =>
						e.monster_id != null &&
						e.echo_cost === cost &&
						e.echo_sets.some((s) => s.id === 19),
				)
				.map((e) => [e.echo_name, e]),
		).values(),
	];
	const threes = ofCost(3),
		ones = ofCost(1);
	const echoes = seed.map((e, i) => {
		const species = i === 0 ? main : i < 3 ? threes[i - 1] : ones[i - 3];
		return {
			...e,
			uid: `owned:phrolova:${i}`,
			typeId: Math.min(
				...echoData
					.filter(
						(d) => d.echo_name === species.echo_name && d.monster_id != null,
					)
					.map((d) => d.monster_id!),
			),
			name: species.echo_name,
			setId: 19,
			mainStats: e.mainStats.map((p) =>
				p.key === "aero" ? { ...p, key: "havoc" as const } : p,
			),
		};
	});
	const scenario: Scenario = {
		profileId: profile.id,
		cycles: 4,
		members: profile.members.map((m, i) => ({
			characterId: m.characterId,
			chain: 0,
			weaponId: [21050056, 21050036, 21050086][i],
			weaponRank: 1,
			echoSource: i === 0 ? "equipped" : "rotation",
			echoes: i === 0 ? echoes : [],
		})),
	};
	return { scenario, echoes };
}

test("Phrolova searches owned echoes with Shorekeeper and Lucilla on rotation stats", async () => {
	const { scenario, echoes } = phrolovaFixture();
	const resolved = resolveRotationStats(scenario, 1608);
	const simulation = evaluate(resolved);
	expect(simulation.diagnostics).toEqual([]);
	expect(simulation.feasible).toBe(true);
	expect(
		simulation.energy.find((e) => e.characterId === 1505)!.actual,
	).toBeGreaterThanOrEqual(240);
	const result = await searchInventory(
		{
			scenario: resolved,
			targetId: 1608,
			objective: { kind: "memberDamage", characterId: 1608 },
			inventory: echoes,
			mainTypeId: echoes[0].typeId,
			resultsLimit: 5,
			budget: 10,
		},
		evaluateFast,
		() => {},
		undefined,
		evaluate,
	);
	expect(result.results).toHaveLength(1);
	expect(result.results[0].uids).toEqual(echoes.map((e) => e.uid));
	expect(result.baseline!.damage).toBe(result.results[0].damage);
	const invalid = structuredClone(resolved);
	invalid.members[0].echoSource = "rotation";
	expect(() => resolveRotationStats(invalid, 1608)).toThrow("owned echoes");
	await expect(
		searchInventory(
			{
				scenario: invalid,
				targetId: 1608,
				objective: { kind: "teamDamage" },
				inventory: echoes,
				mainTypeId: echoes[0].typeId,
				resultsLimit: 5,
				budget: 10,
			},
			evaluate,
			() => {},
		),
	).rejects.toThrow("owned echoes");
});
