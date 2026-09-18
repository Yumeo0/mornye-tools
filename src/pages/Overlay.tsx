import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
	currentMonitor,
	cursorPosition,
	getCurrentWindow,
} from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type CharacterInfo,
	calculateRating,
	findEcho,
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

interface StatsData {
	echo_name: string;
	level: string;
	main_stats: string;
	sub_stats: string;
}

interface GridConfig {
	startX: number;
	startY: number;
	columnSpacing: number;
	rowSpacing: number;
	cellWidth: number;
	cellHeight: number;
	columns: number;
	rows: number;
	clickWaitMs: number;
	scrollWaitMs: number;
}

interface InventoryConfig {
	counter: ScanRegion;
	name: ScanRegion;
	level: ScanRegion;
	mainStats: ScanRegion;
	subStats: ScanRegion;
	grid: GridConfig;
}

// Set overlay to ignore cursor events so you can click through it
await getCurrentWindow().setIgnoreCursorEvents(true);

// Update relevant characters based on the scanned echo's sonata sets
function getRelevantCharactersForStatsData(data: StatsData | null) {
	if (!data?.echo_name) return [];
	const echo = findEcho(data.echo_name);
	if (!echo) return [];
	return getRelevantCharacters(echo.echo_sets.map((set) => set.name));
}

function Overlay() {
	const [textFound, setTextFound] = useState<boolean>(false);
	const [scanRegion, setScanRegion] = useState<ScanRegion | null>(null);
	const [showScanRegion, setShowScanRegion] = useState(false);
	const [statsData, setStatsData] = useState<StatsData | null>(null);
	const [relevantCharacters, setRelevantCharacters] = useState<CharacterInfo[]>(
		[],
	);
	// Character whose preferred stats are highlighted; null = top ranked
	const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(
		null,
	);
	const [inventoryPreview, setInventoryPreview] = useState(false);
	const [inventoryConfig, setInventoryConfig] =
		useState<InventoryConfig | null>(null);
	// Ratio of physical screen pixels to overlay CSS pixels
	const [displayScale, setDisplayScale] = useState(1);
	const cardRef = useRef<HTMLDivElement | null>(null);
	const isScanningRef = useRef(false);
	// Echo name of the last stats event, used to detect echo changes
	const lastEchoNameRef = useRef<string | null>(null);

	// The overlay window is click-through so the game stays playable. To allow
	// clicking the stats card we poll the global cursor position and disable
	// click-through only while the cursor hovers over the card.
	useEffect(() => {
		if (!textFound || !statsData) return;

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
	}, [textFound, statsData]);

	useEffect(() => {
		// Listen for OCR results from the backend
		const unlistenOcr = listen<boolean>("ocr-result", (event) => {
			setTextFound(event.payload);
		});

		// Listen for stats data from the backend
		const unlistenStats = listen<StatsData | null>("stats-data", (event) => {
			setStatsData(event.payload);
			setRelevantCharacters(getRelevantCharactersForStatsData(event.payload));
			// Only reset the selection when a different echo is scanned; the
			// backend emits stats-data on every scan tick (every 2 seconds)
			if ((event.payload?.echo_name ?? null) !== lastEchoNameRef.current) {
				lastEchoNameRef.current = event.payload?.echo_name ?? null;
				setSelectedCharacterId(null);
			}
		});

		// Listen for scan region changes so the outline follows live edits
		const unlistenScanRegion = listen<ScanRegion>(
			"scan-region-changed",
			(event) => {
				setScanRegion(event.payload);
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

		// Listen for inventory region preview changes
		const unlistenInventoryPreview = listen<boolean>(
			"inventory-preview-changed",
			(event) => {
				setInventoryPreview(event.payload);
				if (event.payload) {
					// Make sure we have the region config; a mount-time fetch may
					// have failed (e.g. backend not ready yet)
					invoke<InventoryConfig>("get_inventory_config")
						.then((config) => {
							setInventoryConfig(config);
						})
						.catch(console.error);
				}
			},
		);

		// Load last scan result on mount
		invoke<boolean | null>("get_last_scan_result")
			.then((result) => {
				if (result !== null) {
					setTextFound(result);
				}
			})
			.catch(console.error);

		// Load last stats data on mount
		invoke<StatsData | null>("get_last_stats_data")
			.then((data) => {
				setStatsData(data);
				setRelevantCharacters(getRelevantCharactersForStatsData(data));
			})
			.catch(console.error);

		// Load scan region
		invoke<ScanRegion | null>("get_scan_region")
			.then((region) => {
				setScanRegion(region);
			})
			.catch(console.error);

		// Load show scan region state
		invoke<boolean>("get_show_scan_region")
			.then((show) => {
				setShowScanRegion(show);
			})
			.catch(console.error);

		// Load inventory preview state and region config
		invoke<boolean>("get_inventory_preview")
			.then((show) => {
				setInventoryPreview(show);
			})
			.catch(console.error);
		invoke<InventoryConfig>("get_inventory_config")
			.then((config) => {
				setInventoryConfig(config);
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

		// Set up interval for continuous scanning
		const scanInterval = setInterval(async () => {
			if (isScanningRef.current) return;
			isScanningRef.current = true;
			try {
				await invoke("scan_for_text");
			} catch (error) {
				console.error("Scan error:", error);
			} finally {
				isScanningRef.current = false;
			}
		}, 2000); // Scan every 2 seconds

		return () => {
			unlistenOcr.then((fn) => fn());
			unlistenStats.then((fn) => fn());
			unlistenScanRegion.then((fn) => fn());
			unlistenShowRegion.then((fn) => fn());
			unlistenInventoryPreview.then((fn) => fn());
			window.removeEventListener("resize", updateDisplayScale);
			clearInterval(scanInterval);
		};
	}, []);

	// Parse stats with scores
	const parsedMainStats =
		statsData?.main_stats.split("\n").filter((s) => s.trim()) || [];
	const parsedSubStats =
		statsData?.sub_stats.split("\n").filter((s) => s.trim()) || [];

	// Rank the relevant characters by how well the scanned echo fits them
	const rankedCharacters = relevantCharacters
		.map((character) => ({
			character,
			rating: calculateRating(character, parsedMainStats, parsedSubStats),
		}))
		.sort((a, b) => b.rating - a.rating);

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
						left: `${scanRegion.x * displayScale}px`,
						top: `${scanRegion.y * displayScale}px`,
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

			{/* Inventory Scan Region Preview */}
			{inventoryPreview && (
				<div
					style={{
						position: "absolute",
						left: "8px",
						bottom: "8px",
						padding: "4px 8px",
						backgroundColor: "rgba(0,0,0,0.7)",
						color: "white",
						fontSize: "12px",
						pointerEvents: "none",
						zIndex: 2,
					}}
				>
					Inventory preview · config {inventoryConfig ? "loaded" : "MISSING"} ·
					scale {displayScale.toFixed(2)}
				</div>
			)}
			{inventoryPreview && inventoryConfig && (
				<>
					{[
						{
							label: "counter",
							region: inventoryConfig.counter,
							color: "rgba(56, 189, 248, 0.9)",
						},
						{
							label: "name",
							region: inventoryConfig.name,
							color: "rgba(250, 204, 21, 0.9)",
						},
						{
							label: "level",
							region: inventoryConfig.level,
							color: "rgba(250, 204, 21, 0.9)",
						},
						{
							label: "main",
							region: inventoryConfig.mainStats,
							color: "rgba(250, 204, 21, 0.9)",
						},
						{
							label: "subs",
							region: inventoryConfig.subStats,
							color: "rgba(250, 204, 21, 0.9)",
						},
					].map(({ label, region, color }) => (
						<div
							key={label}
							style={{
								position: "absolute",
								left: `${region.x * displayScale}px`,
								top: `${region.y * displayScale}px`,
								width: `${region.width * displayScale}px`,
								height: `${region.height * displayScale}px`,
								border: `2px solid ${color}`,
								pointerEvents: "none",
								zIndex: 1,
							}}
						/>
					))}
					{Array.from({ length: inventoryConfig.grid.rows }).flatMap((_, row) =>
						Array.from({ length: inventoryConfig.grid.columns }).map(
							(_, column) => {
								// startX/startY are the top-left corner of the first cell
								const x =
									(inventoryConfig.grid.startX +
										column * inventoryConfig.grid.columnSpacing) *
									displayScale;
								const y =
									(inventoryConfig.grid.startY +
										row * inventoryConfig.grid.rowSpacing) *
									displayScale;
								return (
									<div
										// The grid is static; row/column are grid coordinates,
										// not list positions
										// biome-ignore lint/suspicious/noArrayIndexKey: keys are stable grid coordinates
										key={`cell-${row}-${column}`}
										style={{
											position: "absolute",
											left: `${x}px`,
											top: `${y}px`,
											width: `${inventoryConfig.grid.cellWidth * displayScale}px`,
											height: `${inventoryConfig.grid.cellHeight * displayScale}px`,
											border: "2px solid rgba(74, 222, 128, 0.9)",
											pointerEvents: "none",
											zIndex: 1,
										}}
									/>
								);
							},
						),
					)}
				</>
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
				{textFound && statsData && (
					<div ref={cardRef}>
						<Card
							className="min-w-112.5 bg-card/95 backdrop-blur-sm shadow-2xl border-2"
							style={{ pointerEvents: "auto" }}
						>
							{/* Echo Name Header */}
							{statsData.echo_name && (
								<CardHeader className="border-b pb-4">
									<CardTitle className="text-xl text-center">
										{statsData.echo_name}
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
										{parsedMainStats.map((stat) => {
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
										{parsedSubStats.map((stat) => {
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
