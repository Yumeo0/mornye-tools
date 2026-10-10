import { invoke } from "@tauri-apps/api/core";
import { getAllWindows } from "@tauri-apps/api/window";
import { Store } from "@tauri-apps/plugin-store";
import {
	Activity,
	Bug,
	KeyRound,
	Monitor,
	Pause,
	Play,
	ScanText,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import {
	clearSessionKey,
	getStatus,
	importPcap,
	pauseSniffer,
	resumeSniffer,
	type SnifferStatus,
	setSessionKey,
} from "@/lib/sniffer";

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

function CaptureCard() {
	const [status, setStatus] = useState<SnifferStatus | null>(null);
	const [keyInput, setKeyInput] = useState("");
	const [keyOpen, setKeyOpen] = useState(false);
	const [keyMessage, setKeyMessage] = useState<string | null>(null);

	const refresh = useCallback(
		() =>
			getStatus()
				.then(setStatus)
				.catch(() => undefined),
		[],
	);

	useEffect(() => {
		refresh();
		const timer = setInterval(refresh, 2000);
		return () => clearInterval(timer);
	}, [refresh]);

	const togglePause = async () => {
		if (!status) return;
		if (status.paused) {
			await resumeSniffer();
		} else {
			await pauseSniffer();
		}
		await refresh();
	};

	const applyKey = async () => {
		try {
			await setSessionKey(keyInput);
			setKeyMessage("Session key set.");
			setKeyInput("");
			await refresh();
		} catch (error) {
			setKeyMessage(String(error));
		}
	};

	const clearKey = async () => {
		try {
			await clearSessionKey();
			setKeyMessage("Session key cleared.");
			await refresh();
		} catch (error) {
			setKeyMessage(String(error));
		}
	};

	const statusLine = !status
		? "starting…"
		: [
				status.paused ? "paused" : status.capturing ? "capturing" : "armed",
				status.game_process_found ? "game process found" : "waiting for game",
				status.npcap_available ? "capture available" : "capture unavailable",
				status.session_key_cached
					? "session key cached"
					: "waiting for session key",
			].join(" · ");

	return (
		<Card>
			<CardContent className="space-y-4">
				<div className="space-y-0.5">
					<Label className="flex items-center gap-2 text-base font-medium">
						<Activity className="size-4" /> Packet capture
					</Label>
					<p className="text-xs text-muted-foreground">
						Runs by design; the account is filled passively from the game's own
						traffic. Pause only stops reading frames.
					</p>
				</div>

				<p className="text-xs text-muted-foreground">{statusLine}</p>

				<div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
					<div>
						<p className="text-muted-foreground">RSA key</p>
						<p>{status?.rsa_key_fingerprint ?? "—"}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Elevated</p>
						<p>{status?.is_elevated ? "yes" : "no"}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Packets seen</p>
						<p>{status?.packets_seen ?? 0}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Inventory tables</p>
						<p>{status?.tables_loaded ? "loaded" : "missing"}</p>
					</div>
				</div>

				{status?.last_error && (
					<p className="rounded-md bg-destructive/10 p-2 text-[11px] text-destructive">
						{status.last_error}
					</p>
				)}

				<div className="flex flex-wrap items-center gap-2">
					<Button variant="default" size="sm" onClick={togglePause}>
						{status?.paused ? (
							<>
								<Play className="mr-1 size-3.5" /> Resume
							</>
						) : (
							<>
								<Pause className="mr-1 size-3.5" /> Pause
							</>
						)}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setKeyOpen((open) => !open)}
					>
						<KeyRound className="mr-1 size-3.5" />
						{keyOpen ? "Hide session key" : "Session key"}
					</Button>
				</div>

				{keyOpen && (
					<div className="space-y-2 rounded-md bg-muted/50 p-3">
						<Label className="text-xs font-medium">
							Paste a 64-hex session key (recovery for a cleared cache)
						</Label>
						<div className="flex gap-2">
							<Input
								value={keyInput}
								onChange={(e) => setKeyInput(e.target.value)}
								placeholder="64 hex chars"
								className="font-mono text-xs"
							/>
							<Button size="sm" onClick={applyKey} disabled={!keyInput.trim()}>
								Use
							</Button>
							<Button size="sm" variant="outline" onClick={clearKey}>
								Clear
							</Button>
						</div>
						{keyMessage && (
							<p className="text-[11px] text-muted-foreground">{keyMessage}</p>
						)}
					</div>
				)}

				{status && status.log.length > 0 && (
					<details className="rounded-md bg-muted/50 p-2">
						<summary className="cursor-pointer text-xs text-muted-foreground">
							Capture log
						</summary>
						<pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">
							{status.log.slice(-40).join("\n")}
						</pre>
					</details>
				)}
			</CardContent>
		</Card>
	);
}

export function SettingsTab() {
	const [showScanRegion, setShowScanRegion] = useState(false);
	const [selectedResolution, setSelectedResolution] = useState<string>("");
	const [showDebugSection, setShowDebugSection] = useState(false);
	const [overlayEnabled, setOverlayEnabled] = useState(false);
	const [debugRegion, setDebugRegion] = useState<ScanRegion>({
		x: 130,
		y: 65,
		width: 270,
		height: 60,
	});
	const [debugOcrText, setDebugOcrText] = useState<string | null>(null);
	const [isDebugScanning, setIsDebugScanning] = useState(false);
	const [pcapPath, setPcapPath] = useState("");
	const [pcapStatus, setPcapStatus] = useState<string | null>(null);

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
				console.error("[SettingsTab] Failed to load saved resolution:", error);
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

	const runImport = async () => {
		if (!pcapPath.trim()) return;
		setPcapStatus("Importing…");
		try {
			const decoded = await importPcap(pcapPath.trim());
			setPcapStatus(`Decoded ${decoded} game packets.`);
		} catch (error) {
			setPcapStatus(String(error));
		}
	};

	return (
		<div className="space-y-6">
			<CaptureCard />

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
											<Label className="text-sm font-medium">OCR Result:</Label>
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
										Displays a visual outline of the scan region on the overlay
									</p>
								</div>
							</div>

							<Separator />

							<div className="space-y-2">
								<Label className="text-sm font-medium">
									Offline packet import (.pcap / .pcapng)
								</Label>
								<p className="text-xs text-muted-foreground">
									Test tool: feeds a saved capture through the same extractor as
									live capture. It is not a substitute for always-on sniffing.
								</p>
								<div className="flex gap-2">
									<Input
										value={pcapPath}
										onChange={(e) => setPcapPath(e.target.value)}
										placeholder="C:\\path\\to\\capture.pcapng"
										className="font-mono text-xs"
									/>
									<Button
										variant="outline"
										onClick={runImport}
										disabled={!pcapPath.trim()}
									>
										Import
									</Button>
								</div>
								{pcapStatus && (
									<p className="text-[11px] text-muted-foreground">
										{pcapStatus}
									</p>
								)}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
