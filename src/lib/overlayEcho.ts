// Overlay view model. Two independent sources feed the stats card:
//
//   - "packet": the exact echo the game reported over its own traffic
//     (`echo-detected`, triggered by the lock key). Authoritative.
//   - "ocr":    the stats fallback read from the screen (`stats-data`).
//     Approximate, and only used until an exact echo arrives.
//
// Both normalise into one view model so the card renders a single way, and the
// card shows which source produced the data.

import { type Echo, formatStatValue, statLabel } from "@/lib/account";
import { findEcho, findEchoById } from "@/lib/rating";

export type OverlayEchoSource = "packet" | "ocr";

export interface OverlayEchoView {
	source: OverlayEchoSource;
	name: string;
	/** Level text ("+25"); empty when unknown. */
	level: string;
	mainStats: string[];
	subStats: string[];
	/** Sonata set names, used to rank the relevant characters. */
	setNames: string[];
}

/** Payload of the backend's `stats-data` event (OCR fallback). */
export interface OcrStatsData {
	echo_name: string;
	level: string;
	main_stats: string;
	sub_stats: string;
}

/** `"Label value"` lines, matching what the OCR path produces. */
function propLines(props: Echo["mainProps"]): string[] {
	return props.map(
		(prop) => `${statLabel(prop.key)} ${formatStatValue(prop.key, prop.value)}`,
	);
}

/** Sonata sets of the echo instance (`setId`), else all possible sets. */
function setNamesForEcho(echo: Echo): string[] {
	const entry = findEchoById(echo.monsterId);
	if (!entry) return [];
	const sets = entry.echo_sets ?? [];
	const matching = sets.filter((set) => set.id === echo.setId);
	return (matching.length > 0 ? matching : sets).map((set) => set.name);
}

/** View model for the exact echo from `echo-detected`. */
export function viewFromEcho(echo: Echo): OverlayEchoView {
	return {
		source: "packet",
		name: findEchoById(echo.monsterId)?.echo_name ?? `Echo ${echo.monsterId}`,
		level: `+${echo.level}`,
		mainStats: propLines(echo.mainProps),
		subStats: propLines(echo.subProps),
		setNames: setNamesForEcho(echo),
	};
}

/** View model for the OCR stats fallback. */
export function viewFromOcr(stats: OcrStatsData): OverlayEchoView {
	const lines = (text: string) =>
		text
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

	return {
		source: "ocr",
		name: stats.echo_name,
		level: stats.level,
		mainStats: lines(stats.main_stats),
		subStats: lines(stats.sub_stats),
		setNames: findEcho(stats.echo_name)?.echo_sets.map((set) => set.name) ?? [],
	};
}
