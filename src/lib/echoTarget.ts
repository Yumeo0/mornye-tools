// Echo target acquisition (the "exact echo" path).
//
// The overlay OCRs only the echo *name*, and only to notice changes: the exact
// echo arrives from the game's own traffic. While the echo upgrade panel is
// open, the app presses the game's lock key twice whenever the displayed name
// changes or stays unreadable for a second. The key is posted straight to the
// game window, so it works while the game is not focused. Locking/re-locking
// makes the client send an `ItemLockRequest` with the echo's instance id,
// which the sniffer turns into an `echo-detected` event.
//
// This module is deliberately separate from the OCR-stats fallback
// (`scan_for_text`): that path only ever *displays* data, this one drives the
// input/packet round-trip.

import { invoke } from "@tauri-apps/api/core";

/** Result of the backend's cheap name scan. */
export interface EchoNameScan {
	/** True while the "Echo Upgrade" panel is detected. */
	panelOpen: boolean;
	/** Catalog-canonical echo name, empty when it could not be read. */
	name: string;
}

/** Ask the backend for the panel state and the OCR'd echo name. */
export function scanEchoName(): Promise<EchoNameScan> {
	return invoke<EchoNameScan>("scan_echo_name");
}

/** Press the lock key twice (lock + re-lock) in the game window. */
export function pressEchoLock(): Promise<void> {
	return invoke("press_echo_lock");
}

/** Cadence of the name scan. */
export const NAME_SCAN_INTERVAL_MS = 1000;
/** A name that stays unreadable this long triggers a refetch. */
export const NAME_MISSING_MS = 1000;
/** Minimum gap between lock-key attempts (also throttles focus retries). */
export const PRESS_ATTEMPT_INTERVAL_MS = 1000;

export interface EchoTargetState {
	panelOpen: boolean;
	/** Canonical name of the last successful read; null before the first one. */
	name: string | null;
	/** When the name became unreadable while the panel stayed open. */
	missingSince: number | null;
	/** True until a lock press has been sent for the current echo. */
	needsRefetch: boolean;
	/** Timestamp of the last press attempt (successful or skipped). */
	lastAttemptAt: number;
}

export const INITIAL_ECHO_TARGET: EchoTargetState = {
	panelOpen: false,
	name: null,
	missingSince: null,
	needsRefetch: false,
	lastAttemptAt: 0,
};

export interface EchoTargetEvaluation {
	state: EchoTargetState;
	/** Whether to call `pressEchoLock` now. */
	attempt: boolean;
	/** Whether the on-screen echo changed (or was seen for the first time). */
	changed: boolean;
}

/**
 * Fold one name scan into the trigger state. Pure, so the timing rules stay
 * testable without the game.
 */
export function evaluateEchoTarget(
	state: EchoTargetState,
	scan: EchoNameScan,
	now: number,
): EchoTargetEvaluation {
	if (!scan.panelOpen) {
		return {
			state: { ...INITIAL_ECHO_TARGET },
			attempt: false,
			changed: false,
		};
	}

	const name = scan.name.trim();
	let nextName = state.name;
	let missingSince = state.missingSince;
	let needsRefetch = state.needsRefetch;
	let changed = false;

	if (name.length > 0) {
		if (state.name === null || state.name !== name) {
			needsRefetch = true;
			changed = true;
		}
		nextName = name;
		missingSince = null;
	} else if (missingSince === null) {
		missingSince = now;
	} else if (now - missingSince >= NAME_MISSING_MS) {
		needsRefetch = true;
		// Restart the window so the retry is rate-limited, not spammed.
		missingSince = now;
	}

	const attempt =
		needsRefetch && now - state.lastAttemptAt >= PRESS_ATTEMPT_INTERVAL_MS;

	return {
		state: {
			panelOpen: true,
			name: nextName,
			missingSince,
			needsRefetch,
			lastAttemptAt: attempt ? now : state.lastAttemptAt,
		},
		attempt,
		changed,
	};
}

/** A successful press resolved the current echo; stop refetching it. */
export function markRefetched(state: EchoTargetState): EchoTargetState {
	return { ...state, needsRefetch: false };
}
