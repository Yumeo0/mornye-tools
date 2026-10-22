import {
	Add01Icon,
	Compass01Icon,
	MinusSignIcon,
	Target01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas, type MapCanvasHandle } from "@/components/map/MapCanvas";
import { MapFilters } from "@/components/map/MapFilters";
import { MapRegionNavigation } from "@/components/map/MapRegionNavigation";
import { QuestDetails } from "@/components/map/QuestDetails";
import { RewardDetails } from "@/components/map/RewardDetails";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/lib/account";
import {
	formatHotkey,
	hotkeyTargetBlocked,
	matchesHotkey,
} from "@/lib/hotkeys";
import { useMapCatalog } from "@/lib/map/catalog";
import { collectionState, itemType } from "@/lib/map/collection";
import {
	isItemVisible,
	type MapVisibility,
	summarizeItems,
} from "@/lib/map/filters";
import { useMapCollectedHotkey } from "@/lib/map/hotkey";
import { useManualMapMarks } from "@/lib/map/manual";
import { usePlayerPosition } from "@/lib/map/position";
import { containsDestination, destinationAt } from "@/lib/map/regions";
import {
	EMPTY_EXPLORATION,
	KIND_LABELS,
	type MapDestination,
	type MapReward,
	type RewardState,
} from "@/lib/map/types";
import { useProgressionCatalog } from "@/lib/progression/catalog";
import {
	isQuestStatusVisible,
	progressionFor,
	questStatusRows,
	sideQuestMarkers,
} from "@/lib/progression/state";
import type { QuestStatus } from "@/lib/progression/types";

export function MapTab({ active }: { active: boolean }) {
	const account = useAccount();
	const progressionCatalog = useProgressionCatalog(active);
	const progression = progressionFor(account.snapshot);
	// Quest statuses are keyed in `questOverrides`; absent entries follow the default.
	const [questOverrides, setQuestOverrides] = useState<Record<string, boolean>>(
		{},
	);
	const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null);
	const [selectedQuestPoint, setSelectedQuestPoint] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const allQuests = useMemo(
		() =>
			sideQuestMarkers(
				progressionCatalog.catalog?.quests ?? [],
				progression?.quests,
			),
		[progressionCatalog.catalog, progression?.quests],
	);
	const { catalog, error, retry } = useMapCatalog(active);
	const positionStream = usePlayerPosition(active);
	const livePosition =
		positionStream &&
		(!account.snapshot.player ||
			positionStream.playerId === account.snapshot.player.playerId)
			? positionStream
			: null;
	const [followPlayer, setFollowPlayer] = useState(false);
	useEffect(() => {
		if (!livePosition) setFollowPlayer(false);
	}, [livePosition]);
	const stopFollowing = useCallback(() => setFollowPlayer(false), []);
	const [mapId, setMapId] = useState(8);
	const [navigationTarget, setNavigationTarget] =
		useState<MapDestination | null>(null);
	const [viewedDestination, setViewedDestination] =
		useState<MapDestination | null>(null);
	const regions = catalog?.regions;
	const updateViewedDestination = useCallback(
		(position: { mapId: number; x: number; y: number }) => {
			const next = destinationAt(regions ?? [], position.mapId, position);
			// Camera movement only needs to rerender the tab when the area changes.
			setViewedDestination((current) =>
				current?.id === next?.id ? current : next,
			);
		},
		[regions],
	);
	const [layer, setLayer] = useState(0);
	const [search, setSearch] = useState("");
	const mapQuests = useMemo(
		() => allQuests.filter((marker) => marker.point.mapId === mapId),
		[allQuests, mapId],
	);
	// Status rows count this map's markers regardless of what is hidden.
	const questRows = useMemo(() => questStatusRows(mapQuests), [mapQuests]);
	const questMarkers = useMemo(
		() =>
			mapQuests.filter((marker) =>
				isQuestStatusVisible(questOverrides, marker.status),
			),
		[mapQuests, questOverrides],
	);
	const selectedQuest =
		allQuests.find(
			(marker) =>
				marker.quest.id === selectedQuestId &&
				marker.point.mapId === mapId &&
				marker.point.x === selectedQuestPoint?.x &&
				marker.point.y === selectedQuestPoint?.y,
		) ??
		allQuests.find(
			(marker) =>
				marker.quest.id === selectedQuestId && marker.point.mapId === mapId,
		);
	const nearbyQuests = selectedQuest
		? [
				...new Map(
					allQuests
						.filter(
							(marker) =>
								marker.point.mapId === mapId &&
								Math.abs(marker.point.x - selectedQuest.point.x) < 0.1 &&
								Math.abs(marker.point.y - selectedQuest.point.y) < 0.1,
						)
						.map((marker) => [marker.quest.id, marker]),
				).values(),
			]
		: [];
	// Item types are keyed in `overrides`; absent entries follow the kind default.
	const [overrides, setOverrides] = useState<Record<string, boolean>>({});
	const [visibility, setVisibility] = useState<MapVisibility>("all");
	const [selected, setSelected] = useState<MapReward | null>(null);
	const mapRef = useRef<MapCanvasHandle>(null);
	const exploration = account.snapshot.exploration;
	const importPlayerId =
		account.snapshot.player?.playerId ?? exploration?.playerId ?? 0;
	const manual = useManualMapMarks(importPlayerId);
	const snapshot = exploration ?? EMPTY_EXPLORATION;
	const { hotkey, loaded: hotkeyLoaded } = useMapCollectedHotkey();
	const changeSelectedCollected = useCallback(
		(collected: boolean) => {
			if (
				!selected ||
				selected.kind === "collection" ||
				selected.mapId !== mapId ||
				!manual.ready ||
				manual.saving
			)
				return;
			void manual.setCollected(
				selected.key,
				collected,
				snapshot.rewards[selected.key]?.observedAt ?? 0,
			);
		},
		[selected, mapId, manual, snapshot],
	);
	useEffect(() => {
		if (
			!active ||
			!hotkeyLoaded ||
			!catalog ||
			error ||
			!selected ||
			selected.kind === "collection" ||
			selected.mapId !== mapId ||
			!manual.ready ||
			manual.saving
		)
			return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (!matchesHotkey(event, hotkey) || hotkeyTargetBlocked(event)) return;
			event.preventDefault();
			changeSelectedCollected(
				collectionState(selected, snapshot, manual.marks).state !== "collected",
			);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		active,
		hotkeyLoaded,
		hotkey,
		catalog,
		error,
		selected,
		mapId,
		manual,
		snapshot,
		changeSelectedCollected,
	]);
	const playerPosition = livePosition ?? snapshot.scene;
	const sceneMapId = playerPosition?.mapId;
	useEffect(() => {
		if (!catalog) return;
		if (
			sceneMapId !== undefined &&
			catalog.maps.some((map) => map.id === sceneMapId)
		) {
			setMapId(sceneMapId);
			setNavigationTarget(null);
		} else if (sceneMapId === undefined) {
			setNavigationTarget(destinationAt(catalog.regions, 8));
		}
		setSelected(null);
		setSelectedQuestId(null);
		setLayer(0);
	}, [sceneMapId, catalog]);
	const all = useMemo(
		() =>
			(catalog?.rewards ?? [])
				.filter((r) => r.mapId === mapId)
				.map((reward) => {
					const collection = collectionState(reward, snapshot, manual.marks);
					return {
						reward,
						type: itemType(reward),
						state: collection.state,
					};
				}),
		[catalog, mapId, snapshot, manual.marks],
	);
	const itemRows = useMemo(() => summarizeItems(all), [all]);
	const visible = useMemo(() => {
		const types = new Set<string>();
		for (const row of itemRows)
			if (isItemVisible(overrides, row)) types.add(row.type);
		return types;
	}, [itemRows, overrides]);
	const stateTotals = useMemo(() => {
		const totals: Record<RewardState, number> = { collected: 0, remaining: 0 };
		for (const { type, state } of all) if (visible.has(type)) totals[state]++;
		return totals;
	}, [all, visible]);
	const markers = useMemo(
		() =>
			all.filter(
				({ type, state }) =>
					visible.has(type) && (visibility === "all" || state === visibility),
			),
		[all, visible, visibility],
	);
	const map = catalog?.maps.find((m) => m.id === mapId);
	/** Artwork layers this map actually has tiles for. */
	const artworkLayers = useMemo(
		() => new Set(map?.tiles.map((t) => t.layer) ?? []),
		[map],
	);
	/**
	 * Selecting an underground collectible opens its floor's artwork; selecting
	 * it again — or any surface collectible — returns to the surface.
	 */
	const selectReward = useCallback(
		(reward: MapReward) => {
			setSelectedQuestId(null);
			setSelected(reward);
			const floor = reward.underground;
			if (!floor) {
				setLayer(0);
				return;
			}
			if (artworkLayers.has(floor.layer))
				setLayer((current) => (current === floor.layer ? 0 : floor.layer));
		},
		[artworkLayers],
	);
	const navigate = (destination: MapDestination) => {
		setFollowPlayer(false);
		setMapId(destination.mapId);
		setNavigationTarget({ ...destination });
		setLayer(0);
		setSelected(null);
		setSelectedQuestId(null);
	};
	const resetFilters = () => {
		setOverrides({});
		setVisibility("all");
		setSearch("");
		setQuestOverrides({});
	};
	const setTypesVisible = useCallback((types: string[], next: boolean) => {
		setOverrides((values) => {
			const updated = { ...values };
			for (const type of types) updated[type] = next;
			return updated;
		});
	}, []);
	const setQuestStatusesVisible = useCallback(
		(statuses: QuestStatus[], next: boolean) => {
			setQuestOverrides((values) => {
				const updated = { ...values };
				for (const status of statuses) updated[status] = next;
				return updated;
			});
		},
		[],
	);
	if (error)
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3">
				<h2 className="text-xl">Map unavailable</h2>
				<p className="max-w-lg text-sm text-muted-foreground">{error}</p>
				<Button variant="outline" onClick={retry}>
					Retry
				</Button>
			</div>
		);
	if (!catalog || !map)
		return (
			<div
				role="status"
				className="grid flex-1 place-items-center text-sm text-muted-foreground"
			>
				Loading field atlas…
			</div>
		);
	/** Navigation follows the viewport; travel targets remain separate camera commands. */
	const destination =
		viewedDestination?.mapId === mapId
			? viewedDestination
			: destinationAt(catalog.regions, mapId);
	const region = catalog.regions.find((region) =>
		region.destinations.some((item) =>
			containsDestination(item, destination?.id),
		),
	);
	const regionArea = region?.destinations.find((item) =>
		containsDestination(item, destination?.id),
	);
	const subregion =
		regionArea && destination && regionArea.name !== destination.name
			? `${regionArea.name} · ${destination.name}`
			: destination?.name;
	return (
		<section
			className="flex min-h-0 flex-1 flex-col"
			aria-label="Exploration map"
		>
			<div className="flex min-h-0 flex-1 overflow-hidden border bg-card">
				<MapFilters
					itemRows={itemRows}
					overrides={overrides}
					visibility={visibility}
					search={search}
					markerCount={markers.length + questMarkers.length}
					stateTotals={stateTotals}
					questRows={questRows}
					questOverrides={questOverrides}
					questSynced={
						progression?.quests.listSyncedAt != null &&
						progression?.quests.completedSyncedAt != null
					}
					questError={progressionCatalog.error}
					onQuestStatusChange={setQuestStatusesVisible}
					onSearchChange={setSearch}
					onVisibilityChange={setVisibility}
					onTypesChange={setTypesVisible}
					onReset={resetFilters}
					onFirstMatch={() => {
						// The search narrows the filter list; this jumps to the
						// first marker of a matching row (else the first shown).
						const query = search.trim().toLowerCase();
						const matches = (text: string) =>
							text.toLowerCase().includes(query);
						const types = new Set(
							itemRows
								.filter(
									(row) => matches(row.label) || matches(KIND_LABELS[row.kind]),
								)
								.map((row) => row.type),
						);
						const statuses = new Set(
							questRows
								.filter((row) => matches(row.label))
								.map((row) => row.status),
						);
						const reward =
							markers.find(({ type }) => types.has(type))?.reward ??
							markers[0]?.reward;
						if (!reward) {
							const quest =
								questMarkers.find((marker) => statuses.has(marker.status)) ??
								questMarkers[0];
							if (quest) {
								setSelected(null);
								setSelectedQuestId(quest.quest.id);
								setSelectedQuestPoint(quest.point);
								setFollowPlayer(false);
								mapRef.current?.focus(quest.point.x, quest.point.y);
							}
							return;
						}
						setFollowPlayer(false);
						selectReward(reward);
						mapRef.current?.focus(reward.x, reward.y);
					}}
				/>
				<div className="flex min-w-0 flex-1 flex-col">
					<MapRegionNavigation
						regions={catalog.regions}
						destination={destination}
						onNavigate={navigate}
					/>
					<div className="relative flex min-h-0 flex-1 flex-col">
						<MapCanvas
							key={map.id}
							ref={mapRef}
							map={map}
							tileSize={catalog.tileSize}
							target={
								navigationTarget?.mapId === mapId ? navigationTarget : null
							}
							area={navigationTarget?.mapId === mapId ? navigationTarget : null}
							markers={markers}
							questMarkers={questMarkers}
							selectedQuest={selectedQuestId}
							onSelectQuest={(group) => {
								setSelected(null);
								setSelectedQuestId(group[0].quest.id);
								setSelectedQuestPoint(group[0].point);
								setFollowPlayer(false);
							}}
							layer={layer}
							selected={selected?.key ?? null}
							player={playerPosition?.mapId === mapId ? playerPosition : null}
							followPlayer={followPlayer}
							onPan={stopFollowing}
							onViewChange={updateViewedDestination}
							onSelect={selectReward}
						/>
						{region && (
							<section
								aria-label="Currently viewed region"
								className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] items-center gap-3 border bg-background/90 px-3 py-2 shadow-lg backdrop-blur-sm"
							>
								<img
									src={region.icon}
									alt=""
									className="size-10 shrink-0 object-contain"
								/>
								<div className="flex min-w-0 flex-col gap-0.5">
									<span className="truncate text-sm font-medium">
										{region.name}
									</span>
									<span className="truncate text-xs text-muted-foreground">
										{subregion}
									</span>
								</div>
							</section>
						)}

						<div className="absolute bottom-12 right-3 flex flex-col gap-1 border bg-background/95 p-1 shadow-lg">
							<Button
								variant="ghost"
								size="icon"
								aria-label="Zoom in"
								title="Zoom in"
								onClick={() => mapRef.current?.zoom(1.5)}
							>
								<HugeiconsIcon icon={Add01Icon} />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								aria-label="Zoom out"
								title="Zoom out"
								onClick={() => mapRef.current?.zoom(1 / 1.5)}
							>
								<HugeiconsIcon icon={MinusSignIcon} />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								aria-label="Fit map"
								title="Fit map"
								onClick={() => {
									setFollowPlayer(false);
									mapRef.current?.fit();
								}}
							>
								<HugeiconsIcon icon={Compass01Icon} />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								aria-label={
									livePosition ? "Follow player" : "Go to last known position"
								}
								title={
									livePosition
										? "Follow player · drag to stop following"
										: "Go to last known position"
								}
								aria-pressed={followPlayer}
								className={
									followPlayer ? "bg-primary/15 text-primary" : undefined
								}
								disabled={
									!playerPosition ||
									!catalog.maps.some((m) => m.id === playerPosition.mapId)
								}
								onClick={() => {
									if (playerPosition) {
										setNavigationTarget(null);
										if (mapId !== playerPosition.mapId) {
											setMapId(playerPosition.mapId);
											setLayer(0);
											setSelected(null);
										} else {
											mapRef.current?.focus(playerPosition.x, playerPosition.y);
										}
										if (livePosition) setFollowPlayer((value) => !value);
									}
								}}
							>
								<HugeiconsIcon icon={Target01Icon} />
							</Button>
						</div>
						{selected && (
							<RewardDetails
								key={selected.key}
								reward={selected}
								collection={collectionState(selected, snapshot, manual.marks)}
								collectedShortcut={formatHotkey(hotkey)}
								disabled={!manual.ready || manual.saving}
								error={manual.error}
								onCollectedChange={changeSelectedCollected}
								onClose={() => setSelected(null)}
							/>
						)}
						{selectedQuest && (
							<QuestDetails
								marker={selectedQuest}
								nearby={nearbyQuests}
								onSelect={setSelectedQuestId}
								onClose={() => setSelectedQuestId(null)}
							/>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
