import { invoke } from "@tauri-apps/api/core";
import { getAllWindows } from "@tauri-apps/api/window";
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
import { Bug, Monitor, ScanSearch, ScanText } from "lucide-react";

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

export function SettingsTab() {
	const [showScanRegion, setShowScanRegion] = useState(false);
	const [selectedResolution, setSelectedResolution] = useState<string>("");
	const [showDebugSection, setShowDebugSection] = useState(false);
	const [overlayEnabled, setOverlayEnabled] = useState(false);
	const [preview, setPreview] = useState(false);
	const [countdown, setCountdown] = useState<number | null>(null);
	const [scrollStatus, setScrollStatus] = useState<string | null>(null);
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

			// Load overlay enabled state (window visibility is handled on app start)
			try {
				const store = await Store.load("settings.json");
				const savedOverlayEnabled = await store.get<boolean>("overlayEnabled");
				if (savedOverlayEnabled !== null && savedOverlayEnabled !== undefined) {
					setOverlayEnabled(savedOverlayEnabled);
				}
			} catch (error) {
				console.error("[SettingsTab] Failed to load overlay state:", error);
			}

			// Load inventory region preview state
			invoke<boolean>("get_inventory_preview")
				.then(setPreview)
				.catch(console.error);
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

	const toggleOverlay = async () => {
		const windows = await getAllWindows();
		const overlayWindow = windows.find((w) => w.label === "overlay");

		if (overlayWindow) {
			const newState = !overlayEnabled;
			if (newState) {
				await overlayWindow.show();
			} else {
				await overlayWindow.hide();
			}
			setOverlayEnabled(newState);

			// Save overlay enabled state to store
			try {
				const store = await Store.load("settings.json");
				await store.set("overlayEnabled", newState);
				await store.save();
			} catch (error) {
				console.error("[SettingsTab] Failed to save overlay state:", error);
			}
		}
	};

	const togglePreview = async () => {
		try {
			await invoke("set_inventory_preview", { show: !preview });
			setPreview(!preview);
		} catch (error) {
			console.error("[SettingsTab] Failed to toggle region preview:", error);
		}
	};

	const testScroll = () => {
		if (countdown !== null) return;
		setScrollStatus(null);
		let remaining = 5;
		setCountdown(remaining);
		const interval = setInterval(() => {
			remaining -= 1;
			if (remaining <= 0) {
				clearInterval(interval);
				setCountdown(null);
				invoke<string>("test_inventory_scroll")
					.then(setScrollStatus)
					.catch((error) =>
						console.error("[SettingsTab] Test scroll failed:", error),
					);
			} else {
				setCountdown(remaining);
			}
		}, 1000);
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
		<div className="space-y-6">
			<Card>
				<CardContent className="space-y-4">
					<div className="space-y-0.5">
						<Label className="flex items-center gap-2 text-base font-medium">
							<Monitor className="size-4" /> Overlay
						</Label>
						<p className="text-xs text-muted-foreground">
							Show the transparent overlay window on top of the game
						</p>
					</div>
					<div className="flex items-center justify-between">
						<Label>Enable Overlay</Label>
						<Button
							variant={overlayEnabled ? "destructive" : "default"}
							onClick={toggleOverlay}
						>
							{overlayEnabled ? "Disable" : "Enable"}
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="space-y-4">
					<div className="space-y-0.5">
						<Label className="flex items-center gap-2 text-base font-medium">
							<ScanText className="size-4" /> OCR Text Detection
						</Label>
						<p className="text-xs text-muted-foreground">
							Picks the scan regions matching your screen resolution
						</p>
					</div>
					<div className="space-y-2">
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
				</CardContent>
			</Card>

			<Card>
				<CardContent className="space-y-3">
					<Button
						onClick={() => setShowDebugSection(!showDebugSection)}
						variant="ghost"
						className="w-full justify-between px-0 hover:bg-transparent"
					>
						<span className="flex items-center gap-2 text-base font-medium">
							<Bug className="size-4" /> Developer / Debug
						</span>
						<span className="text-muted-foreground">
							{showDebugSection ? "▼" : "▶"}
						</span>
					</Button>

					{showDebugSection && (
						<div className="space-y-4 rounded-lg bg-muted/50 p-4">
							<div className="space-y-2">
								<Label className="flex items-center gap-2 text-sm font-medium">
									<ScanText className="size-3.5" /> OCR Debug
								</Label>

								<div className="space-y-2 rounded-md bg-background p-3">
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
										<div className="rounded-lg bg-muted/50 border p-3 space-y-2">
											<Label className="text-sm font-medium">
												OCR Result:
											</Label>
											<pre className="text-xs text-muted-foreground whitespace-pre-wrap wrap-break-word font-mono">
												{debugOcrText || "(No text detected)"}
											</pre>
										</div>
									)}
								</div>

								<div className="space-y-2 rounded-md bg-background p-3">
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
										Displays a visual outline of the scan region on the
										overlay
									</p>
								</div>
							</div>

							<Separator />

							<div className="space-y-2">
								<Label className="flex items-center gap-2 text-sm font-medium">
									<ScanSearch className="size-3.5" /> Inventory Scan Debug
								</Label>

								<div className="space-y-2 rounded-md bg-background p-3">
									<Button
										onClick={togglePreview}
										variant={preview ? "default" : "outline"}
										className="w-full"
									>
										{preview ? "Hide Region Preview" : "Preview Region Layout"}
									</Button>
									<p className="text-xs text-muted-foreground">
										Shows the inventory scan regions on the overlay: green
										boxes = clicked grid cells, yellow boxes = OCR regions,
										blue box = ownership counter.
									</p>
								</div>

								<div className="space-y-2 rounded-md bg-background p-3">
									<Button
										onClick={testScroll}
										variant="outline"
										className="w-full"
										disabled={countdown !== null}
									>
										{countdown !== null
											? `Scrolling in ${countdown}...`
											: "Test Scroll"}
									</Button>
									<p className="text-xs text-muted-foreground">
										Moves to the center of the last grid element, holds left
										click, drags up smoothly, stays at the end position for
										0.5 seconds and releases — the same motion the scan uses
										to advance pages.
									</p>
									{scrollStatus && (
										<p className="text-sm text-green-400">{scrollStatus}</p>
									)}
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
