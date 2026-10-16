// Constants and helpers for the optimizer's loadout editor.

import type { FilterOption } from "@/components/filters";

export const MAX_RESONATOR_LEVEL = 90;

export const chainOptions: FilterOption[] = [0, 1, 2, 3, 4, 5, 6].map(
	(chain) => ({
		value: String(chain),
		label: String(chain),
	}),
);

export const weaponRankOptions: FilterOption[] = [1, 2, 3, 4, 5].map(
	(rank) => ({
		value: String(rank),
		label: `R${rank}`,
	}),
);

export function clampLoadoutNumber(
	value: number,
	min: number,
	max: number,
): number {
	return Math.min(max, Math.max(min, Math.round(value)));
}
