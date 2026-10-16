/** One selectable filter value, optionally with an icon. */
export interface FilterOption {
	value: string;
	label: string;
	icon?: string;
}

/** Toggle `value` in an array: removed when present, appended otherwise. */
export function toggleInArray<T>(values: readonly T[], value: T): T[] {
	return values.includes(value)
		? values.filter((v) => v !== value)
		: [...values, value];
}
