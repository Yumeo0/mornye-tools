// Echo-to-character relevance rating, shared by the overlay and the
// inventory sorting
import {
	type CatalogEcho,
	charactersById,
	echoesByMonsterId,
} from "@/lib/catalog";
import { type BuildEntry, buildEntries } from "@/lib/characters";
import {
	normalizeStatName,
	parseSubstatTiers,
	sonataNames,
	splitStatCodes,
	subStatRoll,
} from "@/lib/stats";

export interface CharacterInfo {
	character_id: number;
	character_name: string;
	icon_pile: string;
	stats: {
		"4cost": string[][];
		"3cost": string[][];
		"1cost": string[][];
		subs: string[][];
	};
}

/** Id-based catalog lookup used by the account-based Inventory tab. */
export function findEchoById(monsterId: number): CatalogEcho | undefined {
	return echoesByMonsterId.get(monsterId);
}

// Parse a stat string like "HP% 10.5%" or "ATK 123"
export function parseStatValue(
	statString: string,
): { name: string; value: number; hasPercent: boolean } | null {
	const match = statString.match(/^(.+?)\s+([\d.]+)(%?)$/);
	if (match) {
		let name = match[1].trim();
		const hasPercent = match[3] === "%";

		// Map HP/ATK/DEF to HP%/ATK%/DEF% if the value has a %
		if (hasPercent && (name === "HP" || name === "ATK" || name === "DEF")) {
			name = `${name}%`;
		}

		return {
			name,
			value: Number.parseFloat(match[2]),
			hasPercent,
		};
	}
	return null;
}

// "ER:120%>CR=CD>ATK%>Lib%>ATK" -> ["Energy Regen", "Crit. Rate", ...]
function parseSubstatPriority(raw: string | null | undefined): string[] {
	return parseSubstatTiers(raw)
		.flat()
		.map((stat) => stat.name);
}

/** Per-cost main-stat tiers from a role guide (empty tiers dropped). */
function mainStatsFromRole(
	mainStats: string[] | undefined,
): Pick<CharacterInfo["stats"], "4cost" | "3cost" | "1cost"> {
	const stats = mainStats ?? [];
	return {
		"4cost": [splitStatCodes(stats[0])].filter((group) => group.length > 0),
		"3cost": [splitStatCodes(stats[1]), splitStatCodes(stats[2])].filter(
			(group) => group.length > 0,
		),
		"1cost": [splitStatCodes(stats[3]), splitStatCodes(stats[4])].filter(
			(group) => group.length > 0,
		),
	};
}

/** Substat tiers from a priority string; empty when none parses. */
function subsFromPriority(
	priority: string | null | undefined,
): CharacterInfo["stats"]["subs"] {
	return [parseSubstatPriority(priority)].filter((group) => group.length > 0);
}

// Preferred stats of the build role that matches the most of the echo's
// sonata sets; null if no role matches
function preferredStatsForBuild(
	build: BuildEntry,
	wanted: string[],
): CharacterInfo["stats"] | null {
	let bestMatches = 0;
	let bestStats: CharacterInfo["stats"] | null = null;

	for (const guide of Object.values(build.roles)) {
		const sets = guide.echo_sets?.sets ?? [];
		const matches = sets.filter(
			(set) =>
				sonataNames(set.sonata).some((sonata) =>
					wanted.includes(sonata.toLowerCase()),
				) || wanted.includes(set.name.toLowerCase()),
		).length;
		if (matches === 0 || matches <= bestMatches) continue;

		bestMatches = matches;
		bestStats = {
			...mainStatsFromRole(guide.echo_sets.main_stats),
			subs: subsFromPriority(
				guide.substats_priority ??
					Object.values(build.roles)[0]?.substats_priority ??
					null,
			),
		};
	}

	return bestStats;
}

// Find characters whose builds use any of the echo's sonata sets.
// For each character the role with the most set matches provides the
// preferred stats.
export function getRelevantCharacters(setNames: string[]): CharacterInfo[] {
	const wanted = setNames.map((name) => name.toLowerCase());
	const relevant: CharacterInfo[] = [];

	for (const [name, build] of Object.entries(buildEntries)) {
		if (build.character_id === null) continue;
		const character = charactersById.get(build.character_id);
		if (!character) continue;

		const bestStats = preferredStatsForBuild(build, wanted);
		if (bestStats) {
			relevant.push({
				character_id: build.character_id,
				character_name: name,
				icon_pile: character.icon_pile,
				stats: bestStats,
			});
		}
	}

	return relevant;
}

/** Maximum roll points a substat can contribute: 8 percent tiers at 1 point
 * each, or 4 flat tiers at 2 points each. */
const MAX_ROLL_POINTS = 8;

/** Substats an echo can have (revealed at +5/+10/+15/+20/+25). */
export const MAX_SUBSTATS = 5;

// Deduplicated, normalized substats a character wants.
function wantedSubstatNames(character: CharacterInfo): string[] {
	return [...new Set(character.stats.subs.flat().map(normalizeStatName))];
}

// Split the echo's substat lines into normalized name + value pairs.
function echoSubstatEntries(
	parsedSubStats: string[],
): Array<{ name: string; value: number }> {
	const entries: Array<{ name: string; value: number }> = [];
	for (const stat of parsedSubStats) {
		const parsed = parseStatValue(stat);
		if (!parsed) continue;
		entries.push({ name: normalizeStatName(parsed.name), value: parsed.value });
	}
	return entries;
}

/**
 * Presence share of one wanted substat: the even split of 100 across the
 * character's wanted stats, minus what that stat's best rolls can add. With
 * five wanted stats that is 12% on the piece plus 1% per roll tier.
 */
function presenceShare(wantedCount: number): number {
	return (wantedCount > 0 ? 100 / wantedCount : 0) - MAX_ROLL_POINTS;
}

/**
 * Roll value of one wanted substat: the presence share plus one point per roll
 * tier (two per tier for flat stats, whose four tiers still cap at 8 points).
 */
function statRollValue(
	name: string,
	entries: Array<{ value: number }>,
	presence: number,
): number {
	const rollPoints = Math.min(
		entries.reduce((sum, entry) => {
			const roll = subStatRoll(name, entry.value);
			return sum + (roll ? roll.tier * (MAX_ROLL_POINTS / roll.tierCount) : 0);
		}, 0),
		MAX_ROLL_POINTS,
	);
	return presence + rollPoints;
}

/**
 * Roll value of an echo for an explicit list of wanted substats (0-100).
 * `calculateRating` is the per-character wrapper; the character detail uses
 * this directly so each role's own priority applies.
 */
export function rollValueForWantedSubstats(
	wantedSubstats: string[],
	parsedSubStats: string[],
): number {
	const wanted = [...new Set(wantedSubstats.map(normalizeStatName))];
	const presence = presenceShare(wanted.length);
	const entries = echoSubstatEntries(parsedSubStats);

	let total = 0;
	for (const name of wanted) {
		const matching = entries.filter((entry) => entry.name === name);
		if (matching.length === 0) continue;
		total += statRollValue(name, matching, presence);
	}
	return Math.round(Math.min(Math.max(total, 0), 100));
}

// Calculate the roll value of an echo for a character (0-100).
export function calculateRating(
	character: CharacterInfo,
	parsedSubStats: string[],
): number {
	return rollValueForWantedSubstats(
		character.stats.subs.flat().map(normalizeStatName),
		parsedSubStats,
	);
}

/**
 * Best roll value the echo can still reach for a character: the substats that
 * are not revealed yet are assumed to roll missing wanted stats at max tiers.
 * Equal to `calculateRating` once all five substats are revealed.
 */
export function maxPossibleRating(
	character: CharacterInfo,
	parsedSubStats: string[],
): number {
	const wanted = wantedSubstatNames(character);
	const presence = presenceShare(wanted.length);
	const entries = echoSubstatEntries(parsedSubStats);

	let total = 0;
	let missingWanted = 0;
	for (const name of wanted) {
		const matching = entries.filter((entry) => entry.name === name);
		if (matching.length === 0) {
			missingWanted += 1;
			continue;
		}
		total += statRollValue(name, matching, presence);
	}
	const remainingSlots = Math.max(0, MAX_SUBSTATS - entries.length);
	total +=
		Math.min(remainingSlots, missingWanted) * (presence + MAX_ROLL_POINTS);
	return Math.round(Math.min(Math.max(total, 0), 100));
}
