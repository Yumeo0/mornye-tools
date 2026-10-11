import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
	currentMonitor,
	cursorPosition,
	getCurrentWindow,
} from "@tauri-apps/api/window";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Echo } from "@/lib/account";
import {
	type EchoTargetState,
	evaluateEchoTarget,
	INITIAL_ECHO_TARGET,
	markRefetched,
	NAME_SCAN_INTERVAL_MS,
	pressEchoLock,
	scanEchoName,
} from "@/lib/echoTarget";
import {
	type OcrStatsData,
	type OverlayEchoView,
	viewFromEcho,
	viewFromOcr,
} from "@/lib/overlayEcho";
import {
	calculateRating,
	getMaxStatValue,
	getRelevantCharacters,
	getStatProgress,
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

// Set overlay to ignore cursor events so you can click through it
await getCurrentWindow().setIgnoreCursorEvents(true);

/** Closed scans before the panel counts as closed (OCR flicker guard). */
const PANEL_CLOSE_TICKS = 2;
/** Run the OCR stats fallback every Nth name-scan tick while it is needed. */
const STATS_EVERY_TICKS = 2;

function Overlay() {
	const [scanRegion, setScanRegion] = useState<ScanRegion | null>(null);
	const [showScanRegion, setShowScanRegion] = useState(false);
	// Origin of the captured game window; scan regions are window-relative
	const [captureOrigin, setCaptureOrigin] = useState<CaptureOrigin | null>(
		null,
	);
	// Exact echo from the game (lock-request packet path)
	const [exactEcho, setExactEcho] = useState<Echo | null>(null);
	// OCR stats fallback, used until an exact echo is available
	const [ocrStats, setOcrStats] = useState<OcrStatsData | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);
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
	const tickRef = useRef(0);
	const lastEchoKeyRef = useRef<string | null>(null);

	// Single view model for both sources; null hides the card.
	const view: OverlayEchoView | null = useMemo(() => {
		if (!panelOpen) return null;
		if (exactEcho) return viewFromEcho(exactEcho);
		if (ocrStats) return viewFromOcr(ocrStats);
		return null;
	}, [panelOpen, exactEcho, ocrStats]);

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
		const unlistenEcho = listen<Echo>("echo-detected", (event) => {
			exactEchoRef.current = event.payload;
			setExactEcho(event.payload);
			closedTicksRef.current = 0;
			setPanelOpen(true);
		});

		// OCR stats fallback (`scan_for_text`).
		const unlistenStats = listen<OcrStatsData | null>("stats-data", (event) => {
			setOcrStats(event.payload);
		});

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

		// Load the last OCR fallback data on mount
		invoke<OcrStatsData | null>("get_last_stats_data")
			.then((data) => {
				setOcrStats(data);
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

		// One scan tick: read the echo name, ask the game for the exact echo
		// when it changed, and keep the OCR stats fallback warm.
		const runScan = async () => {
			if (busyRef.current) return;
			busyRef.current = true;
			try {
				const scan = await scanEchoName();
				const evaluation = evaluateEchoTarget(
					targetRef.current,
					scan,
					Date.now(),
				);
				let target = evaluation.state;

				if (scan.panelOpen) {
					closedTicksRef.current = 0;
				} else {
					closedTicksRef.current += 1;
				}
				const panelClosed =
					!scan.panelOpen && closedTicksRef.current >= PANEL_CLOSE_TICKS;
				setPanelOpen(!panelClosed);

				if (panelClosed) {
					exactEchoRef.current = null;
					setExactEcho(null);
					setOcrStats(null);
				} else if (evaluation.changed) {
					// A different echo is on screen; the previous exact echo
					// no longer applies.
					exactEchoRef.current = null;
					setExactEcho(null);
					setOcrStats(null);
				}

				// Lock + re-lock so the client reports the echo's id. The key
				// is posted straight to the game window, so it works without
				// focus; failures are retried on the next tick.
				if (evaluation.attempt) {
					try {
						await pressEchoLock();
						target = markRefetched(target);
					} catch (error) {
						console.error("Echo lock press failed:", error);
					}
				}
				targetRef.current = target;

				// OCR stats fallback: only while the panel is open and no
				// exact echo is available yet.
				tickRef.current += 1;
				const due = tickRef.current % STATS_EVERY_TICKS === 0;
				if (
					!panelClosed &&
					!exactEchoRef.current &&
					(due || evaluation.changed)
				) {
					try {
						await invoke("scan_for_text");
					} catch (error) {
						console.error("OCR scan error:", error);
					}
				}
			} catch (error) {
				console.error("Echo name scan failed:", error);
			} finally {
				busyRef.current = false;
			}
		};

		const scanInterval = setInterval(runScan, NAME_SCAN_INTERVAL_MS);
		runScan();

		return () => {
			unlistenEcho.then((fn) => fn());
			unlistenStats.then((fn) => fn());
			unlistenScanRegion.then((fn) => fn());
			unlistenCaptureOrigin.then((fn) => fn());
			unlistenShowRegion.then((fn) => fn());
			window.removeEventListener("resize", updateDisplayScale);
			clearInterval(scanInterval);
		};
	}, []);

	// Reset the highlighted character when a different echo appears.
	useEffect(() => {
		const key = exactEcho
			? `id:${exactEcho.incrId}`
			: (ocrStats?.echo_name ?? null);
		if (key !== lastEchoKeyRef.current) {
			lastEchoKeyRef.current = key;
			setSelectedCharacterId(null);
		}
	}, [exactEcho, ocrStats]);

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
					rating: calculateRating(
						character,
						view?.mainStats ?? [],
						view?.subStats ?? [],
					),
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
									<p
										className={cn(
											"text-center text-[10px] font-medium uppercase tracking-wide",
											view.source === "packet"
												? "text-emerald-400"
												: "text-amber-400",
										)}
									>
										{view.source === "packet"
											? "Exact echo"
											: "OCR (unverified)"}
									</p>
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
											const maxValue = getMaxStatValue(parsed.name, false);
											if (!maxValue) {
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
													</div>
												);
											}

											const { percentage, color } = getStatProgress(
												parsed.value,
												maxValue,
											);

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
													<div className="h-2 bg-black/30 rounded-full overflow-hidden">
														<div
															className="h-full transition-all duration-300"
															style={{
																width: `${percentage}%`,
																backgroundColor: color,
															}}
														/>
													</div>
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
