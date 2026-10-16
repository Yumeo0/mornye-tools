// Character catalog: static character data merged with the tethys.gg build
// guides (roles, echo sets, main stats), plus the icon lookups shared by the
// Characters tab and the optimizer's picker dialog.

import buildsData from "@/configs/character_builds.json";
import {
	catalogCharacters,
	echoesByName,
	sonataIconByName,
} from "@/lib/catalog";

export interface BuildSet {
	variant: string;
	name: string;
	sonata?: string;
	value?: string;
}

export interface RoleBuild {
	echo_sets: {
		variant: string;
		sets: BuildSet[];
		main_stats: string[];
	};
	substats_priority: string | null;
}

export interface BuildEntry {
	character_id: number | null;
	roles: Record<string, RoleBuild>;
}

export interface CharacterEntry {
	id: number;
	name: string;
	image: string;
	rarity?: number;
	element?: string;
	elementIcon?: string | null;
	weaponType?: string;
	weaponTypeIcon?: string | null;
	/** Resonance chain node icons (IconDevice), index 0 = node 1. */
	chainIcons?: string[];
}

/** Owned state of a resonator shown on the cards. */
export interface CardWeapon {
	itemId: number;
	level: number;
	rank: number;
	name: string | null;
}

export interface CardAccount {
	level: number;
	chain: number;
	echoCount: number;
	weapon: CardWeapon | null;
}

const builds = buildsData as Record<string, BuildEntry>;

/** Build guides keyed by character name; shared with the rating module. */
export const buildEntries: Record<string, BuildEntry> = builds;

export const buildByCharacterId = new Map<number, BuildEntry>();
for (const entry of Object.values(builds)) {
	if (
		entry.character_id != null &&
		!buildByCharacterId.has(entry.character_id)
	) {
		buildByCharacterId.set(entry.character_id, entry);
	}
}

export function echoIcon(name: string): string | undefined {
	return echoesByName.get(name.toLowerCase())?.icon_middle;
}

export function sonataIcon(name: string): string {
	return (
		sonataIconByName.get(name) ??
		`https://r2.tethys.gg/asset/sonata-icon/${encodeURIComponent(name)}.webp`
	);
}

// All characters (deduplicated, special forms excluded), sorted by name.
export const allCharacters: CharacterEntry[] = catalogCharacters
	.map((character) => ({
		id: character.character_id,
		name: character.character_name,
		image: character.icon_pile,
		rarity: character.rarity,
		element: character.element,
		elementIcon: character.element_icon_round,
		weaponType: character.weapon_type,
		weaponTypeIcon: character.weapon_type_icon,
		chainIcons: character.chain_icons.filter(Boolean) as string[],
	}))
	.sort((a, b) => a.name.localeCompare(b.name));

// Distinct element / weapon-type filter options derived from the catalog
export const elementOptions = (() => {
	const map = new Map<string, string | null>();
	for (const character of allCharacters) {
		if (character.element && !map.has(character.element)) {
			map.set(character.element, character.elementIcon ?? null);
		}
	}
	return [...map].map(([value, icon]) => ({ value, icon }));
})();

export const weaponTypeOptions = (() => {
	const map = new Map<string, string | null>();
	for (const character of allCharacters) {
		if (character.weaponType && !map.has(character.weaponType)) {
			map.set(character.weaponType, character.weaponTypeIcon ?? null);
		}
	}
	return [...map].map(([value, icon]) => ({ value, icon }));
})();
