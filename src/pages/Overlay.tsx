import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
	currentMonitor,
	cursorPosition,
	getCurrentWindow,
} from "@tauri-apps/api/window";
import { Store } from "@tauri-apps/plugin-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { SubStatRollBar } from "@/components/echo/SubStatRollBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Echo } from "@/lib/account";
import {
	type EchoPanelScan,
	type EchoTargetState,
	evaluateEchoTarget,
	INITIAL_ECHO_TARGET,
	markRefetched,
	PANEL_SCAN_INTERVAL_MS,
	pressEchoDiscard,
	pressEchoToggle,
	registerFailedAttempt,
	scanEchoPanel,
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

/** Last presses seen by the menu debug panel, keyed by the press kind. */
type MenuDebugPressLog = Partial<
	Record<"identify" | "discard", { at: number; ok: boolean }>
>;

/** Live menu-detection snapshot for the overlay's debug panel. */
interface MenuDebugInfo {
	scan: EchoPanelScan;
	/** The flicker guard says the panel is closed (the card is hidden). */
	panelClosed: boolean;
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

/**
 * Closed scans before the panel counts as closed. A single unreadable scan is
 * treated as a flicker for both the card and the trigger rules, so it neither
 * hides the card nor resets the identified echo. The upgrade/tuning screens
 * are detected via the "Tuning Successful" region.
 */
const PANEL_CLOSE_TICKS = 2;
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
	const cardRef = useRef<HTMLDivElement | null>(null);
	const busyRef = useRef(false);
	const exactEchoRef = useRef<Echo | null>(null);
	const targetRef = useRef<EchoTargetState>(INITIAL_ECHO_TARGET);
	const closedTicksRef = useRef(0);
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
			const card = cardRef.current;
			if (!card) return false;
			const rect = card.getBoundingClientRect();
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
		// echo when it changed.
		const runScan = async () => {
			if (busyRef.current) return;
			busyRef.current = true;
			try {
				const scan = await scanEchoPanel();

				if (scan.panelOpen) {
					closedTicksRef.current = 0;
				} else {
					closedTicksRef.current += 1;
				}
				const panelClosed =
					!scan.panelOpen && closedTicksRef.current >= PANEL_CLOSE_TICKS;

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

				setPanelOpen(!panelClosed);

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
						closedTicks: closedTicksRef.current,
						needsRefetch: target.needsRefetch,
						failures: target.failures,
						lastAttemptAt: target.lastAttemptAt,
						pendingDiscard: pendingDiscardRef.current,
						lastPresses: { ...lastPressesRef.current },
					});
				}
			} catch (error) {
				console.error("Echo name scan failed:", error);
			} finally {
				busyRef.current = false;
			}
		};

		const scanInterval = setInterval(runScan, PANEL_SCAN_INTERVAL_MS);
		runScan();

		return () => {
			unlistenEcho.then((fn) => fn());
			unlistenEchoUpdated.then((fn) => fn());
			unlistenEchoSplit.then((fn) => fn());
			unlistenScanRegion.then((fn) => fn());
			unlistenCaptureOrigin.then((fn) => fn());
			unlistenShowRegion.then((fn) => fn());
			unlistenMenuDebug.then((fn) => fn());
			window.removeEventListener("resize", updateDisplayScale);
			clearInterval(scanInterval);
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

	return (
		<div
			style={{
				width: "100vw",
				height: "100vh",
				display: "flex",
				alignItems: "flex-start",
				justifyContent: "center",
				paddingTop: "40px",
			}}
		>
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
							{menuDebug.scan.waitingForBanner ? "yes" : "no"}
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
						<span className="text-zinc-500">card</span>
						<span>
							{menuDebug.panelClosed
								? `hidden (closed ${menuDebug.closedTicks} scans)`
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

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "20px",
					alignItems: "center",
				}}
			>
				{/* Stats Display */}
				{view && (
					<div ref={cardRef}>
						<Card
							className="min-w-112.5 bg-card/95 backdrop-blur-sm shadow-2xl border-2"
							style={{ pointerEvents: "auto" }}
						>
							{/* Echo Name Header */}
							{view.name && (
								<CardHeader className="border-b pb-3">
									<CardTitle className="flex items-center justify-center gap-2 text-xl">
										<span className="truncate">{view.name}</span>
										{view.level && (
											<span className="text-base font-bold text-yellow-400">
												{view.level}
											</span>
										)}
									</CardTitle>
								</CardHeader>
							)}

							<CardContent className="space-y-4">
								{/* Main Stats Section */}
								<div className="space-y-2">
									<h3 className="text-base font-bold text-purple-400">
										Main Stats
									</h3>
									<div className="space-y-1">
										{mainStats.map((stat) => {
											const parsed = parseStatValue(stat);
											const statName = parsed
												? normalizeStatName(parsed.name)
												: "";
											const isPreferred = preferredMainStats.has(statName);
											return (
												<div
													key={`main-${stat}`}
													className={cn("text-sm flex items-center gap-2")}
												>
													{isPreferred && (
														<HugeiconsIcon
															icon={StarIcon}
															className="w-4 h-4 text-yellow-400"
														/>
													)}
													{stat}
												</div>
											);
										})}
									</div>
								</div>

								{/* Sub Stats Section */}
								<div className="space-y-2">
									<h3 className="text-base font-bold text-blue-400">
										Sub Stats
									</h3>
									<div className="space-y-2">
										{subStats.map((stat) => {
											const parsed = parseStatValue(stat);
											if (!parsed) {
												return (
													<div key={`sub-${stat}`} className="text-xs">
														{stat}
													</div>
												);
											}

											const statName = normalizeStatName(parsed.name);
											const isPreferred = preferredSubStats.has(statName);

											return (
												<div key={`sub-${stat}`} className="space-y-1">
													<div className="flex justify-between items-center text-xs">
														<div className="flex items-center gap-2">
															{isPreferred && (
																<HugeiconsIcon
																	icon={StarIcon}
																	className="w-3 h-3 text-yellow-400"
																/>
															)}
															<span>{parsed.name}</span>
														</div>
														<span className="font-bold">
															{parsed.value}
															{parsed.hasPercent ? "%" : ""}
														</span>
													</div>
													<SubStatRollBar
														statName={parsed.name}
														value={parsed.value}
														className="h-1.5"
													/>
												</div>
											);
										})}
									</div>
								</div>

								{/* Relevant Characters Section */}
								{relevantCharacters.length > 0 && (
									<div className="space-y-2">
										<h3 className="text-base font-bold text-green-400">
											Relevant Characters
										</h3>
										<p className="text-xs text-muted-foreground">
											Click a character to highlight their preferred stats
										</p>
										<div className="space-y-2">
											{rankedCharacters.map(({ character, rating }) => {
												const isActive =
													character.character_id ===
													activeCharacter?.character_id;
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
														className={`flex w-full items-center gap-3 bg-muted/50 p-2 text-left ${
															isActive ? "border border-primary" : ""
														}`}
													>
														<img
															src={character.icon_pile}
															alt={character.character_name}
															className="w-6 h-6 object-contain"
														/>
														<span className="text-sm flex-1">
															{character.character_name}
														</span>
														<span className="text-sm font-bold text-yellow-400">
															{rating}%
														</span>
													</button>
												);
											})}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
}

export default Overlay;
