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

/** Whether a placement supports persistent collected/completed progress. */
export function tracksCollection(reward: Pick<MapReward, "kind">) {
	return !["collection", "combat", "teleport"].includes(reward.kind);
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
	// Resources, repeatable combat and teleport locations have no collection progress.
	if (!tracksCollection(reward)) return { state: "remaining", at: null };
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

export function isEchoFlight(reward: MapReward) {
	return (
		reward.kind === "exploration" &&
		/^Echo Challenge: Flight(?: [IVX]+)?$/.test(reward.name)
	);
}

export function isTacticalHologram(reward: MapReward) {
	return (
		reward.kind === "exploration" &&
		/^(Tactical Hologram|Overlord Challenge)(?::|$)/.test(reward.name)
	);
}

export function itemType(reward: MapReward) {
	if (isTacticalHologram(reward)) return "exploration:Tactical Holograms";
	if (isEchoFlight(reward)) return "exploration:Echo Challenge: Flight";
	// Preserve saved filter keys when a known item texture moves to local assets.
	const icon =
		reward.itemId && reward.icon.startsWith("/wuwa-assets/")
			? `/map/icons/gg/${reward.icon
					.split("/")
					.at(-1)
					?.replace(/\.webp$/, ".png")}`
			: reward.icon;
	return `${reward.kind}:${reward.name}:${icon}`;
}
export function itemFilterLabel(reward: MapReward) {
	if (isEchoFlight(reward)) return "Echo Challenge: Flight";
	if (isTacticalHologram(reward)) return "Tactical Holograms";
	return itemLabel(reward);
}

export function itemLabel(reward: MapReward) {
	if (reward.name === "Windchimer") return "Windchimer (Bell)";
	if (reward.name === "Frostbug") return "Frostbug (Worm)";
	if (reward.kind !== "heritage") return reward.name;
	const tier = heritageTier(reward);
	const color = tier === "blue" ? "Blue" : tier === "gold" ? "Gold" : "Purple";
	return `${reward.name} · ${color}`;
}

/** Older catalogues and native rows with no degree retain the illustration fallback. */
export function heritageTier(reward: MapReward) {
	return (
		reward.heritageTier ??
		(reward.icon.includes("blue")
			? "blue"
			: reward.icon.includes("gold") || reward.icon.includes("yellow")
				? "gold"
				: "purple")
	);
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

/** Apply a batch in one save, later than any live evidence for each reward. */
export function markRewards(
	marks: ManualMapMarks,
	rewards: MapReward[],
	collected: boolean,
	snapshot: ExplorationSnapshot,
	now = Date.now(),
): ManualMapMarks {
	const next = { ...marks };
	for (const reward of rewards) {
		if (!tracksCollection(reward)) continue;
		next[reward.key] = {
			collected,
			updatedAt: Math.max(
				now,
				(snapshot.rewards[reward.key]?.observedAt ?? 0) + 1,
			),
		};
	}
	return next;
}
