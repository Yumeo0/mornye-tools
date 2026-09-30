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
	echo_sets: EchoSet[];
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

// Percentage of the max roll and the color used by the overlay
export function getStatProgress(
	value: number,
	maxValue: number,
): { percentage: number; color: string } {
	const percentage = Math.min((value / maxValue) * 100, 100);
	let color: string;
	if (percentage >= 85)
		color = "#10b981"; // green-500
	else if (percentage >= 70)
		color = "#3b82f6"; // blue-500
	else if (percentage >= 50)
		color = "#f59e0b"; // amber-500
	else color = "#ef4444"; // red-500
	return { percentage, color };
}

// Find the echo matching an OCR'd echo name (case-insensitive, exact matches
// preferred, then by longest name for specificity)
export function findEcho(echoName: string): Echo | undefined {
	const lower = echoName.toLowerCase();
	const candidates = (echoData as Echo[]).filter(
		(e) =>
			e.echo_name.toLowerCase().includes(lower) ||
			lower.includes(e.echo_name.toLowerCase()),
	);
	const exactMatches = candidates.filter(
		(e) => e.echo_name.toLowerCase() === lower,
	);
	return exactMatches.length > 0
		? exactMatches[0]
		: candidates.sort((a, b) => b.echo_name.length - a.echo_name.length)[0];
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

// Calculate the echo rating for a character (0-100)
export function calculateRating(
	character: CharacterInfo,
	parsedMainStats: string[],
	parsedSubStats: string[],
): number {
	const mainStatString = parsedMainStats[0];
	if (!mainStatString) return 0;

	// Parse main stat name
	const mainMatch = mainStatString.match(/^(.+?)\s+\d/);
	if (!mainMatch) return 0;
	const mainStatName = normalizeStatName(mainMatch[1]);

	// Get echo sub stat names
	const echoSubNames = parsedSubStats
		.map((stat) => {
			const parsed = parseStatValue(stat);
			return parsed ? normalizeStatName(parsed.name) : "";
		})
		.filter(Boolean);

	// Calculate main stat score
	let mainScore = 0;
	const all4cost = character.stats["4cost"].flat();
	const all3cost = character.stats["3cost"].flat();
	const all1cost = character.stats["1cost"].flat();

	if (all4cost.some((s) => normalizeStatName(s) === mainStatName)) {
		mainScore = 40;
	} else if (all3cost.some((s) => normalizeStatName(s) === mainStatName)) {
		mainScore = 30;
	} else if (all1cost.some((s) => normalizeStatName(s) === mainStatName)) {
		mainScore = 20;
	}

	// Calculate sub stat score
	const preferredSubs = character.stats.subs.flat().map(normalizeStatName);
	const subMatches = preferredSubs.filter((pref) =>
		echoSubNames.includes(pref),
	).length;
	const subScore = (subMatches / Math.max(preferredSubs.length, 1)) * 60;

	return Math.round(mainScore + subScore);
}
