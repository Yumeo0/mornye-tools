import {
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { useMapCamera } from "@/lib/map/camera";
import { clusterMarkers, clusterZoomLevel } from "@/lib/map/clustering";
import type { RewardMarker } from "@/lib/map/filters";
import { tileBounds } from "@/lib/map/tiles";
import type {
	GameMap,
	MapDestination,
	MapReward,
	RewardState,
} from "@/lib/map/types";
import type { QuestMarker } from "@/lib/progression/types";
import { QuestMarkers } from "./QuestMarkers";
import { RewardGroupPicker } from "./RewardGroupPicker";

export interface MapCanvasHandle {
	zoom: (factor: number) => void;
	fit: () => void;
	focus: (x: number, y: number) => void;
}
const COLORS: Record<RewardState, string> = {
	collected: "#67c6aa",
	remaining: "#c5c9c6",
};
/** Selected-and-collected markers glow brighter than the plain collected ring. */
const SELECTED_COLLECTED = "#8ff5c0";
/** Stacks that mix collected and uncollected items. */
const MIXED_COLLECTED = "#f0a445";

const clampScale = (scale: number) => Math.max(0.0001, Math.min(0.08, scale));

/** Badge centre offset from the marker centre, bottom-right. */
const BADGE_X = 11;
const BADGE_Y = 10;

/** The game's layer glyph (a tunnel arch) on a dark badge. */
function drawCaveBadge(ctx: CanvasRenderingContext2D, x: number, y: number) {
	ctx.beginPath();
	ctx.arc(x, y, 7, 0, Math.PI * 2);
	ctx.fillStyle = "#122025f2";
	ctx.fill();
	ctx.strokeStyle = "#9fb0a8";
	ctx.lineWidth = 1.1;
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x - 3.4, y + 3.2);
	ctx.lineTo(x - 3.4, y - 0.2);
	ctx.arc(x, y - 0.2, 3.4, Math.PI, 0);
	ctx.lineTo(x + 3.4, y + 3.2);
	ctx.strokeStyle = "#e8e6d9";
	ctx.lineWidth = 1.9;
	ctx.lineCap = "round";
	ctx.stroke();
}

export function MapCanvas({
	map,
	tileSize,
	target,
	area,
	markers,
	questMarkers,
	selectedQuest,
	onSelectQuest,
	layer,
	selected,
	player,
	followPlayer,
	onPan,
	onViewChange,
	onSelect,
	ref,
}: {
	map: GameMap;
	tileSize: number;
	target: MapDestination | null;
	/** The selected destination; outlined on the map so its extent stays visible. */
	area: MapDestination | null;
	markers: RewardMarker[];
	questMarkers: QuestMarker[];
	selectedQuest: number | null;
	onSelectQuest: (markers: QuestMarker[]) => void;
	layer: number;
	selected: string | null;
	player: { x: number; y: number; yaw?: number | null } | null;
	followPlayer: boolean;
	onPan: () => void;
	onViewChange: (position: { mapId: number; x: number; y: number }) => void;
	onSelect: (reward: MapReward) => void;
	ref: React.Ref<MapCanvasHandle>;
}) {
	const canvas = useRef<HTMLCanvasElement>(null);
	const [size, setSize] = useState({ width: 1, height: 1 });
	const { view, setView, animateTo } = useMapCamera();
	const [clusterLevel, setClusterLevel] = useState(() =>
		clusterZoomLevel(0.001),
	);
	useEffect(() => {
		setClusterLevel((level) => clusterZoomLevel(view.scale, level));
	}, [view.scale]);
	const clusters = useMemo(
		() => clusterMarkers(markers, clusterLevel),
		[markers, clusterLevel],
	);
	/** Only layers this map actually has artwork for can be opened. */
	const artworkLayers = useMemo(
		() => new Set(map.tiles.map((t) => t.layer)),
		[map],
	);
	const [openGroup, setOpenGroup] = useState<{
		id: string;
		view: typeof view;
		markers: RewardMarker[];
	} | null>(null);
	const closeGroup = useCallback(() => setOpenGroup(null), []);
	const pickerGroup =
		openGroup?.view === view && openGroup.markers === markers
			? clusters.find((group) => group.id === openGroup.id)
			: undefined;
	const [hover, setHover] = useState<string | null>(null);
	const images = useRef(new Map<string, HTMLImageElement>());
	const hits = useRef<
		{
			id: string;
			x: number;
			y: number;
			items: RewardMarker[];
			chosen: RewardMarker;
			underground: { floor: number; layer: number } | null;
		}[]
	>([]);
	const drag = useRef<{
		x: number;
		y: number;
		ox: number;
		oy: number;
	} | null>(null);
	const redraw = useRef<() => void>(() => {});
	const fit = useCallback(() => {
		const tiles = map.tiles.filter((t) => t.layer === 0);
		if (!tiles.length) {
			setView({ x: 0, y: 0, scale: 0.001 });
			return;
		}
		const left = Math.min(...tiles.map((t) => (t.x - 1) * tileSize));
		const right = Math.max(...tiles.map((t) => t.x * tileSize));
		const top = Math.min(...tiles.map((t) => -t.y * tileSize));
		const bottom = Math.max(...tiles.map((t) => (1 - t.y) * tileSize));
		setView({
			x: (left + right) / 2,
			y: (top + bottom) / 2,
			scale:
				Math.min(size.width / (right - left), size.height / (bottom - top)) *
				0.92,
		});
	}, [map, tileSize, size, setView]);
	const playerX = player?.x;
	const playerY = player?.y;
	const initialized = useRef(false);
	const positioned = useRef(false);
	const focusedTarget = useRef<MapDestination | null>(null);
	useEffect(() => {
		if (size.width <= 1 || size.height <= 1) return;
		if (target && focusedTarget.current !== target) {
			const move = initialized.current ? animateTo : setView;
			focusedTarget.current = target;
			initialized.current = true;
			positioned.current = true;
			const { left, top, right, bottom } = target.bounds;
			move({
				x: (left + right) / 2,
				y: (top + bottom) / 2,
				scale: clampScale(
					Math.min(
						size.width / Math.max(1000, right - left),
						size.height / Math.max(1000, bottom - top),
					) * 0.84,
				),
			});
			return;
		}
		if (initialized.current && (positioned.current || playerX === undefined))
			return;
		initialized.current = true;
		if (playerX !== undefined && playerY !== undefined) {
			positioned.current = true;
			setView({ x: playerX, y: playerY, scale: 0.008 });
		} else fit();
	}, [fit, playerX, playerY, size, target, animateTo, setView]);
	useEffect(() => {
		if (followPlayer && playerX !== undefined && playerY !== undefined)
			setView((v) => ({ ...v, x: playerX, y: playerY }));
	}, [followPlayer, playerX, playerY, setView]);
	useEffect(() => {
		if (size.width <= 1 || size.height <= 1) return;
		onViewChange({ mapId: map.id, x: view.x, y: view.y });
	}, [map.id, view.x, view.y, size.width, size.height, onViewChange]);
	useImperativeHandle(
		ref,
		() => ({
			fit,
			zoom: (factor) =>
				setView((v) => ({
					...v,
					scale: clampScale(v.scale * factor),
				})),
			focus: (x, y) =>
				setView((v) => ({ x, y, scale: Math.max(0.008, v.scale) })),
		}),
		[fit, setView],
	);
	useEffect(() => {
		const el = canvas.current;
		if (!el) return;
		const observer = new ResizeObserver(([entry]) =>
			setSize({
				width: entry.contentRect.width,
				height: entry.contentRect.height,
			}),
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);
	useEffect(() => {
		const el = canvas.current;
		if (!el) return;
		const wheel = (e: WheelEvent) => {
			e.preventDefault();
			const rect = el.getBoundingClientRect();
			const px = e.clientX - rect.left - size.width / 2;
			const py = e.clientY - rect.top - size.height / 2;
			setView((v) => {
				const scale = clampScale(v.scale * Math.exp(-e.deltaY * 0.0015));
				return {
					x: v.x + px / v.scale - px / scale,
					y: v.y + py / v.scale - py / scale,
					scale,
				};
			});
		};
		el.addEventListener("wheel", wheel, { passive: false });
		return () => el.removeEventListener("wheel", wheel);
	}, [size, setView]);
	useEffect(() => {
		const el = canvas.current;
		const ctx = el?.getContext("2d");
		if (!el || !ctx) return;
		let frame = 0;
		let cancelled = false;
		const load = (url: string) => {
			let image = images.current.get(url);
			if (!image) {
				const highResolution = url.includes("/tiles/");
				const tier = [...images.current.keys()].filter(
					(key) => key.includes("/tiles/") === highResolution,
				);
				if (tier.length >= (highResolution ? 48 : 512))
					images.current.delete(tier[0]);
				image = new Image();
				image.onload = () => redraw.current();
				image.src = url;
				images.current.set(url, image);
			} else {
				images.current.delete(url);
				images.current.set(url, image);
			}
			return image.complete && image.naturalWidth > 0 ? image : null;
		};
		const draw = () => {
			if (cancelled) return;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			el.width = size.width * dpr;
			el.height = size.height * dpr;
			ctx.scale(dpr, dpr);
			ctx.fillStyle = "#141e20";
			ctx.fillRect(0, 0, size.width, size.height);
			const screen = (x: number, y: number) => ({
				x: (x - view.x) * view.scale + size.width / 2,
				y: (y - view.y) * view.scale + size.height / 2,
			});
			for (const tile of map.tiles) {
				if (tile.layer !== 0 && tile.layer !== layer) continue;
				const b = tileBounds(tile.x, tile.y, tileSize);
				const p = screen(b.left, b.top);
				const width = b.size * view.scale;
				if (
					p.x > size.width ||
					p.y > size.height ||
					p.x + width < 0 ||
					p.y + width < 0
				)
					continue;
				const image = load(width < 300 ? tile.thumbnail : tile.image);
				if (image) {
					ctx.globalAlpha = layer && tile.layer === 0 ? 0.35 : 1;
					ctx.drawImage(image, p.x, p.y, width + 0.6, width + 0.6);
					ctx.globalAlpha = 1;
				}
			}
			// Project stable world-space clusters; panning never changes membership.
			hits.current = clusters
				.map((group) => {
					const chosen =
						group.items.find((i) => i.reward.key === selected) ??
						group.items[0];
					const candidate =
						chosen.reward.underground ??
						group.items.find((i) => i.reward.underground)?.reward.underground ??
						null;
					return {
						...group,
						...screen(group.x, group.y),
						chosen,
						// Badge layer: the shown item's, else any underground item's.
						underground:
							candidate && artworkLayers.has(candidate.layer)
								? candidate
								: null,
					};
				})
				.filter(
					(group) =>
						group.x >= -30 &&
						group.y >= -30 &&
						group.x <= size.width + 30 &&
						group.y <= size.height + 30,
				);
			for (const group of hits.current) {
				const { chosen } = group;
				const isSelected = chosen.reward.key === selected;
				const collected = group.items.filter(
					(i) => i.state === "collected",
				).length;
				// A stack that mixes collected and uncollected items reads orange.
				const mixed =
					group.items.length > 1 &&
					collected > 0 &&
					collected < group.items.length;
				const allCollected = collected === group.items.length;
				const radius = group.items.length > 1 ? 14 : 13;
				ctx.globalAlpha = allCollected && !isSelected ? 0.65 : 1;
				ctx.beginPath();
				ctx.arc(group.x, group.y, radius, 0, Math.PI * 2);
				ctx.fillStyle = mixed ? "#2a2014ee" : "#122025ee";
				ctx.fill();
				ctx.strokeStyle = isSelected
					? chosen.state === "collected" && !mixed
						? SELECTED_COLLECTED
						: "#ffffff"
					: mixed
						? MIXED_COLLECTED
						: COLORS[chosen.state];
				ctx.lineWidth = isSelected ? 2.5 : 1.4;
				ctx.stroke();
				if (group.items.length > 1) {
					ctx.fillStyle = mixed ? MIXED_COLLECTED : "#f0ece1";
					ctx.font = "11px 'JetBrains Mono Variable', monospace";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillText(String(group.items.length), group.x, group.y);
				} else {
					const icon = load(chosen.reward.icon);
					if (icon) ctx.drawImage(icon, group.x - 10, group.y - 10, 20, 20);
				}
				if (chosen.state === "collected" && !mixed) {
					// Keep the dot clear of the underground badge's corner.
					ctx.fillStyle = COLORS.collected;
					ctx.beginPath();
					ctx.arc(
						group.x + (group.underground ? -10 : 10),
						group.y + 9,
						4,
						0,
						Math.PI * 2,
					);
					ctx.fill();
				}
				if (group.underground)
					drawCaveBadge(ctx, group.x + BADGE_X, group.y + BADGE_Y);
				ctx.globalAlpha = 1;
			}
			if (player) {
				const p = screen(player.x, player.y);
				ctx.beginPath();
				ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
				ctx.strokeStyle = "#b4ebf6";
				ctx.lineWidth = 1.5;
				ctx.stroke();
				ctx.fillStyle = "#ddfbff";
				ctx.save();
				ctx.translate(p.x, p.y);
				// Unreal yaw 0 faces +X (right); positive yaw turns toward +Y (down).
				ctx.rotate((((player.yaw ?? -90) + 90) * Math.PI) / 180);
				ctx.beginPath();
				ctx.moveTo(0, -9);
				ctx.lineTo(6, 6);
				ctx.lineTo(0, 3);
				ctx.lineTo(-6, 6);
				ctx.closePath();
				ctx.fill();
				ctx.restore();
			}
		};
		redraw.current = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(draw);
		};
		redraw.current();
		return () => {
			cancelled = true;
			cancelAnimationFrame(frame);
		};
	}, [
		map,
		tileSize,
		clusters,
		artworkLayers,
		view,
		size,
		layer,
		selected,
		player,
	]);
	const hitAt = (clientX: number, clientY: number) => {
		const rect = canvas.current?.getBoundingClientRect();
		if (!rect) return undefined;
		const x = clientX - rect.left;
		const y = clientY - rect.top;
		let nearest: (typeof hits.current)[number] | undefined;
		let distance = 17 ** 2;
		for (const hit of hits.current) {
			const squared = (hit.x - x) ** 2 + (hit.y - y) ** 2;
			if (squared <= distance && (!nearest || squared < distance)) {
				nearest = hit;
				distance = squared;
			}
		}
		return nearest;
	};
	/** A selection arms a flash; it replays once the camera settles. */
	const [flashKey, setFlashKey] = useState(0);
	const [flashPending, setFlashPending] = useState(false);
	useEffect(() => {
		setFlashPending(area != null);
	}, [area]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `view` is the camera's progress; every update restarts the settle wait.
	useEffect(() => {
		if (!flashPending) return;
		// Every camera update restarts the wait, so the flash lands after travel.
		const timer = window.setTimeout(() => {
			setFlashPending(false);
			setFlashKey((key) => key + 1);
		}, 140);
		return () => window.clearTimeout(timer);
	}, [flashPending, view]);
	/** The selected area's bounds in screen space, with smoothed corners. */
	const outline = (() => {
		if (!area) return null;
		const { left, top, right, bottom } = area.bounds;
		const width = (right - left) * view.scale;
		const height = (bottom - top) * view.scale;
		if (width <= 0 || height <= 0) return null;
		return {
			left: (left - view.x) * view.scale + size.width / 2,
			top: (top - view.y) * view.scale + size.height / 2,
			width,
			height,
			radius: Math.min(64, Math.max(12, Math.min(width, height) * 0.08)),
		};
	})();
	return (
		<div className="relative min-h-0 flex-1 overflow-hidden bg-[#141e20]">
			{outline && flashKey > 0 && (
				<div
					key={flashKey}
					aria-hidden="true"
					className="map-area-flash pointer-events-none absolute"
					style={{
						left: outline.left,
						top: outline.top,
						width: outline.width,
						height: outline.height,
						borderRadius: outline.radius,
					}}
				/>
			)}
			<QuestMarkers
				markers={questMarkers}
				view={view}
				size={size}
				selected={selectedQuest}
				onSelect={onSelectQuest}
			/>
			<RewardGroupPicker
				group={pickerGroup}
				x={
					pickerGroup
						? (pickerGroup.x - view.x) * view.scale + size.width / 2
						: 0
				}
				y={
					pickerGroup
						? (pickerGroup.y - view.y) * view.scale + size.height / 2
						: 0
				}
				canvas={canvas}
				onClose={closeGroup}
				onSelect={onSelect}
			/>
			<canvas
				ref={canvas}
				className="block size-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
				tabIndex={0}
				aria-label="Reward map. Drag or use arrow keys to pan, scroll to zoom. Select a marker or group to view and change collection status."
				style={{
					cursor: drag.current ? "grabbing" : hover ? "pointer" : "grab",
				}}
				onKeyDown={(e) => {
					const direction: Record<string, [number, number]> = {
						ArrowLeft: [-1, 0],
						ArrowRight: [1, 0],
						ArrowUp: [0, -1],
						ArrowDown: [0, 1],
					};
					if (direction[e.key]) {
						onPan();
						e.preventDefault();
						const [x, y] = direction[e.key];
						setView((v) => ({
							...v,
							x: v.x + (x * 100) / v.scale,
							y: v.y + (y * 100) / v.scale,
						}));
					}
					if (e.key === "+" || e.key === "=" || e.key === "-") {
						e.preventDefault();
						setView((v) => ({
							...v,
							scale: clampScale(v.scale * (e.key === "-" ? 0.8 : 1.25)),
						}));
					}
				}}
				onPointerDown={(e) => {
					if (e.button !== 0) return;
					e.currentTarget.setPointerCapture(e.pointerId);
					drag.current = {
						x: e.clientX,
						y: e.clientY,
						ox: view.x,
						oy: view.y,
					};
				}}
				onPointerMove={(e) => {
					const d = drag.current;
					if (d) {
						if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) {
							onPan();
						}
						setView((v) => ({
							...v,
							x: d.ox - (e.clientX - d.x) / v.scale,
							y: d.oy - (e.clientY - d.y) / v.scale,
						}));
					} else {
						const reward = hitAt(e.clientX, e.clientY)?.items[0]?.reward;
						setHover(
							reward
								? `${reward.name}${
										reward.underground
											? ` · underground floor ${reward.underground.floor}`
											: ""
									}`
								: null,
						);
					}
				}}
				onPointerUp={(e) => {
					const d = drag.current;
					drag.current = null;
					// Tiny pointer drift still counts as a click; only real pans skip it.
					if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) return;
					const hit = hitAt(e.clientX, e.clientY);
					if (!hit) {
						closeGroup();
						return;
					}
					if (hit.items.length > 1) {
						onPan();
						setOpenGroup({ id: hit.id, view, markers });
					} else {
						closeGroup();
						onSelect(hit.items[0].reward);
					}
				}}
				onPointerCancel={() => {
					drag.current = null;
				}}
			/>
			<div className="pointer-events-none absolute bottom-3 left-4 flex items-center gap-3 text-[10px] text-[#e5e5d5]/70">
				<span className="tracking-[.2em]">N ↑</span>
				<span>Drag to explore · Scroll to zoom</span>
				<span>{hover ?? `${Math.round(view.x)}, ${Math.round(view.y)}`}</span>
			</div>
		</div>
	);
}
