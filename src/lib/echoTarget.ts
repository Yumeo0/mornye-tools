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
// This module is deliberately separate from the OCR-stats fallback
// (`scan_for_text`): that path only ever *displays* data, this one drives the
// input/packet round-trip.

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

/** Cadence of the panel scan. */
export const PANEL_SCAN_INTERVAL_MS = 500;
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
export const MAX_FAILED_ATTEMPTS = 4;

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
	// the mark keys do nothing useful: hold the state and skip presses until
	// the screen clears.
	if (scan.tuningSuccessful || scan.sortIconVisible) {
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
