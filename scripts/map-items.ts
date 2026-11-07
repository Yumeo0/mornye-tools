export interface MapItem {
	Id: number;
	Name: string;
	Icon: string;
}

/** Only a single proven preview item can name/illustrate a pickup. */
export function rewardItemLookup(
	items: MapItem[],
	packages: { Id: number; DropPreview: { Key: number }[] }[],
	text: ReadonlyMap<string, string>,
) {
	const byId = new Map(items.map((item) => [item.Id, item]));
	const byReward = new Map(
		packages.flatMap((pack) => {
			const ids = [...new Set(pack.DropPreview.map((drop) => drop.Key))];
			const item = ids.length === 1 ? byId.get(ids[0]) : undefined;
			return item ? [[pack.Id, item] as const] : [];
		}),
	);
	return (reward?: {
		RewardId?: number;
		RewardType?: number;
		Disabled?: boolean;
	}) => {
		// Disabled rewards still identify the prop's item; availability is separate.
		if (!reward || ![1, 2].includes(reward.RewardType ?? 0)) return undefined;
		const item = byReward.get(reward.RewardId ?? 0);
		if (!item) return undefined;
		return {
			id: item.Id,
			name:
				text
					.get(item.Name)
					?.replace(/<[^>]*>/g, "")
					.trim() || undefined,
			icon: item.Icon,
		};
	};
}
