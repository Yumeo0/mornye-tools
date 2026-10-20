import type { MapDestination, MapRegion } from "./types";

export function flattenDestinations(items: MapDestination[]): MapDestination[] {
	return items.flatMap((item) => [item, ...flattenDestinations(item.children)]);
}

export function containsDestination(
	item: MapDestination,
	id: string | undefined,
): boolean {
	return (
		item.id === id ||
		item.children.some((child) => containsDestination(child, id))
	);
}

/** Match a live position to its region even when several destinations share a map ID. */
export function destinationAt(
	regions: MapRegion[],
	mapId: number,
	position?: { x: number; y: number } | null,
) {
	const destinations = regions
		.flatMap((region) => flattenDestinations(region.destinations))
		.filter((item) => item.mapId === mapId);
	if (position) {
		const containing = destinations.filter(
			({ bounds: b }) =>
				position.x >= b.left &&
				position.x <= b.right &&
				position.y >= b.top &&
				position.y <= b.bottom,
		);
		// Prefer the most specific area when bounding boxes overlap.
		containing.sort(
			(a, b) =>
				(a.bounds.right - a.bounds.left) * (a.bounds.bottom - a.bounds.top) -
				(b.bounds.right - b.bounds.left) * (b.bounds.bottom - b.bounds.top),
		);
		if (containing[0]) return containing[0];
	}
	return destinations[0] ?? null;
}
