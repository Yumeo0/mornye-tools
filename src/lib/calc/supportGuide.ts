// Guide-driven echo relevance for support searches.
//
// The packed optimizer prunes candidates with stat weights derived from the
// searched character's damage kit, which is the wrong lens for a support: an
// ER or HP main carries no damage weight but is exactly what the buff scales
// with. These helpers read the shipped tethys.gg role guides (the same data
// behind the overlay rating and the character tabs) and score an echo by how
// well it matches the guide's main stats and substat priorities.

import { STAT_LABELS, type StatKey } from "@/lib/account";
import { buildByCharacterId, type RoleBuild } from "@/lib/characters";
import { parseSubstatTiers, splitStatCodes } from "@/lib/stats";

/** One guide's wanted main stats and weighted substat priorities. */
export interface SupportGuide {
	/** Guide label of the picked role, e.g. "Support". */
	role: string;
	/** Main-stat display names the guide recommends. */
	mains: Set<string>;
	/** Substat display names with priority weight (higher = wanted more). */
	subs: Map<string, number>;
}

const SUPPORT_ROLE = /support|heal|sub/i;

/** The role a support search should follow: a support/healer role, else the first. */
export function supportRoleFor(characterId: number): {
	role: string;
	roleBuild: RoleBuild;
} | null {
	const build = buildByCharacterId.get(characterId);
	if (!build) return null;
	const names = Object.keys(build.roles);
	if (names.length === 0) return null;
	const picked = names.find((name) => SUPPORT_ROLE.test(name)) ?? names[0];
	const roleBuild = build.roles[picked];
	if (!roleBuild) return null;
	return { role: picked, roleBuild };
}

/** Read one character's guide as a support priority; `null` without a guide. */
export function supportGuideFor(characterId: number): SupportGuide | null {
	const picked = supportRoleFor(characterId);
	if (!picked) return null;
	const { role, roleBuild } = picked;

	const mains = new Set<string>();
	for (const entry of roleBuild.echo_sets.main_stats ?? []) {
		for (const name of splitStatCodes(entry)) mains.add(name);
	}

	const tiers = parseSubstatTiers(roleBuild.substats_priority);
	const subs = new Map<string, number>();
	tiers.forEach((tier, index) => {
		const weight = tiers.length - index;
		for (const stat of tier) {
			if (!subs.has(stat.name)) subs.set(stat.name, weight);
		}
	});

	return { role, mains, subs };
}

/** Fallback ranking when a character has no guide entry at all. */
const GENERIC_SUPPORT_WEIGHTS: Record<string, number> = {
	"Energy Regen": 3,
	"Healing Bonus": 2.5,
	"HP%": 1.4,
	"DEF%": 1,
	"ATK%": 1,
	"Crit. Rate": 0.5,
	"Crit. DMG": 0.5,
	HP: 0.1,
	DEF: 0.1,
	ATK: 0.1,
};

function statName(key: string): string {
	return STAT_LABELS[key as StatKey] ?? key;
}

/**
 * Relevance of one echo for the searched character: guide main-stat match
 * first, then the weighted substat priorities. Only ever used to order the
 * candidate pool and seed builds, never to score a build.
 */
export function supportEchoScore(
	echo: {
		mainStats: { primary: { key: string; value: number } };
		substats: Record<string, number>;
	},
	guide: SupportGuide | null,
): number {
	let score = 0;
	const mainName = statName(echo.mainStats.primary.key);
	if (guide) {
		if (guide.mains.has(mainName)) score += 60;
	} else if ((GENERIC_SUPPORT_WEIGHTS[mainName] ?? 0) >= 2) {
		score += 60;
	}

	for (const [key, value] of Object.entries(echo.substats)) {
		if (!Number.isFinite(value) || value <= 0) continue;
		const name = statName(key);
		const weight = guide
			? (guide.subs.get(name) ?? 0)
			: (GENERIC_SUPPORT_WEIGHTS[name] ?? 0);
		score += value * weight;
	}

	return score;
}

/** Reverse of {@link STAT_LABELS}: display name -> calculator stat key. */
const KEY_BY_LABEL = new Map<string, string>(
	Object.entries(STAT_LABELS).map(([key, label]) => [label, key]),
);

/**
 * Guide main stats as calculator filter keys. Elements map through their
 * damage-bonus labels, so a guide's "Spectro%" becomes the `spectro` filter.
 */
export function guideMainStatKeys(characterId: number): string[] {
	const guide = supportGuideFor(characterId);
	if (!guide) return [];
	const keys: string[] = [];
	for (const name of guide.mains) {
		const key = KEY_BY_LABEL.get(name);
		if (key && !keys.includes(key)) keys.push(key);
	}
	return keys;
}
