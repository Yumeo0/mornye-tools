import type { ExplorationMarker } from "./map-exploration";
import { TRAINING_DUMMIES } from "./map-exploration";

type Raw = Record<string, unknown>;
const row = (value: unknown): Raw =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Raw)
		: {};
const rows = (value: unknown): Raw[] =>
	Array.isArray(value) ? value.map(row) : [];
const ids = (value: unknown): number[] =>
	Array.isArray(value) ? value.filter(Number.isSafeInteger) : [];

export interface ObeliskEntity {
	key: string;
	mapId: number;
	blueprint: string;
	components: Raw;
	/** Graph-owned, quest-only, hidden and packed variants already have another context. */
	excluded: boolean;
}

/** Discover standalone state-matching obelisks with explicit reward actions. */
export function obeliskMarkers(
	entities: ObeliskEntity[],
	chestKeys: ReadonlySet<string>,
) {
	const byKey = new Map(entities.map((entity) => [entity.key, entity]));
	const markers = new Map<
		string,
		ExplorationMarker & { chestKeys: string[] }
	>();
	for (const entity of entities) {
		if (entity.excluded) continue;
		const configs = rows(
			row(entity.components.TargetGearGroupComponent).GroupConfigs,
		);
		if (
			!configs.length ||
			!configs.every((config) => {
				const children = ids(config.Entitys);
				const success = row(config.SuccessCondition);
				return (
					children.length > 0 &&
					Array.isArray(config.Entitys) &&
					children.length === config.Entitys.length &&
					success.Type === "SameSpecificState" &&
					typeof success.State === "string" &&
					success.State.length > 0 &&
					children.every((id) => {
						const child = byKey.get(`${entity.mapId}:${id}`);
						return child?.blueprint === "Gameplay050" && !child.excluded;
					})
				);
			})
		)
			continue;
		const chests = new Set<string>();
		for (const behavior of rows(
			row(entity.components.EntityStateComponent).StateChangeBehaviors,
		)) {
			if (behavior.State !== "关卡.Common.状态.完成") continue;
			for (const action of rows(behavior.Action)) {
				if (action.Name !== "AwakeEntity" && action.Name !== "UnlockEntity")
					continue;
				for (const id of ids(row(action.Params).EntityIds)) {
					const key = `${entity.mapId}:${id}`;
					const chest = byKey.get(key);
					if (chestKeys.has(key) && chest && !chest.excluded) chests.add(key);
				}
			}
		}
		if (chests.size)
			markers.set(entity.key, {
				...TRAINING_DUMMIES,
				chestKeys: [...chests].sort(),
			});
	}
	return markers;
}
