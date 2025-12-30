import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import echoData from "@/configs/echo_data.json";
import statsConfig from "@/configs/stats.json";

interface ScanRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface StatsData {
	echo_name: string;
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
function parseStatValue(statString: string): { name: string; value: number; hasPercent: boolean } | null {
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
	if (percentage >= 85) color = "#10b981"; // green-500
	else if (percentage >= 70) color = "#3b82f6"; // blue-500
	else if (percentage >= 50) color = "#f59e0b"; // amber-500
	else color = "#ef4444"; // red-500
	return { percentage, color };
}

// Helper function to calculate echo rating for a character
function calculateRating(
	character: CharacterInfo,
	statsData: StatsData | null,
	parsedMainStats: string[],
	parsedSubStats: string[]
): number {
	if (!statsData) return 0;

	const mainStatString = parsedMainStats[0];
	if (!mainStatString) return 0;

	// Parse main stat name
	const mainMatch = mainStatString.match(/^(.+?)\s+\d/);
	if (!mainMatch) return 0;
	const mainStatName = normalizeStatName(mainMatch[1]);

	// Get echo sub stat names
	const echoSubNames = parsedSubStats.map(stat => {
		const parsed = parseStatValue(stat);
		return parsed ? normalizeStatName(parsed.name) : '';
	}).filter(Boolean);

	// Calculate main stat score
	let mainScore = 0;
	const all4cost = character.stats["4cost"].flat();
	const all3cost = character.stats["3cost"].flat();
	const all1cost = character.stats["1cost"].flat();

	if (all4cost.some(s => normalizeStatName(s) === mainStatName)) {
		mainScore = 40;
	} else if (all3cost.some(s => normalizeStatName(s) === mainStatName)) {
		mainScore = 30;
	} else if (all1cost.some(s => normalizeStatName(s) === mainStatName)) {
		mainScore = 20;
	}

	// Calculate sub stat score
	const preferredSubs = character.stats.subs.flat().map(normalizeStatName);
	const subMatches = preferredSubs.filter(pref => echoSubNames.includes(pref)).length;
	const subScore = (subMatches / Math.max(preferredSubs.length, 1)) * 60;

	return Math.round(mainScore + subScore);
}

function Overlay() {
	const [textFound, setTextFound] = useState<boolean>(false);
	const [isScanning, setIsScanning] = useState(false);
	const [scanRegion, setScanRegion] = useState<ScanRegion | null>(null);
	const [showScanRegion, setShowScanRegion] = useState(false);
	const [statsData, setStatsData] = useState<StatsData | null>(null);
	const [relevantCharacters, setRelevantCharacters] = useState<CharacterInfo[]>(
		[],
	);

	useEffect(() => {
		// Listen for OCR results from the backend
		const unlistenOcr = listen<boolean>("ocr-result", (event) => {
			setTextFound(event.payload);
		});

		// Listen for stats data from the backend
		const unlistenStats = listen<StatsData | null>(
			"stats-data",
			async (event) => {
				setStatsData(event.payload);

				// If we have echo data, try to find relevant characters
				if (event.payload?.echo_name) {
					// Find echo by name (case-insensitive match)
					const echoName = event.payload.echo_name.toLowerCase();
					const candidates = (echoData as Echo[]).filter(
						(e) =>
							e.echo_name.toLowerCase().includes(echoName) ||
							echoName.includes(e.echo_name.toLowerCase()),
					);
					// Pick the candidate with the longest name (more specific match)
					const echo = candidates.sort((a, b) => b.echo_name.length - a.echo_name.length)[0];

					if (echo) {
						// Get echo set IDs
						const setIds = echo.echo_sets.map((s) => s.id);

						// Get relevant characters from backend
						try {
							const characters = await invoke<CharacterInfo[]>(
								"get_relevant_characters",
								{
									echoSetIds: setIds,
								},
							);
							setRelevantCharacters(characters);
						} catch (error) {
							console.error("Failed to get relevant characters:", error);
							setRelevantCharacters([]);
						}
					} else {
						setRelevantCharacters([]);
					}
				} else {
					setRelevantCharacters([]);
				}
			},
		);

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
			.then(async (data) => {
				setStatsData(data);

				// If we have echo data, try to find relevant characters
				if (data?.echo_name) {
					const echoName = data.echo_name.toLowerCase();
					const candidates = (echoData as Echo[]).filter(
						(e) =>
							e.echo_name.toLowerCase().includes(echoName) ||
							echoName.includes(e.echo_name.toLowerCase()),
					);
					// Pick the candidate with the longest name (more specific match)
					const echo = candidates.sort((a, b) => b.echo_name.length - a.echo_name.length)[0];

					if (echo) {
						const setIds = echo.echo_sets.map((s) => s.id);
						try {
							const characters = await invoke<CharacterInfo[]>(
								"get_relevant_characters",
								{
									echoSetIds: setIds,
								},
							);
							setRelevantCharacters(characters);
						} catch (error) {
							console.error("Failed to get relevant characters:", error);
						}
					}
				}
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
			if (!isScanning) {
				setIsScanning(true);
				try {
					await invoke("scan_for_text");
				} catch (error) {
					console.error("Scan error:", error);
				} finally {
					setIsScanning(false);
				}
			}
		}, 2000); // Scan every 2 seconds

		return () => {
			unlistenOcr.then((fn) => fn());
			unlistenStats.then((fn) => fn());
			unlistenShowRegion.then((fn) => fn());
			clearInterval(scanInterval);
		};
	}, [isScanning]);

	// Parse stats with scores
	const parsedMainStats =
		statsData?.main_stats.split("\n").filter((s) => s.trim()) || [];
	const parsedSubStats =
		statsData?.sub_stats.split("\n").filter((s) => s.trim()) || [];

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
								{parsedMainStats.map((stat) => (
									<div key={`main-${stat}`} className="text-sm">
										{stat}
									</div>
								))}
							</div>
						</div>

						{/* Sub Stats Section */}
						<div className="space-y-2">
							<h3 className="text-base font-bold text-blue-400">Sub Stats</h3>
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

											const maxValue = getMaxStatValue(parsed.name, false);
											if (!maxValue) {
												return (
													<div key={`sub-${stat}`} className="space-y-1">
														<div className="flex justify-between items-center text-xs">
															<span>{parsed.name}</span>
															<span className="font-bold">{parsed.value}{parsed.hasPercent ? '%' : ''}</span>
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
														<span>{parsed.name}</span>
														<span className="font-bold">{parsed.value}{parsed.hasPercent ? '%' : ''}</span>
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
									<h3 className="text-base font-bold text-green-400">Relevant Characters</h3>
									<div className="space-y-2">
										{relevantCharacters
											.sort((a, b) => {
												const ratingA = calculateRating(a, statsData, parsedMainStats, parsedSubStats);
												const ratingB = calculateRating(b, statsData, parsedMainStats, parsedSubStats);
												return ratingB - ratingA;
											})
											.map((character) => {
											const rating = calculateRating(character, statsData, parsedMainStats, parsedSubStats);
											return (
												<div key={character.character_id} className="flex items-center gap-3 bg-muted/50 p-2 rounded">
													<img
														src={character.icon_pile}
														alt={character.character_name}
														className="w-6 h-6 object-contain"
													/>
													<span className="text-sm flex-1">{character.character_name}</span>
													<span className="text-sm font-bold text-yellow-400">{rating}%</span>
												</div>
											);
										})}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);}

export default Overlay;