import { DashboardSquare01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { toast } from "sonner";
import { AccountProfileSelector } from "@/components/AccountProfileSelector";
import { MapImportController } from "@/components/map/MapImportController";
import {
	DangerousConnectButton,
	DangerousFeaturesPrompt,
} from "@/components/settings/DangerousFeaturesCard";
import { AchievementsTab } from "@/components/tabs/AchievementsTab";
import { CharactersTab } from "@/components/tabs/CharactersTab";
import { EchoesTab } from "@/components/tabs/EchoesTab";
import { EchoUpgraderTab } from "@/components/tabs/EchoUpgraderTab";
import { InventoryTab } from "@/components/tabs/InventoryTab";
import { MapTab } from "@/components/tabs/MapTab";
import { OptimizerTab } from "@/components/tabs/OptimizerTab";
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { QuestsTab } from "@/components/tabs/QuestsTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { WeaponsTab } from "@/components/tabs/WeaponsTab";
import { UpdateBanner } from "@/components/UpdateBanner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setOverlayVisible } from "@/lib/overlayWindow";
import { applyResolutionRegions } from "@/lib/scanRegions";
import { readSetting } from "@/lib/settings";
import { blockingErrors, getStatus } from "@/lib/sniffer";
import { checkForUpdateOnStartup, useUpdateState } from "@/lib/updater";
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

/** Inventory and tools stay separate in both expanded and collapsed navigation. */
const NAV_GROUPS = [
	{
		title: "Inventory",
		tabs: [
			{ value: "inventory", title: "Inventory", icon: "/icons/navigation/inventory.webp" },
			{ value: "characters", title: "Characters", icon: "/icons/navigation/characters.webp" },
			{ value: "echoes", title: "Echoes", icon: "/icons/navigation/echoes.webp" },
			{ value: "weapons", title: "Weapons", icon: "/icons/navigation/weapons.webp" },
			{
				value: "achievements",
				title: "Achievements",
				icon: "/icons/navigation/achievements.webp",
			},
			{
				value: "quests",
				title: "Quests",
				icon: "/icons/navigation/quests.webp",
			},
		],
	},
	{
		title: "Tools",
		tabs: [
			{ value: "optimizer", title: "Optimizer", icon: "/icons/navigation/optimizer.webp" },
			{ value: "map", title: "Map", icon: "/icons/navigation/map.webp" },
			{
				value: "echo-upgrader",
				title: "Echo Upgrader",
				icon: "/icons/navigation/echoes.webp",
			},
		],
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
			className={`h-auto min-w-0 flex-none gap-2.5 overflow-hidden py-2.5 text-sm ${sidebarOpen ? "px-3 justify-start" : "px-0 group-data-[orientation=vertical]/tabs:justify-center"}`}
		>
			{icon}
			{sidebarOpen && <span className="min-w-0 truncate">{title}</span>}
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
						src="/icons/app/mornye.webp"
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

/** Surface sync failures once; routine capture status lives in Settings. */
function SnifferErrorToasts() {
	useEffect(() => {
		let cancelled = false;
		let previousError: string | null = null;
		const poll = async () => {
			try {
				const next = await getStatus();
				if (cancelled) return;
				const problem = blockingErrors(next)[0] ?? next.last_error;
				if (problem && problem !== previousError) {
					toast.error("Account sync", {
						id: "account-sync-error",
						description: problem,
					});
				}
				previousError = problem;
			} catch {
				// Status polling remains best-effort; diagnostics are in Settings.
			}
		};
		poll();
		const timer = setInterval(poll, 2000);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, []);

	return null;
}

export default function MainWindow() {
	const [tab, setTab] = useState("overview");
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [importOpen, setImportOpen] = useState(false);
	const [settingsSection, setSettingsSection] = useState("overlay");
	const { update } = useUpdateState();

	// Silent update check on start (release builds only): a newer release lights
	// the Settings tab dot and shows the update banner.
	useEffect(() => {
		void checkForUpdateOnStartup();
	}, []);

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
					await setOverlayVisible(overlayWindow, shouldShowOverlay);
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
		{
			value: "overview",
			content: <OverviewTab active={tab === "overview"} onNavigate={setTab} />,
		},
		{ value: "characters", content: <CharactersTab /> },
		{ value: "echoes", content: <EchoesTab /> },
		{ value: "echo-upgrader", content: <EchoUpgraderTab /> },
		{ value: "weapons", content: <WeaponsTab /> },
		{ value: "inventory", content: <InventoryTab /> },
		{
			value: "optimizer",
			content: <OptimizerTab active={tab === "optimizer"} />,
		},
		{
			value: "settings",
			content: (
				<SettingsTab
					onImport={() => setImportOpen(true)}
					section={settingsSection}
					onSectionChange={setSettingsSection}
				/>
			),
		},
		{ value: "map", content: <MapTab active={tab === "map"} /> },
		{
			value: "achievements",
			content: <AchievementsTab active={tab === "achievements"} />,
		},
		{ value: "quests", content: <QuestsTab active={tab === "quests"} /> },
	];

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-background">
			<TitleBar />
			<Tabs
				orientation="vertical"
				value={tab}
				onValueChange={setTab}
				className="flex min-h-0 flex-1 flex-row gap-0"
			>
				<TabsList
					className={`group-data-[orientation=vertical]/tabs:h-full min-w-0 shrink-0 flex-col gap-1 overflow-x-hidden rounded-none border-r bg-muted/30 py-2 transition-[width] ${
						sidebarOpen ? "w-52 px-2" : "w-12 px-1"
					}`}
				>
					<div className="mb-1 flex h-9 shrink-0 items-center justify-center">
						<Button
							variant="ghost"
							size="sm"
							title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
							className="size-7 shrink-0 p-0 text-muted-foreground"
							onClick={() => setSidebarOpen((open) => !open)}
						>
							{sidebarOpen ? (
								<PanelLeftClose className="size-5" />
							) : (
								<PanelLeftOpen className="size-5" />
							)}
						</Button>
					</div>

					<AccountProfileSelector compact={!sidebarOpen} />
					<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 self-stretch overflow-x-hidden overflow-y-auto py-2">
						<NavTab
							value="overview"
							title="Overview"
							sidebarOpen={sidebarOpen}
							icon={
								<HugeiconsIcon
									icon={DashboardSquare01Icon}
									className="size-6 shrink-0"
								/>
							}
						/>
						{NAV_GROUPS.map((group) => (
							<div
								key={group.title}
								className="flex min-w-0 shrink-0 flex-col gap-1"
							>
								{sidebarOpen ? (
									<p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
										{group.title}
									</p>
								) : (
									<Separator aria-label={group.title} className="my-1" />
								)}
								{group.tabs.map((item) => (
									<NavTab
										key={item.value}
										value={item.value}
										title={item.title}
										sidebarOpen={sidebarOpen}
										icon={
											<img
												src={item.icon}
												alt=""
												className={cn(
													"shrink-0 object-contain",
													sidebarOpen ? "size-7" : "size-6",
												)}
											/>
										}
									/>
								))}
							</div>
						))}
					</div>
					<DangerousConnectButton
						compact={!sidebarOpen}
						onConfigure={() => {
							setSettingsSection("dangerous");
							setTab("settings");
						}}
					/>
					<NavTab
						value="settings"
						title={update ? "Settings — update available" : "Settings"}
						sidebarOpen={sidebarOpen}
						icon={
							<span className="relative shrink-0">
								<Cog className="size-5" />
								{update && (
									<span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
								)}
							</span>
						}
					/>
				</TabsList>

				<div
					className={"flex min-h-0 min-w-0 flex-1 flex-col"}
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
			<UpdateBanner />
			<DangerousFeaturesPrompt />
			<SnifferErrorToasts />
			<Toaster />
		</div>
	);
}
