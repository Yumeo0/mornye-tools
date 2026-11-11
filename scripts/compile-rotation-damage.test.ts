import { expect, test } from "bun:test";
import {
	evaluate,
	getCatalog,
	resolveRotationStats,
} from "../src/lib/calc/riley/engine.generated.js";
import { measureRotationDamage } from "../src/lib/calc/rotationDamage";
import {
	calculateRotationScores,
	reusableRotationScores,
} from "./compile-rotation-damage";

test("offline scoring isolates engines and retains complete deterministic results, including invalid teams", async () => {
	const profile = getCatalog().teams[0];
	const invalid = {
		...profile,
		id: "unsupported",
		errors: ["Unsupported rotation"],
	};
	const progress: number[] = [];
	const scores = await calculateRotationScores([profile, invalid], {
		workers: 2,
		onProgress: (n) => progress.push(n),
	});
	expect(Object.keys(scores)).toEqual([profile.id, invalid.id]);
	expect(scores[profile.id]).toEqual(
		measureRotationDamage(profile, resolveRotationStats, evaluate),
	);
	expect(
		scores[profile.id].stats?.[profile.members[0].characterId],
	).toBeDefined();
	expect(scores[invalid.id]).toEqual({
		damage: null,
		error: "Unsupported rotation",
	});
	expect(progress).toEqual([1, 2]);
	expect(await calculateRotationScores([])).toEqual({});
	await expect(calculateRotationScores([profile, profile])).rejects.toThrow(
		"Duplicate",
	);
});

test("offline scoring resumes matching checkpoints and recycles workers without losing teams", async () => {
	const profile = getCatalog().teams[0];
	const profiles = Array.from({ length: 19 }, (_, i) => ({
		...profile,
		id: `invalid:${i}`,
		errors: ["Unsupported rotation"],
	}));
	const seen: string[] = [];
	const scores = await calculateRotationScores(profiles, {
		workers: 1,
		seed: { [profiles[0].id]: { damage: null, error: "Already calculated" } },
		onScore: (id) => seen.push(id),
	});
	expect(seen).toEqual(profiles.slice(1).map((p) => p.id));
	expect(Object.keys(scores)).toEqual(profiles.map((p) => p.id));
	expect(scores[profiles[0].id].error).toBe("Already calculated");
});

test("a versioned snapshot skips simulation on a fresh checkout, including rotation diagnostics", async () => {
	const profile = getCatalog().teams[0];
	const invalid = { ...profile, id: "invalid" };
	const stats = Object.fromEntries(
		profile.members.map((m) => [
			m.characterId,
			{ atk: 2000, hp: 18000, def: 1200, er: 130, cr: 75, cd: 260 },
		]),
	);
	const snapshot = {
		revision: "current",
		scores: {
			[profile.id]: { damage: 12345, stats, warning: "Upstream model gap" },
			[invalid.id]: { damage: null, error: "Requires: Forte 1 >= 300" },
		},
	};
	const profiles = [profile, invalid];
	const seed = reusableRotationScores("current", profiles, [snapshot, null]);
	const calculated: string[] = [];
	expect(
		await calculateRotationScores(profiles, {
			seed,
			onScore: (id) => calculated.push(id),
		}),
	).toEqual(snapshot.scores);
	expect(calculated).toEqual([]);
	expect(reusableRotationScores("changed", profiles, [snapshot])).toEqual({});
	expect(
		reusableRotationScores("current", profiles, [{ broken: true }]),
	).toEqual({});
});

test("snapshot reuse excludes missing stats, empty diagnostics and removed rotations, and merges checkpoints", () => {
	const profile = getCatalog().teams[0];
	const invalid = { ...profile, id: "invalid" };
	const snapshot = {
		revision: "current",
		scores: {
			[profile.id]: { damage: 12345 },
			[invalid.id]: { damage: null },
			removed: { damage: null, error: "Removed rotation" },
		},
	};
	const profiles = [profile, invalid];
	expect(reusableRotationScores("current", profiles, [snapshot])).toEqual({});
	const checkpoint = {
		revision: "current",
		scores: {
			[invalid.id]: { damage: null, error: "Requires: Forte 1 >= 300" },
		},
	};
	expect(
		reusableRotationScores("current", profiles, [snapshot, checkpoint]),
	).toEqual(checkpoint.scores);
});
