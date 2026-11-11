import { expect, test } from "bun:test";
import data from "@/configs/rotation_damage.json";
import {
	bundledRotationScore,
	validateBundledRotationDamage,
} from "./bundledRotationDamage";
import {
	evaluate,
	getCatalog,
	resolveRotationStats,
} from "./riley/engine.generated.js";
import reference from "./riley/reference.generated.json";
import { measureRotationDamage } from "./rotationDamage";
import { bundledRotationDamageSchema } from "./rotationDamageSchema";

test("every pre-made rotation has a current bundled score or diagnostic, with optimal stats matching the engine", () => {
	const bundle = bundledRotationDamageSchema.parse(data);
	const catalog = getCatalog();
	expect(
		validateBundledRotationDamage(bundle, reference.revision, catalog.teams),
	).toBeNull();
	for (const p of catalog.teams) {
		const score = bundledRotationScore(p, reference.revision);
		expect(score).toBeDefined();
		if (score?.damage == null) expect(score?.error).toBeTruthy();
		else
			for (const m of p.members)
				expect(score.stats?.[m.characterId]).toBeDefined();
		expect(score?.damage, p.id).toBeGreaterThan(0);
		if (p.members.some((m) => m.characterId === 1512))
			expect(score?.warning, p.id).toContain("Dream Perfume");
		else expect(score?.warning, p.id).toBeUndefined();
	}
	const profile = catalog.teams[0];
	expect(bundledRotationScore(profile, reference.revision)).toEqual(
		measureRotationDamage(profile, resolveRotationStats, evaluate),
	);
});

test("bundled data rejects stale/incomplete catalogs and never shadows a user rotation", () => {
	const profile = getCatalog().teams[0];
	const scores = { [profile.id]: { damage: 123 } };
	expect(
		validateBundledRotationDamage(
			{ revision: "old", scores },
			reference.revision,
			[profile],
		),
	).toContain("out of date");
	expect(
		validateBundledRotationDamage(
			{ revision: reference.revision, scores: {} },
			reference.revision,
			[profile],
		),
	).toContain("incomplete");
	expect(
		validateBundledRotationDamage(
			{ revision: reference.revision, scores },
			reference.revision,
			[profile],
		),
	).toContain("incomplete");
	expect(bundledRotationScore(profile, "old")).toBeUndefined();
	const custom = {
		...profile,
		customRotation: { id: profile.id, name: "Edited", nodes: [], members: [] },
	};
	expect(bundledRotationScore(custom, reference.revision)).toBeUndefined();
});

test("bundled Hsin teams include damage in both resonance modes", () => {
	const teams = getCatalog().teams.filter((p) =>
		p.members.some((m) => m.characterId === 1311),
	);
	for (const loadoutId of [13111, 13112])
		expect(
			teams.some(
				(p) =>
					p.members.some((m) => m.loadoutId === loadoutId) &&
					(bundledRotationScore(p, reference.revision)?.damage ?? 0) > 0,
			),
		).toBe(true);
	for (const p of teams)
		if (!p.members.some((m) => m.name === "Lily"))
			expect(
				bundledRotationScore(p, reference.revision)?.damage,
			).toBeGreaterThan(0);
	for (const p of teams)
		expect(
			bundledRotationScore(p, reference.revision)?.error ?? "",
		).not.toContain(
			"Hsin: Basic - Illumining Form: Pillars Aligned 3 — Forte 2: short by",
		);
});
