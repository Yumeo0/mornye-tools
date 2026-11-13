import { expect, test } from "bun:test";
import { customRotationProfile, seedRotation } from "@/lib/customRotations";
import { required } from "@/lib/required";
import {
	evaluate,
	getCatalog,
	resolveRotationStats,
} from "./riley/engine.generated.js";
import { measureRotationDamage, referenceScenario } from "./rotationDamage";
import {
	cachedRotationDamage,
	loadRotationDamageCache,
	rememberRotationDamage,
	rotationDamageKey,
} from "./rotationDamageCache";

test("reference damage uses the real team simulation with consistent account-independent builds", () => {
	const profile = getCatalog().teams[0];
	const before = JSON.stringify(profile);
	const scenario = referenceScenario(profile);
	expect(scenario.cycles).toBe(4);
	expect(
		scenario.members.every(
			(m) => m.echoSource === "rotation" && !m.echoes.length,
		),
	).toBe(true);
	for (const [i, m] of scenario.members.entries()) {
		expect(m.chain).toBe(profile.members[i].minSequence);
		expect(m.weaponId).toBe(profile.members[i].defaultWeapon.id);
	}
	const score = measureRotationDamage(profile, resolveRotationStats, evaluate);
	const actual = evaluate(resolveRotationStats(scenario));
	expect(actual.feasible).toBe(true);
	expect(score).toEqual({ damage: actual.teamDamage, stats: actual.stats });
	expect(score.damage).toBeGreaterThan(0);
	expect(JSON.stringify(profile)).toBe(before);
});

test("invalid rotations have no sortable damage and do not stop later scores", () => {
	const profile = getCatalog().teams[0];
	const invalid = { ...profile, errors: ["Unsupported rotation"] };
	expect(
		measureRotationDamage(invalid, resolveRotationStats, evaluate),
	).toEqual({ damage: null, error: "Unsupported rotation" });
	expect(
		measureRotationDamage(
			profile,
			() => {
				throw new Error("Missing template");
			},
			evaluate,
		),
	).toEqual({ damage: null, error: "Missing template" });
	const result = evaluate(resolveRotationStats(referenceScenario(profile)));
	expect(
		measureRotationDamage(
			profile,
			(s) => s,
			() => ({
				...result,
				feasible: false,
				diagnostics: ["Requires: Concerto >= 100"],
			}),
		),
	).toEqual({
		damage: null,
		error: "Requires: Concerto >= 100",
		stats: result.stats,
	});
	expect(
		measureRotationDamage(
			profile,
			(s) => s,
			() => result,
		).damage,
	).toBeGreaterThan(0);
});

test("Hsin reference scores accept the final Heart drain in both resonance modes", () => {
	const catalog = getCatalog();
	for (const loadoutId of [13111, 13112]) {
		const profile = catalog.teams.find(
			(p) =>
				p.members.some((m) => m.loadoutId === loadoutId) &&
				p.members.every((m) => m.name !== "Lily" && m.name !== "Chisa"),
		);
		if (!profile) throw new Error(`Missing Hsin loadout ${loadoutId}`);
		const resolved = resolveRotationStats(referenceScenario(profile));
		const validated = evaluate(resolved);
		expect(validated.diagnostics).toEqual([]);
		expect(validated.feasible).toBe(true);
		expect(validated.teamDamage).toBeGreaterThan(0);
		expect(
			measureRotationDamage(profile, resolveRotationStats, evaluate),
		).toEqual({ damage: validated.teamDamage, stats: validated.stats });
	}
});

test("Hsin and Chisa reference damage accepts Chisa's final Ring drain into Eradication", () => {
	const profile = getCatalog().teams.find(
		(p) =>
			p.members.some((m) => m.characterId === 1311) &&
			p.members.some((m) => m.characterId === 1508) &&
			p.members.every((m) => m.name !== "Lily"),
	);
	if (!profile) throw new Error("Missing Hsin/Chisa team");
	const score = measureRotationDamage(profile, resolveRotationStats, evaluate);
	expect(score.error).toBeUndefined();
	expect(score.damage).toBeGreaterThan(0);
});

test("custom reference scenarios preserve edited actions and invalidate cached scores", () => {
	const profile = getCatalog().teams[0];
	const customRotation = {
		id: "custom:test",
		name: "Test",
		members: profile.members.map((m) => ({
			loadoutId: m.loadoutId,
			mainEchoId: m.mainEcho.engineId,
			mainDps: m.mainDps,
		})),
		nodes: [
			{
				id: "wait",
				kind: "wait" as const,
				characterId: profile.members[0].characterId,
				seconds: 1,
			},
		],
	};
	const custom = { ...profile, id: customRotation.id, customRotation };
	expect(referenceScenario(custom).rotation).toEqual(customRotation);
	const key = rotationDamageKey("revision-a", custom);
	expect(rotationDamageKey("revision-b", custom)).not.toBe(key);
	const edited = structuredClone(custom);
	edited.customRotation.nodes[0].seconds = 2;
	expect(rotationDamageKey("revision-a", edited)).not.toBe(key);
});

test("custom damage and builder playback use the same optimal Riley stats", () => {
	const catalog = getCatalog();
	const preset = catalog.teams.find(
		(p) =>
			!p.errors.length &&
			p.members.map((m) => m.name).join("/") === "Phrolova/Shorekeeper/Lucilla",
	);
	if (!preset) throw new Error("Missing Phrolova team");
	const kits = preset.members.map((m) => {
		const kit = catalog.rotationKits?.find(
			(k) =>
				k.member.loadoutId === m.loadoutId &&
				k.member.mainEcho.engineId === m.mainEcho.engineId,
		);
		if (!kit) throw new Error("Missing rotation kit");
		return kit;
	});
	const rotation = seedRotation(kits);
	const profile = customRotationProfile(rotation, catalog);
	const resolved = resolveRotationStats(referenceScenario(profile));
	expect(resolved.members.every((m) => m.rotationStats != null)).toBe(true);
	const playback = evaluate({ ...resolved, capturePlayback: true });
	const score = measureRotationDamage(profile, resolveRotationStats, evaluate);
	expect(playback.feasible).toBe(true);
	expect(score.damage).toBe(playback.teamDamage);
	expect(score.stats).toEqual(playback.stats);
	expect(score.stats?.[1505].er).toBeGreaterThanOrEqual(240);
});

test("reference scores restore from disk and progressive scores are saved together", async () => {
	const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
	const disk = new Map([
		[
			"optimizer.customRotationDamage.v2",
			JSON.stringify({
				previous: { damage: 12345 },
				invalid: { damage: null, error: "Requires ER" },
			}),
		],
	]);
	const written = Promise.withResolvers<void>();
	const optimalStats = {
		1404: { atk: 2000, hp: 18000, def: 1200, er: 130, cr: 75, cd: 260 },
	};
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: {
			getItem: (key: string) => disk.get(key) ?? null,
			setItem: (key: string, value: string) => {
				disk.set(key, value);
				written.resolve();
			},
		},
	});
	try {
		await loadRotationDamageCache();
		expect(cachedRotationDamage("previous")).toEqual({ damage: 12345 });
		expect(cachedRotationDamage("invalid")).toEqual({
			damage: null,
			error: "Requires ER",
		});
		rememberRotationDamage("next", { damage: 23456, stats: optimalStats });
		rememberRotationDamage("another", { damage: 34567 });
		await written.promise;
		expect(
			JSON.parse(required(disk.get("optimizer.customRotationDamage.v2"))),
		).toEqual({
			previous: { damage: 12345 },
			invalid: { damage: null, error: "Requires ER" },
			next: { damage: 23456, stats: optimalStats },
			another: { damage: 34567 },
		});
	} finally {
		if (original) Object.defineProperty(globalThis, "localStorage", original);
		else Reflect.deleteProperty(globalThis, "localStorage");
	}
});
