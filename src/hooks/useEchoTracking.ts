// The overlay's echo tracking: a pure event consumer of the Rust scan
// supervisor (`src-tauri/src/overlay.rs`).
//
// The supervisor watches the Echo Upgrade panel (capture + OCR in the
// backend), presses the game's lock key to identify the echo on screen, and
// times the Echo Upgrade Assistant's discard presses. This hook only reacts:
// `overlay-panel` shows/hides the card layer, `echo-detected` /
// `echo-updated` / `echo-split` feed the exact echo, and `menu-debug` drives
// the debug panel. The one thing that stays in the frontend is the
// assistant's *rating* (whether an upgraded echo can still reach the
// configured threshold), because the character catalogs live here; the verdict
// is handed to the backend through the queue/cancel commands.

import { listen } from "@tauri-apps/api/event";
import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { Echo } from "@/lib/account";
import {
	cancelAssistantDiscard,
	type EchoPanelScan,
	MENU_DEBUG_EVENT,
	OVERLAY_PANEL_EVENT,
	type OverlayPanelPayload,
	queueAssistantDiscard,
} from "@/lib/echoTarget";
import {
	type EchoSplitPayload,
	splitFollowTarget,
	viewFromEcho,
} from "@/lib/overlayEcho";
import { getRelevantCharacters, maxPossibleRating } from "@/lib/rating";
import { readSetting } from "@/lib/settings";

/** Last presses seen by the menu debug panel, keyed by the press kind. */
export type MenuDebugPressLog = Partial<
	Record<"identify" | "discard", { at: number; ok: boolean }>
>;

/** Live menu-detection snapshot for the overlay's debug panel; mirrors the
 * Rust `MenuDebugInfo`. */
export interface MenuDebugInfo {
	scan: EchoPanelScan;
	/** The flicker guard says the panel is closed (the card is hidden). */
	panelClosed: boolean;
	/** The augmentation hides this tick (dialog up, or the panel closed). */
	panelHidden: boolean;
	/** Consecutive closed scans; the card holds through a single one. */
	closedTicks: number;
	/** The trigger rules still owe the current echo an identification. */
	needsRefetch: boolean;
	/** Consecutive failed identification presses in this panel session. */
	failures: number;
	/** Last time the trigger rules wanted to press (0 = never). */
	lastAttemptAt: number;
	/** Echo queued for the assistant's discard, if any. */
	pendingDiscard: number | null;
	lastPresses: MenuDebugPressLog;
	/** Delay chosen for the next scan (fast while an echo menu is on screen). */
	scanDelayMs: number;
	/** Consecutive scans that read no menu text. */
	menuMisses: number;
	/** Wall-clock cost of the last scan tick, in milliseconds. */
	scanMs: number;
}

/**
 * State + ref mirror. Event listeners must see the current value
 * synchronously (render state lags one frame behind), so one setter writes
 * both.
 */
function useStateRef<T>(initial: T): [T, (next: T) => void, RefObject<T>] {
	const [value, setValue] = useState(initial);
	const ref = useRef(initial);
	const set = useCallback((next: T) => {
		ref.current = next;
		setValue(next);
	}, []);
	return [value, set, ref];
}

export function useEchoTracking(): {
	exactEcho: Echo | null;
	panelOpen: boolean;
	showMenuDebug: boolean;
	menuDebug: MenuDebugInfo | null;
} {
	const [exactEcho, setExactEcho, exactEchoRef] = useStateRef<Echo | null>(
		null,
	);
	const [panelOpen, setPanelOpen, panelOpenRef] = useStateRef(false);
	// Menu-detection debug panel (toggled from the settings Debug section).
	const [showMenuDebug, setShowMenuDebug] = useState(false);
	const [menuDebug, setMenuDebug] = useState<MenuDebugInfo | null>(null);

	// Echo Upgrade Assistant: rate the updated echo against the character
	// catalogs and hand the verdict to the backend, which owns the discard
	// timing and press. Every update re-evaluates from scratch: a stack
	// upgrade sends a transitional update (level 0, no new substats) before
	// the final stats, and a queued discard must not survive the final echo
	// passing the threshold - hence the cancel on every "keep" verdict.
	const evaluateAssistant = useCallback(async (echo: Echo) => {
		try {
			const enabled = await readSetting<boolean>("upgradeAssistantEnabled");
			if (enabled !== true) {
				await cancelAssistantDiscard(echo.incrId);
				return;
			}
			const threshold =
				(await readSetting<number>("upgradeAssistantThreshold")) ?? 75;
			const echoView = viewFromEcho(echo);
			const relevant = getRelevantCharacters(echoView.setNames);
			// 2 = already marked for discard.
			const best =
				relevant.length > 0
					? Math.max(
							...relevant.map((character) =>
								maxPossibleRating(character, echoView.subStats),
							),
						)
					: Number.POSITIVE_INFINITY;
			if (best < threshold && echo.funcValue !== 2) {
				await queueAssistantDiscard(echo.incrId, echo.funcValue);
			} else {
				await cancelAssistantDiscard(echo.incrId);
			}
		} catch (error) {
			console.error("Upgrade assistant failed:", error);
		}
	}, []);

	// Card-layer visibility from the supervisor; a hidden layer drops the
	// tracked echo so a stale card cannot reappear with the next show.
	useEffect(() => {
		const unlisten = listen<OverlayPanelPayload>(
			OVERLAY_PANEL_EVENT,
			(event) => {
				setPanelOpen(event.payload.visible);
				if (!event.payload.visible) setExactEcho(null);
			},
		);
		return () => {
			unlisten.then((fn) => fn());
		};
	}, [setExactEcho, setPanelOpen]);

	// Exact echo: the game answered the supervisor's lock request with the
	// echo's id. The notify also fires for marks made outside the upgrade
	// panel (locking an echo in the inventory, say); it must not pop the
	// card, so it only feeds the display while the card layer is up.
	useEffect(() => {
		const unlisten = listen<Echo>("echo-detected", (event) => {
			if (!panelOpenRef.current) return;
			setExactEcho(event.payload);
		});
		return () => {
			unlisten.then((fn) => fn());
		};
	}, [panelOpenRef, setExactEcho]);

	// In-place echo updates and stack splits refresh/follow the echo on screen.
	useEffect(() => {
		// In-place echo update (an upgrade added substats): refresh the card
		// when the update is for the echo already on screen.
		const unlistenUpdated = listen<Echo>("echo-updated", (event) => {
			const current = exactEchoRef.current;
			if (current && current.incrId === event.payload.incrId) {
				setExactEcho(event.payload);
				void evaluateAssistant(event.payload);
			}
		});

		// Stack split: upgrading one copy of a stack moves it to a new instance
		// id while the tracked id becomes the unleveled remainder. The card
		// must follow the operated half - that is the echo now on screen. (The
		// backend mirrors this for its discard queue.)
		const unlistenSplit = listen<EchoSplitPayload>("echo-split", (event) => {
			if (!panelOpenRef.current) return;
			const follow = splitFollowTarget(exactEchoRef.current, event.payload);
			if (!follow) return;
			setExactEcho(follow);
			void evaluateAssistant(follow);
		});

		return () => {
			unlistenUpdated.then((fn) => fn());
			unlistenSplit.then((fn) => fn());
		};
	}, [evaluateAssistant, exactEchoRef, panelOpenRef, setExactEcho]);

	// Menu-detection debug: the settings window persists the choice and relays
	// live toggles; the stored value is also read here so the panel survives
	// an app restart. The per-tick snapshots arrive while the toggle is on.
	useEffect(() => {
		void readSetting<boolean>("showMenuDebug").then((saved) => {
			if (saved === true) setShowMenuDebug(true);
		});
		const unlistenToggle = listen<boolean>(
			"show-menu-debug-changed",
			(event) => {
				setShowMenuDebug(event.payload);
			},
		);
		const unlistenDebug = listen<MenuDebugInfo>(MENU_DEBUG_EVENT, (event) => {
			setMenuDebug(event.payload);
		});
		return () => {
			unlistenToggle.then((fn) => fn());
			unlistenDebug.then((fn) => fn());
		};
	}, []);

	return { exactEcho, panelOpen, showMenuDebug, menuDebug };
}
