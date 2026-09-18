import { invoke } from "@tauri-apps/api/core";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { exit } from "@tauri-apps/plugin-process";
import { Store } from "@tauri-apps/plugin-store";
import { Minus, Square, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { CharactersTab } from "@/components/tabs/CharactersTab";
import { InventoryTab } from "@/components/tabs/InventoryTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OCR_CONFIG from "@/configs/ocr.json";

interface ScanRegions {
	echo_upgrade: { x: number; y: number; width: number; height: number };
	echo_name: { x: number; y: number; width: number; height: number };
	level: { x: number; y: number; width: number; height: number };
	main_stats: { x: number; y: number; width: number; height: number };
	sub_stats: { x: number; y: number; width: number; height: number };
}

function WindowButton({
	onClick,
	hoverClass,
	children,
}: {
	onClick: () => void;
	hoverClass?: string;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`grid w-11 place-items-center text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground ${hoverClass ?? ""}`}
		>
			{children}
		</button>
	);
}

function TitleBar() {
	const win = getCurrentWindow();

	return (
		<div
			data-tauri-drag-region
			className="flex h-9 shrink-0 items-stretch select-none border-b bg-background"
		>
			<span
				data-tauri-drag-region
				className="flex items-center px-3 text-xs font-medium text-muted-foreground"
			>
				Mornye Tools
			</span>
			<div data-tauri-drag-region className="flex-1" />
			<WindowButton onClick={() => win.minimize()}>
				<Minus className="size-4" />
			</WindowButton>
			<WindowButton onClick={() => win.toggleMaximize()}>
				<Square className="size-3.5" />
			</WindowButton>
			<WindowButton
				onClick={() => win.close()}
				hoverClass="hover:bg-destructive hover:text-destructive-foreground"
			>
				<X className="size-4" />
			</WindowButton>
		</div>
	);
}

export default function Settings() {
	// Initialize scan regions and overlay state on app start
	useEffect(() => {
		const initApp = async () => {
			try {
				const store = await Store.load("settings.json");

				// Initialize scan regions first (required for overlay to function)
				const savedResolution = await store.get<string>("resolution");
				const resolution = savedResolution || "2560x1440"; // Default resolution

				const config =
					OCR_CONFIG.resolutions[
						resolution as keyof typeof OCR_CONFIG.resolutions
					];
				if (config?.echoUpgrade) {
					const echoUpgradeRegion = config.echoUpgrade;

					// Set the echo upgrade scan region
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
				}

				// Then handle overlay visibility
				const savedOverlayEnabled = await store.get<boolean>("overlayEnabled");
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
		<div className="flex h-screen flex-col overflow-hidden bg-background">
			<TitleBar />
			<div className="mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col px-6 pt-2">
				<Tabs
					defaultValue="characters"
					className="flex w-full min-h-0 flex-1 flex-col"
				>
					<TabsList className="grid w-full shrink-0 grid-cols-3">
						<TabsTrigger value="characters">Characters</TabsTrigger>
						<TabsTrigger value="inventory">Inventory</TabsTrigger>
						<TabsTrigger value="settings">Settings</TabsTrigger>
					</TabsList>

					<TabsContent value="characters" className="min-h-0 flex-1 flex flex-col">
						<CharactersTab />
					</TabsContent>

					<TabsContent
						value="inventory"
						className="min-h-0 flex-1 space-y-6 overflow-y-auto"
					>
						<InventoryTab />
					</TabsContent>

					<TabsContent
						value="settings"
						className="min-h-0 flex-1 space-y-6 overflow-y-auto"
					>
						<SettingsTab />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
