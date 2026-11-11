// Per-echo best roll rating across the characters the echo's sonata set is
// relevant for (the same percent the overlay shows). The winning character is
// kept as the default, with nonzero alternatives available for comparison.

import { echoKey } from "@/components/echo/EchoCard";
import { type Echo, statPropLines } from "@/lib/account";
import { echoSetsFor } from "@/lib/catalog";
import {
	type CharacterInfo,
	calculateRating,
	findEchoById,
	getRelevantCharacters,
	hasWantedMainStat,
	mainStatForEcho,
} from "@/lib/rating";

export interface EchoRoll {
	rating: number;
	character: CharacterInfo;
}

export interface EchoRollSummary extends EchoRoll {
	/** Nonzero RVs, highest first; ties keep the default character order. */
	options: EchoRoll[];
}

/** Roll rating per echo instance key (`incr:`-prefixed id). */
export function computeEchoRolls(echoes: Echo[]): Map<string, EchoRollSummary> {
	const map = new Map<string, EchoRollSummary>();
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
		const main = mainStatForEcho(echo);
		let best: EchoRoll | null = null;
		const options: EchoRoll[] = [];
		for (const character of characters) {
			if (!hasWantedMainStat(character, main)) continue;
			const rating = calculateRating(character, subs, main);
			const roll = { rating, character };
			if (rating > 0) options.push(roll);
			if (best === null || rating > best.rating) {
				best = roll;
			}
		}
		if (best) {
			options.sort((a, b) => b.rating - a.rating);
			map.set(echoKey(echo), { ...best, options });
		}
	}
	return map;
}
