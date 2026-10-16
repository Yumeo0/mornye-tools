import { invoke } from "@tauri-apps/api/core";
import { getAllWindows } from "@tauri-apps/api/window";
import { Store } from "@tauri-apps/plugin-store";
import { Activity, Monitor, ScanText, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OCR_CONFIG from "@/configs/ocr.json";
import { reviveString, usePersistedState } from "@/lib/persisted";
import { getStatus, importPcap, type SnifferStatus } from "@/lib/sniffer";

interface ScanRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface ScanRegions {
	echo_upgrade: ScanRegion;
	tuning_successful?: ScanRegion;
	sort_icon?: ScanRegion | null;
	high_rarity_notice?: ScanRegion | null;
	/** Echo-bag header and COST text: the overlay's fast-cadence reads. */
	echoes_text?: ScanRegion | null;
	cost_text?: ScanRegion | null;
	echo_panel?: ScanRegion | null;
	main_stats?: ScanRegion | null;
	sub_stats?: ScanRegion | null;
	stat_stars?: ScanRegion | null;
	sub_stat_stars?: ScanRegion | null;
}

const SETTINGS_SECTIONS = new Set(["overlay", "assistant", "advanced"]);

const reviveSection = (value: unknown): string =>
	SETTINGS_SECTIONS.has(reviveString(value)) ? reviveString(value) : "overlay";

/** Default rating threshold of the Echo Upgrade Assistant (percent). */
const DEFAULT_ASSISTANT_THRESHOLD = 75;

function UpgradeAssistantCard({
	enabled,
	threshold,
	onToggle,
	onThresholdChange,
}: {
	enabled: boolean;
	threshold: number;
	onToggle: () => void;
	onThresholdChange: (value: number) => void;
}) {
	return (
		<Card>
			<CardContent className="space-y-4">
				<div className="space-y-0.5">
					<Label className="flex items-center gap-2 text-base font-medium">
						<Sparkles className="size-4" /> Echo Upgrade Assistant
					</Label>
					<p className="text-xs text-muted-foreground">
						After each upgrade or tuning, checks whether the echo can still
						reach the rating threshold on any relevant character. If not, it is
						marked for discard automatically while the overlay is running.
					</p>
				</div>

				<div className="flex items-center justify-between">
					<Label htmlFor="assistant-enabled">Enable</Label>
					<Switch
						id="assistant-enabled"
						checked={enabled}
						onCheckedChange={onToggle}
					/>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="assistant-threshold">Rating threshold</Label>
						<span className="text-sm font-medium tabular-nums">
							{threshold}%
						</span>
					</div>
					<Slider
						min={0}
						max={100}
						step={5}
						value={[threshold]}
						onValueChange={(values) =>
							onThresholdChange(values[0] ?? DEFAULT_ASSISTANT_THRESHOLD)
						}
						disabled={!enabled}
					/>
					<p className="text-xs text-muted-foreground">
						An echo is discarded once even perfect remaining substats cannot
						reach this rating on any relevant character.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

function CaptureCard() {
	const [status, setStatus] = useState<SnifferStatus | null>(null);

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

	const statusLine = !status
		? "starting…"
		: [
				status.capturing ? "capturing" : "armed",
				status.game_process_found ? "game process found" : "waiting for game",
				status.capture_available ? "capture available" : "capture unavailable",
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
					<div>
						<p className="text-muted-foreground">Frames fed</p>
						<p>{status?.frames_fed ?? 0}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Frame errors</p>
						<p>
							{status?.frame_errors ?? 0}
							{status && status.conv_mismatches > 0
								? ` (${status.conv_mismatches} stale conv)`
								: ""}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground">Packet errors</p>
						<p>{status?.packet_errors ?? 0}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Decode failures</p>
						<p>{status?.decode_failures ?? 0}</p>
					</div>
				</div>

				{status?.stream_stalled && (
					<p className="rounded-md bg-destructive/10 p-2 text-[11px] text-destructive">
						Stream stalled: game frames keep arriving but nothing has decoded
						for a while - the passive KCP mirror most likely lost a segment.
						Account data stays stale until the game restarts its connection
						(relaunch the game or reconnect in-game).
					</p>
				)}

				{status?.last_error && (
					<p className="rounded-md bg-destructive/10 p-2 text-[11px] text-destructive">
						{status.last_error}
					</p>
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
	const [section, setSection] = usePersistedState(
		"app.settingsSection",
		"overlay",
		reviveSection,
	);
	const [showScanRegion, setShowScanRegion] = useState(false);
	const [showMenuDebug, setShowMenuDebug] = useState(false);
	const [selectedResolution, setSelectedResolution] = useState<string>("");
	const [overlayEnabled, setOverlayEnabled] = useState(false);
	const [assistantEnabled, setAssistantEnabled] = useState(false);
	const [assistantThreshold, setAssistantThreshold] = useState(
		DEFAULT_ASSISTANT_THRESHOLD,
	);
	const thresholdSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

				// Set all panel-scan regions
				const scanRegions: ScanRegions = {
					echo_upgrade: echoUpgradeRegion,
					tuning_successful: config.tuningSuccessful,
					sort_icon: config.sortIcon ?? null,
					high_rarity_notice: config.highRarityNotice ?? null,
					echoes_text: config.echoesText ?? null,
					cost_text: config.costText ?? null,
					echo_panel: config.echoPanel ?? null,
					main_stats: config.mainStats ?? null,
					sub_stats: config.subStats ?? null,
					stat_stars: config.statStars ?? null,
					sub_stat_stars: config.subStatStars ?? null,
				};
				await invoke("set_scan_regions", { regions: scanRegions });

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

			// Load the menu detection panel toggle
			try {
				const store = await Store.load("settings.json");
				const savedMenuDebug = await store.get<boolean>("showMenuDebug");
				if (savedMenuDebug === true) {
					setShowMenuDebug(true);
				}
			} catch (error) {
				console.error("[SettingsTab] Failed to load menu debug state:", error);
			}

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

			// Load Echo Upgrade Assistant settings
			try {
				const store = await Store.load("settings.json");
				const savedAssistantEnabled = await store.get<boolean>(
					"upgradeAssistantEnabled",
				);
				if (
					savedAssistantEnabled !== null &&
					savedAssistantEnabled !== undefined
				) {
					setAssistantEnabled(savedAssistantEnabled);
				}
				const savedThreshold = await store.get<number>(
					"upgradeAssistantThreshold",
				);
				if (typeof savedThreshold === "number") {
					setAssistantThreshold(savedThreshold);
				}
			} catch (error) {
				console.error(
					"[SettingsTab] Failed to load assistant settings:",
					error,
				);
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

	const toggleMenuDebug = async () => {
		const next = !showMenuDebug;
		setShowMenuDebug(next);
		try {
			await invoke("set_show_menu_debug", { show: next });
			const store = await Store.load("settings.json");
			await store.set("showMenuDebug", next);
			await store.save();
		} catch (error) {
			console.error("[SettingsTab] Failed to toggle menu debug panel:", error);
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

	const toggleAssistant = async () => {
		const next = !assistantEnabled;
		setAssistantEnabled(next);
		try {
			const store = await Store.load("settings.json");
			await store.set("upgradeAssistantEnabled", next);
			await store.save();
		} catch (error) {
			console.error("[SettingsTab] Failed to save assistant state:", error);
		}
	};

	const changeAssistantThreshold = (value: number) => {
		setAssistantThreshold(value);
		if (thresholdSaveTimer.current) {
			clearTimeout(thresholdSaveTimer.current);
		}
		// Debounced: the slider fires on every drag step.
		thresholdSaveTimer.current = setTimeout(() => {
			thresholdSaveTimer.current = null;
			void Store.load("settings.json")
				.then(async (store) => {
					await store.set("upgradeAssistantThreshold", value);
					await store.save();
				})
				.catch((error) =>
					console.error(
						"[SettingsTab] Failed to save assistant threshold:",
						error,
					),
				);
		}, 400);
	};

	useEffect(
		() => () => {
			if (thresholdSaveTimer.current) {
				clearTimeout(thresholdSaveTimer.current);
			}
		},
		[],
	);

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
		<Tabs
			value={section}
			onValueChange={setSection}
			className="flex min-h-0 flex-1 flex-col gap-4"
		>
			<TabsList className="shrink-0">
				<TabsTrigger value="overlay">Overlay</TabsTrigger>
				<TabsTrigger value="assistant">Upgrade Assistant</TabsTrigger>
				<TabsTrigger value="advanced">Developer</TabsTrigger>
			</TabsList>

			<TabsContent
				value="overlay"
				className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4"
			>
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
								Reads the echo on screen so the overlay can show it
								automatically. Pick your game's screen resolution so it reads
								correctly.
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
			</TabsContent>

			<TabsContent
				value="assistant"
				className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4"
			>
				<UpgradeAssistantCard
					enabled={assistantEnabled}
					threshold={assistantThreshold}
					onToggle={toggleAssistant}
					onThresholdChange={changeAssistantThreshold}
				/>
			</TabsContent>

			<TabsContent
				value="advanced"
				className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4"
			>
				<CaptureCard />

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
								Test a custom region (relative to the game window) without
								saving it to the main configuration
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
								{showScanRegion ? "Hide Region Outline" : "Show Region Outline"}
							</Button>
							<p className="text-xs text-muted-foreground">
								Displays a visual outline of the scan region on the overlay
							</p>
						</div>

						<div className="space-y-2 rounded-md bg-background p-3">
							<Label className="text-sm font-medium">
								Menu Detection Panel
							</Label>
							<Button
								onClick={toggleMenuDebug}
								variant={showMenuDebug ? "default" : "outline"}
								className="w-full"
							>
								{showMenuDebug ? "Hide Menu Panel" : "Show Menu Panel"}
							</Button>
							<p className="text-xs text-muted-foreground">
								Shows which menu the overlay believes is on screen - Echo
								Upgrade panel, Tuning Successful screen or another screen - in
								the bottom-left corner of the overlay, with the raw title and
								banner reads behind the decision.
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
							<p className="text-[11px] text-muted-foreground">{pcapStatus}</p>
						)}
					</div>
				</div>
			</TabsContent>
		</Tabs>
	);
}
