import { expect, test } from "bun:test";
import {
	evaluate,
	getCatalog,
	resolveRotationStats,
} from "./riley/engine.generated.js";
import { measureRotationDamage, referenceScenario } from "./rotationDamage";

for (const [name, suffix] of [
	["Galbrena", "15051.0.6000060/14111.0.6000116/12082.1.6000120"],
	["Denia Fusion Burst", "12111.0.6000200/15091.0.6000198/12101.1.6000191"],
	["Denia Tune Strain", "12091.0.6000190/12112.0.6000198/14131.1.6000221"],
	["Iuno", "14071.0.6000113/14051.0.6000052/14102.1.6000160"],
	["Xuanling", "11101.0.6000216/12041.0.6000052/16101.1.6000218"],
	["Zani", "14072.0.6000113/15091.0.6000189/15071.1.6000104"],
	["Camellya", "15031.0.6000060/11021.0.6000052/16031.1.6000090"],
]) {
	test(`${name}: Forte report deficits do not override legal casts`, () => {
		const profile = getCatalog().teams.find(
			(p) => p.id === `riley-v1:${suffix}`,
		);
		if (!profile) throw new Error(`Missing ${name} preset`);
		const result = evaluate(resolveRotationStats(referenceScenario(profile)));
		expect(result.diagnostics).toEqual([]);
		expect(result.feasible).toBe(true);
		expect(result.teamDamage).toBeGreaterThan(0);
	});
}

for (const characterId of [1404, 1410, 1413]) {
	test(`${characterId}: a passive Kelpie main keeps its Outro damage and fixed main slot`, () => {
		const profile = getCatalog().teams.find(
			(p) =>
				p.members.some(
					(m) =>
						m.characterId === characterId && m.mainEcho.engineId === 6000113,
				) && p.members.every((m) => m.characterId !== 1512),
		);
		if (!profile)
			throw new Error(`Missing passive Kelpie preset ${characterId}`);
		expect(profile.errors).toEqual([]);
		const scenario = resolveRotationStats(referenceScenario(profile));
		const result = evaluate({ ...scenario, capturePlayback: true });
		expect(result.diagnostics).toEqual([]);
		expect(
			result.playback?.some(
				(event) =>
					event.characterId === characterId &&
					event.name === "Echo - Nightmare: Kelpie (Outro)",
			),
		).toBe(true);
		const wrongMain = structuredClone(scenario);
		const member = wrongMain.members.find(
			(m) => m.characterId === characterId,
		)!;
		// An invalid theoretical echo choice is still rejected before a run.
		member.rotationStats!.echoIndex = -1;
		expect(() => evaluate(wrongMain)).toThrow("invalid rotation stat template");
	});
}

for (const suffix of [
	"11101.0.6000216/15011.0.6000060/15071.1.6000104",
	"11101.0.6000216/15011.0.6000060/15071.1.6000092",
	"15031.0.6000060/15011.0.6000060/15071.1.6000104",
	"15031.0.6000060/15011.0.6000060/15071.1.6000092",
	"15031.0.6000060/15011.0.6000060/15062.1.6000104",
	"15051.0.6000060/14071.0.6000052/14041.1.6000086",
	"15031.0.6000060/14101.0.6000052/14041.1.6000086",
	"15031.0.6000060/14071.0.6000052/14041.1.6000086",
]) {
	test(`${suffix}: ER mains sustain the rotation without adding free stats`, () => {
		const profile = getCatalog().teams.find(
			(p) => p.id === `riley-v1:${suffix}`,
		);
		if (!profile) throw new Error("Missing ER fallback preset");
		const resolved = resolveRotationStats(referenceScenario(profile));
		const result = evaluate(resolved);
		expect(result.diagnostics).toEqual([]);
		for (const energy of result.energy) {
			expect(energy.feasible).toBe(true);
			expect(energy.actual + 1e-6).toBeGreaterThanOrEqual(
				Math.max(energy.required, energy.kitMinimum),
			);
		}
		const target = result.energy.find(
			(e) => e.characterId === 1501 || e.characterId === 1404,
		)!;
		expect(target.actual).toBeGreaterThan(127.6);
	});
}

test("only known Lily model gaps yield marked preset estimates; custom and unrelated failures stay invalid", () => {
	const profile = getCatalog().teams.find((p) =>
		p.members.some((m) => m.characterId === 1512),
	)!;
	const result = evaluate(resolveRotationStats(referenceScenario(profile)));
	expect(result.feasible).toBe(false);
	expect(
		result.diagnostics.every((message) => message.startsWith("Lily:")),
	).toBe(true);
	const score = measureRotationDamage(profile, resolveRotationStats, evaluate);
	expect(score.damage).toBe(result.teamDamage);
	expect(score.warning).toContain("Dream Perfume");
	expect(score.error).toBeUndefined();
	const unrelated = measureRotationDamage(
		profile,
		(s) => s,
		() => ({
			...result,
			diagnostics: [...result.diagnostics, "Lily: insufficient ER"],
		}),
	);
	expect(unrelated.damage).toBeNull();
	expect(unrelated.warning).toBeUndefined();
	const custom = {
		...profile,
		customRotation: { id: "custom:lily", name: "Lily", nodes: [], members: [] },
	};
	expect(
		measureRotationDamage(
			custom,
			(s) => s,
			() => result,
		).damage,
	).toBeNull();
});
