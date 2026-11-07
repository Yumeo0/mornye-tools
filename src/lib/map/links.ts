import type { MapQuestLink, MapRequirement, MapReward } from "./types";

/** Reverse the explicit reward links; filter visibility never affects these relationships. */
export function chestChallengeIndex(rewards: MapReward[]) {
	const byKey = new Map(rewards.map((reward) => [reward.key, reward]));
	const result = new Map<string, MapReward[]>();
	for (const challenge of rewards) {
		if (challenge.kind !== "exploration") continue;
		for (const key of new Set(challenge.chestKeys ?? [])) {
			const chest = byKey.get(key);
			if (chest?.kind !== "chest" || chest.mapId !== challenge.mapId) continue;
			const entries = result.get(key) ?? [];
			entries.push(challenge);
			result.set(key, entries);
		}
	}
	return result;
}

export type AcquisitionSource =
	| { kind: "quest"; quest: MapQuestLink }
	| { kind: "challenge"; reward: MapReward }
	| { kind: "requirement"; requirement: MapRequirement; step: number };

export function requirementLabel(requirement: MapRequirement): string {
	if (requirement.action === "objective") return requirement.text;
	if ("requirements" in requirement) {
		const labels = requirement.requirements.map((child) =>
			"requirements" in child
				? `(${requirementLabel(child)})`
				: requirementLabel(child),
		);
		switch (requirement.action) {
			case "sequence":
				return labels.join("; then ");
			case "any":
				return `Either: ${labels.join("; or ")}`;
			case "atLeast":
				return `Complete at least ${requirement.count} of: ${labels.join("; ")}`;
			case "exactly":
				return `Complete exactly ${requirement.count} of: ${labels.join("; ")}`;
			case "all":
				return `All of: ${labels.join("; ")}`;
		}
	}
	const verb = {
		collect: "Collect",
		defeat: "Defeat",
		destroy: "Destroy",
		interact: "Interact with",
		activate: "Activate",
		complete: "Complete",
	}[requirement.action];
	return `${verb} ${requirement.targets.map((target) => `${target.count} × ${target.name}`).join(", ")}`;
}

/** Linked challenge cards already describe their own activation/completion step. */
function withoutLinkedChallenges(
	requirement: MapRequirement,
	linkedKeys: ReadonlySet<string>,
): MapRequirement | null {
	if (requirement.action === "all" || requirement.action === "sequence") {
		const requirements = requirement.requirements.flatMap((child) => {
			const next = withoutLinkedChallenges(child, linkedKeys);
			return next ? [next] : [];
		});
		if (!requirements.length) return null;
		return requirements.length === 1
			? requirements[0]
			: { ...requirement, requirements };
	}
	// Removing one alternative or a counted option would change its meaning.
	if (requirement.action !== "activate" && requirement.action !== "complete")
		return requirement;
	const targets = requirement.targets.filter(
		(target) =>
			!(
				target.count === 1 &&
				target.entityKey &&
				linkedKeys.has(target.entityKey)
			),
	);
	return targets.length ? { ...requirement, targets } : null;
}

/** Show a quest once rather than repeating the intermediate gameplay it contains. */
export function obtainedThrough(
	chest: MapReward,
	challenges: MapReward[],
): AcquisitionSource[] {
	const quests = [
		...new Map(
			(chest.kind === "chest" ? (chest.questLinks ?? []) : []).map((quest) => [
				quest.id,
				quest,
			]),
		).values(),
	];
	const covered = new Set(quests.flatMap((quest) => quest.playIds ?? []));
	const remaining = (chest.kind === "chest" ? challenges : []).filter(
		(challenge) =>
			challenge.mapId === chest.mapId &&
			(challenge.owner === null || !covered.has(challenge.owner)),
	);
	const isGeneric = (challenge: MapReward) =>
		challenge.name === "Challenge Project" && !challenge.title;
	const hasNamedChallenge = remaining.some(
		(challenge) => !isGeneric(challenge),
	);
	const visibleChallenges = remaining.filter(
		(challenge) => !hasNamedChallenge || !isGeneric(challenge),
	);
	const linkedKeys = new Set(
		visibleChallenges.map((challenge) => challenge.key),
	);
	const requirements = (chest.requirements ?? []).flatMap((requirement) => {
		const next = withoutLinkedChallenges(requirement, linkedKeys);
		return next ? [next] : [];
	});
	return [
		...quests.map((quest): AcquisitionSource => ({ kind: "quest", quest })),
		...visibleChallenges.map(
			(reward): AcquisitionSource => ({ kind: "challenge", reward }),
		),
		...requirements.map(
			(requirement, step): AcquisitionSource => ({
				kind: "requirement",
				requirement,
				step,
			}),
		),
	];
}
