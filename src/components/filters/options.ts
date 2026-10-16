import type { FilterOption } from "@/components/filters/types";
import { type Resonator, STAT_LABELS, type StatKey } from "@/lib/account";
import { charactersById } from "@/lib/catalog";
import { statIconAsset } from "@/lib/stats";

/** Stat filter options, with icons; defaults to every known stat. */
export function statFilterOptions(keys?: readonly StatKey[]): FilterOption[] {
	const list = keys ?? (Object.keys(STAT_LABELS) as StatKey[]);
	return list.map((key) => ({
		value: key,
		label: STAT_LABELS[key],
		icon: statIconAsset(STAT_LABELS[key]),
	}));
}

/** Character filter options shared by the echoes and weapons tabs. */
export function characterFilterOptions(
	resonators: Resonator[],
): FilterOption[] {
	return resonators
		.map((resonator) => ({
			value: String(resonator.id),
			label:
				charactersById.get(resonator.id)?.character_name ||
				resonator.name ||
				String(resonator.id),
			icon: charactersById.get(resonator.id)?.icon_head_256,
		}))
		.sort((a, b) => a.label.localeCompare(b.label));
}
