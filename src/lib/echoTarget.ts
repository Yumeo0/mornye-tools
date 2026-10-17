// Overlay scan protocol: the event payloads, constants and assistant commands
// mirroring the Rust scan supervisor (`src-tauri/src/overlay.rs`).
//
// The supervisor owns the whole input/scan round trip: it watches the "Echo
// Upgrade" panel through the backend scan, presses the game's lock key to
// identify the echo on screen (the game answers with an
// `ItemFuncValueUpdateNotify`, which the sniffer turns into the
// `echo-detected` event), restores the mark the echo had before the press,
// and times the assistant's discard key. The frontend never polls and never
// presses keys directly; it only reacts to events:
//
// - `overlay-panel`: show/hide the card layer.
// - `menu-debug`: per-tick scan snapshot for the debug panel.
// - `echo-detected` / `echo-updated` / `echo-split`: the exact echo for the
//   card (rendered via `@/lib/overlayEcho`).

import { invoke } from "@tauri-apps/api/core";

/** Result of one backend scan tick (carried inside `menu-debug`). */
export interface EchoPanelScan {
	/** True while the "Echo Upgrade" panel is detected. */
	panelOpen: boolean;
	/** True while the "Tuning Successful" banner is up (or animating in). */
	tuningSuccessful: boolean;
	/** True while the banner wait after an upgrade packet is still running. */
	waitingForBanner: boolean;
	/** Raw OCR of the panel-title region (trimmed); debug evidence. */
	titleText: string;
	/** Raw OCR of the tuning-banner region, when it was read this scan. */
	bannerText: string;
	/** True while the menu sort icon is visible in its configured region. */
	sortIconVisible: boolean;
	/**
	 * Similarity of the sort-icon region against its template (0..=1), for
	 * the menu-detection debug panel; `null` when unavailable.
	 */
	sortIconScore: number | null;
	/** True while the high-rarity confirmation dialog text is visible. */
	highRarityNoticeVisible: boolean;
	/** Raw OCR of the high-rarity notice region; debug evidence. */
	highRarityNoticeText: string;
	/** Raw OCR of the echo-bag header region ("Echoes"). */
	echoesText: string;
	/** True while that region reads as "echo" (phrase-checked). */
	echoesVisible: boolean;
	/** Raw OCR of the COST text region. */
	costText: string;
	/**
	 * True while the COST text is on screen: those are the echo-bag screens,
	 * never the upgrade panel, so the card layer closes at once.
	 */
	echoCostVisible: boolean;
}

/** Payload of `overlay-panel`: whether the card layer shows. */
export interface OverlayPanelPayload {
	visible: boolean;
}

export const OVERLAY_PANEL_EVENT = "overlay-panel";
export const MENU_DEBUG_EVENT = "menu-debug";

/**
 * Consecutive scans without a menu read before the backend scan drops back to
 * the slow cadence; shown by the menu-detection debug panel.
 */
export const PANEL_SCAN_MENU_MISS_LIMIT = 3;

/**
 * Queue an automatic discard mark (Echo Upgrade Assistant). The frontend
 * decides *whether* the echo should go (rating against the character
 * catalogs); the Rust supervisor decides *when* the press is safe and fires
 * it. Re-queueing replaces any pending discard.
 */
export function queueAssistantDiscard(
	incrId: number,
	funcValue: number,
): Promise<void> {
	return invoke("assistant_queue_discard", {
		incr_id: incrId,
		func_value: funcValue,
	});
}

/**
 * Cancel a queued assistant discard for this echo (it passed the
 * re-evaluation, or the assistant is off).
 */
export function cancelAssistantDiscard(incrId: number): Promise<void> {
	return invoke("assistant_cancel_discard", { incr_id: incrId });
}
