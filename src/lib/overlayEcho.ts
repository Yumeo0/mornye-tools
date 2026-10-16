// Overlay view model. The stats card is fed by the "packet" path: the exact
// echo the game reported over its own traffic (`echo-detected`, triggered by
// the lock key; refreshed in place by `echo-updated` when the game reports
// new stats). It normalises into a view model so the card renders a single
// way.

import { type Echo, statPropLines } from "@/lib/account";
import { echoSetsFor } from "@/lib/catalog";
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
	pendingIncrId: number,
	split: EchoSplitPayload,
): number {
	const involved =
		pendingIncrId === split.operated.incrId ||
		(split.remainder !== null && pendingIncrId === split.remainder.incrId);
	return involved ? split.operated.incrId : pendingIncrId;
}

/** Sonata sets of the echo instance (`setId`), else all possible sets. */
function setNamesForEcho(echo: Echo): string[] {
	const entry = findEchoById(echo.monsterId);
	if (!entry) return [];
	return echoSetsFor(entry, echo.setId).map((set) => set.name);
}

/** View model for the exact echo from `echo-detected`. */
export function viewFromEcho(echo: Echo): OverlayEchoView {
	return {
		name: findEchoById(echo.monsterId)?.echo_name ?? `Echo ${echo.monsterId}`,
		level: `+${echo.level}`,
		mainStats: statPropLines(echo.mainProps),
		subStats: statPropLines(echo.subProps),
		setNames: setNamesForEcho(echo),
	};
}
