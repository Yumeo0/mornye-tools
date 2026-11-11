import { expect, test } from "bun:test";
import { EMPTY_ACCOUNT } from "@/lib/account";
import { getCatalog } from "@/lib/calc/riley/engine.generated.js";
import type { RotationDamage } from "@/lib/calc/rotationDamage";
import {
	EMPTY_ROTATION_FILTERS,
	filterRotationProfiles,
	groupRotationProfiles,
} from "./rotationProfiles";

test("team grouping preserves score order, roles and independently named custom rotations", () => {
	const base = getCatalog().teams[0];
	const first = { ...base, id: "best" };
	const alternate = { ...base, id: "alternate" };
	const otherRole = {
		...base,
		id: "role",
		members: base.members.map((m, i) =>
			i === 0 ? { ...m, mainDps: !m.mainDps } : m,
		),
	};
	const custom = (id: string) => ({
		...base,
		id,
		customRotation: { id, name: id, members: [], nodes: [] },
	});
	const profiles = [
		first,
		otherRole,
		alternate,
		custom("custom-a"),
		custom("custom-b"),
	];
	expect(
		groupRotationProfiles(profiles).map((g) => g.profiles.map((p) => p.id)),
	).toEqual([["best", "alternate"], ["role"], ["custom-a"], ["custom-b"]]);
	expect(profiles.map((p) => p.id)).toEqual([
		"best",
		"role",
		"alternate",
		"custom-a",
		"custom-b",
	]);
});

test("character role filters apply to that character rather than another teammate", () => {
	const profiles = getCatalog().teams;
	const filters = { ...EMPTY_ROTATION_FILTERS, characterId: "1404" };
	const dps = filterRotationProfiles(profiles, EMPTY_ACCOUNT, {
		...filters,
		role: "dps",
	});
	expect(dps.length).toBeGreaterThan(0);
	expect(
		dps.every((p) => p.members.find((m) => m.characterId === 1404)?.mainDps),
	).toBe(true);
	expect(
		filterRotationProfiles(profiles, EMPTY_ACCOUNT, {
			...filters,
			role: "support",
		}),
	).toEqual([]);
});

test("rotation search combines teammates, variant and fixed main echo without losing variants", () => {
	const profiles = getCatalog().teams;
	const before = profiles.map((p) => p.id);
	const matches = filterRotationProfiles(profiles, EMPTY_ACCOUNT, {
		...EMPTY_ROTATION_FILTERS,
		characterId: "1608",
		search: "  SHOREKEEPER lucilla nightmare: hecate  ",
	});
	expect(matches.length).toBeGreaterThan(2);
	const allPhrolova = filterRotationProfiles(profiles, EMPTY_ACCOUNT, {
		...EMPTY_ROTATION_FILTERS,
		characterId: "1608",
	});
	expect(
		new Set(
			allPhrolova.map(
				(p) => p.members.find((m) => m.characterId === 1608)?.loadoutId,
			),
		).size,
	).toBe(3);
	expect(
		matches.every(
			(p) =>
				p.members.some((m) => m.name === "Shorekeeper") &&
				p.members.some((m) => m.name === "Lucilla"),
		),
	).toBe(true);
	expect(profiles.map((p) => p.id)).toEqual(before);
});

test("ownership is team-wide and rotations with compatibility errors remain visible", () => {
	const profiles = getCatalog().teams;
	expect(
		filterRotationProfiles(profiles, EMPTY_ACCOUNT, EMPTY_ROTATION_FILTERS),
	).toHaveLength(profiles.length);
	expect(
		filterRotationProfiles(profiles, EMPTY_ACCOUNT, {
			...EMPTY_ROTATION_FILTERS,
			ownership: "owned",
		}),
	).toEqual([]);
	const selected = profiles.find((p) => !p.errors.length);
	if (!selected) throw new Error("Expected a compatible preset");
	const snapshot = {
		...EMPTY_ACCOUNT,
		resonators: selected.members.map((m) => ({
			id: m.characterId,
			name: m.name,
			level: 90,
			chain: 0,
			breakthrough: 6,
			skills: [],
		})),
	};
	const owned = filterRotationProfiles(profiles, snapshot, {
		...EMPTY_ROTATION_FILTERS,
		ownership: "owned",
	});
	expect(owned.some((p) => p.id === selected.id)).toBe(true);
	expect(
		owned.every((p) =>
			p.members.every((m) =>
				snapshot.resonators.some((r) => r.id === m.characterId),
			),
		),
	).toBe(true);
	const incompatible = {
		...selected,
		id: "incompatible",
		errors: ["Missing mapping"],
	};
	expect(
		filterRotationProfiles([incompatible], snapshot, EMPTY_ROTATION_FILTERS),
	).toEqual([incompatible]);
});

test("damage sorting ranks valid scores in both directions with unknown scores last and stable ties", () => {
	const template = getCatalog().teams[0];
	const profiles = ["pending", "low", "invalid", "high-b", "high-a"].map(
		(id) => ({ ...template, id, label: "Team" }),
	);
	const before = profiles.map((p) => p.id);
	const scores = new Map<string, RotationDamage>([
		["low", { damage: 100 }],
		["high-a", { damage: 200 }],
		["high-b", { damage: 200 }],
		["invalid", { damage: null, error: "ER requirement" }],
	]);
	const sorted = (sort: "damage-desc" | "damage-asc" | "name") =>
		filterRotationProfiles(
			profiles,
			EMPTY_ACCOUNT,
			{ ...EMPTY_ROTATION_FILTERS, sort },
			scores,
		).map((p) => p.id);
	expect(sorted("damage-desc")).toEqual([
		"high-a",
		"high-b",
		"low",
		"invalid",
		"pending",
	]);
	expect(sorted("damage-asc")).toEqual([
		"low",
		"high-a",
		"high-b",
		"invalid",
		"pending",
	]);
	expect(sorted("name")).toEqual([
		"high-a",
		"high-b",
		"invalid",
		"low",
		"pending",
	]);
	expect(profiles.map((p) => p.id)).toEqual(before);
});
