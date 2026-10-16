// Shared sort skeleton of the inventory lists.

/**
 * Sort `items` by a named key.
 *
 * - `"none"` keeps the capture order; ascending reverses it (newest first).
 * - Every other key compares through `compare`; `sortAsc` flips the direction.
 * - Items matching `isBottom` always sink to the bottom, independent of the
 *   direction — used for "unequipped items last".
 */
export function sortByKey<T, K extends string>(
	items: readonly T[],
	sortBy: K,
	sortAsc: boolean,
	compare: (key: K, a: T, b: T) => number,
	isBottom?: (item: T) => boolean,
): T[] {
	if (sortBy === "none") {
		const list = [...items];
		return sortAsc ? list.reverse() : list;
	}
	const dir = sortAsc ? 1 : -1;
	return [...items].sort((a, b) => {
		if (isBottom) {
			const bottomA = isBottom(a);
			const bottomB = isBottom(b);
			if (bottomA && !bottomB) return 1;
			if (!bottomA && bottomB) return -1;
		}
		return dir * compare(sortBy, a, b);
	});
}
