import type { ExplorationSnapshot, MapReward, RewardState } from "./types";

export interface ManualMapMark {
	collected: boolean;
	updatedAt: number;
}
export type ManualMapMarks = Record<string, ManualMapMark>;

export interface CollectionState {
	state: RewardState;
	/** When the state last changed, live or by hand. */
	at: number | null;
}

/**
 * One boolean per placement: collected or not. Live claim evidence starts it
 * collected, and the player's own toggle is simply the later of the two, so a
 * hand-set value can always un-collect something the game reported.
 */
export function collectionState(
	reward: MapReward,
	snapshot: ExplorationSnapshot,
	manual: ManualMapMarks,
): CollectionState {
	// Gathering resources are nodes, not rewards: they are never tracked.
	if (reward.kind === "collection") return { state: "remaining", at: null };
	const evidence = snapshot.rewards[reward.key];
	const live =
		evidence &&
		(evidence.source === "reward-response" || evidence.source === "tree-update")
			? evidence
			: null;
	const mark = manual[reward.key];
	if (mark && (!live || mark.updatedAt > live.observedAt))
		return {
			state: mark.collected ? "collected" : "remaining",
			at: mark.updatedAt,
		};
	if (live) return { state: "collected", at: live.observedAt };
	return { state: "remaining", at: null };
}

export function itemType(reward: MapReward) {
	return `${reward.kind}:${reward.name}:${reward.icon}`;
}
export function itemLabel(reward: MapReward) {
	if (reward.name === "Windchimer") return "Windchimer (Bell)";
	if (reward.name === "Frostbug") return "Frostbug (Worm)";
	if (reward.kind !== "heritage") return reward.name;
	const color = reward.icon.includes("blue")
		? "Blue"
		: reward.icon.includes("gold") || reward.icon.includes("yellow")
			? "Gold"
			: "Purple";
	return `${reward.name} · ${color}`;
}

export function parseManualMarks(value: unknown): ManualMapMarks {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return Object.fromEntries(
		Object.entries(value).filter(
			([key, mark]) =>
				/^\d+:\d+$/.test(key) &&
				mark &&
				typeof mark.collected === "boolean" &&
				Number.isFinite(mark.updatedAt),
		),
	);
}
