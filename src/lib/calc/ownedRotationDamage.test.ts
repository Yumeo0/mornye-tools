import { expect, test } from "bun:test";
import { customRotationProfile, seedRotation } from "@/lib/customRotations";
import { bundledRotationScore } from "./bundledRotationDamage";
import {
	measureRotationDamageAtChains as measureRotationDamage,
	referenceScenarioAtChains as referenceScenario,
	usesReferenceChains,
} from "./ownedRotationDamage";
import {
	evaluate,
	getCatalog,
	resolveRotationStats,
} from "./riley/engine.generated.js";
import {
	rotationDamageKey,
	rotationReferenceRevision,
	savedRotationDamage,
} from "./rotationDamageCache";

function preset() {
	const profile = getCatalog().teams.find(
		(team) =>
			team.members.map((m) => m.name).join("/") ===
			"Phrolova/Shorekeeper/Lucilla",
	);
	if (!profile) throw new Error("Missing Phrolova team");
	return profile;
}

test("owned chains affect the actual simulation, including support chain buffs", () => {
	const profile = preset();
	const before = JSON.stringify(profile);
	const chains = { 1608: 6, 1505: 2, 1109: 0 };
	const scenario = referenceScenario(profile, chains);
	expect(scenario.members.map((member) => member.chain)).toEqual([6, 2, 0]);
	const actual = evaluate(resolveRotationStats(scenario));
	expect(actual.feasible).toBe(true);
	const score = measureRotationDamage(
		profile,
		resolveRotationStats,
		evaluate,
		chains,
	);
	expect(score).toEqual({ damage: actual.teamDamage, stats: actual.stats });
	const baseline = bundledRotationScore(profile, rotationReferenceRevision);
	expect(score.damage).toBeGreaterThan(baseline?.damage ?? Infinity);
	const support = measureRotationDamage(
		profile,
		resolveRotationStats,
		evaluate,
		{ 1608: 0, 1505: 2, 1109: 0 },
	);
	expect(support.damage).toBeGreaterThan(baseline?.damage ?? Infinity);
	expect(JSON.stringify(profile)).toBe(before);
});

test("custom rotations execute the saved flow at the owned chains", () => {
	const catalog = getCatalog();
	const kits = preset().members.map((member) => {
		const kit = catalog.rotationKits?.find(
			(candidate) =>
				candidate.member.loadoutId === member.loadoutId &&
				candidate.member.mainEcho.engineId === member.mainEcho.engineId,
		);
		if (!kit) throw new Error("Missing rotation kit");
		return kit;
	});
	const rotation = seedRotation(kits);
	const profile = customRotationProfile(rotation, catalog);
	const chains = { 1608: 6, 1505: 2, 1109: 0 };
	const scenario = referenceScenario(profile, chains);
	expect(scenario.rotation).toBe(rotation);
	expect(scenario.members.map((member) => member.chain)).toEqual([6, 2, 0]);
	const actual = evaluate(resolveRotationStats(scenario));
	expect(actual.feasible).toBe(true);
	const score = measureRotationDamage(
		profile,
		resolveRotationStats,
		evaluate,
		chains,
	);
	expect(score.damage).toBe(actual.teamDamage);
	expect(score.damage).toBeGreaterThan(0);
});

test("chain-specific scores cannot fall back to bundled minimum-chain scores", () => {
	const profile = preset();
	const revision = rotationReferenceRevision;
	const minimums = Object.fromEntries(
		profile.members.map((m) => [m.characterId, m.minSequence]),
	);
	const chains = { ...minimums, 1608: 6 };
	expect(usesReferenceChains(profile, minimums)).toBe(true);
	expect(usesReferenceChains(profile, chains)).toBe(false);
	expect(savedRotationDamage(revision, profile, minimums)).toEqual(
		bundledRotationScore(profile, revision),
	);
	expect(savedRotationDamage(revision, profile, chains)).toBeUndefined();
	const referenceKey = rotationDamageKey(revision, profile);
	expect(rotationDamageKey(revision, profile, minimums)).toBe(referenceKey);
	const ownedKey = rotationDamageKey(revision, profile, chains);
	expect(ownedKey).not.toBe(referenceKey);
	expect(rotationDamageKey(revision, profile, { ...chains, 1505: 2 })).not.toBe(
		ownedKey,
	);
	expect(rotationDamageKey(revision, profile, { ...chains, 999999: 6 })).toBe(
		ownedKey,
	);
	expect(rotationDamageKey("different-revision", profile, chains)).not.toBe(
		ownedKey,
	);
	const custom = {
		...profile,
		customRotation: seedRotation([]),
	};
	expect(rotationDamageKey(revision, custom, chains)).not.toBe(ownedKey);
	const edited = structuredClone(custom);
	edited.customRotation.nodes = [
		{ id: "wait", kind: "wait", characterId: 1608, seconds: 1 },
	];
	expect(rotationDamageKey(revision, edited, chains)).not.toBe(
		rotationDamageKey(revision, custom, chains),
	);
});

test("unsupported owned chains are rejected rather than silently lowered", () => {
	const profile = preset();
	for (const chain of [-1, 0.5, 7, NaN]) {
		const score = measureRotationDamage(
			profile,
			() => {
				throw new Error("Should not prepare invalid chains");
			},
			evaluate,
			{ 1608: chain },
		);
		expect(score.damage).toBeNull();
		expect(score.error).toContain("outside this rotation's supported chains");
	}
});
