import { invoke } from "@tauri-apps/api/core";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { exit } from "@tauri-apps/plugin-process";
import { Store } from "@tauri-apps/plugin-store";
import {
	Cog,
	Minus,
	PanelLeftClose,
	PanelLeftOpen,
	Pause,
	Play,
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
import {
	blockingErrors,
	getStatus,
	pauseSniffer,
	resumeSniffer,
	type SnifferStatus,
} from "@/lib/sniffer";

const TAB_VALUES = new Set([
	"characters",
	"echoes",
	"weapons",
	"optimizer",
	"settings",
]);

const reviveTab = (value: unknown): string =>
	TAB_VALUES.has(reviveString(value)) ? reviveString(value) : "characters";

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

/**
 * Compact account-sync indicator for the sidebar footer: a state dot plus a
 * click-to-pause/resume control. Details live in Settings -> Packet capture.
 */
function SnifferIndicator({ compact }: { compact: boolean }) {
	const [status, setStatus] = useState<SnifferStatus | null>(null);
	const [busy, setBusy] = useState(false);

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

	const toggle = async () => {
		if (!status || busy) return;
		setBusy(true);
		try {
			if (status.paused) {
				await resumeSniffer();
			} else {
				await pauseSniffer();
			}
			setStatus(await getStatus());
		} catch {
			// Ignore transient failures; the next poll re-reads the state.
		} finally {
			setBusy(false);
		}
	};

	const problem = status
		? (blockingErrors(status)[0] ?? status.last_error)
		: null;
	const [label, dotClass] = !status
		? ["starting…", "bg-muted-foreground/50"]
		: problem
			? ["sync error", "bg-destructive"]
			: status.paused
				? ["paused", "bg-amber-400"]
				: status.capturing
					? ["capturing", "bg-emerald-400"]
					: status.game_process_found
						? ["game found", "bg-sky-400"]
						: ["armed", "bg-muted-foreground/50"];

	const title = !status
		? "Account sync: starting…"
		: [
				`Account sync: ${label}`,
				problem,
				status.paused ? "click to resume" : "click to pause",
			]
				.filter(Boolean)
				.join(" · ");

	return (
		<button
			type="button"
			onClick={toggle}
			disabled={!status || busy}
			title={title}
			className={`flex h-9 shrink-0 items-center rounded-md text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground ${
				compact ? "w-9 justify-center p-0" : "w-full gap-2 px-2"
			}`}
		>
			<span className={`size-2 shrink-0 rounded-full ${dotClass}`} />
			{!compact && (
				<>
					<span className="min-w-0 flex-1 truncate text-left text-[11px]">
						{label}
					</span>
					{status &&
						(status.paused ? (
							<Play className="size-3.5 shrink-0" />
						) : (
							<Pause className="size-3.5 shrink-0" />
						))}
				</>
			)}
		</button>
	);
}

export default function Settings() {
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
						className="min-h-0 flex-1 space-y-6 overflow-y-auto"
					>
						<SettingsTab />
					</TabsContent>
				</div>
			</Tabs>
		</div>
	);
}
