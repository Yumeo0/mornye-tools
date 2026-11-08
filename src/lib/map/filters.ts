import {
	isEchoFlight,
	isTacticalHologram,
	itemFilterLabel,
	itemType,
	tracksCollection,
} from "./collection";
import {
	KIND_LABELS,
	type MapReward,
	REWARD_KINDS,
	type ResourceUsage,
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
	resourceUsage?: ResourceUsage;
	icon: string;
	total: number;
	remaining: number;
	collected: number;
}

type ItemSection =
	| Exclude<RewardKind, "collection">
	| `collection:${ResourceUsage}`;

const ITEM_SECTIONS = REWARD_KINDS.flatMap<{ id: ItemSection; label: string }>(
	(kind) =>
		kind === "collection"
			? [
					{ id: "collection:upgrade", label: "Upgrade materials" },
					{ id: "collection:other", label: "Other resources" },
				]
			: [{ id: kind, label: KIND_LABELS[kind] }],
);

/** Resource groups keep the original item type keys and saved visibility toggles. */
export function groupItemRows(rows: ItemRow[], search = "") {
	const query = search.trim().toLowerCase();
	const matches = (text: string) => text.toLowerCase().includes(query);
	return ITEM_SECTIONS.map((section) => ({
		...section,
		rows: rows.filter((row) => {
			const id =
				row.kind === "collection"
					? `collection:${row.resourceUsage ?? "other"}`
					: row.kind;
			return (
				id === section.id &&
				(matches(row.label) ||
					matches(section.label) ||
					matches(KIND_LABELS[row.kind]))
			);
		}),
	})).filter((section) => section.rows.length > 0);
}

/** All marker types start hidden until enabled in the filter list. */
export function isItemVisible(
	overrides: Record<string, boolean>,
	row: ItemRow,
) {
	if (overrides[row.type] !== undefined) return overrides[row.type];
	if (row.kind !== "collection") return false;
	// Native item data can correct a previously mismatched resource illustration.
	// Keep its saved visibility only when previous entries for this name agree.
	const prefix = `${row.kind}:${row.label}:`;
	const previous = Object.entries(overrides)
		.filter(([key]) => key.startsWith(prefix))
		.map(([, visible]) => visible);
	return previous.length > 0 && previous.every(Boolean);
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
				label: itemFilterLabel(reward),
				kind: reward.kind,
				...(reward.kind === "collection"
					? { resourceUsage: reward.resourceUsage ?? "other" }
					: {}),
				icon: isEchoFlight(reward)
					? "/icons/map/echo-flight.webp"
					: isTacticalHologram(reward)
						? "/icons/map/tactical-hologram.webp"
						: reward.icon,
				total: 0,
				remaining: 0,
				collected: 0,
			};
			byType.set(type, row);
		}
		row.total++;
		if (tracksCollection(reward)) row[state]++;
	}
	return [...byType.values()].sort(
		(a, b) =>
			REWARD_KINDS.indexOf(a.kind) - REWARD_KINDS.indexOf(b.kind) ||
			a.label.localeCompare(b.label),
	);
}

/** Untracked map locations remain visible regardless of the collection filter. */
export function matchesMapVisibility(
	marker: RewardMarker,
	visibility: MapVisibility,
) {
	return (
		!tracksCollection(marker.reward) ||
		visibility === "all" ||
		marker.state === visibility
	);
}
