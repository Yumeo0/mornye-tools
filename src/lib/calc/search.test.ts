import { expect, test } from "bun:test";
import { makeFixture } from "../../../calculator/fixture";
import { evaluate, getCatalog } from "./riley/engine.generated.js";
import { isLegalBuild, searchInventory } from "./search";
import type { SearchRequest, SimulationResult } from "./types";

function request(): SearchRequest {
	const fixture = makeFixture(getCatalog(), 10);
	return {
		scenario: fixture.scenario,
		targetId: 1404,
		objective: { kind: "teamDamage" },
		inventory: fixture.inventory,
		mainTypeId: fixture.profile.members[2].mainEcho.typeId,
		resultsLimit: 8,
		budget: 3000,
	};
}
test("small exact search preserves required main type and can leave an infeasible baseline", async () => {
	const input = request();
	input.scenario.members[2].echoes[0].typeId = -1;
	const scorer = (scenario: SearchRequest["scenario"]): SimulationResult => {
		const echoes = scenario.members[2].echoes;
		const damage = echoes.reduce((n, e) => n + e.substats[0].value, 0);
		return {
			feasible: true,
			damageByMember: { 1404: damage },
			teamDamage: damage,
			duration: 1,
			energy: [],
			diagnostics: [],
			stats: {},
		};
	};
	const a = await searchInventory(input, scorer, () => {});
	const b = await searchInventory(input, scorer, () => {});
	expect(a.results).toEqual(b.results);
	expect(a.baseline).toBeNull();
	expect(a.results.length).toBe(8);
	const byUid = new Map(input.inventory.map((e) => [e.uid, e]));
	for (const r of a.results)
		expect(
			isLegalBuild(
				r.uids.map((u) => byUid.get(u)!),
				input.mainTypeId,
			),
		).toBe(true);
	// Independent brute-force oracle for the best score over this tiny inventory.
	let best = -Infinity;
	for (const main of input.inventory.filter(
		(e) => e.typeId === input.mainTypeId,
	))
		for (let a = 0; a < 10; a++)
			for (let b = a + 1; b < 10; b++)
				for (let c = b + 1; c < 10; c++)
					for (let d = c + 1; d < 10; d++) {
						const combo = [
							main,
							input.inventory[a],
							input.inventory[b],
							input.inventory[c],
							input.inventory[d],
						];
						if (isLegalBuild(combo, input.mainTypeId))
							best = Math.max(
								best,
								combo.reduce((n, e) => n + e.substats[0].value, 0),
							);
					}
	expect(a.results[0].damage).toBe(best);
});
test("support uses team total, and provisional candidates must pass strict validation", async () => {
	const input = request();
	const scorer = (s: SearchRequest["scenario"]): SimulationResult => {
		const n = s.members[2].echoes.reduce((n, e) => n + e.substats[0].value, 0);
		return {
			feasible: true,
			damageByMember: { 1404: 100 - n, 1204: 2 * n },
			teamDamage: 100 + n,
			duration: 1,
			energy: [],
			diagnostics: [],
			stats: {},
		};
	};
	const support = await searchInventory(input, scorer, () => {});
	const own = await searchInventory(
		{ ...input, objective: { kind: "memberDamage", characterId: 1404 } },
		scorer,
		() => {},
	);
	expect(support.results[0].uids).not.toEqual(own.results[0].uids);
	const strict = (s: SearchRequest["scenario"]) => ({
		...scorer(s),
		feasible: false,
		diagnostics: ["Invalid timed resource condition"],
	});
	const checked = await searchInventory(
		input,
		scorer,
		() => {},
		undefined,
		strict,
	);
	expect(checked.results).toEqual([]);
	const one = { ...input, resultsLimit: 1 };
	const rejectHighest = (s: SearchRequest["scenario"]) => {
		const value = scorer(s);
		return {
			...value,
			feasible: value.teamDamage <= 140,
			diagnostics: value.teamDamage <= 140 ? [] : ["Invalid timed condition"],
		};
	};
	const expected = await searchInventory(one, rejectHighest, () => {});
	const validated = await searchInventory(
		one,
		scorer,
		() => {},
		undefined,
		rejectHighest,
	);
	expect(expected.results.length).toBe(1);
	expect(validated.results[0].damage).toBe(expected.results[0].damage);
});
test("cancellation and evaluation budget are bounded", async () => {
	const input = request();
	input.budget = 3;
	const score = (): SimulationResult => ({
		feasible: true,
		damageByMember: {},
		teamDamage: 1,
		duration: 1,
		energy: [],
		diagnostics: [],
		stats: {},
	});
	expect(
		(await searchInventory(input, score, () => {})).progress.processed,
	).toBeLessThanOrEqual(3);
	expect(
		(
			await searchInventory(
				input,
				score,
				() => {},
				() => true,
			)
		).progress.processed,
	).toBe(0);
});

test("real Riley support search matches an independently enumerated small-inventory optimum", async () => {
	const fixture = makeFixture(getCatalog(), 10, 31415, 1);
	const input: SearchRequest = {
		...request(),
		scenario: fixture.scenario,
		inventory: fixture.inventory,
		targetId: 1204,
		mainTypeId: fixture.profile.members[1].mainEcho.typeId,
	};
	let best = -Infinity;
	for (const main of input.inventory.filter(
		(e) => e.typeId === input.mainTypeId,
	)) {
		for (let a = 0; a < 7; a++)
			for (let b = a + 1; b < 8; b++)
				for (let c = b + 1; c < 9; c++)
					for (let d = c + 1; d < 10; d++) {
						const combo = [
							main,
							input.inventory[a],
							input.inventory[b],
							input.inventory[c],
							input.inventory[d],
						];
						if (!isLegalBuild(combo, input.mainTypeId)) continue;
						const result = evaluate({
							...input.scenario,
							members: input.scenario.members.map((m) =>
								m.characterId === 1204 ? { ...m, echoes: combo } : m,
							),
						});
						if (result.feasible) best = Math.max(best, result.teamDamage);
					}
	}
	const before = JSON.stringify(
		input.scenario.members.filter((m) => m.characterId !== 1204),
	);
	const result = await searchInventory(input, evaluate, () => {});
	expect(Number.isFinite(best)).toBe(true);
	expect(result.results[0].damage).toBe(best);
	expect(
		JSON.stringify(
			input.scenario.members.filter((m) => m.characterId !== 1204),
		),
	).toBe(before);
});
