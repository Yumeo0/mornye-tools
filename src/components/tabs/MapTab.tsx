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
import { RewardDetails } from "@/components/map/RewardDetails";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/lib/account";
import { useMapCatalog } from "@/lib/map/catalog";
import { collectionState, itemType } from "@/lib/map/collection";
import {
	isItemVisible,
	type MapVisibility,
	summarizeItems,
} from "@/lib/map/filters";
import { useManualMapMarks } from "@/lib/map/manual";
import { usePlayerPosition } from "@/lib/map/position";
import { destinationAt } from "@/lib/map/regions";
import {
	EMPTY_EXPLORATION,
	type MapDestination,
	type MapReward,
	type RewardState,
} from "@/lib/map/types";

export function MapTab({ active }: { active: boolean }) {
	const account = useAccount();
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
	const [layer, setLayer] = useState(0);
	const [search, setSearch] = useState("");
	// Item types are keyed in `overrides`; absent entries follow the kind default.
	const [overrides, setOverrides] = useState<Record<string, boolean>>({});
	const [visibility, setVisibility] = useState<MapVisibility>("all");
	const [selected, setSelected] = useState<MapReward | null>(null);
	const mapRef = useRef<MapCanvasHandle>(null);
	const exploration = account.snapshot.exploration;
	const manual = useManualMapMarks(account.snapshot.player?.playerId ?? 0);
	const snapshot = exploration ?? EMPTY_EXPLORATION;
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
	const markers = useMemo(() => {
		const query = search.trim().toLowerCase();
		return all.filter(
			({ reward: r, type, state }) =>
				visible.has(type) &&
				(visibility === "all" || state === visibility) &&
				(!query ||
					`${r.name} ${r.area} ${r.entityId} ${r.blueprint}`
						.toLowerCase()
						.includes(query)),
		);
	}, [all, visible, visibility, search]);
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
	};
	const resetFilters = () => {
		setOverrides({});
		setVisibility("all");
		setSearch("");
	};
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
	const setTypesVisible = (types: string[], next: boolean) =>
		setOverrides((values) => {
			const updated = { ...values };
			for (const type of types) updated[type] = next;
			return updated;
		});
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
					markerCount={markers.length}
					stateTotals={stateTotals}
					onSearchChange={setSearch}
					onVisibilityChange={setVisibility}
					onTypesChange={setTypesVisible}
					onReset={resetFilters}
					onFirstMatch={() => {
						const reward = markers[0]?.reward;
						if (!reward) return;
						setFollowPlayer(false);
						selectReward(reward);
						mapRef.current?.focus(reward.x, reward.y);
					}}
				/>
				<div className="flex min-w-0 flex-1 flex-col">
					<MapRegionNavigation
						regions={catalog.regions}
						destination={
							followPlayer || !navigationTarget
								? destinationAt(
										catalog.regions,
										mapId,
										playerPosition?.mapId === mapId ? playerPosition : null,
									)
								: navigationTarget
						}
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
							markers={markers}
							layer={layer}
							selected={selected?.key ?? null}
							player={playerPosition?.mapId === mapId ? playerPosition : null}
							followPlayer={followPlayer}
							onPan={stopFollowing}
							onSelect={selectReward}
						/>

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
								disabled={!manual.ready || manual.saving}
								error={manual.error}
								onCollectedChange={(collected) =>
									void manual.setCollected(
										selected.key,
										collected,
										snapshot.rewards[selected.key]?.observedAt ?? 0,
									)
								}
								onClose={() => setSelected(null)}
							/>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
