import type { MapQuestLink, MapReward } from "../src/lib/map/types";

interface ChallengePlay {
	id: number;
	mapId: number;
	references: string[];
}

/** Chest membership shared by challenge and quest links, scoped to each native map/play. */
function playChestIndex(rewards: MapReward[], plays: ChallengePlay[]) {
	const chests = rewards.filter((reward) => reward.kind === "chest");
	const byOwner = new Map<string, Set<string>>();
	for (const chest of chests) {
		if (chest.owner === null) continue;
		const key = `${chest.mapId}:${chest.owner}`;
		const keys = byOwner.get(key) ?? new Set<string>();
		keys.add(chest.key);
		byOwner.set(key, keys);
	}
	const chestByKey = new Map(chests.map((chest) => [chest.key, chest]));
	for (const play of plays) {
		const key = `${play.mapId}:${play.id}`;
		const keys = byOwner.get(key) ?? new Set<string>();
		for (const reference of play.references) {
			const match = /^e_(\d+)_(\d+)$/.exec(reference);
			if (!match || Number(match[1]) !== play.mapId) continue;
			const chestKey = `${match[1]}:${match[2]}`;
			if (chestByKey.has(chestKey)) keys.add(chestKey);
		}
		byOwner.set(key, keys);
	}
	return byOwner;
}

/** Join real chest placements through native gameplay ownership/references, never distance. */
export function challengeChestLinks(
	rewards: MapReward[],
	challenges: ReadonlySet<string>,
	plays: ChallengePlay[],
): Map<string, string[]> {
	const byOwner = playChestIndex(rewards, plays);
	const result = new Map<string, string[]>();
	for (const reward of rewards) {
		if (!challenges.has(reward.key) || reward.owner === null) continue;
		const keys = byOwner.get(`${reward.mapId}:${reward.owner}`);
		if (keys?.size) result.set(reward.key, [...keys].sort());
	}
	return result;
}

interface QuestReferences extends MapQuestLink {
	references: string[];
}

/** Quests can reference a chest directly, or a gameplay graph that owns its rewards. */
export function questChestLinks(
	rewards: MapReward[],
	plays: ChallengePlay[],
	quests: QuestReferences[],
): Map<string, MapQuestLink[]> {
	const byPlay = playChestIndex(rewards, plays);
	const chestKeys = new Set(
		rewards
			.filter((reward) => reward.kind === "chest")
			.map((reward) => reward.key),
	);
	const links = new Map<string, Map<number, MapQuestLink>>();
	for (const quest of quests) {
		if (!quest.name.trim()) continue;
		const keys = new Set<string>();
		const playIds = new Map<string, Set<number>>();
		for (const reference of quest.references) {
			const match = /^([el])_(\d+)_(\d+)$/.exec(reference);
			if (!match) continue;
			const key = `${match[2]}:${match[3]}`;
			if (match[1] === "e" && chestKeys.has(key)) keys.add(key);
			if (match[1] === "l") {
				for (const chest of byPlay.get(key) ?? []) {
					keys.add(chest);
					const ids = playIds.get(chest) ?? new Set<number>();
					ids.add(Number(match[3]));
					playIds.set(chest, ids);
				}
			}
		}
		for (const key of keys) {
			const entries = links.get(key) ?? new Map<number, MapQuestLink>();
			const { references: _references, ...details } = quest;
			const ids = playIds.get(key);
			entries.set(quest.id, {
				...details,
				...(ids?.size ? { playIds: [...ids].sort((a, b) => a - b) } : {}),
			});
			links.set(key, entries);
		}
	}
	return new Map(
		[...links].map(([key, entries]) => [
			key,
			[...entries.values()].sort(
				(a, b) => a.name.localeCompare(b.name) || a.id - b.id,
			),
		]),
	);
}
