export interface ChallengeGraphEvidence {
	texts: string[];
	timed: boolean;
}

/** Read localized objectives and explicit failure timers; delays/animations are not timers. */
export function challengeGraphEvidence(
	nodes: { Key: string; Data: unknown }[],
	text: ReadonlyMap<string, string>,
): Map<number, ChallengeGraphEvidence> {
	const result = new Map<number, ChallengeGraphEvidence>();
	for (const node of nodes) {
		const id = Number(node.Key.slice(0, node.Key.lastIndexOf("_")));
		if (!Number.isSafeInteger(id)) continue;
		const evidence = result.get(id) ?? { texts: [], timed: false };
		const strings = new Set(evidence.texts);
		const visit = (value: unknown) => {
			if (Array.isArray(value)) {
				for (const child of value) visit(child);
				return;
			}
			if (!value || typeof value !== "object") return;
			const row = value as Record<string, unknown>;
			if (
				row.Type === "QuestFailed" &&
				row.FailedCondition &&
				typeof row.FailedCondition === "object"
			) {
				const timer = (row.FailedCondition as Record<string, unknown>).Timer;
				if (
					timer &&
					typeof timer === "object" &&
					typeof (timer as Record<string, unknown>).Time === "number" &&
					Number((timer as Record<string, unknown>).Time) > 0
				)
					evidence.timed = true;
			}
			for (const [key, child] of Object.entries(row)) {
				if (key.startsWith("Tid") && typeof child === "string") {
					const localized = text.get(child);
					if (localized) strings.add(localized);
				}
				visit(child);
			}
		};
		visit(node.Data);
		evidence.texts = [...strings];
		result.set(id, evidence);
	}
	return result;
}
