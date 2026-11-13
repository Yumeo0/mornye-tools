import type { Resonator } from "@/lib/account";
import type { RotationChains } from "@/lib/calc/ownedRotationDamage";
import type { RotationDamage } from "@/lib/calc/rotationDamage";
import { aliasRoleId } from "@/lib/calc/translate";
import type { TeamProfile } from "@/lib/calc/types";
import { catalogCharacters, charactersById } from "@/lib/catalog";

// The calculator models one Rover gender per element. Ownership stays specific
// to the unlocked element, while every element occupies the same team slot.
const roverForms = new Map<string, number>();
for (const character of catalogCharacters) {
	if (!character.character_name.startsWith("Rover:")) continue;
	const previous = roverForms.get(character.character_name);
	roverForms.set(
		character.character_name,
		Math.min(previous ?? Infinity, character.character_id),
	);
}

function rotationCharacterId(id: number): number {
	const aliased = Number(aliasRoleId(id));
	const name = charactersById.get(aliased)?.character_name;
	return (name && roverForms.get(name)) || aliased;
}

export function teamCharacterKey(id: number): string {
	const canonical = rotationCharacterId(id);
	return charactersById.get(canonical)?.character_name.startsWith("Rover:")
		? "rover"
		: String(canonical);
}

export function ownedTeamChains(snapshot: {
	resonators: readonly Pick<Resonator, "id" | "chain">[];
}): RotationChains {
	const chains: Record<number, number> = {};
	for (const role of snapshot.resonators) {
		const id = rotationCharacterId(role.id);
		chains[id] = Math.max(chains[id] ?? -1, role.chain);
	}
	return chains;
}

/** Resolve calculator identities to the account's actual IDs before team edits. */
export function ownedTeamRoleIds(
	profile: TeamProfile,
	snapshot: { resonators: readonly Pick<Resonator, "id">[] },
): number[] | null {
	if (profile.members.length !== 3) return null;
	const roleIds: number[] = [];
	for (const member of profile.members) {
		const role =
			snapshot.resonators.find((role) => role.id === member.characterId) ??
			snapshot.resonators.find(
				(role) =>
					rotationCharacterId(role.id) ===
					rotationCharacterId(member.characterId),
			);
		if (!role) return null;
		roleIds.push(role.id);
	}
	return new Set(roleIds.map(teamCharacterKey)).size === 3 ? roleIds : null;
}

/** Only complete, executable lineups from the selected account's roster. */
export function ownedTeamRotations(
	profiles: TeamProfile[],
	snapshot: { resonators: readonly Pick<Resonator, "id" | "chain">[] },
): TeamProfile[] {
	const owned = ownedTeamChains(snapshot);
	return profiles.filter(
		(profile) =>
			!profile.errors.length &&
			profile.members.length === 3 &&
			new Set(profile.members.map((m) => teamCharacterKey(m.characterId)))
				.size === 3 &&
			profile.members.every((member) => {
				const chain = owned[rotationCharacterId(member.characterId)];
				return (
					Number.isInteger(chain) &&
					chain >= member.minSequence &&
					chain <= member.maxSequence
				);
			}),
	);
}

export interface SuggestedTeam {
	id: string;
	profile: TeamProfile;
	damage: number;
	warning?: string;
}

export interface TeamSuggestion {
	id: string;
	teams: SuggestedTeam[];
	damage: number;
}

export const TEAM_COUNTS = [1, 2, 3, 4, 5] as const;
export type SuggestedTeamCount = (typeof TEAM_COUNTS)[number];

/** Retain the best rotation for each lineup, regardless of slot order or source. */
export function bestTeamRotations(
	profiles: TeamProfile[],
	scores: ReadonlyMap<string, RotationDamage>,
): SuggestedTeam[] {
	const lineups = new Map<string, SuggestedTeam>();
	for (const profile of profiles) {
		const score = scores.get(profile.id);
		if (
			profile.errors.length ||
			score?.damage == null ||
			score.error ||
			!Number.isFinite(score.damage) ||
			score.damage <= 0
		)
			continue;
		const id = profile.members
			.map((member) => rotationCharacterId(member.characterId))
			.toSorted((a, b) => a - b)
			.join(",");
		const previous = lineups.get(id);
		if (
			!previous ||
			score.damage > previous.damage ||
			(score.damage === previous.damage &&
				profile.id.localeCompare(previous.profile.id) < 0)
		)
			lineups.set(id, {
				id,
				profile,
				damage: score.damage,
				warning: score.warning,
			});
	}
	return [...lineups.values()].sort(
		(a, b) => b.damage - a.damage || a.id.localeCompare(b.id),
	);
}

/** Maximize combined damage for the requested number of disjoint teams.
 * Return no recommendation when that many complete teams cannot be formed. */
export function suggestTeamCombination(
	teams: SuggestedTeam[],
	teamCount: SuggestedTeamCount,
): TeamSuggestion | null {
	const candidates = teams.toSorted(
		(a, b) => b.damage - a.damage || a.id.localeCompare(b.id),
	);
	const bits = new Map<string, bigint>();
	const masks = candidates.map((team) =>
		team.profile.members.reduce((mask, member) => {
			const key = teamCharacterKey(member.characterId);
			let bit = bits.get(key);
			if (bit === undefined) {
				bit = 1n << BigInt(bits.size);
				bits.set(key, bit);
			}
			return mask | bit;
		}, 0n),
	);
	if (bits.size < teamCount * 3) return null;
	let best: TeamSuggestion | null = null;
	const selected: SuggestedTeam[] = [];
	const search = (start: number, used: bigint, damage: number) => {
		const remaining = teamCount - selected.length;
		if (!remaining) {
			if (damage > (best?.damage ?? 0))
				best = {
					id: selected.map((team) => team.id).join("|"),
					teams: [...selected],
					damage,
				};
			return;
		}
		// Ignore conflicts between future teams for an optimistic upper bound,
		// but do exclude teams conflicting with those already selected.
		let possible = damage;
		let slots = remaining;
		for (let index = start; index < candidates.length && slots; index++) {
			if ((used & masks[index]) !== 0n) continue;
			possible += candidates[index].damage;
			slots--;
		}
		if (slots || possible <= (best?.damage ?? 0)) return;
		for (let index = start; index <= candidates.length - remaining; index++) {
			let upperBound = damage;
			for (
				let offset = 0;
				offset < remaining && index + offset < candidates.length;
				offset++
			)
				upperBound += candidates[index + offset].damage;
			if (upperBound <= (best?.damage ?? 0)) break;
			if ((used & masks[index]) !== 0n) continue;
			selected.push(candidates[index]);
			search(index + 1, used | masks[index], damage + candidates[index].damage);
			selected.pop();
		}
	};
	search(0, 0n, 0);
	return best;
}
