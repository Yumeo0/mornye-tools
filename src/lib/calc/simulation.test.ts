import { expect, test } from "bun:test";
import echoData from "@/configs/echo_data.json";
import { required } from "@/lib/required";
import { makeFixture } from "../../../calculator/fixture";
import {
	evaluate,
	evaluateFast,
	getCatalog,
} from "./riley/engine.generated.js";
import { objectiveScore } from "./search";
import type { Scenario } from "./types";

test("registry includes support alternatives, ordered roles, and distinct Phrolova rotations", () => {
	const catalog = getCatalog();
	expect(new Set(catalog.teams.map((t) => t.id)).size).toBe(
		catalog.teams.length,
	);
	const verina = catalog.teams.filter((t) =>
		t.members.some((m) => m.name === "Verina"),
	);
	expect(verina.length).toBeGreaterThan(10);
	expect(
		verina.some((t) => t.members[0].name === "Verina" && !t.members[0].mainDps),
	).toBe(true);
	expect(
		new Set(
			catalog.teams
				.flatMap((t) => t.members)
				.filter((m) => m.name === "Phrolova")
				.map((m) => m.loadoutId),
		).size,
	).toBe(3);
});
test("exact inventory stats, hit ownership, fast/validated scores, and state isolation", () => {
	const { scenario } = makeFixture(getCatalog());
	const before = JSON.stringify(scenario);
	const a = evaluate(scenario);
	expect(a.feasible).toBe(true);
	expect(a.teamDamage).toBe(
		Object.values(a.damageByMember).reduce((n, d) => n + d, 0),
	);
	expect(objectiveScore(a, { kind: "teamDamage" })).toBeGreaterThan(
		objectiveScore(a, { kind: "memberDamage", characterId: 1404 }),
	);
	const target = required(scenario.members.find((m) => m.characterId === 1404));
	const held =
		100 +
		target.echoes
			.flatMap((e) => [...e.mainStats, ...e.substats])
			.filter((p) => p.key === "energyRegen")
			.reduce((n, p) => n + p.value, 0);
	expect(
		required(a.energy.find((e) => e.characterId === 1404)).actual,
	).toBeCloseTo(held, 8);
	const changed = structuredClone(scenario);
	changed.members[2].echoes[1].substats[0].value += 1;
	evaluate(changed);
	expect(evaluate(scenario)).toEqual(a);
	const fast = evaluateFast(scenario);
	expect(fast.damageByMember).toEqual(a.damageByMember);
	expect(fast.energy).toEqual(a.energy);
	expect(JSON.stringify(scenario)).toBe(before);
});
test("a full-energy opener cannot hide repeat-cycle energy deficits", () => {
	const { scenario } = makeFixture(getCatalog());
	for (const e of scenario.members[2].echoes)
		for (const p of [...e.mainStats, ...e.substats])
			if (p.key === "energyRegen") {
				p.key = "atkPercent";
				p.value = 0;
			}
	expect(evaluate({ ...scenario, cycles: 1 }).feasible).toBe(true);
	const result = evaluate(scenario);
	expect(result.feasible).toBe(false);
	expect(result.energy[2].required).toBeGreaterThan(result.energy[2].actual);
});
test("fixed main type, unique owned instances, and supported weapon are enforced", () => {
	const { scenario } = makeFixture(getCatalog());
	const wrong = structuredClone(scenario);
	wrong.members[2].echoes[0].typeId = -1;
	expect(() => evaluate(wrong)).toThrow("slot one");
	const shared = structuredClone(scenario);
	shared.members[2].echoes[1].uid = shared.members[0].echoes[1].uid;
	expect(() => evaluate(shared)).toThrow("different owned instance");
	const weapon = structuredClone(scenario);
	weapon.members[2].weaponId = 1;
	expect(() => evaluate(weapon)).toThrow("unsupported");
});

test("mapped main echoes pass equipment validation despite upstream name differences", () => {
	const catalog = getCatalog();
	const { scenario: fixture } = makeFixture(catalog);
	for (const mainId of [6000199, 6000225, 6000201, 6000121]) {
		const profile = required(
			catalog.teams.find(
				(team) =>
					!team.errors.length &&
					team.members.some((m) => m.mainEcho.engineId === mainId),
			),
		);
		const scenario: Scenario = {
			profileId: "custom:mapped-main",
			cycles: 1,
			rotation: {
				id: "mapped-main",
				name: "Mapped main echo",
				members: profile.members.map((m) => ({
					loadoutId: m.loadoutId,
					mainEchoId: m.mainEcho.engineId,
					mainDps: m.mainDps,
				})),
				nodes: profile.members.map((m) => ({
					id: `wait:${m.characterId}`,
					kind: "wait",
					characterId: m.characterId,
					seconds: 0.1,
				})),
			},
			members: profile.members.map((m, i) => ({
				characterId: m.characterId,
				chain: m.minSequence,
				weaponId: m.weapons[0].id,
				weaponRank: m.weapons[0].ranks[0],
				echoes: fixture.members[i].echoes.map((echo, slot) => ({
					...echo,
					uid: `mapped:${mainId}:${m.characterId}:${slot}`,
					...(slot === 0
						? {
								typeId: m.mainEcho.typeId,
								name: m.mainEcho.name,
								setId: required(
									echoData.find((e) => e.monster_id === m.mainEcho.typeId),
								).echo_sets[0].id,
							}
						: {}),
				})),
			})),
		};
		const member = required(
			profile.members.find((m) => m.mainEcho.engineId === mainId),
		);
		expect(
			evaluateFast(scenario).stats[member.characterId].atk,
		).toBeGreaterThan(0);
		const wrong = structuredClone(scenario);
		required(
			wrong.members.find((m) => m.characterId === member.characterId),
		).echoes[0].typeId = -1;
		expect(() => evaluateFast(wrong)).toThrow("slot one");
	}
});
test("duplicate species do not activate a five-piece sonata", () => {
	const { scenario } = makeFixture(getCatalog());
	const original = evaluate(scenario);
	const duplicate = structuredClone(scenario);
	duplicate.members[2].echoes[4].typeId = duplicate.members[2].echoes[3].typeId;
	expect(evaluate(duplicate).damageByMember[1404]).toBeLessThan(
		original.damageByMember[1404],
	);
});

test("rotation-derived ER is feasible at its boundary and rejects a real shortfall", () => {
	const { scenario } = makeFixture(getCatalog());
	const required = evaluate(scenario).energy[2].required;
	const rolls = scenario.members[2].echoes
		.flatMap((e) => [...e.mainStats, ...e.substats])
		.filter((p) => p.key === "energyRegen");
	for (const roll of rolls) roll.value = 0;
	const er = rolls[0];
	er.value = required - 100;
	expect(evaluate(scenario).feasible).toBe(true);
	er.value -= 0.1;
	expect(evaluate(scenario).energy[2].feasible).toBe(false);
});
