import { invoke } from "@tauri-apps/api/core";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { exit } from "@tauri-apps/plugin-process";
import { Store } from "@tauri-apps/plugin-store";
import {
	Cog,
	Minus,
	PanelLeftClose,
	PanelLeftOpen,
	Square,
	X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { CharactersTab } from "@/components/tabs/CharactersTab";
import { EchoesTab } from "@/components/tabs/EchoesTab";
import { OptimizerTab } from "@/components/tabs/OptimizerTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { WeaponsTab } from "@/components/tabs/WeaponsTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OCR_CONFIG from "@/configs/ocr.json";
import {
	persistedReady,
	reviveBoolean,
	reviveString,
	usePersistedState,
} from "@/lib/persisted";
import { blockingErrors, getStatus, type SnifferStatus } from "@/lib/sniffer";

const TAB_VALUES = new Set([
	"characters",
	"echoes",
	"weapons",
	"optimizer",
	"settings",
]);

const reviveTab = (value: unknown): string =>
	TAB_VALUES.has(reviveString(value)) ? reviveString(value) : "characters";

interface ScanRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface ScanRegions {
	echo_upgrade: ScanRect;
	tuning_successful?: ScanRect;
	sort_icon?: ScanRect | null;
	high_rarity_notice?: ScanRect | null;
	/** Echo-bag header and COST text: the overlay's fast-cadence reads. */
	echoes_text?: ScanRect | null;
	cost_text?: ScanRect | null;
	echo_panel?: ScanRect | null;
	main_stats?: ScanRect | null;
	sub_stats?: ScanRect | null;
	stat_stars?: ScanRect | null;
	sub_stat_stars?: ScanRect | null;
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

/**
 * Compact account-sync indicator for the sidebar footer: a state dot and the
 * current state. Details live in Settings -> Developer.
 */
function SnifferIndicator({ compact }: { compact: boolean }) {
	const [status, setStatus] = useState<SnifferStatus | null>(null);

	useEffect(() => {
		let cancelled = false;
		const poll = async () => {
			try {
				const next = await getStatus();
				if (!cancelled) setStatus(next);
			} catch {
				// Sniffer status is best-effort in the sidebar.
			}
		};
		poll();
		const timer = setInterval(poll, 2000);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, []);

	const problem = status
		? (blockingErrors(status)[0] ?? status.last_error)
		: null;
	const [label, dotClass] = !status
		? ["starting…", "bg-muted-foreground/50"]
		: problem
			? ["sync error", "bg-destructive"]
			: status.capturing
				? ["capturing", "bg-emerald-400"]
				: status.game_process_found
					? ["game found", "bg-sky-400"]
					: ["armed", "bg-muted-foreground/50"];

	const title = [
		!status ? "Account sync: starting…" : `Account sync: ${label}`,
		problem,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<div
			title={title}
			className={`flex h-9 shrink-0 items-center text-muted-foreground ${
				compact ? "w-9 justify-center" : "w-full gap-2 px-2"
			}`}
		>
			<span className={`size-2 shrink-0 rounded-full ${dotClass}`} />
			{!compact && (
				<span className="min-w-0 flex-1 truncate text-left text-[11px]">
					{label}
				</span>
			)}
		</div>
	);
}

export default function MainWindow() {
	// The last tab and sidebar state survive restarts, like every tab's own
	// filter settings.
	const [tab, setTab] = usePersistedState("app.tab", "characters", reviveTab);
	const [sidebarOpen, setSidebarOpen] = usePersistedState(
		"app.sidebarOpen",
		true,
		(value) => reviveBoolean(value, true),
	);
	// Hold the tab content until the persisted state has been read (the shell
	// renders once `ready` flips below).
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void persistedReady().then(() => {
			if (!cancelled) setReady(true);
		});
		return () => {
			cancelled = true;
		};
	}, []);

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
				console.error("[MainWindow] Failed to initialize app:", error);
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

	// Hold the shell content until the persisted state has been read so
	// restored values never flash the defaults first.
	if (!ready) {
		return (
			<div className="flex h-screen flex-col overflow-hidden bg-background">
				<TitleBar />
			</div>
		);
	}

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-background">
			<TitleBar />
			<Tabs
				orientation="vertical"
				value={tab}
				onValueChange={setTab}
				className="flex min-h-0 flex-1 flex-row"
			>
				<TabsList
					className={`group-data-[orientation=vertical]/tabs:h-full shrink-0 flex-col gap-1 rounded-none border-r bg-muted/30 p-2 transition-[width] ${
						sidebarOpen ? "w-44" : "w-12"
					}`}
				>
					<div className="mb-1 flex h-9 shrink-0 items-center justify-center">
						<Button
							variant="ghost"
							size="sm"
							title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
							className="size-9 shrink-0 p-0 text-muted-foreground"
							onClick={() => setSidebarOpen((open) => !open)}
						>
							{sidebarOpen ? (
								<PanelLeftClose className="size-5" />
							) : (
								<PanelLeftOpen className="size-5" />
							)}
						</Button>
					</div>

					<div className="flex min-h-0 flex-1 flex-col justify-center gap-1 self-stretch">
						<TabsTrigger
							value="characters"
							title="Characters"
							className={`h-auto flex-none gap-3 py-2.5 text-base ${sidebarOpen ? "px-3 justify-start" : "px-0 group-data-[orientation=vertical]/tabs:justify-center"}`}
						>
							<img
								src="/characters.webp"
								alt=""
								className="size-7 shrink-0 object-contain"
							/>
							{sidebarOpen && "Characters"}
						</TabsTrigger>
						<TabsTrigger
							value="echoes"
							title="Echoes"
							className={`h-auto flex-none gap-3 py-2.5 text-base ${sidebarOpen ? "px-3 justify-start" : "px-0 group-data-[orientation=vertical]/tabs:justify-center"}`}
						>
							<img
								src="/characters/echo.png"
								alt=""
								className="size-7 shrink-0 object-contain"
							/>
							{sidebarOpen && "Echoes"}
						</TabsTrigger>
						<TabsTrigger
							value="weapons"
							title="Weapons"
							className={`h-auto flex-none gap-3 py-2.5 text-base ${sidebarOpen ? "px-3 justify-start" : "px-0 group-data-[orientation=vertical]/tabs:justify-center"}`}
						>
							<img
								src="/weapons.webp"
								alt=""
								className="size-7 shrink-0 object-contain"
							/>
							{sidebarOpen && "Weapons"}
						</TabsTrigger>
						<TabsTrigger
							value="optimizer"
							title="Optimizer"
							className={`h-auto flex-none gap-3 py-2.5 text-base ${sidebarOpen ? "px-3 justify-start" : "px-0 group-data-[orientation=vertical]/tabs:justify-center"}`}
						>
							<img
								src="/optimizer.webp"
								alt=""
								className="size-7 shrink-0 object-contain"
							/>
							{sidebarOpen && "Optimizer"}
						</TabsTrigger>
					</div>
					<div className="flex shrink-0 justify-center">
						<SnifferIndicator compact={!sidebarOpen} />
					</div>
					<TabsTrigger
						value="settings"
						title="Settings"
						className={`h-auto flex-none gap-3 py-2.5 text-base ${sidebarOpen ? "px-3 justify-start" : "px-0 group-data-[orientation=vertical]/tabs:justify-center"}`}
					>
						<Cog className="size-5 shrink-0" />
						{sidebarOpen && "Settings"}
					</TabsTrigger>
				</TabsList>

				<div className="flex min-h-0 flex-1 flex-col px-6 pt-4">
					<TabsContent
						value="characters"
						keepMounted
						className="min-h-0 flex-1 flex flex-col"
					>
						<CharactersTab />
					</TabsContent>

					<TabsContent
						value="echoes"
						keepMounted
						className="flex min-h-0 flex-1 flex-col"
					>
						<EchoesTab />
					</TabsContent>

					<TabsContent
						value="weapons"
						keepMounted
						className="flex min-h-0 flex-1 flex-col"
					>
						<WeaponsTab />
					</TabsContent>

					<TabsContent
						value="optimizer"
						keepMounted
						className="flex min-h-0 flex-1 flex-col"
					>
						<OptimizerTab active={tab === "optimizer"} />
					</TabsContent>

					<TabsContent
						value="settings"
						keepMounted
						className="flex min-h-0 flex-1 flex-col"
					>
						<SettingsTab />
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
}
