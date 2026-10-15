// Echo-to-character relevance rating, shared by the overlay and the
// inventory sorting
import buildsData from "@/configs/character_builds.json";
import characterData from "@/configs/character_data.json";
import echoData from "@/configs/echo_data.json";
import statsConfig from "@/configs/stats.json";
import {
	isExcludedCharacter,
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

export interface EchoSet {
	id: number;
	name: string;
}

export interface Echo {
	echo_name: string;
	echo_id: number;
	monster_id?: number | null;
	echo_sets: EchoSet[];
}

// Calculator id (`MonsterId`) -> catalog entry, with every possible set merged.
const echoByMonsterId = new Map<number, Echo>();
for (const echo of echoData as Echo[]) {
	if (echo.monster_id == null) continue;
	const existing = echoByMonsterId.get(echo.monster_id);
	if (!existing) {
		echoByMonsterId.set(echo.monster_id, {
			...echo,
			echo_sets: [...(echo.echo_sets ?? [])],
		});
		continue;
	}
	for (const set of echo.echo_sets ?? []) {
		if (!existing.echo_sets.some((s) => s.id === set.id)) {
			existing.echo_sets.push(set);
		}
	}
}

/** Id-based catalog lookup used by the account-based Inventory tab. */
export function findEchoById(monsterId: number): Echo | undefined {
	return echoByMonsterId.get(monsterId);
}

interface BuildSet {
	variant: string;
	name: string;
	sonata?: string;
	value?: string;
}

interface RoleBuild {
	echo_sets: {
		variant: string;
		sets: BuildSet[];
		main_stats: string[];
	};
	substats_priority: string | null;
}

interface BuildEntry {
	character_id: number | null;
	roles: Record<string, RoleBuild>;
}

const builds = buildsData as Record<string, BuildEntry>;

const characterById = new Map<number, { name: string; icon_pile: string }>();
for (const character of characterData as {
	character_id: number;
	character_name: string;
	icon_pile: string;
}[]) {
	if (isExcludedCharacter(character.character_id)) continue;
	if (!characterById.has(character.character_id)) {
		characterById.set(character.character_id, {
			name: character.character_name,
			icon_pile: character.icon_pile,
		});
	}
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

// Max possible value for a stat from stats.json (main or sub table)
export function getMaxStatValue(
	statName: string,
	isMainStat: boolean,
): number | null {
	const stats = isMainStat ? statsConfig.main : statsConfig.sub;
	const statKey = Object.keys(stats).find(
		(key) => normalizeStatName(key) === normalizeStatName(statName),
	);
	if (statKey) {
		return stats[statKey as keyof typeof stats].max;
	}
	return null;
}

// "ER:120%>CR=CD>ATK%>Lib%>ATK" -> ["Energy Regen", "Crit. Rate", ...]
function parseSubstatPriority(raw: string | null | undefined): string[] {
	return parseSubstatTiers(raw)
		.flat()
		.map((stat) => stat.name);
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

		const mainStats = guide.echo_sets.main_stats ?? [];
		bestMatches = matches;
		bestStats = {
			"4cost": [splitStatCodes(mainStats[0])].filter(
				(group) => group.length > 0,
			),
			"3cost": [
				splitStatCodes(mainStats[1]),
				splitStatCodes(mainStats[2]),
			].filter((group) => group.length > 0),
			"1cost": [
				splitStatCodes(mainStats[3]),
				splitStatCodes(mainStats[4]),
			].filter((group) => group.length > 0),
			subs: [
				parseSubstatPriority(
					guide.substats_priority ??
						Object.values(build.roles)[0]?.substats_priority ??
						null,
				),
			].filter((group) => group.length > 0),
		};
	}

	return bestStats;
}

// Fallback stats from the first build role (used when no role matches)
function firstRoleStats(build: BuildEntry): CharacterInfo["stats"] | null {
	const firstRole = Object.values(build.roles)[0];
	if (!firstRole) return null;
	const mainStats = firstRole.echo_sets.main_stats ?? [];
	return {
		"4cost": [splitStatCodes(mainStats[0])].filter((group) => group.length > 0),
		"3cost": [
			splitStatCodes(mainStats[1]),
			splitStatCodes(mainStats[2]),
		].filter((group) => group.length > 0),
		"1cost": [
			splitStatCodes(mainStats[3]),
			splitStatCodes(mainStats[4]),
		].filter((group) => group.length > 0),
		subs: [parseSubstatPriority(firstRole.substats_priority)].filter(
			(group) => group.length > 0,
		),
	};
}

// Find characters whose builds use any of the echo's sonata sets.
// For each character the role with the most set matches provides the
// preferred stats.
export function getRelevantCharacters(setNames: string[]): CharacterInfo[] {
	const wanted = setNames.map((name) => name.toLowerCase());
	const relevant: CharacterInfo[] = [];

	for (const [name, build] of Object.entries(builds)) {
		if (build.character_id === null) continue;
		const character = characterById.get(build.character_id);
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

// Preferred stats of a specific character for an echo with the given sonata
// sets. Falls back to the first build role when no role matches the sets.
export function getCharacterInfo(
	characterId: number,
	setNames: string[],
): CharacterInfo | null {
	const wanted = setNames.map((name) => name.toLowerCase());
	for (const [name, build] of Object.entries(builds)) {
		if (build.character_id !== characterId) continue;
		const character = characterById.get(build.character_id);
		if (!character) return null;
		const stats =
			preferredStatsForBuild(build, wanted) ?? firstRoleStats(build);
		if (!stats) return null;
		return {
			character_id: build.character_id,
			character_name: name,
			icon_pile: character.icon_pile,
			stats,
		};
	}
	return null;
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
