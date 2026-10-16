// Character list filtering and sorting, shared by the Characters tab and the
// optimizer's picker dialog. Pure, so the rules stay testable without a
// snapshot.

import type { CardAccount, CharacterEntry } from "@/lib/characters";

/** Character list filters, one input type per facet. */
export interface CharacterFilters {
	search: string;
	elements: string[];
	weaponTypes: string[];
	rarity: number[];
	ownedOnly: boolean;
	levelRange: [number, number];
	chainRange: [number, number];
}

export const LEVEL_RANGE: [number, number] = [1, 90];
export const CHAIN_RANGE: [number, number] = [0, 6];

export const DEFAULT_FILTERS: CharacterFilters = {
	search: "",
	elements: [],
	weaponTypes: [],
	rarity: [],
	ownedOnly: false,
	levelRange: LEVEL_RANGE,
	chainRange: CHAIN_RANGE,
};

export type CharacterSortKey = "name" | "level" | "chain" | "rarity" | "echoes";

// `desc` is the natural default direction per key
export const CHARACTER_SORT_OPTIONS: {
	value: CharacterSortKey;
	label: string;
	desc: boolean;
}[] = [
	{ value: "name", label: "Name", desc: false },
	{ value: "level", label: "Lvl", desc: true },
	{ value: "chain", label: "Chain", desc: true },
	{ value: "rarity", label: "Rarity", desc: true },
	{ value: "echoes", label: "Echoes", desc: true },
];

export function matchesCharacterFilters(
	character: CharacterEntry,
	account: CardAccount | undefined,
	filters: CharacterFilters,
): boolean {
	if (filters.search) {
		const query = filters.search.toLowerCase();
		if (!character.name.toLowerCase().includes(query)) return false;
	}
	if (
		filters.elements.length > 0 &&
		(!character.element || !filters.elements.includes(character.element))
	) {
		return false;
	}
	if (
		filters.weaponTypes.length > 0 &&
		(!character.weaponType ||
			!filters.weaponTypes.includes(character.weaponType))
	) {
		return false;
	}
	if (
		filters.rarity.length > 0 &&
		(character.rarity == null || !filters.rarity.includes(character.rarity))
	) {
		return false;
	}
	if (filters.ownedOnly && !account) return false;
	// Level/chain ranges only concern owned characters; activating one hides
	// unowned characters instead of always sorting them into view.
	const levelActive =
		filters.levelRange[0] > LEVEL_RANGE[0] ||
		filters.levelRange[1] < LEVEL_RANGE[1];
	const chainActive =
		filters.chainRange[0] > CHAIN_RANGE[0] ||
		filters.chainRange[1] < CHAIN_RANGE[1];
	if ((levelActive || chainActive) && !account) return false;
	if (account) {
		if (
			account.level < filters.levelRange[0] ||
			account.level > filters.levelRange[1]
		) {
			return false;
		}
		if (
			account.chain < filters.chainRange[0] ||
			account.chain > filters.chainRange[1]
		) {
			return false;
		}
	}
	return true;
}

export function sortCharacters(
	list: CharacterEntry[],
	accounts: Map<number, CardAccount>,
	key: CharacterSortKey,
	desc: boolean,
): CharacterEntry[] {
	const dir = desc ? -1 : 1;
	if (key === "name") {
		return [...list].sort((a, b) => dir * a.name.localeCompare(b.name));
	}
	if (key === "rarity") {
		// Static data: every character has a rarity
		return [...list].sort((a, b) => dir * ((a.rarity ?? 0) - (b.rarity ?? 0)));
	}
	// Account-value sorts (level/chain/echoes): unowned characters have no
	// value and always sink to the bottom
	const owned = list.filter((character) => accounts.has(character.id));
	const unowned = list.filter((character) => !accounts.has(character.id));
	const value = (character: CharacterEntry): number => {
		const account = accounts.get(character.id);
		if (!account) return -1;
		switch (key) {
			case "level":
				return account.level;
			case "chain":
				return account.chain;
			case "echoes":
				return account.echoCount;
		}
	};
	owned.sort((a, b) => dir * (value(a) - value(b)));
	return [...owned, ...unowned];
}

/** Filter and sort in one step, the way both character lists consume them. */
export function filterAndSortCharacters(
	characters: CharacterEntry[],
	accounts: Map<number, CardAccount>,
	filters: CharacterFilters,
	sortKey: CharacterSortKey,
	sortDesc: boolean,
): CharacterEntry[] {
	return sortCharacters(
		characters.filter((character) =>
			matchesCharacterFilters(character, accounts.get(character.id), filters),
		),
		accounts,
		sortKey,
		sortDesc,
	);
}
