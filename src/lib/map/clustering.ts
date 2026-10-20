type PointMarker = { reward: { key: string; x: number; y: number } };

export interface MarkerCluster<T> {
	id: string;
	x: number;
	y: number;
	items: T[];
}

const ZOOM_STEP = 1.5;

/** Keep the current band near its boundary so tiny wheel changes cannot toggle groups. */
export function clusterZoomLevel(scale: number, previous?: number): number {
	const level = Math.log(scale) / Math.log(ZOOM_STEP);
	if (previous !== undefined && Math.abs(level - previous) <= 0.7)
		return previous;
	return Math.round(level);
}

/** Cluster the full filtered map, independent of camera position or viewport edges. */
export function clusterMarkers<T extends PointMarker>(
	markers: readonly T[],
	level: number,
): MarkerCluster<T>[] {
	const radius = 34 / ZOOM_STEP ** level;
	const buckets = new Map<
		string,
		(MarkerCluster<T> & { seedX: number; seedY: number })[]
	>();
	const groups: (MarkerCluster<T> & { seedX: number; seedY: number })[] = [];
	// Stable seeds and tie breaking, even if evidence updates reorder the input.
	for (const item of [...markers].sort((a, b) =>
		a.reward.key.localeCompare(b.reward.key),
	)) {
		const { x, y, key } = item.reward;
		const bx = Math.floor(x / radius);
		const by = Math.floor(y / radius);
		let nearest: (typeof groups)[number] | undefined;
		let distance = radius * radius;
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (const candidate of buckets.get(`${bx + dx}:${by + dy}`) ?? []) {
					const d = (candidate.seedX - x) ** 2 + (candidate.seedY - y) ** 2;
					if (
						d <= distance &&
						(!nearest || d < distance || candidate.id < nearest.id)
					) {
						nearest = candidate;
						distance = d;
					}
				}
			}
		}
		if (nearest) {
			nearest.items.push(item);
			nearest.x += (x - nearest.x) / nearest.items.length;
			nearest.y += (y - nearest.y) / nearest.items.length;
		} else {
			const group = { id: key, x, y, seedX: x, seedY: y, items: [item] };
			groups.push(group);
			const bucket = `${bx}:${by}`;
			const existing = buckets.get(bucket);
			if (existing) existing.push(group);
			else buckets.set(bucket, [group]);
		}
	}
	return groups;
}
