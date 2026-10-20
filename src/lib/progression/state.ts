import {
	type AchievementEntry,
	type ProgressionSnapshot,
	QUEST_STATUS_ICONS,
	QUEST_STATUS_LABELS,
	QUEST_STATUS_ORDER,
	type QuestMarker,
	type QuestSnapshot,
	type QuestStatus,
	type SideQuest,
} from "./types";

/**
 * The progression snapshot for the account's current player. The Rust store
 * scopes and resets it on login, so this only refuses a snapshot that is
 * provably another player's. The player block itself is optional: it is only
 * filled once the game sends `PlayerBasicInfoGetResponse`, and progress must
 * not be hidden before then.
 */
export function progressionFor(snapshot: {
	player?: { playerId: number } | null;
	progression?: ProgressionSnapshot;
}): ProgressionSnapshot | undefined {
	if (!snapshot.progression) return undefined;
	if (
		snapshot.player &&
		snapshot.progression.playerId !== snapshot.player.playerId
	)
		return undefined;
	return snapshot.progression;
}

export function questStatus(
	id: number,
	snapshot: QuestSnapshot | undefined,
): QuestStatus {
	if (!snapshot) return "unknown";
	const state = snapshot.states[id];
	if (state === 3) return "completed";
	if (state === 2) return "active";
	if (state === 1) return "available";
	if (state === 0) return "locked";
	if (snapshot.completedIds.includes(id)) return "completed";
	if (snapshot.availableIds.includes(id)) return "available";
	return snapshot.listSyncedAt !== null && snapshot.completedSyncedAt !== null
		? "locked"
		: "unknown";
}

/** Only proven acceptance points or currently active objective targets become markers. */
export function sideQuestMarkers(
	quests: SideQuest[],
	snapshot: QuestSnapshot | undefined,
): QuestMarker[] {
	return quests.flatMap<QuestMarker>((quest) => {
		const status = questStatus(quest.id, snapshot);
		if (status === "active") {
			const active = new Set(snapshot?.activeNodes[quest.id] ?? []);
			const objectives = quest.objectives.filter((objective) =>
				active.has(objective.id),
			);
			const markers = objectives.flatMap((objective) =>
				objective.points.map((point) => ({
					quest,
					status,
					point,
					objective: objective.text,
				})),
			);
			if (markers.length) return markers;
		}
		return quest.start
			? [{ quest, status, point: quest.start, objective: null }]
			: [];
	});
}

/** One filter entry per quest status, counted across the selected map. */
export interface QuestStatusRow {
	status: QuestStatus;
	label: string;
	icon: string;
	total: number;
}

/**
 * Quest statuses are visible by default; completed starts hidden so the map
 * stays readable (the same reasoning as gathering items in the reward list).
 */
export function isQuestStatusVisible(
	overrides: Record<string, boolean>,
	status: QuestStatus,
): boolean {
	return overrides[status] ?? status !== "completed";
}

export function questStatusRows(markers: QuestMarker[]): QuestStatusRow[] {
	const totals = new Map<QuestStatus, number>();
	for (const marker of markers)
		totals.set(marker.status, (totals.get(marker.status) ?? 0) + 1);
	return QUEST_STATUS_ORDER.filter(
		(status) => (totals.get(status) ?? 0) > 0,
	).map((status) => ({
		status,
		label: QUEST_STATUS_LABELS[status],
		icon: QUEST_STATUS_ICONS[status],
		total: totals.get(status) ?? 0,
	}));
}

export type AchievementStatus =
	| "unknown"
	| "incomplete"
	| "unclaimed"
	| "claimed";
export function achievementStatus(
	entry: AchievementEntry | undefined,
): AchievementStatus {
	if (!entry) return "unknown";
	if (entry.claimed) return "claimed";
	return entry.finishedAt > 0 ? "unclaimed" : "incomplete";
}

export function isAchievementComplete(
	entry: AchievementEntry | undefined,
): boolean {
	const status = achievementStatus(entry);
	return status === "claimed" || status === "unclaimed";
}
