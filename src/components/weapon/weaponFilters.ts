// Weapon list filtering and sorting for the Weapons tab.

import { weaponEntry, weaponName } from "@/components/weapon/WeaponCard";
import type { Weapon } from "@/lib/account";
import { sortByKey } from "@/lib/sorting";

export const MIN_WEAPON_LEVEL = 1;

export interface WeaponFilters {
	search: string;
	minLevel: number;
	type: string[];
	rarity: string[];
	character: string[];
}

export const EMPTY_WEAPON_FILTERS: WeaponFilters = {
	search: "",
	minLevel: MIN_WEAPON_LEVEL,
	type: [],
	rarity: [],
	character: [],
};

export function matchesWeaponFilters(
	weapon: Weapon,
	filters: WeaponFilters,
): boolean {
	if (
		filters.search &&
		!weaponName(weapon).toLowerCase().includes(filters.search.toLowerCase())
	) {
		return false;
	}
	if (weapon.level < filters.minLevel) {
		return false;
	}

	const entry = weaponEntry(weapon);

	if (
		filters.type.length > 0 &&
		(!entry || !filters.type.includes(String(entry.type)))
	) {
		return false;
	}

	if (
		filters.rarity.length > 0 &&
		(!entry || !filters.rarity.includes(String(entry.rarity)))
	) {
		return false;
	}

	if (filters.character.length > 0) {
		const matchesNone =
			weapon.equippedBy == null && filters.character.includes("none");
		const matchesCharacter =
			weapon.equippedBy != null &&
			filters.character.includes(String(weapon.equippedBy));
		if (!matchesNone && !matchesCharacter) return false;
	}

	return true;
}

export type WeaponSortKey =
	| "none"
	| "level"
	| "rarity"
	| "name"
	| "type"
	| "character";

// `desc` is the natural default direction per key
export const WEAPON_SORT_OPTIONS: {
	value: WeaponSortKey;
	label: string;
	desc: boolean;
}[] = [
	{ value: "none", label: "Newest", desc: true },
	{ value: "level", label: "Lvl", desc: true },
	{ value: "rarity", label: "Rarity", desc: true },
	{ value: "name", label: "Name", desc: false },
	{ value: "type", label: "Type", desc: false },
	{ value: "character", label: "Equipped", desc: false },
];

/** Rarity descending: signature weapons first, like the in-game list. */
export const WEAPON_DEFAULT_SORT: WeaponSortKey = "rarity";

export function sortWeapons(
	weapons: Weapon[],
	sortBy: WeaponSortKey,
	sortAsc: boolean,
): Weapon[] {
	return sortByKey(
		weapons,
		sortBy,
		sortAsc,
		(key, a, b) => {
			switch (key) {
				case "name":
					return weaponName(a).localeCompare(weaponName(b));
				case "level":
					return a.level - b.level;
				case "rarity":
					return (weaponEntry(a)?.rarity ?? 0) - (weaponEntry(b)?.rarity ?? 0);
				case "type":
					return (weaponEntry(a)?.type_name ?? "").localeCompare(
						weaponEntry(b)?.type_name ?? "",
					);
				case "character":
					return (a.equippedBy ?? 0) - (b.equippedBy ?? 0);
				default:
					return 0;
			}
		},
		sortBy === "character" ? (weapon) => weapon.equippedBy == null : undefined,
	);
}
