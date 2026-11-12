import { type Echo, statPropLines } from "./account";
import {
	type CharacterInfo,
	calculateRating,
	hasWantedMainStat,
	mainStatForEcho,
	rollValueForWantedSubstats,
} from "./rating";
import {
	normalizeStatName,
	subStatRolls,
	substatPriorityWeights,
} from "./stats";

export interface BuildRating {
	total: number;
	maximum: number | null;
	requiredEr: number;
	maximumEr: number | null;
}

/** Sum per-piece RV; perfect rolls may replace every substat, preserving equipment. */
export function buildRating(
	character: CharacterInfo | null,
	echoes: readonly Echo[],
	actualEr?: number,
	requiredEr = character?.stats.erBreakpoint ?? 100,
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
	const target = Number.isFinite(requiredEr) ? Math.max(100, requiredEr) : null;
	if (actualEr === undefined || !Number.isFinite(actualEr) || target === null)
		return { total, maximum: null, requiredEr, maximumEr: null };
	const baseEr =
		actualEr -
		echoes.reduce(
			(sum, echo) =>
				sum +
				echo.subProps
					.filter((p) => p.key === "energyRegen")
					.reduce((n, p) => n + p.value, 0),
			0,
		);
	const maxErRoll = subStatRolls("Energy Regen")?.at(-1) ?? 0;
	const maximumEr = baseEr + echoes.length * maxErRoll;
	const wanted = [
		...new Set(character.stats.subs.flat().map(normalizeStatName)),
	];
	const weights = substatPriorityWeights(
		character.stats.subs,
		character.stats.erBreakpoint,
	);
	const maxLines = wanted
		.filter((name) => name !== "energy regen")
		.sort((a, b) => (weights.get(b) ?? 0) - (weights.get(a) ?? 0))
		.flatMap((name) => {
			const maximum = subStatRolls(name)?.at(-1);
			return maximum === undefined ? [] : [`${name} ${maximum}`];
		});
	// Every perfect wanted roll has the same unweighted value, so the largest
	// priority weights give the best four/five non-ER stats. Round per piece.
	const best = (er: boolean) => {
		const lines = maxLines.slice(0, 5 - Number(er));
		if (er) lines.push(`Energy Regen ${maxErRoll}`);
		return rollValueForWantedSubstats(
			character.stats.subs,
			lines,
			character.stats.erBreakpoint,
		);
	};
	const withoutEr = best(false);
	const withEr = best(true);
	let maximum: number | null = null;
	for (let mask = 0; mask < 2 ** echoes.length; mask++) {
		let er = baseEr;
		let score = 0;
		echoes.forEach((echo, index) => {
			const hasEr = (mask & (1 << index)) !== 0;
			if (hasEr) er += maxErRoll;
			if (hasWantedMainStat(character, mainStatForEcho(echo)))
				score += hasEr ? withEr : withoutEr;
		});
		if (er + 1e-6 >= target) maximum = Math.max(maximum ?? 0, score);
	}
	return { total, maximum, requiredEr: target, maximumEr };
}
