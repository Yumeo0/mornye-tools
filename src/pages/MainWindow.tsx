import { isTauri } from "@tauri-apps/api/core";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { exit } from "@tauri-apps/plugin-process";
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
import { MapImportController } from "@/components/map/MapImportController";
import { AchievementsTab } from "@/components/tabs/AchievementsTab";
import { CharactersTab } from "@/components/tabs/CharactersTab";
import { EchoesTab } from "@/components/tabs/EchoesTab";
import { MapTab } from "@/components/tabs/MapTab";
import { OptimizerTab } from "@/components/tabs/OptimizerTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { WeaponsTab } from "@/components/tabs/WeaponsTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { applyResolutionRegions } from "@/lib/scanRegions";
import { readSetting } from "@/lib/settings";
import { blockingErrors, getStatus, type SnifferStatus } from "@/lib/sniffer";
import { cn } from "@/lib/utils";

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

/** Primary sidebar tabs, in display order. */
const NAV_TABS = [
	{ value: "characters", title: "Characters", icon: "/characters.webp" },
	{ value: "echoes", title: "Echoes", icon: "/characters/echo.png" },
	{ value: "weapons", title: "Weapons", icon: "/weapons.webp" },
	{ value: "optimizer", title: "Optimizer", icon: "/optimizer.webp" },
	{ value: "map", title: "Map", icon: "/map.webp" },
	{
		value: "achievements",
		title: "Achievements",
		icon: "/wuwa-assets/UI/UIResources/Common/Atlas/TabIcon/SP_FuncIconAchievement.webp",
	},
] as const;

/** One sidebar tab button: icon plus label (hidden while collapsed). */
function NavTab({
	value,
	title,
	icon,
	sidebarOpen,
}: {
	value: string;
	title: string;
	icon: ReactNode;
	sidebarOpen: boolean;
}) {
	return (
		<TabsTrigger
			value={value}
			title={title}
			className={`h-auto flex-none gap-3 py-2.5 text-base ${sidebarOpen ? "px-3 justify-start" : "px-0 group-data-[orientation=vertical]/tabs:justify-center"}`}
		>
			{icon}
			{sidebarOpen && title}
		</TabsTrigger>
	);
}

function TitleBar() {
	const win = isTauri() ? getCurrentWindow() : null;

	return (
		<div
			data-tauri-drag-region
			className="flex h-9 shrink-0 items-stretch select-none border-b bg-background"
		>
			<span
				data-tauri-drag-region
				className="flex items-center gap-2 px-3 text-xs font-medium text-muted-foreground"
			>
				<span className="size-6 shrink-0 overflow-hidden rounded-md ring-1 ring-border">
					<img
						src="/mornye-chibi.webp"
						alt=""
						className="size-full scale-[1.3] object-cover"
					/>
				</span>
				Mornye Tools
			</span>
			<div data-tauri-drag-region className="flex-1" />
			<WindowButton onClick={() => win?.minimize()}>
				<Minus className="size-4" />
			</WindowButton>
			<WindowButton onClick={() => win?.toggleMaximize()}>
				<Square className="size-3.5" />
			</WindowButton>
			<WindowButton
				onClick={() => win?.close()}
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
	const [tab, setTab] = useState("characters");
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [importOpen, setImportOpen] = useState(false);

	// Initialize scan regions and overlay state on app start
	useEffect(() => {
		const initApp = async () => {
			if (!isTauri()) return;
			try {
				// Initialize scan regions first (required for the overlay to
				// function); an unknown saved resolution is ignored.
				const savedResolution = await readSetting<string>("resolution");
				await applyResolutionRegions(savedResolution || "2560x1440");

				// Then handle overlay visibility
				const savedOverlayEnabled =
					await readSetting<boolean>("overlayEnabled");
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
		if (!isTauri()) return;
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

	// Content panes for the primary tabs; all stay mounted so each tab keeps
	// its state (filters, scroll position) across switches.
	const tabContents: Array<{ value: string; content: ReactNode }> = [
		{ value: "characters", content: <CharactersTab /> },
		{ value: "echoes", content: <EchoesTab /> },
		{ value: "weapons", content: <WeaponsTab /> },
		{
			value: "optimizer",
			content: <OptimizerTab active={tab === "optimizer"} />,
		},
		{
			value: "settings",
			content: <SettingsTab onImport={() => setImportOpen(true)} />,
		},
		{ value: "map", content: <MapTab active={tab === "map"} /> },
		{
			value: "achievements",
			content: <AchievementsTab active={tab === "achievements"} />,
		},
	];

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-background">
			<TitleBar />
			<Tabs
				orientation="vertical"
				value={tab}
				onValueChange={setTab}
				className={cn("flex min-h-0 flex-1 flex-row", tab === "map" && "gap-0")}
			>
				<TabsList
					className={`group-data-[orientation=vertical]/tabs:h-full shrink-0 flex-col gap-1 rounded-none border-r bg-muted/30 p-2 transition-[width] ${
						sidebarOpen ? "w-52" : "w-12"
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
						{NAV_TABS.map((tab) => (
							<NavTab
								key={tab.value}
								value={tab.value}
								title={tab.title}
								sidebarOpen={sidebarOpen}
								icon={
									<img
										src={tab.icon}
										alt=""
										className="size-7 shrink-0 object-contain"
									/>
								}
							/>
						))}
					</div>
					<div className="flex shrink-0 justify-center">
						<SnifferIndicator compact={!sidebarOpen} />
					</div>
					<NavTab
						value="settings"
						title="Settings"
						sidebarOpen={sidebarOpen}
						icon={<Cog className="size-5 shrink-0" />}
					/>
				</TabsList>

				<div
					className={cn(
						"flex min-h-0 min-w-0 flex-1 flex-col",
						tab !== "map" && "px-4 pt-4",
					)}
				>
					{tabContents.map(({ value, content }) => (
						<TabsContent
							key={value}
							value={value}
							keepMounted
							className="flex min-h-0 min-w-0 flex-1 flex-col"
						>
							{content}
						</TabsContent>
					))}
				</div>
			</Tabs>
			<MapImportController
				mapActive={tab === "map"}
				open={importOpen}
				onOpenChange={setImportOpen}
			/>
		</div>
	);
}
