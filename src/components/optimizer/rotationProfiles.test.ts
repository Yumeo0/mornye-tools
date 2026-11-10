import { expect, test } from "bun:test";
import { EMPTY_ACCOUNT } from "@/lib/account";
import { getCatalog } from "@/lib/calc/riley/engine.generated.js";
import {
	EMPTY_ROTATION_FILTERS,
	filterRotationProfiles,
} from "./rotationProfiles";

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
		compatibility: "supported",
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
				(p) => p.members.find((m) => m.characterId === 1608)!.loadoutId,
			),
		).size,
	).toBe(3);
	expect(
		matches.every(
			(p) =>
				!p.errors.length &&
				p.members.some((m) => m.name === "Shorekeeper") &&
				p.members.some((m) => m.name === "Lucilla"),
		),
	).toBe(true);
	expect(profiles.map((p) => p.id)).toEqual(before);
});

test("ownership is team-wide, compatibility is independent, and defaults keep all profiles visible", () => {
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
	const selected = profiles.find((p) => !p.errors.length)!;
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
		compatibility: "supported",
	});
	expect(owned.some((p) => p.id === selected.id)).toBe(true);
	expect(
		owned.every(
			(p) =>
				!p.errors.length &&
				p.members.every((m) =>
					snapshot.resonators.some((r) => r.id === m.characterId),
				),
		),
	).toBe(true);
});
