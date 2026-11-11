import type { ActiveFilter } from "./FilterPanel";

/** One removable chip per active facet; reset only that facet. */
export function activeFilterChips<T extends object>(
	filters: T,
	defaults: T,
	onChange: (update: (previous: T) => T) => void,
	labels: { [K in keyof T]: (value: T[K]) => string },
): ActiveFilter[] {
	return (Object.keys(defaults) as (keyof T)[])
		.filter(
			(key) => JSON.stringify(filters[key]) !== JSON.stringify(defaults[key]),
		)
		.map((key) => ({
			id: String(key),
			label: labels[key](filters[key]),
			onRemove: () =>
				onChange((previous) => ({ ...previous, [key]: defaults[key] })),
		}));
}
