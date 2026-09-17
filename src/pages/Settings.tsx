import { invoke } from "@tauri-apps/api/core";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { exit } from "@tauri-apps/plugin-process";
import { Store } from "@tauri-apps/plugin-store";
import { useEffect } from "react";
import { OcrTab } from "@/components/tabs/OcrTab";
import { OverlayTab } from "@/components/tabs/OverlayTab";
import { RulesTab } from "@/components/tabs/RulesTab";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OCR_CONFIG from "@/configs/ocr.json";

interface ScanRegions {
	echo_upgrade: { x: number; y: number; width: number; height: number };
	echo_name: { x: number; y: number; width: number; height: number };
	level: { x: number; y: number; width: number; height: number };
	main_stats: { x: number; y: number; width: number; height: number };
	sub_stats: { x: number; y: number; width: number; height: number };
}

export function Settings() {
	// Initialize scan regions and overlay state on app start
	useEffect(() => {
		const initApp = async () => {
			try {
				const store = await Store.load("settings.json");

				// Initialize scan regions first (required for overlay to function)
				const savedResolution = await store.get<string>("resolution");
				const resolution = savedResolution || "2560x1440"; // Default resolution

				const config =
					OCR_CONFIG.resolutions[resolution as keyof typeof OCR_CONFIG.resolutions];
				if (config?.echoUpgrade) {
					const echoUpgradeRegion = config.echoUpgrade;

					// Set the echo upgrade scan region
					await invoke("set_scan_region", { region: echoUpgradeRegion });

					// Set all scan regions including echo name for stats scanning
					if (config.echoName && config.level && config.mainStats && config.subStats) {
						const scanRegions: ScanRegions = {
							echo_upgrade: echoUpgradeRegion,
							echo_name: config.echoName,
							level: config.level,
							main_stats: config.mainStats,
							sub_stats: config.subStats,
						};
						await invoke("set_scan_regions", { regions: scanRegions });
					}
				}

				// Then handle overlay visibility
				const savedOverlayEnabled =
					await store.get<boolean>("overlayEnabled");
				const shouldShowOverlay = savedOverlayEnabled === true;

				const windows = await getAllWindows();
				const overlayWindow = windows.find((w) => w.label === "overlay");

				if (overlayWindow) {
					if (shouldShowOverlay) {
						await overlayWindow.show();
					} else {
						await overlayWindow.hide();
					}
				}
			} catch (error) {
				console.error("[Settings] Failed to initialize app:", error);
			}
		};

		initApp();
	}, []);

	// Close overlay when settings window closes
	useEffect(() => {
		const setupCloseHandler = async () => {
			const currentWin = getCurrentWindow();
			const unlisten = await currentWin.onCloseRequested(async () => {
				// Exit the entire application
				await exit(0);
			});
			return unlisten;
		};

		const unlistenPromise = setupCloseHandler();

		return () => {
			unlistenPromise.then((unlisten) => unlisten());
		};
	}, []);

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="max-w-4xl mx-auto space-y-6">
				<div className="space-y-2">
					<h1 className="text-4xl font-bold tracking-tight">Mornye Tools</h1>
				</div>

				<Separator />

				<Tabs defaultValue="rules" className="w-full">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="rules">Rules</TabsTrigger>
						<TabsTrigger value="overlay">Overlay</TabsTrigger>
						<TabsTrigger value="ocr">OCR</TabsTrigger>
					</TabsList>

					<TabsContent value="rules" className="space-y-6">
						<RulesTab />
					</TabsContent>

					<TabsContent value="overlay" className="space-y-6">
						<OverlayTab />
					</TabsContent>

					<TabsContent value="ocr" className="space-y-6">
						<OcrTab />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}

export default Settings;
