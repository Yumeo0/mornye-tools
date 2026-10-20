import { itemLabel, itemType } from "./collection";
import {
	type MapReward,
	REWARD_KINDS,
	type RewardKind,
	type RewardState,
} from "./types";

export type MapVisibility = "all" | RewardState;

export interface RewardMarker {
	reward: MapReward;
	state: RewardState;
}

export interface ItemRow {
	type: string;
	label: string;
	kind: RewardKind;
	icon: string;
	total: number;
	remaining: number;
	collected: number;
}

/** All marker types start hidden until enabled in the filter list. */
export function isItemVisible(
	overrides: Record<string, boolean>,
	row: ItemRow,
) {
	return overrides[row.type] ?? false;
}

/** One filter entry per item type, counted across the selected map. */
export function summarizeItems(markers: RewardMarker[]): ItemRow[] {
	const byType = new Map<string, ItemRow>();
	for (const { reward, state } of markers) {
		const type = itemType(reward);
		let row = byType.get(type);
		if (!row) {
			row = {
				type,
				label: itemLabel(reward),
				kind: reward.kind,
				icon: reward.icon,
				total: 0,
				remaining: 0,
				collected: 0,
			};
			byType.set(type, row);
		}
		row.total++;
		row[state]++;
	}
	return [...byType.values()].sort(
		(a, b) =>
			REWARD_KINDS.indexOf(a.kind) - REWARD_KINDS.indexOf(b.kind) ||
			a.label.localeCompare(b.label),
	);
}
