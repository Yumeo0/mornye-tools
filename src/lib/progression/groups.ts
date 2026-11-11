export interface ProgressionGroup {
	id: string;
	title: string;
	status: string;
	order: number;
}

export type ProgressionRow<T> =
	| { kind: "header"; group: ProgressionGroup; count: number }
	| { kind: "entry"; entry: T };

/** Flatten groups so headers and variable-height entries share one virtual list. */
export function progressionRows<T>(
	entries: readonly T[],
	groupFor: (entry: T) => ProgressionGroup,
): ProgressionRow<T>[] {
	const groups = new Map<string, { group: ProgressionGroup; entries: T[] }>();
	for (const entry of entries) {
		const group = groupFor(entry);
		const bucket = groups.get(group.id);
		if (bucket) bucket.entries.push(entry);
		else groups.set(group.id, { group, entries: [entry] });
	}
	return [...groups.values()]
		.sort(
			(a, b) =>
				a.group.order - b.group.order ||
				a.group.title.localeCompare(b.group.title),
		)
		.flatMap(({ group, entries }): ProgressionRow<T>[] => [
			{ kind: "header", group, count: entries.length },
			...entries.map((entry) => ({ kind: "entry" as const, entry })),
		]);
}
