import { expect, test } from "bun:test";
import { EMPTY_ACCOUNT } from "@/lib/account";
import type { RotationDamage } from "@/lib/calc/rotationDamage";
import type { TeamProfile } from "@/lib/calc/types";
import {
	bestTeamRotations,
	ownedTeamChains,
	ownedTeamRoleIds,
	ownedTeamRotations,
	type SuggestedTeam,
	suggestTeamCombination,
	TEAM_COUNTS,
	teamCharacterKey,
} from "./teamSuggestions";

function profile(id: string, characterIds: number[]): TeamProfile {
	return {
		id,
		label: id,
		errors: [],
		members: characterIds.map((characterId) => ({
			characterId,
			name: String(characterId),
			loadoutId: characterId * 10,
			variant: "Default",
			mainDps: false,
			mainEcho: { typeId: 1, name: "Echo", engineId: 1 },
			minSequence: 0,
			maxSequence: 6,
			weapons: [],
			defaultWeapon: { id: 1, rank: 1 },
			kitMinEr: 0,
			kitMinCr: 0,
			recommendedMains: [],
		})),
	};
}

const roster = (...ids: number[]) => ({
	...EMPTY_ACCOUNT,
	resonators: ids.map((id) => ({
		id,
		name: String(id),
		level: 90,
		breakthrough: 6,
		chain: 0,
		skills: [],
	})),
});

const team = (id: string, ids: number[], damage: number): SuggestedTeam => ({
	id,
	profile: profile(id, ids),
	damage,
});

test("suggestions use only complete owned rotations with the required chains", () => {
	const valid = profile("valid", [1, 2, 3]);
	const needsChain = profile("chain", [1, 2, 3]);
	needsChain.members[0].minSequence = 2;
	const profiles = [
		valid,
		needsChain,
		profile("unowned", [1, 2, 4]),
		profile("partial", [1, 2]),
		profile("repeated", [1, 2, 2]),
		{ ...valid, id: "broken", errors: ["Invalid action"] },
	];
	expect(ownedTeamRotations(profiles, roster(1, 2, 3))).toEqual([valid]);
	const account = roster(1, 2, 3);
	account.resonators[0].chain = 2;
	expect(ownedTeamRotations(profiles, account)).toEqual([valid, needsChain]);
	expect(ownedTeamRotations(profiles, roster())).toEqual([]);
	expect(ownedTeamRotations(profiles, roster(4, 5, 6))).toEqual([]);
});

test("Rover ownership recognizes gender and legacy aliases without unlocking other elements", () => {
	const spectro = profile("spectro", [1501, 1, 2]);
	const aero = profile("aero", [1406, 1, 2]);
	for (const id of [1501, 1502, 9990, 9991])
		expect(ownedTeamRotations([spectro, aero], roster(id, 1, 2))).toEqual([
			spectro,
		]);
	expect(
		ownedTeamRotations(
			[profile("two-rovers", [1501, 1406, 1])],
			roster(1501, 1406, 1),
		),
	).toEqual([]);
});

test("owned chain levels are preserved for scoring, including Rover aliases", () => {
	const account = roster(1502, 1, 2);
	account.resonators[0].chain = 6;
	account.resonators[1].chain = 3;
	expect(ownedTeamChains(account)).toEqual({ 1501: 6, 1: 3, 2: 0 });
	const limited = profile("limited", [1501, 1, 2]);
	limited.members[0].maxSequence = 2;
	expect(ownedTeamRotations([limited], account)).toEqual([]);
});

test("recommended lineups preserve rotation order when resolved to owned role IDs", () => {
	const rotation = profile("recommendation", [1404, 1505, 1503]);
	expect(ownedTeamRoleIds(rotation, roster(1503, 1404, 1505))).toEqual([
		1404, 1505, 1503,
	]);
});

test("replacement lineups use the owned Rover gender and legacy ID for the same element", () => {
	const rotation = profile("spectro", [1, 1501, 2]);
	for (const id of [1501, 1502, 9990, 9991])
		expect(ownedTeamRoleIds(rotation, roster(id, 1, 2))).toEqual([1, id, 2]);
	expect(ownedTeamRoleIds(rotation, roster(1406, 1, 2))).toBeNull();
	// Prefer an exact owned identity if both gender IDs were captured.
	expect(ownedTeamRoleIds(rotation, roster(1502, 1501, 1, 2))).toEqual([
		1, 1501, 2,
	]);
});

test("replacement lineups reject missing members, incomplete teams and repeated characters", () => {
	expect(
		ownedTeamRoleIds(profile("unowned", [1, 2, 4]), roster(1, 2, 3)),
	).toBeNull();
	expect(
		ownedTeamRoleIds(profile("partial", [1, 2]), roster(1, 2, 3)),
	).toBeNull();
	expect(
		ownedTeamRoleIds(profile("duplicate", [1, 2, 2]), roster(1, 2, 3)),
	).toBeNull();
	expect(
		ownedTeamRoleIds(
			profile("two-rovers", [1501, 1406, 1]),
			roster(1502, 1406, 1),
		),
	).toBeNull();
});

test("each lineup uses the strongest scored rotation across order, variants, and source", () => {
	const preset = profile("preset", [1, 2, 3]);
	const custom = {
		...profile("custom:saved", [3, 1, 2]),
		customRotation: { id: "saved", name: "Saved", members: [], nodes: [] },
	};
	const scores = new Map<string, RotationDamage>([
		[preset.id, { damage: 100 }],
		[custom.id, { damage: 150 }],
		["invalid", { damage: null, error: "Not feasible" }],
		["error", { damage: 500, error: "Failed simulation" }],
		["nan", { damage: NaN }],
		["infinite", { damage: Infinity }],
		["zero", { damage: 0 }],
		["negative", { damage: -5 }],
		["estimate", { damage: 125, warning: "Estimated" }],
	]);
	const candidates = bestTeamRotations(
		[
			preset,
			custom,
			...[
				"invalid",
				"error",
				"nan",
				"infinite",
				"zero",
				"negative",
				"estimate",
				"pending",
			].map((id) => profile(id, [4, 5, 6])),
		],
		scores,
	);
	expect(candidates.map((candidate) => candidate.profile.id)).toEqual([
		"custom:saved",
		"estimate",
	]);
	expect(candidates[1].warning).toBe("Estimated");
	scores.set(preset.id, { damage: 200 });
	expect(bestTeamRotations([custom, preset], scores)[0].profile.id).toBe(
		preset.id,
	);
});

test("the best disjoint combination can exclude the strongest individual team", () => {
	const candidates = [
		team("A", [1, 2, 3], 100),
		team("B", [1, 4, 5], 90),
		team("C", [2, 6, 7], 80),
		team("D", [8, 9, 10], 10),
	];
	const suggestion = suggestTeamCombination(candidates, 3);
	expect(suggestion?.damage).toBe(180);
	expect(suggestion?.teams.map((candidate) => candidate.id)).toEqual([
		"B",
		"C",
		"D",
	]);
	expect(suggestTeamCombination(candidates, 2)?.damage).toBe(170);
});

test("characters are never shared, even when only one team can be recommended", () => {
	const candidates = [
		team("A", [1, 2, 3], 100),
		team("B", [1, 4, 5], 90),
		team("C", [1, 6, 7], 80),
	];
	const suggestion = suggestTeamCombination(candidates, 1);
	expect(suggestion?.damage).toBe(100);
	expect(suggestion?.teams.map((candidate) => candidate.id)).toEqual(["A"]);
	expect(suggestTeamCombination(candidates, 2)).toBeNull();
});

test("different Rover elements reserve the same character across teams", () => {
	const candidates = [
		team("spectro", [1501, 1, 2], 100),
		team("aero", [1406, 3, 4], 90),
		team("other", [5, 6, 7], 80),
	];
	const suggestion = suggestTeamCombination(candidates, 2);
	expect(suggestion?.damage).toBe(180);
	expect(suggestion?.teams.map((candidate) => candidate.id)).toEqual([
		"spectro",
		"other",
	]);
	expect(suggestTeamCombination(candidates, 3)).toBeNull();
});

test("empty rosters produce no recommendation", () => {
	expect(suggestTeamCombination([], 1)).toBeNull();
});

test("the selected number of teams is respected even when fewer teams score higher", () => {
	const candidates = [
		team("A", [1, 2, 3], 100),
		team("B", [4, 5, 6], 90),
		team("C", [7, 8, 9], 80),
		team("D", [10, 11, 12], 10),
		team("E", [13, 14, 15], 9),
	];
	expect(suggestTeamCombination(candidates, 5)?.teams).toHaveLength(5);
	const withStrongTeam = [...candidates, team("strong", [1, 4, 7], 1000)];
	const suggestion = suggestTeamCombination(withStrongTeam, 5);
	expect(suggestion?.damage).toBe(289);
	expect(suggestion?.teams.map((candidate) => candidate.id)).toEqual([
		"A",
		"B",
		"C",
		"D",
		"E",
	]);
	expect(suggestTeamCombination(withStrongTeam, 3)?.damage).toBe(1019);
});

test("every selectable count from one to five returns that many teams", () => {
	const candidates = Array.from({ length: 6 }, (_, index) =>
		team(
			String(index),
			[index * 3 + 1, index * 3 + 2, index * 3 + 3],
			100 - index,
		),
	);
	for (const count of TEAM_COUNTS) {
		const suggestion = suggestTeamCombination(candidates, count);
		expect(suggestion?.teams).toHaveLength(count);
		expect(suggestion?.damage).toBe(
			candidates
				.slice(0, count)
				.reduce((sum, candidate) => sum + candidate.damage, 0),
		);
	}
	expect(suggestTeamCombination(candidates.slice(0, 4), 5)).toBeNull();
});

test("the pruned search matches exhaustive ranking for each selected team count", () => {
	let seed = 42;
	const random = () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed;
	};
	for (let round = 0; round < 12; round++) {
		const candidates = Array.from({ length: 14 }, (_, index) => {
			const ids = new Set<number>();
			while (ids.size < 3) ids.add(10000 + (random() % 15));
			return team(String(index), [...ids], 1 + (random() % 1000));
		});
		for (const count of TEAM_COUNTS) {
			let expected: number | null = null;
			const enumerate = (start: number, selected: SuggestedTeam[]) => {
				const keys = selected.flatMap((candidate) =>
					candidate.profile.members.map((m) => teamCharacterKey(m.characterId)),
				);
				if (new Set(keys).size !== keys.length) return;
				if (selected.length === count) {
					expected = Math.max(
						expected ?? 0,
						selected.reduce((sum, candidate) => sum + candidate.damage, 0),
					);
					return;
				}
				for (let index = start; index < candidates.length; index++)
					enumerate(index + 1, [...selected, candidates[index]]);
			};
			enumerate(0, []);
			const actual = suggestTeamCombination(candidates, count);
			expect(actual?.damage ?? null).toBe(expected);
			if (actual) expect(actual.teams).toHaveLength(count);
			expect(suggestTeamCombination(candidates.toReversed(), count)).toEqual(
				actual,
			);
		}
	}
});

test("character masks support rosters larger than 64 characters", () => {
	const candidates = Array.from({ length: 30 }, (_, index) =>
		team(
			String(index),
			[index * 3 + 1, index * 3 + 2, index * 3 + 3],
			100 - index,
		),
	);
	const suggestion = suggestTeamCombination(candidates, 5);
	expect(suggestion?.damage).toBe(490);
	expect(suggestion?.teams).toHaveLength(5);
	const conflict = team("conflict", [1, 100, 101], 500);
	const exact = suggestTeamCombination([...candidates, conflict], 5);
	expect(exact?.damage).toBe(500 + 99 + 98 + 97 + 96);
});
