// Echo list filtering and sorting for the Echoes tab.

import { echoCost, echoName, echoSet } from "@/components/echo/EchoCard";
import type { Echo } from "@/lib/account";
import { sortByKey } from "@/lib/sorting";

export interface EchoFilters {
	search: string;
	minLevel: number;
	cost: number[];
	set: string[];
	mainStat: string;
	substat: string[];
	character: string[];
}

export const EMPTY_ECHO_FILTERS: EchoFilters = {
	search: "",
	minLevel: 0,
	cost: [],
	set: [],
	mainStat: "any",
	substat: [],
	character: [],
};

export function matchesEchoFilters(echo: Echo, filters: EchoFilters): boolean {
	if (
		filters.search &&
		!echoName(echo).toLowerCase().includes(filters.search.toLowerCase())
	) {
		return false;
	}
	if (echo.level < filters.minLevel) {
		return false;
	}

	if (filters.cost.length > 0) {
		const cost = echoCost(echo);
		if (cost === undefined || !filters.cost.includes(cost)) {
			return false;
		}
	}

	if (
		filters.set.length > 0 &&
		!filters.set.includes(echoSet(echo)?.name ?? "")
	) {
		return false;
	}

	if (
		filters.mainStat !== "any" &&
		!echo.mainProps.some((prop) => prop.key === filters.mainStat)
	) {
		return false;
	}

	if (
		filters.substat.length > 0 &&
		!echo.subProps.some((prop) => filters.substat.includes(prop.key))
	) {
		return false;
	}

	if (filters.character.length > 0) {
		const matchesNone =
			echo.equippedBy == null && filters.character.includes("none");
		const matchesCharacter =
			echo.equippedBy != null &&
			filters.character.includes(String(echo.equippedBy));
		if (!matchesNone && !matchesCharacter) return false;
	}

	return true;
}

export type EchoSortKey =
	| "none"
	| "rollValue"
	| "level"
	| "cost"
	| "set"
	| "name"
	| "character";

// `desc` is the natural default direction per key
export const ECHO_SORT_OPTIONS: {
	value: EchoSortKey;
	label: string;
	desc: boolean;
}[] = [
	{ value: "none", label: "Newest", desc: true },
	{ value: "rollValue", label: "Roll Value", desc: true },
	{ value: "level", label: "Lvl", desc: true },
	{ value: "cost", label: "Cost", desc: true },
	{ value: "set", label: "Set", desc: false },
	{ value: "name", label: "Name", desc: false },
	{ value: "character", label: "Equipped", desc: false },
];

/** `rollScore` feeds the roll-value sort (0 when the echo has no rating). */
export function sortEchoes(
	echoes: Echo[],
	sortBy: EchoSortKey,
	sortAsc: boolean,
	rollScore: (echo: Echo) => number,
): Echo[] {
	return sortByKey(
		echoes,
		sortBy,
		sortAsc,
		(key, a, b) => {
			switch (key) {
				case "name":
					return echoName(a).localeCompare(echoName(b));
				case "level":
					return a.level - b.level;
				case "cost":
					return (echoCost(a) ?? 0) - (echoCost(b) ?? 0);
				case "set":
					return (echoSet(a)?.name ?? "").localeCompare(echoSet(b)?.name ?? "");
				case "rollValue":
					return rollScore(a) - rollScore(b);
				case "character":
					return (a.equippedBy ?? 0) - (b.equippedBy ?? 0);
				default:
					return 0;
			}
		},
		sortBy === "character" ? (echo) => echo.equippedBy == null : undefined,
	);
}
