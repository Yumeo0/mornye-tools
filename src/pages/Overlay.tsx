import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { cursorPosition, getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import buildsData from "@/configs/character_builds.json";
import characterData from "@/configs/character_data.json";
import echoData from "@/configs/echo_data.json";
import statsConfig from "@/configs/stats.json";
import { parseSubstatTiers, sonataNames, splitStatCodes } from "@/lib/stats";
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

interface CharacterInfo {
	character_id: number;
	character_name: string;
	icon_pile: string;
	stats: {
		"4cost": string[][];
		"3cost": string[][];
		"1cost": string[][];
		subs: string[][];
	};
}

interface EchoSet {
	id: number;
	name: string;
}

interface Echo {
	echo_name: string;
	echo_id: number;
	echo_sets: EchoSet[];
}

// Set overlay to ignore cursor events so you can click through it
await getCurrentWindow().setIgnoreCursorEvents(true);

// Helper function to normalize stat names for comparison
function normalizeStatName(stat: string): string {
	return stat.replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

// Helper function to parse stat value from stat string (e.g., "HP% 10.5%" -> 10.5)
function parseStatValue(
	statString: string,
): { name: string; value: number; hasPercent: boolean } | null {
	// Match patterns like "HP% 10.5%" or "ATK 123"
	const match = statString.match(/^(.+?)\s+([\d.]+)(%?)$/);
	if (match) {
		let name = match[1].trim();
		const hasPercent = match[3] === "%";

		// Map HP/ATK/DEF to HP%/ATK%/DEF% if the value has a %
		if (hasPercent && (name === "HP" || name === "ATK" || name === "DEF")) {
			name = `${name}%`;
		}

		return {
			name,
			value: Number.parseFloat(match[2]),
			hasPercent,
		};
	}
	return null;
}

// Helper function to get max value for a stat
function getMaxStatValue(statName: string, isMainStat: boolean): number | null {
	const stats = isMainStat ? statsConfig.main : statsConfig.sub;
	const statKey = Object.keys(stats).find(
		(key) => normalizeStatName(key) === normalizeStatName(statName),
	);
	if (statKey) {
		return stats[statKey as keyof typeof stats].max;
	}
	return null;
}

// Helper function to calculate percentage and get color
function getStatProgress(
	value: number,
	maxValue: number,
): { percentage: number; color: string } {
	const percentage = Math.min((value / maxValue) * 100, 100);
	let color: string;
	if (percentage >= 85)
		color = "#10b981"; // green-500
	else if (percentage >= 70)
		color = "#3b82f6"; // blue-500
	else if (percentage >= 50)
		color = "#f59e0b"; // amber-500
	else color = "#ef4444"; // red-500
	return { percentage, color };
}

// Find the echo matching an OCR'd echo name (case-insensitive, exact matches
// preferred, then by longest name for specificity)
function findEcho(echoName: string): Echo | undefined {
	const lower = echoName.toLowerCase();
	const candidates = (echoData as Echo[]).filter(
		(e) =>
			e.echo_name.toLowerCase().includes(lower) ||
			lower.includes(e.echo_name.toLowerCase()),
	);
	const exactMatches = candidates.filter(
		(e) => e.echo_name.toLowerCase() === lower,
	);
	return exactMatches.length > 0
		? exactMatches[0]
		: candidates.sort((a, b) => b.echo_name.length - a.echo_name.length)[0];
}

interface BuildSet {
	variant: string;
	name: string;
	sonata?: string;
	value?: string;
}

interface RoleBuild {
	echo_sets: {
		variant: string;
		sets: BuildSet[];
		main_stats: string[];
	};
	substats_priority: string | null;
}

interface BuildEntry {
	character_id: number | null;
	roles: Record<string, RoleBuild>;
}

const builds = buildsData as Record<string, BuildEntry>;

const characterById = new Map<number, { name: string; icon_pile: string }>();
for (const character of characterData as {
	character_id: number;
	character_name: string;
	icon_pile: string;
}[]) {
	if (!characterById.has(character.character_id)) {
		characterById.set(character.character_id, {
			name: character.character_name,
			icon_pile: character.icon_pile,
		});
	}
}

// "ER:120%>CR=CD>ATK%>Lib%>ATK" -> ["Energy Regen", "Crit. Rate", ...]
function parseSubstatPriority(raw: string | null | undefined): string[] {
	return parseSubstatTiers(raw)
		.flat()
		.map((stat) => stat.name);
}

// Find characters whose builds use any of the scanned echo's sonata sets.
// For each character the role with the most set matches provides the
// preferred stats.
function getRelevantCharacters(setNames: string[]): CharacterInfo[] {
	const wanted = setNames.map((name) => name.toLowerCase());
	const relevant: CharacterInfo[] = [];

	for (const [name, build] of Object.entries(builds)) {
		if (build.character_id === null) continue;
		const character = characterById.get(build.character_id);
		if (!character) continue;

		// Roles without their own substat priority fall back to the first role's
		const firstRolePriority =
			Object.values(build.roles)[0]?.substats_priority ?? null;

		let bestMatches = 0;
		let bestStats: CharacterInfo["stats"] | null = null;

		for (const guide of Object.values(build.roles)) {
			const sets = guide.echo_sets?.sets ?? [];
			const matches = sets.filter(
				(set) =>
					sonataNames(set.sonata).some((sonata) =>
						wanted.includes(sonata.toLowerCase()),
					) || wanted.includes(set.name.toLowerCase()),
			).length;
			if (matches === 0 || matches <= bestMatches) continue;

			const mainStats = guide.echo_sets.main_stats ?? [];
			bestMatches = matches;
			bestStats = {
				"4cost": [splitStatCodes(mainStats[0])].filter(
					(group) => group.length > 0,
				),
				"3cost": [
					splitStatCodes(mainStats[1]),
					splitStatCodes(mainStats[2]),
				].filter((group) => group.length > 0),
				"1cost": [
					splitStatCodes(mainStats[3]),
					splitStatCodes(mainStats[4]),
				].filter((group) => group.length > 0),
				subs: [
					parseSubstatPriority(guide.substats_priority ?? firstRolePriority),
				].filter((group) => group.length > 0),
			};
		}

		if (bestStats) {
			relevant.push({
				character_id: build.character_id,
				character_name: name,
				icon_pile: character.icon_pile,
				stats: bestStats,
			});
		}
	}

	return relevant;
}

// Update relevant characters based on the scanned echo's sonata sets
function getRelevantCharactersForStatsData(data: StatsData | null) {
	if (!data?.echo_name) return [];
	const echo = findEcho(data.echo_name);
	if (!echo) return [];
	return getRelevantCharacters(echo.echo_sets.map((set) => set.name));
}

// Helper function to calculate echo rating for a character
function calculateRating(
	character: CharacterInfo,
	parsedMainStats: string[],
	parsedSubStats: string[],
): number {
	const mainStatString = parsedMainStats[0];
	if (!mainStatString) return 0;

	// Parse main stat name
	const mainMatch = mainStatString.match(/^(.+?)\s+\d/);
	if (!mainMatch) return 0;
	const mainStatName = normalizeStatName(mainMatch[1]);

	// Get echo sub stat names
	const echoSubNames = parsedSubStats
		.map((stat) => {
			const parsed = parseStatValue(stat);
			return parsed ? normalizeStatName(parsed.name) : "";
		})
		.filter(Boolean);

	// Calculate main stat score
	let mainScore = 0;
	const all4cost = character.stats["4cost"].flat();
	const all3cost = character.stats["3cost"].flat();
	const all1cost = character.stats["1cost"].flat();

	if (all4cost.some((s) => normalizeStatName(s) === mainStatName)) {
		mainScore = 40;
	} else if (all3cost.some((s) => normalizeStatName(s) === mainStatName)) {
		mainScore = 30;
	} else if (all1cost.some((s) => normalizeStatName(s) === mainStatName)) {
		mainScore = 20;
	}

	// Calculate sub stat score
	const preferredSubs = character.stats.subs.flat().map(normalizeStatName);
	const subMatches = preferredSubs.filter((pref) =>
		echoSubNames.includes(pref),
	).length;
	const subScore = (subMatches / Math.max(preferredSubs.length, 1)) * 60;

	return Math.round(mainScore + subScore);
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

		// Listen for scan region visibility changes
		const unlistenShowRegion = listen<boolean>(
			"show-scan-region-changed",
			(event) => {
				setShowScanRegion(event.payload);
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
			unlistenShowRegion.then((fn) => fn());
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
						left: `${scanRegion.x}px`,
						top: `${scanRegion.y}px`,
						width: `${scanRegion.width}px`,
						height: `${scanRegion.height}px`,
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
