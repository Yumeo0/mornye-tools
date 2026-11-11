/** Released records always win, including when an old preview becomes available. */
export function mergePreviewCatalog<T>(
	released: readonly T[],
	previews: readonly T[],
	id: (entry: T) => number,
): T[] {
	const entries = new Map<number, T>();
	for (const entry of [...released, ...previews]) {
		if (!entries.has(id(entry))) entries.set(id(entry), entry);
	}
	return [...entries.values()];
}
