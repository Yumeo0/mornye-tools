import type { ExplorationMarker } from "./map-exploration";

export const ADDITIONAL_MARKERS = {
	musicfly: { name: "Musicfly", icon: "SP_IconMap_Play_22_UI" },
	moments: {
		name: "Moments Scattered to the Wind",
		icon: "SP_IconMap_Play_21_UI",
	},
	cindertide: { name: "Dream of Cindertides", icon: "SP_IconMap_Play_48_UI" },
	patrol: { name: "Dream Patrol", icon: "SP_IconMap_Play_19_UI" },
	mimic: { name: "Mimic Chest", icon: "SP_IconMonsterHead_31048_UI" },
	palette: { name: "Overflowing Palette", icon: "SP_IconMap_Play_18_UI" },
	crab: { name: "Crab Chest", icon: "SP_IconMap_SJ_01_UI" },
	brothers: { name: "Three Brothers", icon: "SP_IconMap_Play_20_UI" },
	boat: { name: "Boat Racing", icon: "SP_IconMap_Play_36_UI" },
	wings: { name: "Ace Wings", icon: "SP_IconMap_Play_37_UI" },
	dodge: { name: "Flash Dodge", icon: "SP_IconMap_Play_33_UI" },
	elite: { name: "Elite Monster", icon: "SP_IconMap_Boss_00_UI" },
	books: { name: "Book fragments/records", icon: "SP_IconMap_Task_18_UI" },
} satisfies Record<string, ExplorationMarker>;

type Marker = ExplorationMarker & { title?: string };
export interface ActivityEntity {
	key: string;
	mapId: number;
	entityId: number;
	type: string;
	blueprint: string;
	title: string;
	rewardId: number;
	owner: number | null;
	packId: number;
}
export interface ActivityPlay {
	id: number;
	mapId: number;
	entityId: number;
	type: string;
	internalName: string;
	title: string;
	degree?: number;
	children: string[];
	packId: number;
}
export interface ActivityMapMark {
	mapId: number;
	entityId: number;
	playId: number;
	title: string;
}

/** The native map labels are authoritative even when the controller has no English name. */
export function activityForTitle(title: string): ExplorationMarker | null {
	if (title === "Musicfly") return ADDITIONAL_MARKERS.musicfly;
	if (title === "Moments Scattered to the Wind")
		return ADDITIONAL_MARKERS.moments;
	if (/^Dreams? of Cindertides?(?::|$)/.test(title))
		return ADDITIONAL_MARKERS.cindertide;
	if (/^Dream Patrol(?::|$)/.test(title)) return ADDITIONAL_MARKERS.patrol;
	if (title === "Chest Mimic" || title === "Mimic Chest")
		return ADDITIONAL_MARKERS.mimic;
	if (title === "Overflowing Palette") return ADDITIONAL_MARKERS.palette;
	if (title === "The Three Fratellis' Challenge")
		return ADDITIONAL_MARKERS.brothers;
	if (/^Boat Racing(?: [IVX]+)?$/.test(title)) return ADDITIONAL_MARKERS.boat;
	if (/^Ace Wing(?:s|: [IVX]+)$/.test(title)) return ADDITIONAL_MARKERS.wings;
	if (title === "Flash Dodge") return ADDITIONAL_MARKERS.dodge;
	if (title === "Experiment Records") return ADDITIONAL_MARKERS.books;
	return null;
}

const PLAY_DEGREES: Record<number, ExplorationMarker> = {
	20: ADDITIONAL_MARKERS.palette,
	22: ADDITIONAL_MARKERS.patrol,
	23: ADDITIONAL_MARKERS.brothers,
	25: ADDITIONAL_MARKERS.musicfly,
	36: ADDITIONAL_MARKERS.wings,
	37: ADDITIONAL_MARKERS.boat,
	39: ADDITIONAL_MARKERS.dodge,
	40: ADDITIONAL_MARKERS.patrol,
	47: ADDITIONAL_MARKERS.cindertide,
	48: ADDITIONAL_MARKERS.cindertide,
};

// Reward packages shared by the game's paper fragments and permanent field
// records, on Gameplay603 / Treasure035. Do not expose generic Investigate loot.
const LORE_REWARDS = new Set([
	45025, 45026, 45027, 45028, 45029, 45030, 45031, 45042, 45055, 45056, 45070,
	45071, 45072, 45073, 45074, 45075, 45076, 45077, 45114,
]);

/** One placement per activity; all output keys remain native map/entity IDs. */
export function additionalActivityMarkers(
	entities: ActivityEntity[],
	plays: ActivityPlay[],
	mapMarks: ActivityMapMark[],
): { markers: Map<string, Marker>; playIds: Set<number> } {
	const byKey = new Map(entities.map((e) => [e.key, e]));
	const playById = new Map(plays.map((p) => [p.id, p]));
	const selected = new Map<
		number,
		{ entity: ActivityEntity; marker: Marker }
	>();
	const markers = new Map<string, Marker>();
	const add = (entity: ActivityEntity, marker: Marker, playId?: number) => {
		if (entity.packId) return;
		if (playId) {
			const play = playById.get(playId);
			if (!play || play.packId || play.mapId !== entity.mapId) return;
			if (!selected.has(playId)) selected.set(playId, { entity, marker });
		} else markers.set(entity.key, marker);
	};
	// The same entity can have several marker aliases in mapmark.json.
	for (const mark of mapMarks) {
		const marker = activityForTitle(mark.title);
		const entity = byKey.get(`${mark.mapId}:${mark.entityId}`);
		if (marker && entity)
			add(entity, { ...marker, title: mark.title }, mark.playId || undefined);
	}
	for (const play of plays) {
		if (selected.has(play.id) || play.packId) continue;
		const marker =
			play.type === "SpecialElite"
				? ADDITIONAL_MARKERS.elite
				: (PLAY_DEGREES[play.degree ?? -1] ??
					activityForTitle(play.title) ??
					// Native crab-altar graphs, including their later Sanguis variants.
					(play.type === "Riddle" &&
					/螃蟹.*祭坛|螃蟹后日谈/.test(play.internalName)
						? ADDITIONAL_MARKERS.crab
						: null));
		if (!marker) continue;
		// Crab chests are actual supply chests, so reuse the reward's key instead
		// of adding a second activity pin for the same collectible.
		const chests =
			marker === ADDITIONAL_MARKERS.crab
				? play.children
						.map((ref) => byKey.get(ref.replace(/^e_(\d+)_/, "$1:")))
						.filter((entity): entity is ActivityEntity =>
							Boolean(
								entity &&
									["TreasureBox", "HookTreasureBox"].includes(entity.type),
							),
						)
				: [];
		const entity =
			chests.length === 1
				? chests[0]
				: byKey.get(`${play.mapId}:${play.entityId}`);
		if (entity)
			add(entity, { ...marker, title: play.title || undefined }, play.id);
	}
	for (const { entity, marker } of selected.values()) {
		markers.set(entity.key, marker);
	}
	for (const entity of entities) {
		if (entity.packId || markers.has(entity.key)) continue;
		if (
			entity.type === "Monster" &&
			(entity.blueprint === "branch2.0_Monster187" ||
				entity.title === "Chest Mimic")
		) {
			if (entity.owner !== null && playById.get(entity.owner)?.type === "Quest")
				continue;
			add(entity, ADDITIONAL_MARKERS.mimic);
		}
		if (
			["Gameplay603", "Treasure035"].includes(entity.blueprint) &&
			LORE_REWARDS.has(entity.rewardId)
		) {
			add(entity, {
				...ADDITIONAL_MARKERS.books,
				title: /^(Inspect|Investigate|Read|Pick up|)$/.test(entity.title)
					? undefined
					: entity.title,
			});
		}
	}
	return { markers, playIds: new Set(selected.keys()) };
}
