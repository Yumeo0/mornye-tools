// Per-echo best roll rating across the characters the echo's sonata set is
// relevant for (the same percent the overlay shows). The winning character is
// kept so the card can show whose value it is.

import { echoKey } from "@/components/echo/EchoCard";
import { type Echo, statPropLines } from "@/lib/account";
import { echoSetsFor } from "@/lib/catalog";
import {
	type CharacterInfo,
	calculateRating,
	findEchoById,
	getRelevantCharacters,
} from "@/lib/rating";

export interface EchoRoll {
	rating: number;
	character: CharacterInfo;
}

/** Roll rating per echo instance key (`incr:`-prefixed id). */
export function computeEchoRolls(echoes: Echo[]): Map<string, EchoRoll> {
	const map = new Map<string, EchoRoll>();
	const charactersCache = new Map<string, CharacterInfo[]>();
	for (const echo of echoes) {
		const cacheKey = `${echo.monsterId}:${echo.setId}`;
		let characters = charactersCache.get(cacheKey);
		if (characters === undefined) {
			const entry = findEchoById(echo.monsterId);
			characters = entry
				? getRelevantCharacters(
						echoSetsFor(entry, echo.setId).map((set) => set.name),
					)
				: [];
			charactersCache.set(cacheKey, characters);
		}
		if (characters.length === 0) continue;
		const subs = statPropLines(echo.subProps);
		let best: EchoRoll | null = null;
		for (const character of characters) {
			const rating = calculateRating(character, subs);
			if (best === null || rating > best.rating) {
				best = { rating, character };
			}
		}
		if (best) map.set(echoKey(echo), best);
	}
	return map;
}
