// Shared option lists and the filter shape for the optimizer views.
//
// The optimizer never assumes which echoes are interesting: the user picks the
// candidate pool explicitly (the "Recommended" button applies the derived main
// stats on request). Empty selections mean "no restriction"; echoes beyond the
// search-space cap are still ranked by stat weight (a technical necessity, see
// `selectOptimizerCandidates`).

import { type FilterOption, statFilterOptions } from "@/components/filters";
import type { StatKey } from "@/lib/account";
import { echoSetsById, sonataIcon128 } from "@/lib/catalog";

export const DEFAULT_RESULTS_LIMIT = 128;
export const MIN_RESULTS_LIMIT = 8;
export const MAX_RESULTS_LIMIT = 65536;

export const MAX_ECHO_LEVEL = 25;

/** Which equipped echoes may enter the candidate pool. */
export type EquippedMode = "include" | "exclude-others" | "exclude-all";

export const EQUIPPED_OPTIONS: FilterOption[] = [
	{ value: "include", label: "All echoes" },
	{ value: "exclude-others", label: "Exclude other resonators" },
	{ value: "exclude-all", label: "Exclude all equipped" },
];

export interface OptimizerFilters {
	equipped: EquippedMode;
	/** Minimum echo level (+0 … +25); 0 = no restriction. */
	minLevel: number;
	/** Allowed sonata set ids (as strings); empty = every set. */
	sets: string[];
	/** Allowed main-stat keys; empty = every main stat. */
	mainStats: string[];
	/** Candidates must include one of these substats; empty = any substats. */
	substats: string[];
}

export const EMPTY_OPTIMIZER_FILTERS: OptimizerFilters = {
	equipped: "include",
	minLevel: 0,
	sets: [],
	mainStats: [],
	substats: [],
};

export function hasOptimizerFilters(filters: OptimizerFilters): boolean {
	return (
		filters.equipped !== "include" ||
		filters.minLevel > 0 ||
		filters.sets.length > 0 ||
		filters.mainStats.length > 0 ||
		filters.substats.length > 0
	);
}

/** Main-stat keys an echo can actually roll as its main stat. */
const MAIN_STAT_KEYS: StatKey[] = [
	"atkPercent",
	"hpPercent",
	"defPercent",
	"energyRegen",
	"critRate",
	"critDmg",
	"healingBonus",
	"aero",
	"glacio",
	"electro",
	"fusion",
	"spectro",
	"havoc",
];

export const mainStatOptions: FilterOption[] =
	statFilterOptions(MAIN_STAT_KEYS);
export const substatOptions: FilterOption[] = statFilterOptions();

// Sonata set options from the echo catalog (id-keyed, like the inventory).
export const optimizerSetOptions: FilterOption[] = [...echoSetsById.values()]
	.sort((a, b) => a.name.localeCompare(b.name))
	.map((set) => ({
		value: String(set.id),
		label: set.name,
		icon: sonataIcon128(set.icon),
	}));
