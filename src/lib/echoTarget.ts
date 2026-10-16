// Echo target acquisition (the "exact echo" path).
//
// The overlay watches the "Echo Upgrade" panel: when the panel opens it
// presses the game's lock key once, and the game answers with an
// `ItemFuncValueUpdateNotify` carrying the echo's instance id and its new mark
// value, which the sniffer turns into an `echo-detected` event. The backend
// then restores the mark the echo had before the press (lock again, or discard
// for a discard-marked echo). The echo *name* is not used as the change signal:
// it can be covered while browsing upgrade fodder, so the panel opening is what
// marks a fresh (possibly different) echo.
//
// This module drives the input/packet round-trip; the card itself is rendered
// from the sniffer's exact-echo events (`@/lib/overlayEcho`).

import { invoke } from "@tauri-apps/api/core";

/** Result of the backend's cheap panel scan. */
export interface EchoPanelScan {
	/** True while the "Echo Upgrade" panel is detected. */
	panelOpen: boolean;
	/**
	 * True while the "Tuning Successful" banner is up, or while it is still
	 * animating in after an upgrade packet. The banner covers the panel
	 * title, so the panel stays open and no key press fires until it clears.
	 */
	tuningSuccessful: boolean;
	/**
	 * True while the banner wait after an upgrade packet is still running;
	 * the banner region has not been read yet then.
	 */
	waitingForBanner: boolean;
	/** Raw OCR of the panel-title region (trimmed); debug evidence. */
	titleText: string;
	/** Raw OCR of the tuning-banner region, when it was read this scan. */
	bannerText: string;
	/**
	 * True while the menu sort icon is visible in its configured region. Some
	 * list screens (upgrade fodder selection, echo bags) swallow or misdirect
	 * the mark keys, so presses wait until this screen closes.
	 */
	sortIconVisible: boolean;
	/**
	 * Similarity of the sort-icon region against its template (0..=1), for
	 * the menu-detection debug panel; `null` when the region or the template
	 * is unavailable.
	 */
	sortIconScore: number | null;
	/**
	 * True while the high-rarity confirmation dialog text ("Includes High
	 * Rarity and Upgrade materials. Do you wish to continue upgrade?") is
	 * visible in its configured region. The dialog swallows the mark keys, so
	 * presses wait until it closes, like for the sort-icon screen.
	 */
	highRarityNoticeVisible: boolean;
	/** Raw OCR of the high-rarity notice region; debug evidence. */
	highRarityNoticeText: string;
	/**
	 * Raw OCR of the echo-bag header region ("Echoes"); one of the two cheap
	 * reads that tell the overlay an echo menu is on screen, which switches
	 * the scan to its fast cadence.
	 */
	echoesText: string;
	/**
	 * True while that region reads as "echo" (the bag's header, or the upgrade
	 * panel title the region also overlaps). Phrase-checked: the raw OCR of
	 * this area is junk on an idle screen (the minimap sits under it).
	 */
	echoesVisible: boolean;
	/** Raw OCR of the COST text region; the other fast-cadence read. */
	costText: string;
	/**
	 * True while the COST text is on screen. Those are the echo-bag screens,
	 * never the upgrade panel, so the overlay closes its augmentation at once
	 * instead of holding it through the flicker guard.
	 */
	echoCostVisible: boolean;
}

/** Ask the backend for the panel and tuning states. */
export function scanEchoPanel(): Promise<EchoPanelScan> {
	return invoke<EchoPanelScan>("scan_echo_panel");
}

/** Identify the on-screen echo and restore its previous mark state. */
export function pressEchoToggle(): Promise<void> {
	return invoke("press_echo_toggle");
}

/** Mark the on-screen echo for discard (single discard-key press). */
export function pressEchoDiscard(): Promise<void> {
	return invoke("press_echo_discard");
}

/**
 * Cadence of the panel scan while no echo menu is on screen. Every tick
 * captures the game window and OCRs several regions, so the idle rate stays
 * gentle.
 */
export const PANEL_SCAN_INTERVAL_MS = 1000;
/**
 * Cadence while an echo menu is on screen: the echo bag and the upgrade panel
 * change quickly (lock-press round trip, tuning banner), so the scan polls
 * fast to keep up with them.
 */
export const PANEL_SCAN_FAST_INTERVAL_MS = 100;
/**
 * Consecutive scans without a menu read before the scan drops back to the
 * slow cadence - the menus count as closed once they have been gone for more
 * than two scans.
 */
export const PANEL_SCAN_MENU_MISS_LIMIT = 3;

/**
 * Consecutive closed scans before the panel counts as closed. A single
 * unreadable scan is a flicker, not a closed panel: it neither hides the
 * augmentation (with [`foldPanelVisibility`]) nor resets the identified echo.
 */
export const PANEL_CLOSE_TICKS = 2;

/**
 * Fold one scan into the augmentation's panel state: the updated closed-scan
 * counter, whether the panel counts as closed (the identified echo is dropped
 * then) and whether the augmentation hides this tick.
 *
 * - The COST text marks an echo-bag screen, never the upgrade panel: closed
 *   and hidden at once.
 * - The high-rarity dialog is a modal over the panel, which is still open
 *   behind it (its dimmed title stops reading): the augmentation hides so it
 *   cannot draw over the dialog, but the panel is not closed, so the echo
 *   survives and returns with the dialog's exit, like on the sort-icon screen.
 * - Otherwise the flicker guard: hidden and closed once the panel has read
 *   closed for [`PANEL_CLOSE_TICKS`] straight scans.
 */
export function foldPanelVisibility(
	closedTicks: number,
	scan: EchoPanelScan,
): { closedTicks: number; panelClosed: boolean; hidden: boolean } {
	if (scan.echoCostVisible) {
		return { closedTicks: PANEL_CLOSE_TICKS, panelClosed: true, hidden: true };
	}

	// The dialog counts as an open panel for the flicker guard.
	const ticks =
		scan.panelOpen || scan.highRarityNoticeVisible ? 0 : closedTicks + 1;
	const panelClosed = !scan.panelOpen && ticks >= PANEL_CLOSE_TICKS;
	return {
		closedTicks: ticks,
		panelClosed,
		hidden: panelClosed || scan.highRarityNoticeVisible,
	};
}

/** Scan cadence state: how long the echo menus have been gone. */
export interface EchoMenuWatch {
	/** Consecutive scans that read no menu. */
	misses: number;
}

/** The overlay launches outside the echo menus; start at the slow cadence. */
export const INITIAL_ECHO_MENU_WATCH: EchoMenuWatch = {
	misses: PANEL_SCAN_MENU_MISS_LIMIT,
};

/**
 * Whether one scan shows an echo menu on screen. Only actual menu reads count
 * - phrase matches and flags from the backend (the echo-bag header, the COST
 * text, the upgrade panel with its tuning banner, the high-rarity dialog).
 * Raw OCR text does not: an idle screen harvests junk out of these regions
 * (the minimap sits right under the header), and junk must not keep the scan
 * fast. The sort-icon template match does not count either; it is not OCR.
 */
function scanShowsMenu(scan: EchoPanelScan): boolean {
	return (
		scan.echoesVisible ||
		scan.echoCostVisible ||
		scan.panelOpen ||
		scan.highRarityNoticeVisible
	);
}

/**
 * Fold one scan into the scan cadence: fast while an echo menu is on screen,
 * back to the standard rate once the menus have been gone for more than two
 * scans with no menu read in between. Pure, like the trigger rules, so the
 * timing stays testable without the game.
 */
export function watchEchoMenu(
	watch: EchoMenuWatch,
	scan: EchoPanelScan,
): { watch: EchoMenuWatch; delayMs: number } {
	const misses = scanShowsMenu(scan) ? 0 : watch.misses + 1;
	return {
		watch: { misses },
		delayMs:
			misses >= PANEL_SCAN_MENU_MISS_LIMIT
				? PANEL_SCAN_INTERVAL_MS
				: PANEL_SCAN_FAST_INTERVAL_MS,
	};
}

/** Minimum gap between lock-key attempts (also throttles focus retries). */
export const PRESS_ATTEMPT_INTERVAL_MS = 1000;

export interface EchoTargetState {
	panelOpen: boolean;
	/** True until a lock press has resolved the current echo. */
	needsRefetch: boolean;
	/** Timestamp of the last press attempt (successful or skipped). */
	lastAttemptAt: number;
	/** Consecutive failed press attempts in this panel session. */
	failures: number;
}

export const INITIAL_ECHO_TARGET: EchoTargetState = {
	panelOpen: false,
	needsRefetch: false,
	lastAttemptAt: 0,
	failures: 0,
};

/** Stop retrying identification after this many consecutive failures. */
export const MAX_FAILED_ATTEMPTS = 1;

export interface EchoTargetEvaluation {
	state: EchoTargetState;
	/** Whether to call `pressEchoToggle` now. */
	attempt: boolean;
	/** Whether the panel opened on a fresh echo (the card's echo may differ). */
	changed: boolean;
}

/**
 * Fold one panel scan into the trigger state. Pure, so the timing rules stay
 * testable without the game.
 */
export function evaluateEchoTarget(
	state: EchoTargetState,
	scan: EchoPanelScan,
	now: number,
): EchoTargetEvaluation {
	if (!scan.panelOpen) {
		return {
			state: { ...INITIAL_ECHO_TARGET },
			attempt: false,
			changed: false,
		};
	}

	// The tuning-success banner hides the panel title while it is up, and the
	// sort icon marks a list screen inside the panel (fodder selection) where
	// the mark keys do nothing useful; the high-rarity confirmation dialog
	// swallows them outright. Hold the state and skip presses until the screen
	// clears.
	if (
		scan.tuningSuccessful ||
		scan.sortIconVisible ||
		scan.highRarityNoticeVisible
	) {
		return {
			state: { ...state, panelOpen: true },
			attempt: false,
			changed: false,
		};
	}

	// Opening the panel marks a fresh echo; a panel that merely stays open
	// never restarts the round trip (so tuning or browsing upgrade fodder in
	// between presses cannot trigger one).
	const opened = !state.panelOpen;
	const needsRefetch = state.needsRefetch || opened;
	const attempt =
		needsRefetch && now - state.lastAttemptAt >= PRESS_ATTEMPT_INTERVAL_MS;

	return {
		state: {
			panelOpen: true,
			needsRefetch,
			lastAttemptAt: attempt ? now : state.lastAttemptAt,
			failures: state.failures,
		},
		attempt,
		changed: opened,
	};
}

/** A successful press resolved the current echo; stop refetching it. */
export function markRefetched(state: EchoTargetState): EchoTargetState {
	return { ...state, needsRefetch: false, failures: 0 };
}

/**
 * Count a failed press attempt. After too many in one panel session the
 * retries stop: something is off (an unknown screen, an echo the sniffer has
 * not seen yet), and a panel reopen starts fresh.
 */
export function registerFailedAttempt(state: EchoTargetState): EchoTargetState {
	const failures = state.failures + 1;
	return {
		...state,
		failures,
		needsRefetch: state.needsRefetch && failures < MAX_FAILED_ATTEMPTS,
	};
}

/**
 * Fallback for the Echo Upgrade Assistant when no "Tuning Successful" screen
 * follows an update packet: the queued discard fires anyway after this long.
 */
export const DISCARD_SCREEN_TIMEOUT_MS = 4000;

/** Echo queued for the assistant's automatic discard mark. */
export interface PendingDiscard {
	incrId: number;
	/** `FuncValue` the echo had when queued; player input cancels the discard. */
	funcValue: number;
	/** A "Tuning Successful" screen was seen since the discard was queued. */
	sawTuning: boolean;
	/** When the discard was queued; the screen wait times out from here. */
	queuedAt: number;
}

export type DiscardDecision =
	/** Keep waiting; `pending` carries the updated gate (`sawTuning`). */
	| { action: "wait"; pending: PendingDiscard }
	/** The player re-marked the echo: the discard is cancelled. */
	| { action: "cancel" }
	/** Fire the discard key now. */
	| { action: "fire" };

/** Minimal echo shape the discard gate reads. */
export interface DiscardEcho {
	incrId: number;
	funcValue: number;
}

/**
 * Fold one scan tick into the assistant-discard decision. The discard waits
 * out the "Tuning Successful" screen (the discard key is swallowed while it is
 * up) and only fires while the upgrade panel is verifiably showing - anywhere
 * else the key would act on a different screen. If no tuning screen follows
 * the update packet, the wait times out after [`DISCARD_SCREEN_TIMEOUT_MS`].
 * Pure, like the other trigger rules.
 */
export function nextDiscardDecision(
	pending: PendingDiscard,
	echo: DiscardEcho | null,
	scan: EchoPanelScan,
	now: number,
): DiscardDecision {
	const sawTuning = pending.sawTuning || scan.tuningSuccessful;
	const wait = (): DiscardDecision => ({
		action: "wait",
		pending: { ...pending, sawTuning },
	});

	if (
		!scan.panelOpen ||
		scan.tuningSuccessful ||
		scan.sortIconVisible ||
		scan.highRarityNoticeVisible
	) {
		return wait();
	}
	const screenCleared =
		sawTuning || now - pending.queuedAt >= DISCARD_SCREEN_TIMEOUT_MS;
	if (!screenCleared) return wait();
	if (echo === null || echo.incrId !== pending.incrId) return wait();
	if (echo.funcValue !== pending.funcValue) return { action: "cancel" };
	return { action: "fire" };
}
