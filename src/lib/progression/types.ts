export interface QuestPoint {
	mapId: number;
	x: number;
	y: number;
	z: number;
	area: string;
	entityId?: number;
}

export interface SideQuest {
	id: number;
	name: string;
	description: string;
	start: QuestPoint | null;
	objectives: { id: number; text: string; points: QuestPoint[] }[];
	prerequisites: string[];
	hiddenAccept: boolean;
}

/** All player-facing quest types, including quests without a world-map marker. */
export interface QuestDefinition {
	id: number;
	name: string;
	description: string;
	type: number;
	typeName: string;
	icon: string;
}

export interface Achievement {
	id: number;
	groupId: number;
	name: string;
	description: string;
	hidden: boolean;
}

export interface ProgressionCatalog {
	allQuests: QuestDefinition[];
	/** Only side quests have acceptance/objective markers on the map. */
	quests: SideQuest[];
	achievements: Achievement[];
	categories: { id: number; name: string; icon: string }[];
	groups: { id: number; categoryId: number; name: string }[];
}

export interface QuestSnapshot {
	listSyncedAt: number | null;
	completedSyncedAt: number | null;
	states: Record<string, number>;
	completedIds: number[];
	availableIds: number[];
	activeNodes: Record<string, number[]>;
}

export interface AchievementEntry {
	finishedAt: number;
	claimed: boolean;
	current: number | null;
	target: number | null;
}

export interface AchievementSnapshot {
	syncedAt: number | null;
	updatedAt: number | null;
	entries: Record<string, AchievementEntry>;
	finishedCount: number;
	starCount: number;
}

export interface ProgressionSnapshot {
	playerId: number;
	quests: QuestSnapshot;
	achievements: AchievementSnapshot;
}

export type QuestStatus =
	| "unknown"
	| "available"
	| "active"
	| "completed"
	| "locked";

export const QUEST_STATUS_LABELS: Record<QuestStatus, string> = {
	unknown: "Not synced",
	available: "Available",
	active: "In progress",
	completed: "Completed",
	locked: "Not available",
};

/** Filter list order: whatever is actionable first, completion last. */
export const QUEST_STATUS_ORDER: QuestStatus[] = [
	"active",
	"available",
	"locked",
	"completed",
	"unknown",
];

/**
 * World-map quest pins from the game's icon atlas: the ordinary marker, its
 * gold unavailable variant (quest giver not usable yet) and the green
 * completed variant.
 */
export const QUEST_STATUS_ICONS: Record<QuestStatus, string> = {
	available: "/icons/map/task-02-3.webp",
	active: "/icons/map/task-02-3.webp",
	locked: "/icons/map/task-01-3.webp",
	completed: "/icons/map/task-06.webp",
	unknown: "/icons/map/task-02-3.webp",
};

export interface QuestMarker {
	quest: SideQuest;
	point: QuestPoint;
	status: QuestStatus;
	objective: string | null;
}
