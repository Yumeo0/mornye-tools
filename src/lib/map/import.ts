import {
	collectionState,
	type ManualMapMarks,
	tracksCollection,
} from "./collection";
import { chestChallengeIndex } from "./links";
import type { ExplorationSnapshot, MapReward } from "./types";

/** Expand checked import matches by one explicit link, then omit existing progress. */
export function pendingImportedRewards(
	rewards: MapReward[],
	catalog: MapReward[],
	snapshot: ExplorationSnapshot,
	marks: ManualMapMarks,
): MapReward[] {
	const byKey = new Map(catalog.map((reward) => [reward.key, reward]));
	const seeds = new Map<string, MapReward>();
	for (const reward of rewards) {
		const native = byKey.get(reward.key);
		if (native?.mapId === reward.mapId && tracksCollection(native))
			seeds.set(native.key, native);
	}
	const selected = new Map(seeds);
	for (const [chestKey, challenges] of chestChallengeIndex(catalog)) {
		for (const challenge of challenges) {
			if (seeds.has(chestKey)) selected.set(challenge.key, challenge);
			if (seeds.has(challenge.key)) {
				const chest = byKey.get(chestKey);
				if (chest) selected.set(chest.key, chest);
			}
		}
	}
	return [...selected.values()].filter(
		(reward) => collectionState(reward, snapshot, marks).state !== "collected",
	);
}
