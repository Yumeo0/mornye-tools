import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

interface ScanRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface StatsData {
	main_stats: string;
	sub_stats: string;
}

// Set overlay to ignore cursor events so you can click through it
await getCurrentWindow().setIgnoreCursorEvents(true);

function Overlay() {
	const [textFound, setTextFound] = useState<boolean>(false);
	const [isScanning, setIsScanning] = useState(false);
	const [scanRegion, setScanRegion] = useState<ScanRegion | null>(null);
	const [showScanRegion, setShowScanRegion] = useState(false);
	const [statsData, setStatsData] = useState<StatsData | null>(null);

	useEffect(() => {
		// Listen for OCR results from the backend
		const unlistenOcr = listen<boolean>("ocr-result", (event) => {
			setTextFound(event.payload);
		});

		// Listen for stats data from the backend
		const unlistenStats = listen<StatsData | null>("stats-data", (event) => {
			setStatsData(event.payload);
		});

		// Listen for scan region visibility changes
		const unlistenShowRegion = listen<boolean>("show-scan-region-changed", (event) => {
			setShowScanRegion(event.payload);
		});

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
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "16px",
								pointerEvents: "auto",
							}}
						>
							{/* Main Stats */}
							<div
								style={{
									background: "rgba(147, 51, 234, 0.9)",
									padding: "16px 24px",
									borderRadius: "12px",
									color: "white",
									boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
									border: "2px solid rgba(147, 51, 234, 1)",
									minWidth: "400px",
								}}
							>
								<div
									style={{
										fontSize: "18px",
										fontWeight: "bold",
										marginBottom: "8px",
										opacity: 0.9,
									}}
								>
									Main Stats
								</div>
								<div
									style={{
										fontSize: "16px",
										whiteSpace: "pre-wrap",
										fontFamily: "monospace",
										lineHeight: "1.5",
									}}
								>
									{statsData.main_stats || "No data detected"}
								</div>
							</div>

							{/* Sub Stats */}
							<div
								style={{
									background: "rgba(59, 130, 246, 0.9)",
									padding: "16px 24px",
									borderRadius: "12px",
									color: "white",
									boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
									border: "2px solid rgba(59, 130, 246, 1)",
									minWidth: "400px",
								}}
							>
								<div
									style={{
										fontSize: "18px",
										fontWeight: "bold",
										marginBottom: "8px",
										opacity: 0.9,
									}}
								>
									Sub Stats
								</div>
								<div
									style={{
										fontSize: "16px",
										whiteSpace: "pre-wrap",
										fontFamily: "monospace",
										lineHeight: "1.5",
									}}
								>
									{statsData.sub_stats || "No data detected"}
								</div>
							</div>
						</div>
					)}
				</div>
		</div>
	);
}

export default Overlay;
