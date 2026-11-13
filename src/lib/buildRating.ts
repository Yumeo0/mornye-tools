import { type Echo, statPropLines } from "./account";
import { type CharacterInfo, calculateRating, mainStatForEcho } from "./rating";

export interface BuildRating {
	total: number;
	maximum: 500;
}

/** Sum per-piece RV against the fixed maximum of five perfect echoes. */
export function buildRating(
	character: CharacterInfo | null,
	echoes: readonly Echo[],
): BuildRating | null {
	if (!character?.stats.subs.flat().length || !echoes.length) return null;
	const total = echoes.reduce(
		(sum, echo) =>
			sum +
			calculateRating(
				character,
				statPropLines(echo.subProps),
				mainStatForEcho(echo),
			),
		0,
	);
	return { total, maximum: 500 };
}
