// Mapping of tethys.gg stat codes to the full stat names used by the OCR output
export const STAT_NAMES: Record<string, string> = {
	HP: "HP",
	"HP%": "HP%",
	ATK: "ATK",
	"ATK%": "ATK%",
	DEF: "DEF",
	"DEF%": "DEF%",
	CR: "Crit. Rate",
	CD: "Crit. DMG",
	ER: "Energy Regen",
	"BA%": "Basic Attack DMG Bonus",
	"HA%": "Heavy Attack DMG Bonus",
	"Skill%": "Resonance Skill DMG Bonus",
	"Lib%": "Resonance Liberation DMG Bonus",
	"Fusion%": "Fusion DMG Bonus",
	"Glacio%": "Glacio DMG Bonus",
	"Aero%": "Aero DMG Bonus",
	"Electro%": "Electro DMG Bonus",
	"Spectro%": "Spectro DMG Bonus",
	"Havoc%": "Havoc DMG Bonus",
	"Heal%": "Healing Bonus",
};

export function statFullName(code: string): string {
	const trimmed = code.trim();
	return STAT_NAMES[trimmed] ?? trimmed;
}

// "CR/CD" -> ["Crit. Rate", "Crit. DMG"]
export function splitStatCodes(raw: string | null | undefined): string[] {
	if (!raw) return [];
	return raw.split("/").map(statFullName).filter(Boolean);
}

// Stat icon shown on tethys.gg
export function statIconUrl(code: string): string {
	return `https://r2.tethys.gg/asset/stat-icon/${code.replace("%", " Percent")}.webp`;
}

import statsJson from "@/configs/stats.json";

// Special Rover finishing-attack forms are not real characters and must not
// appear as equip targets, filters or build guides
const EXCLUDED_CHARACTER_IDS = new Set([9990, 9991]);

export function isExcludedCharacter(characterId: number): boolean {
	return EXCLUDED_CHARACTER_IDS.has(characterId);
}

interface StatRangeJson {
	min: number;
	max: number;
	/** Possible substat roll values, ascending (8, or 4 for flat ATK/DEF). */
	rolls?: number[];
}

interface StatsJson {
	main: Record<string, StatRangeJson>;
	sub: Record<string, StatRangeJson>;
}

// Normalize a stat name for lookup (matches the overlay's normalization)
export function normalizeStatName(stat: string): string {
	return stat.replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Possible roll values of a substat, ascending; null when unknown. */
export function subStatRolls(statName: string): number[] | null {
	const stats = (statsJson as StatsJson).sub;
	const key = Object.keys(stats).find(
		(k) => normalizeStatName(k) === normalizeStatName(statName),
	);
	const rolls = key ? stats[key].rolls : undefined;
	return rolls && rolls.length > 0 ? rolls : null;
}

export interface SubStatRoll {
	/** 1-based tier the value landed on. */
	tier: number;
	/** Number of possible roll values for this stat. */
	tierCount: number;
	/** The roll values, ascending. */
	rolls: number[];
}

/**
 * Match a substat value to its roll tier; the nearest tier wins so small
 * rounding differences (OCR, lower-rarity ranges) still land on a bar.
 */
export function subStatRoll(
	statName: string,
	value: number,
): SubStatRoll | null {
	const rolls = subStatRolls(statName);
	if (!rolls) return null;
	let tier = 1;
	let bestDistance = Math.abs(rolls[0] - value);
	for (let index = 1; index < rolls.length; index++) {
		const distance = Math.abs(rolls[index] - value);
		if (distance < bestDistance) {
			bestDistance = distance;
			tier = index + 1;
		}
	}
	return { tier, tierCount: rolls.length, rolls };
}

// Max possible substat roll for a stat name, or null if unknown
export function maxSubStatValue(statName: string): number | null {
	const stats = (statsJson as StatsJson).sub;
	const key = Object.keys(stats).find(
		(k) => normalizeStatName(k) === normalizeStatName(statName),
	);
	return key ? stats[key].max : null;
}

// Color a 0-100 percentage by how close it is to the maximum (shared
// thresholds for ratings, roll bars and value colors)
export function ratingColor(percentage: number): string {
	if (percentage >= 85) return "#10b981"; // green-500
	if (percentage >= 70) return "#3b82f6"; // blue-500
	if (percentage >= 50) return "#f59e0b"; // amber-500
	return "#ef4444"; // red-500
}

// Color a substat roll by how close it is to the max possible roll
export function subStatRollColor(value: number, maxValue: number): string {
	return ratingColor(Math.min((value / maxValue) * 100, 100));
}

// Local game asset icons (IconAttribute folder) keyed by full stat name
const STAT_ASSETS: Record<string, string> = {
	HP: "greenlife",
	"HP%": "greenlife",
	ATK: "redattack",
	"ATK%": "redattack",
	DEF: "greendefense",
	"DEF%": "greendefense",
	"Crit. Rate": "redbaoji",
	"Crit. DMG": "redcrit",
	"Energy Regen": "greenenergy",
	"Healing Bonus": "greencure",
	"Basic Attack DMG Bonus": "redphysics",
	"Heavy Attack DMG Bonus": "redfoco",
	"Resonance Skill DMG Bonus": "redspeed",
	"Resonance Liberation DMG Bonus": "redskill",
	"Glacio DMG Bonus": "redice",
	"Fusion DMG Bonus": "redhot",
	"Electro DMG Bonus": "redmine",
	"Aero DMG Bonus": "redwind",
	"Havoc DMG Bonus": "reddark",
	"Spectro DMG Bonus": "redlight",
};

export function statIconAsset(name: string): string | undefined {
	const file = STAT_ASSETS[name];
	if (!file) return undefined;
	return `/wuwa-assets/UI/UIResources/Common/Image/IconAttribute/T_Iconproperty${file}_UI.webp`;
}

export interface ParsedStatLine {
	name: string;
	value: string;
}

// "Crit. DMG 44.0%\nATK 150" -> [{ name: "Crit. DMG", value: "44.0%" }, { name: "ATK", value: "150" }]
export function parseStatLines(
	raw: string | null | undefined,
): ParsedStatLine[] {
	if (!raw) return [];
	return raw
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const match = line.match(/^(.+?)\s*([\d.]+%?)$/);
			if (!match) return { name: line, value: "" };
			return { name: match[1].trim(), value: match[2] };
		});
}

// "Dream of the Lost\nHavoc Eclipse/Midnight Veil" -> ["Dream of the Lost", "Havoc Eclipse", "Midnight Veil"]
export function sonataNames(sonata: string | null | undefined): string[] {
	if (!sonata) return [];
	return sonata
		.split("\n")
		.flatMap((part) => part.split("/"))
		.map((name) => name.trim())
		.filter(Boolean);
}

export interface StatTier {
	code: string;
	name: string;
	/** Breakpoint to hit before lower tiers are valued, e.g. "120%" from "ER:120%" */
	breakpoint?: string;
}

// "ER:120%>CR=CD>ATK%>Lib%>ATK" -> tiers of equal-priority stats;
// ">" separates tiers, "=" marks stats of equal priority within a tier,
// ":" marks a breakpoint the stat should reach ("~", ranges and "+" suffixes
// like "ER:200-250%+" are kept verbatim)
export function parseSubstatTiers(
	raw: string | null | undefined,
): StatTier[][] {
	if (!raw) return [];
	return raw
		.split(">")
		.map((tier) =>
			tier
				.split("=")
				.map((code) => code.trim())
				.filter(Boolean)
				.map((code) => {
					const colon = code.indexOf(":");
					if (colon === -1) {
						return { code, name: statFullName(code) };
					}
					const base = code.slice(0, colon).trim();
					const breakpoint = code.slice(colon + 1).trim();
					return { code: base, name: statFullName(base), breakpoint };
				}),
		)
		.filter((tier) => tier.length > 0);
}
