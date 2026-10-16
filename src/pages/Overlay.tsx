import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
	currentMonitor,
	cursorPosition,
	getCurrentWindow,
} from "@tauri-apps/api/window";
import { Store } from "@tauri-apps/plugin-store";
import {
	type CSSProperties,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { SubStatRollBar } from "@/components/echo/SubStatRollBar";
import type { Echo } from "@/lib/account";
import {
	type EchoMenuWatch,
	type EchoPanelScan,
	type EchoTargetState,
	evaluateEchoTarget,
	foldPanelVisibility,
	INITIAL_ECHO_MENU_WATCH,
	INITIAL_ECHO_TARGET,
	markRefetched,
	PANEL_CLOSE_TICKS,
	PANEL_SCAN_INTERVAL_MS,
	PANEL_SCAN_MENU_MISS_LIMIT,
	pressEchoDiscard,
	pressEchoToggle,
	registerFailedAttempt,
	scanEchoPanel,
	watchEchoMenu,
} from "@/lib/echoTarget";
import {
	type EchoSplitPayload,
	type OverlayEchoView,
	retargetPendingDiscard,
	splitFollowTarget,
	viewFromEcho,
} from "@/lib/overlayEcho";
import {
	calculateRating,
	getRelevantCharacters,
	maxPossibleRating,
	parseStatValue,
} from "@/lib/rating";
import { normalizeStatName } from "@/lib/stats";
import { cn } from "@/lib/utils";

interface ScanRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface CaptureOrigin {
	x: number;
	y: number;
}

/**
 * Panel geometry the overlay's augmentation layer aligns to, in game-window
 * pixels. The game renders name, level and stat values itself; the overlay
 * only adds wanted-stars and roll segments on top of those rows.
 */
interface PanelRegions {
	echo_panel?: ScanRegion | null;
	main_stats?: ScanRegion | null;
	sub_stats?: ScanRegion | null;
	stat_stars?: ScanRegion | null;
	sub_stat_stars?: ScanRegion | null;
}

/** Last presses seen by the menu debug panel, keyed by the press kind. */
type MenuDebugPressLog = Partial<
	Record<"identify" | "discard", { at: number; ok: boolean }>
>;

/** Live menu-detection snapshot for the overlay's debug panel. */
interface MenuDebugInfo {
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

// Set overlay to ignore cursor events so you can click through it. A failure
// must not take this module down: a rejected top-level await would leave the
// whole overlay blank until the app restarts. The cursor-over-card poll
// re-applies the setting anyway.
try {
	await getCurrentWindow().setIgnoreCursorEvents(true);
} catch (error) {
	console.error("Failed to set ignore cursor events:", error);
}

/** Tint of the wanted-star overlay (the game's star asset, masked). */
const WANTED_STAR_COLOR = "#f7eba6";
/** Soft glow around the wanted-star, drawn by the wrapper's drop-shadow. */
const WANTED_STAR_GLOW = "rgba(247, 235, 166, 0.8)";
/** Wanted-stars render a bit larger than the game's own stars. */
const WANTED_STAR_SCALE = 1.25;
/**
 * Fallback for the Echo Upgrade Assistant when no "Tuning Successful" screen
 * follows an update packet: the queued discard fires anyway after this long.
 */
const DISCARD_SCREEN_TIMEOUT_MS = 4000;

function Overlay() {
	const [scanRegion, setScanRegion] = useState<ScanRegion | null>(null);
	const [showScanRegion, setShowScanRegion] = useState(false);
	// Origin of the captured game window; scan regions are window-relative
	const [captureOrigin, setCaptureOrigin] = useState<CaptureOrigin | null>(
		null,
	);
	// Panel geometry (window-relative) the augmentation layer aligns to
	const [panelRegions, setPanelRegions] = useState<PanelRegions | null>(null);
	// Exact echo from the game (lock-request packet path)
	const [exactEcho, setExactEcho] = useState<Echo | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);
	// Menu-detection debug panel (toggled from the settings Debug section)
	const [showMenuDebug, setShowMenuDebug] = useState(false);
	const [menuDebug, setMenuDebug] = useState<MenuDebugInfo | null>(null);
	// Character whose preferred stats are highlighted; null = top ranked
	const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(
		null,
	);
	// Ratio of physical screen pixels to overlay CSS pixels
	const [displayScale, setDisplayScale] = useState(1);
	const charsRef = useRef<HTMLDivElement | null>(null);
	const busyRef = useRef(false);
	const exactEchoRef = useRef<Echo | null>(null);
	const targetRef = useRef<EchoTargetState>(INITIAL_ECHO_TARGET);
	const closedTicksRef = useRef(0);
	// Scan cadence watch: how long the echo menus have been gone, so the scan
	// ticks slowly outside them and fast while they are on screen.
	const menuWatchRef = useRef<EchoMenuWatch>(INITIAL_ECHO_MENU_WATCH);
	const lastEchoKeyRef = useRef<string | null>(null);
	const showMenuDebugRef = useRef(false);
	const lastPressesRef = useRef<MenuDebugPressLog>({});
	// Echo Upgrade Assistant: echo queued for an automatic discard mark.
	const pendingDiscardRef = useRef<number | null>(null);
	// The echo's mark when the discard was queued; player input cancels it.
	const pendingDiscardFuncRef = useRef<number | null>(null);
	// Whether the "Tuning Successful" screen was seen for the queued discard.
	const discardSawTuningRef = useRef(false);
	// When the discard was queued (fallback when no tuning screen appears).
	const discardQueuedAtRef = useRef(0);

	// The card's view model; null hides the card.
	const view: OverlayEchoView | null = useMemo(() => {
		if (!panelOpen) return null;
		if (exactEcho) return viewFromEcho(exactEcho);
		return null;
	}, [panelOpen, exactEcho]);

	// The overlay window is click-through so the game stays playable. To allow
	// clicking the stats card we poll the global cursor position and disable
	// click-through only while the cursor hovers over the card.
	useEffect(() => {
		if (!view) return;

		const win = getCurrentWindow();
		let disposed = false;
		let timer: number | undefined;
		let ignoring = true;

		const setIgnoring = (value: boolean) => {
			if (ignoring === value) return;
			ignoring = value;
			win.setIgnoreCursorEvents(value).catch(() => {});
		};

		const isOverCard = (cssX: number, cssY: number) => {
			const node = charsRef.current;
			if (!node) return false;
			const rect = node.getBoundingClientRect();
			return (
				cssX >= rect.left &&
				cssX <= rect.right &&
				cssY >= rect.top &&
				cssY <= rect.bottom
			);
		};

		const pollCursor = async () => {
			if (disposed) return;
			try {
				const [cursor, origin, scale] = await Promise.all([
					cursorPosition(),
					win.outerPosition(),
					win.scaleFactor(),
				]);
				// Cursor position and window origin are physical pixels,
				// getBoundingClientRect is CSS pixels
				setIgnoring(
					!isOverCard(
						(cursor.x - origin.x) / scale,
						(cursor.y - origin.y) / scale,
					),
				);
			} catch {
				// Not running inside Tauri
			}
			timer = window.setTimeout(pollCursor, 100);
		};

		// Instantly re-enable click-through once the cursor leaves the card
		const onMouseMove = (event: MouseEvent) => {
			setIgnoring(!isOverCard(event.clientX, event.clientY));
		};
		window.addEventListener("mousemove", onMouseMove);
		pollCursor();

		return () => {
			disposed = true;
			if (timer !== undefined) clearTimeout(timer);
			window.removeEventListener("mousemove", onMouseMove);
			setIgnoring(true);
		};
	}, [view]);

	useEffect(() => {
		// Exact echo: the game answered a lock request with the echo's id.
		// The notify also fires for marks made outside the upgrade panel (the
		// player locking an echo in the inventory, say); those must not pop
		// the card. A notify only feeds the display while the scan still sees
		// the panel open - its own identification round trip or a manual mark
		// in the panel - so the card never flashes over another screen.
		const unlistenEcho = listen<Echo>("echo-detected", (event) => {
			if (closedTicksRef.current >= PANEL_CLOSE_TICKS) return;
			exactEchoRef.current = event.payload;
			setExactEcho(event.payload);
			setPanelOpen(true);
		});

		// Echo Upgrade Assistant: after an upgrade, an echo that can no longer
		// reach the configured rating on any relevant character is queued for
		// an automatic discard mark (applied once the upgrade screen clears).
		const queueAssistantDiscard = async (echo: Echo) => {
			// Every update re-evaluates its echo from scratch. A stack upgrade
			// sends an intermediate update (the split moment: level 0, no new
			// substats) before the response with the final stats arrives; a
			// discard queued from that transitional state must not survive the
			// final echo passing the threshold.
			if (pendingDiscardRef.current === echo.incrId) {
				pendingDiscardRef.current = null;
				pendingDiscardFuncRef.current = null;
			}
			try {
				const store = await Store.load("settings.json");
				const enabled = await store.get<boolean>("upgradeAssistantEnabled");
				if (enabled !== true) return;
				const threshold =
					(await store.get<number>("upgradeAssistantThreshold")) ?? 75;
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
				pendingDiscardRef.current = echo.incrId;
				pendingDiscardFuncRef.current = echo.funcValue;
				// The discard key is swallowed while the "Tuning Successful"
				// screen is up, so wait for it to be seen and cleared.
				discardSawTuningRef.current = false;
				discardQueuedAtRef.current = Date.now();
			} catch (error) {
				console.error("Upgrade assistant failed:", error);
			}
		};

		// In-place echo update (e.g. an upgrade added substats): refresh the
		// card when the update is for the echo already on screen.
		const unlistenEchoUpdated = listen<Echo>("echo-updated", (event) => {
			const current = exactEchoRef.current;
			if (current && current.incrId === event.payload.incrId) {
				exactEchoRef.current = event.payload;
				setExactEcho(event.payload);
				void queueAssistantDiscard(event.payload);
			}
		});

		// Stack split: upgrading one copy of a stack moves it to a new
		// instance id while the tracked id becomes the unleveled remainder.
		// The card (and any queued assistant discard) must follow the
		// operated half - that is the echo now on screen.
		const unlistenEchoSplit = listen<EchoSplitPayload>(
			"echo-split",
			(event) => {
				if (closedTicksRef.current >= PANEL_CLOSE_TICKS) return;
				const split = event.payload;
				const follow = splitFollowTarget(exactEchoRef.current, split);
				if (!follow) return;
				exactEchoRef.current = follow;
				setExactEcho(follow);
				const pending = retargetPendingDiscard(
					pendingDiscardRef.current,
					split,
				);
				if (pending !== pendingDiscardRef.current) {
					pendingDiscardRef.current = pending;
					pendingDiscardFuncRef.current = follow.funcValue;
				}
				void queueAssistantDiscard(follow);
			},
		);

		// Listen for scan region changes so the outline follows live edits
		const unlistenScanRegion = listen<ScanRegion>(
			"scan-region-changed",
			(event) => {
				setScanRegion(event.payload);
			},
		);

		// Panel geometry the augmentation layer aligns to; follows live edits
		const unlistenScanRegions = listen<PanelRegions>(
			"scan-regions-changed",
			(event) => {
				setPanelRegions(event.payload);
			},
		);

		// Listen for game window origin changes so the outline stays anchored
		// to the window the regions are relative to
		const unlistenCaptureOrigin = listen<CaptureOrigin | null>(
			"capture-origin-changed",
			(event) => {
				setCaptureOrigin(event.payload);
			},
		);

		// Listen for scan region visibility changes
		const unlistenShowRegion = listen<boolean>(
			"show-scan-region-changed",
			(event) => {
				setShowScanRegion(event.payload);
				// Re-read the region; the overlay may have started before any
				// region was set
				invoke<ScanRegion | null>("get_scan_region")
					.then((region) => {
						setScanRegion(region);
					})
					.catch(console.error);
			},
		);

		// Menu-detection debug panel: the settings window persists the choice
		// and relays live toggles; the stored value is also read here so the
		// panel survives an app restart.
		Store.load("settings.json")
			.then(async (store) => {
				const saved = await store.get<boolean>("showMenuDebug");
				if (saved === true) {
					showMenuDebugRef.current = true;
					setShowMenuDebug(true);
				}
			})
			.catch(console.error);

		const unlistenMenuDebug = listen<boolean>(
			"show-menu-debug-changed",
			(event) => {
				showMenuDebugRef.current = event.payload;
				setShowMenuDebug(event.payload);
			},
		);

		// Load scan region
		invoke<ScanRegion | null>("get_scan_region")
			.then((region) => {
				setScanRegion(region);
			})
			.catch(console.error);

		// Load the panel geometry the augmentation layer aligns to
		invoke<PanelRegions | null>("get_scan_regions")
			.then((regions) => {
				setPanelRegions(regions);
			})
			.catch(console.error);

		// Load the captured game window origin
		invoke<CaptureOrigin | null>("get_capture_origin")
			.then((origin) => {
				setCaptureOrigin(origin);
			})
			.catch(console.error);

		// Load show scan region state
		invoke<boolean>("get_show_scan_region")
			.then((show) => {
				setShowScanRegion(show);
			})
			.catch(console.error);

		// Region outlines are positioned in physical screen pixels; scale them
		// into the overlay window's CSS pixel space. Measuring the actual
		// monitor width against the viewport covers both DPI scaling and a
		// fullscreen window that did not cover the whole monitor.
		const updateDisplayScale = () => {
			currentMonitor()
				.then((monitor) => {
					if (monitor && window.innerWidth > 0) {
						setDisplayScale(monitor.size.width / window.innerWidth);
					}
				})
				.catch(console.error);
		};
		updateDisplayScale();
		window.addEventListener("resize", updateDisplayScale);

		// One scan tick: watch the panel state and ask the game for the exact
		// echo when it changed. Returns the delay to wait before the next tick.
		const runScan = async (): Promise<number> => {
			if (busyRef.current) return PANEL_SCAN_INTERVAL_MS;
			busyRef.current = true;
			const startedAt = performance.now();
			try {
				const scan = await scanEchoPanel();
				const scanMs = Math.round(performance.now() - startedAt);

				// Scan cadence: a menu read means an echo menu is on screen,
				// where the overlay polls fast; once the menus have been gone
				// for more than two scans it drops back to the standard rate.
				const cadence = watchEchoMenu(menuWatchRef.current, scan);
				menuWatchRef.current = cadence.watch;

				// Panel visibility: the echo bag closes the augmentation on
				// the spot, the high-rarity dialog only hides it (the panel is
				// still open behind the modal, so the echo is remembered), and
				// an unreadable scan counts once it repeats (a flicker must not
				// hide the card).
				const visibility = foldPanelVisibility(closedTicksRef.current, scan);
				closedTicksRef.current = visibility.closedTicks;
				const panelClosed = visibility.panelClosed;

				// A single unreadable scan is a flicker, not a closed panel:
				// feed the trigger rules an open panel then, so the target is
				// not reset and no re-identification press fires on recovery
				// (e.g. the moment the tuning banner gives way to the panel).
				const evaluation = evaluateEchoTarget(
					targetRef.current,
					panelClosed ? scan : { ...scan, panelOpen: true },
					Date.now(),
				);
				let target = evaluation.state;

				setPanelOpen(!visibility.hidden);

				if (panelClosed) {
					exactEchoRef.current = null;
					setExactEcho(null);
					pendingDiscardRef.current = null;
				} else if (evaluation.changed) {
					// A different echo is on screen; the previous exact echo
					// no longer applies.
					exactEchoRef.current = null;
					setExactEcho(null);
					pendingDiscardRef.current = null;
				}

				// Identify the echo and restore its mark state. The key is
				// posted straight to the game window, so it works without
				// focus; failures are retried on the next tick. Presses are
				// only allowed while the scan genuinely reports the panel open:
				// the flicker-tolerant scan above may keep the card state
				// through a single unreadable tick, but a press in any other
				// screen (echo inventory, equip menu) would toggle whatever is
				// selected there.
				if (
					evaluation.attempt &&
					scan.panelOpen &&
					!scan.sortIconVisible &&
					!scan.highRarityNoticeVisible
				) {
					try {
						await pressEchoToggle();
						target = markRefetched(target);
						lastPressesRef.current.identify = {
							at: Date.now(),
							ok: true,
						};
					} catch (error) {
						console.error("Echo mark press failed:", error);
						target = registerFailedAttempt(target);
						lastPressesRef.current.identify = {
							at: Date.now(),
							ok: false,
						};
					}
				}
				targetRef.current = target;

				// Echo Upgrade Assistant: a queued discard waits out the
				// "Tuning Successful" screen (the discard key is swallowed
				// while it is up), then fires only while the upgrade panel is
				// verifiably showing - in any other screen (echo inventory,
				// equip menu) the key would act on whatever is selected. If no
				// screen follows the update packet, the wait times out.
				if (pendingDiscardRef.current !== null) {
					if (scan.tuningSuccessful) {
						discardSawTuningRef.current = true;
					}
					const echo = exactEchoRef.current;
					const screenCleared =
						discardSawTuningRef.current ||
						Date.now() - discardQueuedAtRef.current >=
							DISCARD_SCREEN_TIMEOUT_MS;
					if (
						scan.panelOpen &&
						!scan.tuningSuccessful &&
						!scan.sortIconVisible &&
						!scan.highRarityNoticeVisible &&
						screenCleared &&
						echo?.incrId === pendingDiscardRef.current
					) {
						if (echo.funcValue !== pendingDiscardFuncRef.current) {
							// The player marked the echo after the assistant
							// queued it (locking it back, say); their input wins
							// and the discard is cancelled.
							pendingDiscardRef.current = null;
						} else {
							const incrId = pendingDiscardRef.current;
							pendingDiscardRef.current = null;
							try {
								await pressEchoDiscard();
								lastPressesRef.current.discard = {
									at: Date.now(),
									ok: true,
								};
							} catch (error) {
								console.error("Auto-discard press failed:", error);
								pendingDiscardRef.current = incrId;
								lastPressesRef.current.discard = {
									at: Date.now(),
									ok: false,
								};
							}
						}
					}
				}

				// Menu-detection debug snapshot (only while the panel is on).
				if (showMenuDebugRef.current) {
					setMenuDebug({
						scan,
						panelClosed,
						panelHidden: visibility.hidden,
						closedTicks: closedTicksRef.current,
						needsRefetch: target.needsRefetch,
						failures: target.failures,
						lastAttemptAt: target.lastAttemptAt,
						pendingDiscard: pendingDiscardRef.current,
						lastPresses: { ...lastPressesRef.current },
						scanDelayMs: cadence.delayMs,
						menuMisses: cadence.watch.misses,
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
			unlistenEcho.then((fn) => fn());
			unlistenEchoUpdated.then((fn) => fn());
			unlistenEchoSplit.then((fn) => fn());
			unlistenScanRegion.then((fn) => fn());
			unlistenScanRegions.then((fn) => fn());
			unlistenCaptureOrigin.then((fn) => fn());
			unlistenShowRegion.then((fn) => fn());
			unlistenMenuDebug.then((fn) => fn());
			window.removeEventListener("resize", updateDisplayScale);
		};
	}, []);

	// Reset the highlighted character when a different echo appears.
	useEffect(() => {
		const key = exactEcho ? `id:${exactEcho.incrId}` : null;
		if (key !== lastEchoKeyRef.current) {
			lastEchoKeyRef.current = key;
			setSelectedCharacterId(null);
		}
	}, [exactEcho]);

	const mainStats = view?.mainStats ?? [];
	const subStats = view?.subStats ?? [];

	// Rank the relevant characters by how well the echoed echo fits them
	const relevantCharacters = useMemo(
		() =>
			view && view.setNames.length > 0
				? getRelevantCharacters(view.setNames)
				: [],
		[view],
	);

	const rankedCharacters = useMemo(
		() =>
			relevantCharacters
				.map((character) => ({
					character,
					rating: calculateRating(character, view?.subStats ?? []),
				}))
				.sort((a, b) => b.rating - a.rating),
		[relevantCharacters, view],
	);

	// Character whose preferred stats are highlighted by the stars
	const activeCharacter =
		rankedCharacters.find(
			({ character }) => character.character_id === selectedCharacterId,
		)?.character ??
		rankedCharacters[0]?.character ??
		null;
	const preferredMainStats = new Set(
		activeCharacter
			? [
					...activeCharacter.stats["4cost"],
					...activeCharacter.stats["3cost"],
					...activeCharacter.stats["1cost"],
				]
					.flat()
					.map(normalizeStatName)
			: [],
	);
	const preferredSubStats = new Set(
		activeCharacter
			? activeCharacter.stats.subs.flat().map(normalizeStatName)
			: [],
	);

	// Menu-detection debug strings
	const debugMenuLabel = !menuDebug
		? ""
		: menuDebug.scan.tuningSuccessful
			? menuDebug.scan.waitingForBanner
				? "Tuning banner animating in"
				: "Tuning Successful screen"
			: menuDebug.scan.panelOpen
				? "Echo Upgrade panel"
				: "Other screen - no Echo Upgrade panel";
	const debugMenuColor = menuDebug?.scan.tuningSuccessful
		? "text-amber-400"
		: menuDebug?.scan.panelOpen
			? "text-emerald-400"
			: "text-zinc-400";
	const debugAgo = (at: number) =>
		`${((Date.now() - at) / 1000).toFixed(1)}s ago`;
	const debugPress = (kind: "identify" | "discard") => {
		const press = menuDebug?.lastPresses[kind];
		return press ? `${debugAgo(press.at)}${press.ok ? "" : " (failed)"}` : "-";
	};

	// The augmentation layer aligns to the game's own stat rows: wanted-stars
	// in the gutter left of each row, roll segments below each substat. Name,
	// level and values are the game's to render.
	const mainRegion = panelRegions?.main_stats ?? null;
	const subRegion = panelRegions?.sub_stats ?? null;
	const starsRegion = panelRegions?.stat_stars ?? null;
	const subStarsRegion = panelRegions?.sub_stat_stars ?? null;
	const panelRegion = panelRegions?.echo_panel ?? null;
	const anchored = mainRegion !== null && subRegion !== null;
	const originX = captureOrigin?.x ?? 0;
	const originY = captureOrigin?.y ?? 0;
	// The game draws two main-stat rows and five substat row slots from the
	// top of each region, so per-row geometry follows from the region height.
	const mainRowHeight = (mainRegion?.height ?? 0) / 2;
	const subRowHeight = (subRegion?.height ?? 0) / 5;
	const starSize = Math.min(starsRegion?.width ?? 26, 26);
	const starX = starsRegion ? starsRegion.x : (mainRegion?.x ?? 0) - 40;
	// The substat-star region encapsulates the game's five star icons exactly,
	// so the stars tile it: container width per star, an even pitch with the
	// first star flush against the top and the last against the bottom.
	const subStarSize = subStarsRegion?.width ?? 0;
	const subStarPitch =
		subStarsRegion && subStarSize > 0
			? (subStarsRegion.height - subStarsRegion.width) / 4
			: subRowHeight;
	const anchorLeft = panelRegion
		? panelRegion.x + panelRegion.width
		: (mainRegion?.x ?? 0) + (mainRegion?.width ?? 0);
	const anchorTop = panelRegion?.y ?? mainRegion?.y ?? 0;

	// The game's star asset tinted through a CSS mask; drawn only over stats
	// the active character wants, a bit larger than the original. Positioned
	// by its center so the enlarged star stays centered on the game's own.
	// The glow sits on this wrapper: masking is applied after filtering, so a
	// drop-shadow on the masked element itself would be clipped away by the
	// star mask and never show.
	const starStyle = (cx: number, cy: number, size: number): CSSProperties => ({
		position: "absolute",
		left: (originX + cx - size / 2) * displayScale,
		top: (originY + cy - size / 2) * displayScale,
		width: size * displayScale,
		height: size * displayScale,
		filter: `drop-shadow(0 0 ${2 * displayScale}px ${WANTED_STAR_GLOW}) drop-shadow(0 0 ${6 * displayScale}px ${WANTED_STAR_GLOW})`,
	});
	/** The tinted star shape inside the glowing wrapper. */
	const starMaskStyle: CSSProperties = {
		position: "absolute",
		inset: 0,
		backgroundColor: WANTED_STAR_COLOR,
		maskImage: "url(/star.png)",
		maskSize: "100% 100%",
		maskRepeat: "no-repeat",
		WebkitMaskImage: "url(/star.png)",
		WebkitMaskSize: "100% 100%",
		WebkitMaskRepeat: "no-repeat",
	};
	const charactersStyle: CSSProperties = anchored
		? {
				pointerEvents: "auto",
				position: "absolute",
				left: (originX + anchorLeft + 20) * displayScale,
				top: (originY + anchorTop) * displayScale,
				width: 280 * displayScale,
			}
		: {
				pointerEvents: "auto",
				position: "absolute",
				left: "50%",
				top: 40,
				transform: "translateX(-50%)",
				width: 450,
			};

	return (
		<div style={{ width: "100vw", height: "100vh", position: "relative" }}>
			{/* Scan Region Outline */}
			{showScanRegion && scanRegion && (
				<div
					style={{
						position: "absolute",
						// Regions are relative to the game window; add the window
						// origin to place the outline on screen
						left: `${((captureOrigin?.x ?? 0) + scanRegion.x) * displayScale}px`,
						top: `${((captureOrigin?.y ?? 0) + scanRegion.y) * displayScale}px`,
						width: `${scanRegion.width * displayScale}px`,
						height: `${scanRegion.height * displayScale}px`,
						border: "3px solid rgba(147, 51, 234, 0.9)",
						backgroundColor: "rgba(147, 51, 234, 0.1)",
						pointerEvents: "none",
						boxShadow: "0 0 20px rgba(147, 51, 234, 0.5)",
						zIndex: 1,
					}}
				/>
			)}

			{/* Menu-detection debug panel (toggled in the settings Debug section) */}
			{showMenuDebug && menuDebug && (
				<div
					style={{ pointerEvents: "none" }}
					className="fixed bottom-4 left-4 z-50 w-96 space-y-1.5 rounded-md border border-white/10 bg-black/80 p-3 font-mono text-[11px] leading-snug text-zinc-200 shadow-2xl backdrop-blur-sm"
				>
					<div className="text-[10px] uppercase tracking-wider text-zinc-500">
						Menu detection
					</div>
					<div className={cn("font-bold", debugMenuColor)}>
						{debugMenuLabel}
					</div>
					<div className="grid grid-cols-[auto_1fr] gap-x-3">
						<span className="text-zinc-500">title</span>
						<span className="break-all">
							{menuDebug.scan.titleText.trim() || "(no text)"}
						</span>
						<span className="text-zinc-500">banner</span>
						<span className="break-all">
							{menuDebug.scan.bannerText.trim() || "(not read)"}
						</span>
						<span className="text-zinc-500">flags</span>
						<span>
							panel {menuDebug.scan.panelOpen ? "yes" : "no"} · tuning{" "}
							{menuDebug.scan.tuningSuccessful ? "yes" : "no"} · waiting{" "}
							{menuDebug.scan.waitingForBanner ? "yes" : "no"} · echoes{" "}
							{menuDebug.scan.echoesVisible ? "yes" : "no"} · cost{" "}
							{menuDebug.scan.echoCostVisible ? "yes" : "no"}
						</span>
						<span className="text-zinc-500">sortIcon</span>
						<span>
							{menuDebug.scan.sortIconVisible ? "yes" : "no"}{" "}
							{menuDebug.scan.sortIconScore === null
								? "(no template)"
								: `(${menuDebug.scan.sortIconScore.toFixed(2)})`}
						</span>
						<span className="text-zinc-500">rarity</span>
						<span className="break-all">
							{menuDebug.scan.highRarityNoticeVisible ? "yes" : "no"}
							{menuDebug.scan.highRarityNoticeText.trim()
								? ` (${menuDebug.scan.highRarityNoticeText.trim()})`
								: ""}
						</span>
						<span className="text-zinc-500">menu</span>
						<span className="break-all">
							echoes {menuDebug.scan.echoesText.trim() || "(no text)"} · cost{" "}
							{menuDebug.scan.costText.trim() || "(no text)"}
						</span>
						<span className="text-zinc-500">cadence</span>
						<span>
							{menuDebug.scanDelayMs} ms
							{menuDebug.menuMisses >= PANEL_SCAN_MENU_MISS_LIMIT
								? " (menus gone)"
								: ` · ${menuDebug.menuMisses} missed`}{" "}
							· tick {menuDebug.scanMs} ms
						</span>
						<span className="text-zinc-500">card</span>
						<span>
							{menuDebug.panelClosed
								? `hidden (closed ${menuDebug.closedTicks} scans)`
								: menuDebug.panelHidden
									? "hidden (dialog)"
									: "shown"}
						</span>
						<span className="text-zinc-500">trigger</span>
						<span>
							refetch {menuDebug.needsRefetch ? "needed" : "no"}
							{menuDebug.failures > 0 ? ` (${menuDebug.failures} failed)` : ""}{" "}
							· wanted{" "}
							{menuDebug.lastAttemptAt
								? debugAgo(menuDebug.lastAttemptAt)
								: "-"}
						</span>
						<span className="text-zinc-500">presses</span>
						<span>
							identify {debugPress("identify")} · discard{" "}
							{debugPress("discard")}
						</span>
						<span className="text-zinc-500">queue</span>
						<span>
							{menuDebug.pendingDiscard === null
								? "none"
								: `echo ${menuDebug.pendingDiscard}`}
						</span>
					</div>
				</div>
			)}

			{view && (
				<>
					{anchored && mainRegion && subRegion && (
						<div style={{ pointerEvents: "none" }}>
							{/* Wanted-stars beside the game's main-stat rows */}
							{mainStats.map((stat, index) => {
								const parsed = parseStatValue(stat);
								const statName = parsed ? normalizeStatName(parsed.name) : "";
								if (!preferredMainStats.has(statName)) return null;
								return (
									<div
										key={`main-star-${stat}`}
										style={starStyle(
											starX + starSize / 2,
											mainRegion.y + index * mainRowHeight + mainRowHeight / 2,
											starSize * WANTED_STAR_SCALE,
										)}
									>
										<div style={starMaskStyle} />
									</div>
								);
							})}
							{/* Wanted-stars and roll segments on the substat rows */}
							{subStats.map((stat, index) => {
								const parsed = parseStatValue(stat);
								if (!parsed) return null;
								const statName = normalizeStatName(parsed.name);
								const wanted = preferredSubStats.has(statName);
								const rowTop = subRegion.y + index * subRowHeight;
								return (
									<div key={`sub-${stat}`}>
										{wanted && subStarsRegion && (
											// Cover the game's own substat star with the
											// wanted-star.
											<div
												style={starStyle(
													subStarsRegion.x + subStarsRegion.width / 2,
													subStarsRegion.y +
														index * subStarPitch +
														subStarsRegion.width / 2,
													subStarSize * WANTED_STAR_SCALE,
												)}
											>
												<div style={starMaskStyle} />
											</div>
										)}
										<div
											style={{
												position: "absolute",
												left: (originX + subRegion.x) * displayScale,
												top:
													(originY + rowTop + subRowHeight - 8) * displayScale,
												width: subRegion.width * displayScale,
												height: 5 * displayScale,
											}}
										>
											<SubStatRollBar
												statName={parsed.name}
												value={parsed.value}
												className="h-full"
												dimmed={!wanted}
											/>
										</div>
									</div>
								);
							})}
						</div>
					)}

					{/* Relevant characters, beside the stats panel. Styled after the
					    game's own pills: fully rounded, translucent white/gray
					    over the screen, gold accent on the active pick. */}
					{relevantCharacters.length > 0 && (
						<div
							ref={charsRef}
							style={charactersStyle}
							className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-black/35 p-2 shadow-2xl backdrop-blur-sm"
						>
							<h3 className="px-2 pt-0.5 text-lg font-bold text-white">
								Relevant Characters
							</h3>
							<div className="flex flex-col gap-1.5">
								{rankedCharacters.map(({ character, rating }) => {
									const isActive =
										character.character_id === activeCharacter?.character_id;
									return (
										<button
											type="button"
											key={character.character_id}
											onClick={() =>
												setSelectedCharacterId(
													isActive && selectedCharacterId !== null
														? null
														: character.character_id,
												)
											}
											className={cn(
												"flex h-11 w-full items-center gap-2.5 rounded-full border pr-3.5 pl-0 text-left transition-colors",
												isActive
													? "border-[#f7eba6]/70 bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_10px_rgba(247,235,166,0.35)]"
													: "border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_3px_rgba(0,0,0,0.4)] hover:border-white/25 hover:bg-white/15",
											)}
										>
											<img
												src={character.icon_pile}
												alt={character.character_name}
												className="h-full aspect-square shrink-0 rounded-full object-contain"
											/>
											<span className="flex-1 truncate text-sm font-medium text-white">
												{character.character_name}
											</span>
											<span
												className={cn(
													"text-sm font-bold",
													isActive ? "text-[#f7eba6]" : "text-white/90",
												)}
											>
												{rating}%
											</span>
										</button>
									);
								})}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}

export default Overlay;
