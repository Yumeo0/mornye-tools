import type {
	MapBounds,
	MapDestination,
	MapRegion,
} from "../src/lib/map/types";

export interface RegionArea {
	AreaId: number;
	CountryId: number;
	MapConfigId: number;
	Level: number;
	Father: number;
	Title: string;
	AreaName?: string;
	SortIndex: number;
}

export interface RegionCountry {
	Id: number;
	Title: string;
	Icon: string;
	SortIndex: number;
}

export interface RegionPlacement {
	mapId: number;
	areaId: number;
	x: number;
	y: number;
}

/** Use the game's area ancestry to split shared maps without guessing coordinate ranges. */
export function compileMapRegions(
	areas: RegionArea[],
	countries: RegionCountry[],
	placements: RegionPlacement[],
	text: Map<string, string>,
): MapRegion[] {
	const byId = new Map(areas.map((area) => [area.AreaId, area]));
	const bounds = new Map<string, MapBounds>();
	for (const point of placements) {
		if (![point.x, point.y].every(Number.isFinite)) continue;
		const visited = new Set<number>();
		let area = byId.get(point.areaId);
		while (area && !visited.has(area.AreaId)) {
			visited.add(area.AreaId);
			if (area.MapConfigId === point.mapId) {
				const key = `${point.mapId}:${area.AreaId}`;
				const box = bounds.get(key);
				if (box) {
					box.left = Math.min(box.left, point.x);
					box.top = Math.min(box.top, point.y);
					box.right = Math.max(box.right, point.x);
					box.bottom = Math.max(box.bottom, point.y);
				} else
					bounds.set(key, {
						left: point.x,
						top: point.y,
						right: point.x,
						bottom: point.y,
					});
			}
			area = byId.get(area.Father);
		}
	}

	const candidates = areas.filter(
		(area) =>
			area.Level !== 1 &&
			text.get(area.Title) &&
			bounds.has(`${area.MapConfigId}:${area.AreaId}`),
	);
	const regions: MapRegion[] = [];
	for (const country of [...countries].sort(
		(a, b) => b.SortIndex - a.SortIndex,
	)) {
		if (!country.Icon) continue;
		const countryAreas = candidates.filter(
			(area) => area.CountryId === country.Id,
		);
		const candidateIds = new Set(countryAreas.map((area) => area.AreaId));
		const nodes = new Map<number, MapDestination>();
		for (const area of countryAreas.sort(
			(a, b) => a.SortIndex - b.SortIndex || a.AreaId - b.AreaId,
		)) {
			nodes.set(area.AreaId, {
				id: `${area.MapConfigId}:${area.AreaId}`,
				name: text.get(area.Title) as string,
				mapId: area.MapConfigId,
				bounds: bounds.get(`${area.MapConfigId}:${area.AreaId}`) as MapBounds,
				children: [],
			});
		}
		const roots: MapDestination[] = [];
		for (const area of countryAreas) {
			const node = nodes.get(area.AreaId) as MapDestination;
			const visited = new Set<number>([area.AreaId]);
			let parent = byId.get(area.Father);
			while (parent && !visited.has(parent.AreaId)) {
				visited.add(parent.AreaId);
				// A separate physical map remains an independent destination.
				if (
					parent.MapConfigId === area.MapConfigId &&
					candidateIds.has(parent.AreaId)
				)
					break;
				parent = byId.get(parent.Father);
			}
			const parentNode = parent && nodes.get(parent.AreaId);
			if (parentNode) parentNode.children.push(node);
			else roots.push(node);
		}
		if (!roots.length) continue;
		// Navigation stops at nation → region → district. Bounds already include
		// placements in deeper areas, so those remain covered by their district.
		for (const root of roots)
			for (const district of root.children) district.children = [];
		regions.push({
			id: country.Id,
			name: text.get(country.Title) ?? country.Title,
			icon: `/map/icons/${country.Icon.split("/").at(-1)?.split(".")[0]}.webp`,
			destinations: roots,
		});
	}
	return regions;
}
