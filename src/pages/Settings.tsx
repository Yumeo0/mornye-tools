import { invoke } from "@tauri-apps/api/core";
import { getAllWindows } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { OCR_CONFIG } from "@/configs/ocr";

interface ScanRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface ScanRegions {
	echo_upgrade: ScanRegion;
	main_stats: ScanRegion;
	sub_stats: ScanRegion;
}

export function Settings() {
	const [overlayEnabled, setOverlayEnabled] = useState(false);
	const [_scanRegion, setScanRegion] = useState<ScanRegion>({
		x: 130,
		y: 65,
		width: 270,
		height: 60,
	});
	const [tesseractInstalled, setTesseractInstalled] = useState<boolean | null>(
		null,
	);
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

	useEffect(() => {
		// Load saved scan region on mount
		invoke<ScanRegion | null>("get_scan_region")
			.then((region) => {
				if (region) {
					setScanRegion(region);
				}
			})
			.catch(console.error);

		// Check if Tesseract is installed
		invoke<boolean>("check_tesseract_installed")
			.then((installed) => {
				setTesseractInstalled(installed);
			})
			.catch(console.error);

		// Load show scan region state
		invoke<boolean>("get_show_scan_region")
			.then((show) => {
				setShowScanRegion(show);
			})
			.catch(console.error);
	}, []);

	// Update scan region when debug region changes and outline is visible
	useEffect(() => {
		if (showScanRegion) {
			invoke("set_scan_region", { region: debugRegion }).catch(console.error);
		}
	}, [debugRegion, showScanRegion]);

	const toggleOverlay = async () => {
		const windows = await getAllWindows();
		const overlayWindow = windows.find((w) => w.label === "overlay");

		if (overlayWindow) {
			if (overlayEnabled) {
				await overlayWindow.hide();
			} else {
				await overlayWindow.show();
			}
			setOverlayEnabled(!overlayEnabled);
		}
	};

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

	const applyResolutionConfig = async (resolution: string) => {
		const config = OCR_CONFIG[resolution as keyof typeof OCR_CONFIG];
		if (config?.echoUpgrade) {
			const echoUpgradeRegion = config.echoUpgrade;
			setScanRegion(echoUpgradeRegion);
			setSelectedResolution(resolution);
			try {
				// Set the echo upgrade scan region (for backward compatibility and debug outline)
				await invoke("set_scan_region", { region: echoUpgradeRegion });
				
				// Set all three scan regions for stats scanning
				if (config.mainStats && config.subStats) {
					const scanRegions: ScanRegions = {
						echo_upgrade: echoUpgradeRegion,
						main_stats: config.mainStats,
						sub_stats: config.subStats,
					};
					await invoke("set_scan_regions", { regions: scanRegions });
				}
				
				console.log("Scan regions updated to:", resolution, config);
			} catch (error) {
				console.error("Failed to update scan regions:", error);
			}
		}
	};

	const performDebugScan = async () => {
		setIsDebugScanning(true);
		setDebugOcrText(null);
		try {
			const text = await invoke<string>("scan_region_for_text", { region: debugRegion });
			setDebugOcrText(text);
			console.log("Debug OCR result:", text);
		} catch (error) {
			console.error("Debug scan failed:", error);
			setDebugOcrText(`Error: ${error}`);
		} finally {
			setIsDebugScanning(false);
		}
	};

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="max-w-4xl mx-auto space-y-6">
				<div className="space-y-2">
					<h1 className="text-4xl font-bold tracking-tight">Mornye Tools</h1>
					<p className="text-muted-foreground">
						Manage your overlay and application settings
					</p>
				</div>

				<Separator />

				<Card>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Enable Overlay</Label>
							</div>
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
						<div className="space-y-2">
							<Label className="text-base font-medium">
								OCR Text Detection
							</Label>
							<p className="text-sm text-muted-foreground">
								Configure screen region to scan for "Echo Upgrade" text
							</p>
						</div>

						<Separator />

						{tesseractInstalled === false && (
							<div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-3">
								<div className="flex items-start gap-3">
									<span className="text-2xl">⚠️</span>
									<div className="space-y-2 flex-1">
										<h4 className="text-sm font-semibold text-destructive">
											Tesseract OCR Not Installed
										</h4>
										<p className="text-sm text-muted-foreground leading-relaxed">
											OCR functionality requires Tesseract to be installed on
											your system.
										</p>
										<div className="space-y-2 text-sm">
											<p className="font-medium">Installation steps:</p>
											<ol className="list-decimal list-inside space-y-1 text-muted-foreground">
												<li>
													Download from:{" "}
													<a
														href="https://github.com/UB-Mannheim/tesseract/wiki"
														target="_blank"
														rel="noopener noreferrer"
														className="text-primary underline hover:no-underline"
													>
														github.com/UB-Mannheim/tesseract/wiki
													</a>
												</li>
												<li>
													Run the installer and note the installation path
												</li>
												<li>
													Add Tesseract to your system PATH or select "Add to
													PATH" during installation
												</li>
												<li>Restart this application after installation</li>
											</ol>
										</div>
									</div>
								</div>
							</div>
						)}

						{tesseractInstalled === true && (
							<div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
								<p className="text-sm font-medium text-green-500">
									✓ Tesseract OCR is installed and ready
								</p>
							</div>
						)}
						<div className="space-y-3">
							<Label htmlFor="resolution-select">Screen Resolution</Label>
							<Select
								value={selectedResolution}
								onValueChange={(value) => applyResolutionConfig(value ?? "")}
							>
								<SelectTrigger className="w-full">
									{selectedResolution === "" ? "Select your screen resolution" : selectedResolution}
								</SelectTrigger>
								<SelectContent>
									{Object.keys(OCR_CONFIG).map((resolution) => (
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
									Test a custom region without saving it to the main configuration
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
									disabled={isDebugScanning || tesseractInstalled === false}
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
											Displays a visual outline of the scan region on the
											overlay
										</p>
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default Settings;
