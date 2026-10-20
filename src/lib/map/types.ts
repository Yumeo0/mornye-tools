export type RewardKind =
	| "chest"
	| "heritage"
	| "casket"
	| "exploration"
	| "collection";
export const REWARD_KINDS: RewardKind[] = [
	"chest",
	"heritage",
	"casket",
	"exploration",
	"collection",
];
export type RewardState = "collected" | "remaining";

export interface MapReward {
	key: string;
	mapId: number;
	entityId: number;
	x: number;
	y: number;
	z: number;
	kind: RewardKind;
	name: string;
	blueprint: string;
	area: string;
	icon: string;
	owner: number | null;
	refresh: string;
	hidden: boolean;
	/**
	 * The underground artwork layer this placement belongs to, joined from
	 * `multimap.json` by area id; null for surface or unknowns. `floor` is the
	 * game's floor number (negative underground) and `layer` matches the
	 * artwork layer ids used by map tiles.
	 */
	underground: { floor: number; layer: number } | null;
}

export interface MapTile {
	x: number;
	y: number;
	image: string;
	thumbnail: string;
	layer: number;
}

export interface GameMap {
	id: number;
	name: string;
	tiles: MapTile[];
}

export interface MapBounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export interface MapDestination {
	id: string;
	name: string;
	mapId: number;
	bounds: MapBounds;
	children: MapDestination[];
}

export interface MapRegion {
	id: number;
	name: string;
	icon: string;
	destinations: MapDestination[];
}

export interface MapCatalog {
	version: string;
	tileSize: number;
	maps: GameMap[];
	regions: MapRegion[];
	rewards: MapReward[];
	icons: string[];
	missingTiles: { mapId: number; name: string }[];
}

export interface RewardEvidence {
	mapId: number;
	entityId: number;
	source: "reward-response" | "tree-snapshot" | "tree-update" | "observed";
	observedAt: number;
}

export interface ExplorationSnapshot {
	playerId: number;
	scene: { mapId: number; x: number; y: number; z: number } | null;
	rewards: Record<string, RewardEvidence>;
}

export const EMPTY_EXPLORATION: ExplorationSnapshot = {
	playerId: 0,
	scene: null,
	rewards: {},
};

export const STATE_LABELS: Record<RewardState, string> = {
	collected: "Collected",
	remaining: "Not collected",
};

export const KIND_LABELS: Record<RewardKind, string> = {
	chest: "Supply chests",
	heritage: "Tidal Heritage",
	casket: "Caskets & collectibles",
	exploration: "Exploration",
	collection: "Resources",
};
