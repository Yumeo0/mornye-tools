import type { ExplorationMarker } from "./map-exploration";

export interface ExploreProgress {
	Area: number;
	ExploreType: number;
	SubTypeScore: { Key: number }[];
}

export interface ExploreType {
	ExploreTypeKey: number;
	Name: string;
	Icon: string;
}

export type ExplorationCategoryLookup = (
	degree: number | undefined,
	areaId?: number,
) => ExplorationMarker | undefined;

/** Join exploration degrees through progress rows, retaining area-specific meanings. */
export function explorationCategoryLookup(
	progress: ExploreProgress[],
	types: ExploreType[],
	text: ReadonlyMap<string, string>,
	areas: { AreaId: number; Father: number }[] = [],
): ExplorationCategoryLookup {
	const byType = new Map(types.map((type) => [type.ExploreTypeKey, type]));
	const parents = new Map(areas.map((area) => [area.AreaId, area.Father]));
	const local = new Map<string, Map<number, ExplorationMarker>>();
	const global = new Map<number, Map<number, ExplorationMarker>>();
	for (const row of progress) {
		const type = byType.get(row.ExploreType);
		const name = type && text.get(type.Name)?.trim();
		const icon = type?.Icon.split("/").at(-1)?.split(".")[0];
		if (!type || !name || !icon) continue;
		for (const { Key: degree } of row.SubTypeScore) {
			const marker = { name, icon };
			const key = `${row.Area}:${degree}`;
			const candidates = local.get(key) ?? new Map();
			candidates.set(type.ExploreTypeKey, marker);
			local.set(key, candidates);
			const all = global.get(degree) ?? new Map();
			all.set(type.ExploreTypeKey, marker);
			global.set(degree, all);
		}
	}
	const unique = (candidates?: Map<number, ExplorationMarker>) => {
		const markers = new Map(
			[...(candidates?.values() ?? [])].map((marker) => [
				JSON.stringify(marker),
				marker,
			]),
		);
		return markers.size === 1 ? markers.values().next().value : undefined;
	};
	return (degree, areaId) => {
		if (degree === undefined) return undefined;
		const seen = new Set<number>();
		while (areaId !== undefined && !seen.has(areaId)) {
			seen.add(areaId);
			const candidates = local.get(`${areaId}:${degree}`);
			if (candidates) return unique(candidates);
			areaId = parents.get(areaId);
		}
		return unique(global.get(degree));
	};
}
