import { tracksCollection } from "./collection";
import type { RewardMarker } from "./filters";

/** Select the drawn stack centres, including every trackable reward in a stack. */
export function rewardsInBox(
	groups: { x: number; y: number; items: RewardMarker[] }[],
	start: { x: number; y: number },
	end: { x: number; y: number },
) {
	const left = Math.min(start.x, end.x);
	const right = Math.max(start.x, end.x);
	const top = Math.min(start.y, end.y);
	const bottom = Math.max(start.y, end.y);
	return groups
		.filter(
			(group) =>
				group.x >= left &&
				group.x <= right &&
				group.y >= top &&
				group.y <= bottom,
		)
		.flatMap((group) => group.items.map((item) => item.reward))
		.filter(tracksCollection);
}
