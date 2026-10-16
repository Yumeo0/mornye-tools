// The overlay's echo tracking loop: watch the Echo Upgrade panel through the
// backend's cheap scan, press the game's lock key to identify the echo on
// screen, feed the stats card with the exact echo the sniffer reports, and run
// the Echo Upgrade Assistant's automatic discard marks.

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
	type EchoMenuWatch,
	type EchoPanelScan,
	type EchoTargetEvaluation,
	type EchoTargetState,
	evaluateEchoTarget,
	foldPanelVisibility,
	INITIAL_ECHO_MENU_WATCH,
	INITIAL_ECHO_TARGET,
	markRefetched,
	nextDiscardDecision,
	PANEL_CLOSE_TICKS,
	PANEL_SCAN_INTERVAL_MS,
	type PendingDiscard,
	pressEchoDiscard,
	pressEchoToggle,
	registerFailedAttempt,
	scanEchoPanel,
	watchEchoMenu,
} from "@/lib/echoTarget";
import {
	type EchoSplitPayload,
	retargetPendingDiscard,
	splitFollowTarget,
	viewFromEcho,
} from "@/lib/overlayEcho";
import { getRelevantCharacters, maxPossibleRating } from "@/lib/rating";
import { readSetting } from "@/lib/settings";

/** Last presses seen by the menu debug panel, keyed by the press kind. */
export type MenuDebugPressLog = Partial<
	Record<"identify" | "discard", { at: number; ok: boolean }>
>;

/** Live menu-detection snapshot for the overlay's debug panel. */
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
 * State + ref mirror. The async scan loop and the event listeners must see
 * the current value synchronously (render state lags one frame behind), so
 * one setter writes both.
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
	const [panelOpen, setPanelOpen] = useState(false);
	// Menu-detection debug panel (toggled from the settings Debug section).
	const [showMenuDebug, setShowMenuDebug, showMenuDebugRef] =
		useStateRef(false);
	const [menuDebug, setMenuDebug] = useState<MenuDebugInfo | null>(null);

	const busyRef = useRef(false);
	const targetRef = useRef<EchoTargetState>(INITIAL_ECHO_TARGET);
	const closedTicksRef = useRef(0);
	// Scan cadence watch: how long the echo menus have been gone, so the scan
	// ticks slowly outside them and fast while they are on screen.
	const menuWatchRef = useRef<EchoMenuWatch>(INITIAL_ECHO_MENU_WATCH);
	const lastPressesRef = useRef<MenuDebugPressLog>({});
	// Echo Upgrade Assistant: echo queued for an automatic discard mark.
	const pendingDiscardRef = useRef<PendingDiscard | null>(null);

	// Echo Upgrade Assistant: queue an automatic discard when the upgraded
	// echo can no longer reach the configured rating on any relevant
	// character. Every update re-evaluates from scratch: a stack upgrade
	// sends a transitional update (level 0, no new substats) before the
	// final stats, and a discard queued from it must not survive the final
	// echo passing the threshold.
	const queueAssistantDiscard = useCallback(async (echo: Echo) => {
		if (pendingDiscardRef.current?.incrId === echo.incrId) {
			pendingDiscardRef.current = null;
		}
		try {
			const enabled = await readSetting<boolean>("upgradeAssistantEnabled");
			if (enabled !== true) return;
			const threshold =
				(await readSetting<number>("upgradeAssistantThreshold")) ?? 75;
			const echoView = viewFromEcho(echo);
			const relevant = getRelevantCharacters(echoView.setNames);
			if (relevant.length === 0) return;
			const best = Math.max(
				...relevant.map((character) =>
					maxPossibleRating(character, echoView.subStats),
				),
			);
			if (best >= threshold) return;
			// 2 = already marked for discard.
			if (echo.funcValue === 2) return;
			// The discard key is swallowed while the "Tuning Successful"
			// screen is up, so wait for it to be seen and cleared.
			pendingDiscardRef.current = {
				incrId: echo.incrId,
				funcValue: echo.funcValue,
				sawTuning: false,
				queuedAt: Date.now(),
			};
		} catch (error) {
			console.error("Upgrade assistant failed:", error);
		}
	}, []);

	// Exact echo: the game answered a lock request with the echo's id. The
	// notify also fires for marks made outside the upgrade panel (locking
	// an echo in the inventory, say); it must not pop the card, so it only
	// feeds the display while the scan still sees the panel open.
	useEffect(() => {
		const unlisten = listen<Echo>("echo-detected", (event) => {
			if (closedTicksRef.current >= PANEL_CLOSE_TICKS) return;
			setExactEcho(event.payload);
			setPanelOpen(true);
		});
		return () => {
			unlisten.then((fn) => fn());
		};
	}, [setExactEcho]);

	// In-place echo updates and stack splits refresh/follow the echo on screen.
	useEffect(() => {
		// In-place echo update (an upgrade added substats): refresh the card
		// when the update is for the echo already on screen.
		const unlistenUpdated = listen<Echo>("echo-updated", (event) => {
			const current = exactEchoRef.current;
			if (current && current.incrId === event.payload.incrId) {
				setExactEcho(event.payload);
				void queueAssistantDiscard(event.payload);
			}
		});

		// Stack split: upgrading one copy of a stack moves it to a new instance
		// id while the tracked id becomes the unleveled remainder. The card
		// (and any queued assistant discard) must follow the operated half -
		// that is the echo now on screen.
		const unlistenSplit = listen<EchoSplitPayload>("echo-split", (event) => {
			if (closedTicksRef.current >= PANEL_CLOSE_TICKS) return;
			const split = event.payload;
			const follow = splitFollowTarget(exactEchoRef.current, split);
			if (!follow) return;
			setExactEcho(follow);
			const pending = pendingDiscardRef.current;
			if (pending) {
				const retargeted = retargetPendingDiscard(pending.incrId, split);
				if (retargeted !== pending.incrId) {
					pendingDiscardRef.current = {
						...pending,
						incrId: retargeted,
						funcValue: follow.funcValue,
					};
				}
			}
			void queueAssistantDiscard(follow);
		});

		return () => {
			unlistenUpdated.then((fn) => fn());
			unlistenSplit.then((fn) => fn());
		};
	}, [exactEchoRef, queueAssistantDiscard, setExactEcho]);

	// Menu-detection debug panel: the settings window persists the choice and
	// relays live toggles; the stored value is also read here so the panel
	// survives an app restart.
	useEffect(() => {
		void readSetting<boolean>("showMenuDebug").then((saved) => {
			if (saved === true) setShowMenuDebug(true);
		});
		const unlisten = listen<boolean>("show-menu-debug-changed", (event) => {
			setShowMenuDebug(event.payload);
		});
		return () => {
			unlisten.then((fn) => fn());
		};
	}, [setShowMenuDebug]);

	// The scan loop and the key presses it triggers.
	useEffect(() => {
		// Panel closed, or a different echo on screen: the previous exact echo
		// (and any queued assistant discard for it) no longer applies.
		const resetTrackedEcho = () => {
			setExactEcho(null);
			pendingDiscardRef.current = null;
		};

		// Identify the echo and restore its mark state; the key goes straight
		// to the game window, so it works without focus, and failures are
		// retried on the next tick. Presses are only allowed while the scan
		// genuinely reports the panel open: the flicker-tolerant state may hold
		// through one unreadable tick, but a press in any other screen (echo
		// inventory, equip menu) would toggle whatever is selected there.
		const identifyEcho = async (
			scan: EchoPanelScan,
			evaluation: EchoTargetEvaluation,
			target: EchoTargetState,
		): Promise<EchoTargetState> => {
			if (
				!evaluation.attempt ||
				!scan.panelOpen ||
				scan.sortIconVisible ||
				scan.highRarityNoticeVisible
			) {
				return target;
			}
			try {
				await pressEchoToggle();
				lastPressesRef.current.identify = { at: Date.now(), ok: true };
				return markRefetched(target);
			} catch (error) {
				console.error("Echo mark press failed:", error);
				lastPressesRef.current.identify = { at: Date.now(), ok: false };
				return registerFailedAttempt(target);
			}
		};

		// Echo Upgrade Assistant: fire the queued discard once the trigger
		// rules allow it (see `nextDiscardDecision`).
		const runQueuedDiscard = async (scan: EchoPanelScan) => {
			if (pendingDiscardRef.current === null) return;
			const decision = nextDiscardDecision(
				pendingDiscardRef.current,
				exactEchoRef.current,
				scan,
				Date.now(),
			);
			if (decision.action === "wait") {
				pendingDiscardRef.current = decision.pending;
				return;
			}
			if (decision.action === "cancel") {
				// The player marked the echo after the assistant queued it;
				// their input wins and the discard is cancelled.
				pendingDiscardRef.current = null;
				return;
			}
			const pending = pendingDiscardRef.current;
			pendingDiscardRef.current = null;
			try {
				await pressEchoDiscard();
				lastPressesRef.current.discard = { at: Date.now(), ok: true };
			} catch (error) {
				console.error("Auto-discard press failed:", error);
				pendingDiscardRef.current = pending;
				lastPressesRef.current.discard = { at: Date.now(), ok: false };
			}
		};

		// Menu-detection debug snapshot, kept only while the panel is on.
		const publishMenuDebug = (info: {
			scan: EchoPanelScan;
			panelClosed: boolean;
			hidden: boolean;
			target: EchoTargetState;
			cadence: { delayMs: number; watch: EchoMenuWatch };
			scanMs: number;
		}) => {
			setMenuDebug({
				scan: info.scan,
				panelClosed: info.panelClosed,
				panelHidden: info.hidden,
				closedTicks: closedTicksRef.current,
				needsRefetch: info.target.needsRefetch,
				failures: info.target.failures,
				lastAttemptAt: info.target.lastAttemptAt,
				pendingDiscard: pendingDiscardRef.current?.incrId ?? null,
				lastPresses: { ...lastPressesRef.current },
				scanDelayMs: info.cadence.delayMs,
				menuMisses: info.cadence.watch.misses,
				scanMs: info.scanMs,
			});
		};

		// One scan tick: fold the panel state, identify the echo when the
		// trigger rules ask for it, fire any queued assistant discard. Returns
		// the delay for the next tick.
		const runScan = async (): Promise<number> => {
			if (busyRef.current) return PANEL_SCAN_INTERVAL_MS;
			busyRef.current = true;
			const startedAt = performance.now();
			try {
				const scan = await scanEchoPanel();
				const scanMs = Math.round(performance.now() - startedAt);

				// Cadence: fast while an echo menu is on screen, back to the
				// standard rate once the menus have been gone for two scans.
				const cadence = watchEchoMenu(menuWatchRef.current, scan);
				menuWatchRef.current = cadence.watch;

				// Panel visibility: the echo bag closes the augmentation on the
				// spot, the high-rarity dialog only hides it (the panel is
				// still open behind the modal, so the echo is remembered), and
				// an unreadable scan counts once it repeats (a flicker must not
				// hide the card).
				const visibility = foldPanelVisibility(closedTicksRef.current, scan);
				closedTicksRef.current = visibility.closedTicks;

				// A single unreadable scan is a flicker, not a closed panel:
				// feed the trigger rules an open panel then, so the target is
				// not reset and no re-identification press fires on recovery.
				const evaluation = evaluateEchoTarget(
					targetRef.current,
					visibility.panelClosed ? scan : { ...scan, panelOpen: true },
					Date.now(),
				);

				setPanelOpen(!visibility.hidden);
				if (visibility.panelClosed || evaluation.changed) resetTrackedEcho();

				targetRef.current = await identifyEcho(
					scan,
					evaluation,
					evaluation.state,
				);

				await runQueuedDiscard(scan);

				if (showMenuDebugRef.current) {
					publishMenuDebug({
						scan,
						panelClosed: visibility.panelClosed,
						hidden: visibility.hidden,
						target: targetRef.current,
						cadence,
						scanMs,
					});
				}

				return cadence.delayMs;
			} catch (error) {
				console.error("Echo name scan failed:", error);
				return PANEL_SCAN_INTERVAL_MS;
			} finally {
				busyRef.current = false;
			}
		};

		// Self-scheduling scan loop: each tick picks the next delay from what
		// it saw, so a slow OCR pass never queues up behind another tick.
		let scanTimer: ReturnType<typeof setTimeout> | undefined;
		let scanStopped = false;
		const runScanLoop = async () => {
			const delayMs = await runScan();
			if (scanStopped) return;
			scanTimer = setTimeout(runScanLoop, delayMs);
		};
		void runScanLoop();

		return () => {
			scanStopped = true;
			if (scanTimer !== undefined) clearTimeout(scanTimer);
		};
	}, [exactEchoRef, setExactEcho, showMenuDebugRef]);

	return { exactEcho, panelOpen, showMenuDebug, menuDebug };
}
