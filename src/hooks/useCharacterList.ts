// The character list and owned-state map shared by the Characters tab and the
// optimizer's picker dialog: the static catalog plus any captured resonator
// missing from it, mapped onto the account snapshot.

import { useMemo } from "react";
import { weaponName } from "@/components/weapon/WeaponCard";
import {
	type AccountSnapshot,
	echoesForResonator,
	useAccount,
	weaponForResonator,
} from "@/lib/account";
import { charactersById } from "@/lib/catalog";
import {
	allCharacters,
	type CardAccount,
	type CharacterEntry,
} from "@/lib/characters";

export function useCharacterList(): {
	snapshot: AccountSnapshot;
	error: string | null;
	characters: CharacterEntry[];
	accountByCharacterId: Map<number, CardAccount>;
} {
	const { snapshot, error } = useAccount();

	const characters = useMemo(() => {
		const list = [...allCharacters];
		const known = new Set(list.map((character) => character.id));
		for (const resonator of snapshot.resonators) {
			if (known.has(resonator.id)) continue;
			known.add(resonator.id);
			list.push({
				id: resonator.id,
				name:
					charactersById.get(resonator.id)?.character_name ||
					resonator.name ||
					String(resonator.id),
				image: charactersById.get(resonator.id)?.icon_head_256 ?? "",
			});
		}
		return list.sort((a, b) => a.name.localeCompare(b.name));
	}, [snapshot.resonators]);

	const accountByCharacterId = useMemo(() => {
		const map = new Map<number, CardAccount>();
		for (const resonator of snapshot.resonators) {
			const weapon = weaponForResonator(snapshot, resonator.id);
			map.set(resonator.id, {
				level: resonator.level,
				chain: resonator.chain,
				echoCount: echoesForResonator(snapshot, resonator.id).length,
				weapon: weapon
					? {
							itemId: weapon.itemId,
							level: weapon.level,
							rank: weapon.rank,
							name: weaponName(weapon),
						}
					: null,
			});
		}
		return map;
	}, [snapshot]);

	return { snapshot, error, characters, accountByCharacterId };
}
