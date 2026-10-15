// Overlay view model. The stats card is fed by the "packet" path: the exact
// echo the game reported over its own traffic (`echo-detected`, triggered by
// the lock key; refreshed in place by `echo-updated` when the game reports
// new stats). It normalises into a view model so the card renders a single
// way.

import { type Echo, formatStatValue, statLabel } from "@/lib/account";
import { findEchoById } from "@/lib/rating";

export interface OverlayEchoView {
	name: string;
	/** Level text ("+25"); empty when unknown. */
	level: string;
	mainStats: string[];
	subStats: string[];
	/** Sonata set names, used to rank the relevant characters. */
	setNames: string[];
}

/** Payload of the backend's `echo-split` event: both halves of a stack split. */
export interface EchoSplitPayload {
	/** The echo that was operated on (leveled/polished); the one on screen. */
	operated: Echo;
	/** The rest of the stack under the old instance id, if any remained. */
	remainder: Echo | null;
}

/**
 * The echo the overlay must track after a stack split, or null when the split
 * is unrelated to the current card.
 *
 * Upgrading one copy of a stack moves it to a new instance id while the old
 * id becomes the unleveled remainder: a card tracking either half would keep
 * showing the stale remainder unless it follows the operated half.
 */
export function splitFollowTarget(
	current: Echo | null,
	split: EchoSplitPayload,
): Echo | null {
	if (!current) return null;
	const involved =
		current.incrId === split.operated.incrId ||
		(split.remainder !== null && current.incrId === split.remainder.incrId);
	return involved ? split.operated : null;
}

/**
 * Move a queued assistant discard across a stack split: a queue entry
 * pointing at either half belongs to the echo on screen (the operated one).
 * Unrelated entries pass through unchanged.
 */
export function retargetPendingDiscard(
	pendingIncrId: number | null,
	split: EchoSplitPayload,
): number | null {
	if (pendingIncrId === null) return null;
	const involved =
		pendingIncrId === split.operated.incrId ||
		(split.remainder !== null && pendingIncrId === split.remainder.incrId);
	return involved ? split.operated.incrId : pendingIncrId;
}

/** `"Label value"` lines for the card's stat sections. */
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
		name: findEchoById(echo.monsterId)?.echo_name ?? `Echo ${echo.monsterId}`,
		level: `+${echo.level}`,
		mainStats: propLines(echo.mainProps),
		subStats: propLines(echo.subProps),
		setNames: setNamesForEcho(echo),
	};
}
