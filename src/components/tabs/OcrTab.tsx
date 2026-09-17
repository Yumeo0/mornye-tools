import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import OCR_CONFIG from "@/configs/ocr.json";

interface ScanRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface ScanRegions {
	echo_upgrade: ScanRegion;
	echo_name: ScanRegion;
	level: ScanRegion;
	main_stats: ScanRegion;
	sub_stats: ScanRegion;
}

export function OcrTab() {
	const [showScanRegion, setShowScanRegion] = useState(false);
	const [selectedResolution, setSelectedResolution] = useState<string>("");
	const [showDebugSection, setShowDebugSection] = useState(false);
	const [debugRegion, setDebugRegion] = useState<ScanRegion>({
		x: 130,
		y: 65,
		width: 270,
		height: 60,
	});
	const [debugOcrText, setDebugOcrText] = useState<string | null>(null);
	const [isDebugScanning, setIsDebugScanning] = useState(false);

	const applyResolutionConfig = async (resolution: string) => {
		const config =
			OCR_CONFIG.resolutions[resolution as keyof typeof OCR_CONFIG.resolutions];
		if (config?.echoUpgrade) {
			const echoUpgradeRegion = config.echoUpgrade;
			setSelectedResolution(resolution);
			try {
				// Set the echo upgrade scan region (for backward compatibility and debug outline)
				await invoke("set_scan_region", { region: echoUpgradeRegion });

				// Set all scan regions including echo name for stats scanning
				if (
					config.echoName &&
					config.level &&
					config.mainStats &&
					config.subStats
				) {
					const scanRegions: ScanRegions = {
						echo_upgrade: echoUpgradeRegion,
						echo_name: config.echoName,
						level: config.level,
						main_stats: config.mainStats,
						sub_stats: config.subStats,
					};
					await invoke("set_scan_regions", { regions: scanRegions });
				}

				// Save the selected resolution to plugin-store
				const store = await Store.load("settings.json");
				await store.set("resolution", resolution);
				await store.save();
			} catch (error) {
				console.error("Failed to update scan regions:", error);
			}
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: applyResolutionConfig changes on every re-render and should not be used as a hook dependency
	useEffect(() => {
		const initOcrSettings = async () => {
			// Load show scan region state
			invoke<boolean>("get_show_scan_region")
				.then((show) => {
					setShowScanRegion(show);
				})
				.catch(console.error);

			// Load saved resolution from plugin-store
			try {
				const store = await Store.load("settings.json");
				const savedResolution = await store.get<string>("resolution");
				if (savedResolution) {
					await applyResolutionConfig(savedResolution);
				}
			} catch (error) {
				console.error("[OcrTab] Failed to load saved resolution:", error);
			}
		};

		initOcrSettings();
	}, []);

	// Update scan region when debug region changes and outline is visible
	useEffect(() => {
		if (showScanRegion) {
			invoke("set_scan_region", { region: debugRegion }).catch(console.error);
		}
	}, [debugRegion, showScanRegion]);

	const toggleShowScanRegion = async () => {
		try {
			const newValue = !showScanRegion;

			// When enabling the outline from debug section, temporarily set the scan region to debug region
			if (newValue) {
				await invoke("set_scan_region", { region: debugRegion });
			}

			await invoke("set_show_scan_region", { show: newValue });
			setShowScanRegion(newValue);
		} catch (error) {
			console.error("Failed to toggle scan region visibility:", error);
		}
	};

	const performDebugScan = async () => {
		setIsDebugScanning(true);
		setDebugOcrText(null);
		try {
			const text = await invoke<string>("scan_region_for_text", {
				region: debugRegion,
			});
			setDebugOcrText(text);
		} catch (error) {
			console.error("Debug scan failed:", error);
			setDebugOcrText(`Error: ${error}`);
		} finally {
			setIsDebugScanning(false);
		}
	};

	return (
		<Card>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label className="text-base font-medium">OCR Text Detection</Label>
				</div>

				<Separator />

				<div className="space-y-3">
					<Label htmlFor="resolution-select">Screen Resolution</Label>
					<Select
						value={selectedResolution}
						onValueChange={(value) => applyResolutionConfig(value ?? "")}
					>
						<SelectTrigger className="w-full">
							{selectedResolution === ""
								? "Select your screen resolution"
								: selectedResolution}
						</SelectTrigger>
						<SelectContent>
							{Object.keys(OCR_CONFIG.resolutions).map((resolution) => (
								<SelectItem key={resolution} value={resolution}>
									{resolution}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<Separator />

				<div className="space-y-3">
					<Button
						onClick={() => setShowDebugSection(!showDebugSection)}
						variant="ghost"
						className="w-full justify-between"
					>
						<span className="text-sm font-medium">
							Developer / Debug Settings
						</span>
						<span className="text-muted-foreground">
							{showDebugSection ? "▼" : "▶"}
						</span>
					</Button>

					{showDebugSection && (
						<div className="space-y-4 rounded-lg bg-muted/50 p-4">
							<div className="space-y-2">
								<Label className="text-sm font-medium">
									Manual Region Configuration
								</Label>
								<p className="text-xs text-muted-foreground">
									Test a custom region without saving it to the main
									configuration
								</p>
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="debug-region-x">X Position (px)</Label>
										<Input
											id="debug-region-x"
											type="number"
											value={debugRegion.x}
											onChange={(e) =>
												setDebugRegion({
													...debugRegion,
													x: Number(e.target.value),
												})
											}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="debug-region-y">Y Position (px)</Label>
										<Input
											id="debug-region-y"
											type="number"
											value={debugRegion.y}
											onChange={(e) =>
												setDebugRegion({
													...debugRegion,
													y: Number(e.target.value),
												})
											}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="debug-region-width">Width (px)</Label>
										<Input
											id="debug-region-width"
											type="number"
											value={debugRegion.width}
											onChange={(e) =>
												setDebugRegion({
													...debugRegion,
													width: Number(e.target.value),
												})
											}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="debug-region-height">Height (px)</Label>
										<Input
											id="debug-region-height"
											type="number"
											value={debugRegion.height}
											onChange={(e) =>
												setDebugRegion({
													...debugRegion,
													height: Number(e.target.value),
												})
											}
										/>
									</div>
								</div>
								<Button
									onClick={performDebugScan}
									disabled={isDebugScanning}
									variant="default"
									className="w-full"
								>
									{isDebugScanning ? "Scanning..." : "Test Scan Region"}
								</Button>

								{debugOcrText !== null && (
									<div className="rounded-lg bg-background border p-3 space-y-2">
										<Label className="text-sm font-medium">OCR Result:</Label>
										<pre className="text-xs text-muted-foreground whitespace-pre-wrap wrap-break-word font-mono">
											{debugOcrText || "(No text detected)"}
										</pre>
									</div>
								)}
							</div>

							<Separator />

							<div className="space-y-2">
								<Label className="text-sm font-medium">
									Region Outline Visibility
								</Label>
								<Button
									onClick={toggleShowScanRegion}
									variant={showScanRegion ? "default" : "outline"}
									className="w-full"
								>
									{showScanRegion
										? "Hide Region Outline"
										: "Show Region Outline"}
								</Button>
								<p className="text-xs text-muted-foreground">
									Displays a visual outline of the scan region on the overlay
								</p>
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
