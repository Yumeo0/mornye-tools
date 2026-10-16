// Raw catalog tables derived from the bundled JSON configs.
//
// The card, rating, build-guide and optimizer modules all need the same
// lookups (character by id, echo species by monster id / name, sonata icons),
// so the deduplication, set merging and exclusions happen exactly once here.

import characterData from "@/configs/character_data.json";
import echoData from "@/configs/echo_data.json";
import { isExcludedCharacter } from "@/lib/stats";

/** One character of `character_data.json`; only fields the UI reads. */
export interface CatalogCharacter {
	character_id: number;
	character_name: string;
	icon_head_256: string;
	icon_pile: string;
	element: string;
	element_icon_round: string | null;
	weapon_type: string;
	weapon_type_icon: string | null;
	rarity: number;
	chain_icons: (string | null)[];
}

/** One sonata set of `echo_data.json`. */
export interface EchoSet {
	id: number;
	name: string;
	icon: string;
}

/** One echo species of `echo_data.json`, sets merged across entries. */
export interface CatalogEcho {
	echo_name: string;
	echo_id: number;
	monster_id?: number | null;
	echo_cost?: number;
	icon_middle?: string;
	echo_sets: EchoSet[];
}

/** Deduplicated characters (first entry wins), excluded forms dropped. */
export const catalogCharacters: CatalogCharacter[] = (() => {
	const seen = new Set<number>();
	const list: CatalogCharacter[] = [];
	for (const character of characterData as CatalogCharacter[]) {
		if (seen.has(character.character_id)) continue;
		if (isExcludedCharacter(character.character_id)) continue;
		seen.add(character.character_id);
		list.push(character);
	}
	return list;
})();

export const charactersById = new Map(
	catalogCharacters.map((character) => [character.character_id, character]),
);

/** Echo species by monster id, every possible sonata set merged in. */
export const echoesByMonsterId = new Map<number, CatalogEcho>();
for (const echo of echoData as CatalogEcho[]) {
	if (echo.monster_id == null) continue;
	const existing = echoesByMonsterId.get(echo.monster_id);
	if (!existing) {
		echoesByMonsterId.set(echo.monster_id, {
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

/** Echo species by lowercased name (first entry wins), for build guides. */
export const echoesByName = new Map<string, CatalogEcho>();
for (const echo of echoData as CatalogEcho[]) {
	const key = echo.echo_name.toLowerCase();
	if (!echoesByName.has(key)) echoesByName.set(key, echo);
}

/** Sonata sets by id (first entry wins), for the optimizer set filter. */
export const echoSetsById = new Map<number, EchoSet>();
for (const echo of echoData as CatalogEcho[]) {
	for (const set of echo.echo_sets ?? []) {
		if (!echoSetsById.has(set.id)) echoSetsById.set(set.id, set);
	}
}

/** The sets of a species that match `setId`; all of them when none does. */
export function echoSetsFor(entry: CatalogEcho, setId: number): EchoSet[] {
	const sets = entry.echo_sets ?? [];
	const matching = sets.filter((set) => set.id === setId);
	return matching.length > 0 ? matching : sets;
}

/** Sonata icon assets only ship in the IconElementAttri128 resolution. */
export function sonataIcon128(icon: string): string {
	return icon.replace(
		"IconElementAttri/T_IconElementAttri",
		"IconElementAttri128/T_IconElementAttri128_",
	);
}

/** First sonata icon per set name (build cards, set filter). */
export const sonataIconByName = new Map<string, string>();
for (const echo of echoData as CatalogEcho[]) {
	for (const set of echo.echo_sets ?? []) {
		if (!sonataIconByName.has(set.name)) {
			sonataIconByName.set(set.name, sonataIcon128(set.icon));
		}
	}
}
