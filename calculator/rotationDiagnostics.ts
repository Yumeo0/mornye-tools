import type { RotationDiagnostic } from "../src/lib/calc/types";

export interface DiagnosticAction {
	name: string;
	cancelOf?: DiagnosticAction | null;
	formOf?: DiagnosticAction | null;
	actions?: readonly DiagnosticAction[];
	of?: DiagnosticAction;
	gated?: DiagnosticAction;
	intros?: readonly DiagnosticAction[];
}

export class RotationNodeError extends Error {
	readonly rotationDiagnostic: RotationDiagnostic;
	constructor(message: string, nodeId?: string) {
		super(message);
		this.rotationDiagnostic = { message, ...(nodeId ? { nodeId } : {}) };
	}
}

interface ConditionSnapshot {
	action: {
		castMin?: readonly number[] | null;
		castMax?: readonly number[] | null;
	};
	castUnmet?: readonly boolean[] | null;
	buffUnmet?: readonly { name: string }[] | null;
	buffForbidden?: readonly { name: string }[] | null;
	forteScale?: readonly number[];
	shownShort?: readonly boolean[];
	shownAfter?: readonly number[];
}

/** Undo the report's background-gain adjustment for an authored cast (or Outro).
 * Queued actions do not carry their pending background gains in `adds`. */
export function castConcerto(snapshot: {
	concertoBefore?: number;
	adds?: readonly { background?: boolean; gains: readonly number[] }[];
}): number | undefined {
	if (!Number.isFinite(snapshot.concertoBefore)) return;
	return (
		snapshot.concertoBefore! +
		(snapshot.adds ?? []).reduce(
			(total, add) => total + (add.background ? (add.gains[1] ?? 0) : 0),
			0,
		)
	);
}

/** Report the actual failed checks, in displayed points rather than engine units.
 * Cast requirements use the engine's failure flags: settled gauge values include
 * delayed hits and must not be presented as the amount available at the cast. */
export function conditionProblems(
	snapshot: ConditionSnapshot,
	concertoAtCast?: number,
): string[] {
	const labels = [
		"Energy",
		"Concerto",
		"Forte 1",
		"Forte 2",
		"Forte 3",
		"Forte 4",
		"Forte 5",
	];
	const scale = (bar: number) =>
		bar < 2 ? 0.01 : (snapshot.forteScale?.[bar - 2] ?? 1);
	const number = (value: number) => String(Number(value.toFixed(2)));
	const reasons: string[] = [];
	for (const [bar, unmet] of (snapshot.castUnmet ?? []).entries()) {
		if (!unmet) continue;
		const min = snapshot.action.castMin?.[bar] ?? -Infinity;
		const max = snapshot.action.castMax?.[bar] ?? Infinity;
		const minimum = number(min * scale(bar));
		const maximum = number(max * scale(bar));
		const condition =
			Number.isFinite(min) && Number.isFinite(max)
				? min === max
					? `= ${minimum}`
					: `${minimum}–${maximum}`
				: Number.isFinite(min)
					? `>= ${minimum}`
					: `<= ${maximum}`;
		const current =
			bar === 1 && Number.isFinite(concertoAtCast)
				? ` (current: ${number(concertoAtCast! * scale(bar))})`
				: "";
		reasons.push(`Requires: ${labels[bar]} ${condition}${current}`);
	}
	for (const buff of snapshot.buffUnmet ?? [])
		reasons.push(`missing buff: ${buff.name}`);
	for (const buff of snapshot.buffForbidden ?? [])
		reasons.push(`blocked by buff: ${buff.name}`);
	for (const [index, short] of (snapshot.shownShort ?? []).entries()) {
		// Off-tune is shared by the enemy and is not a character resource condition.
		if (!short || index === 2) continue;
		const bar = index > 2 ? index - 1 : index;
		if (snapshot.castUnmet?.[bar]) continue;
		const deficit = -(snapshot.shownAfter?.[index] ?? 0) * scale(bar);
		reasons.push(
			`${labels[bar]}: ${deficit > 1e-9 ? `short by ${number(deficit)}` : "depleted during action"}`,
		);
	}
	return reasons;
}

/** Upstream exceptions have no source metadata. Link only an unambiguous named press
 * in this visit; repeated names remain unlinked rather than pointing at the wrong block. */
export function exceptionNode(
	message: string,
	entries: { nodeId: string; action: DiagnosticAction }[],
): string | undefined {
	const names = (
		action: DiagnosticAction,
		seen = new Set<DiagnosticAction>(),
	): string[] => {
		if (seen.has(action)) return [];
		seen.add(action);
		return [
			action.name,
			...[
				...(action.actions ?? []),
				...(action.intros ?? []),
				action.of,
				action.gated,
				action.cancelOf,
				action.formOf,
			].flatMap((a) => (a ? names(a, seen) : [])),
		].filter(Boolean);
	};
	const matches = entries
		.flatMap(({ nodeId, action }) =>
			names(action).flatMap((name) => {
				const at = message.indexOf(name);
				const next = message.charAt(at + name.length);
				return at < 0 ||
					(/\p{L}|\p{N}/u.test(name.at(-1) ?? "") && /\p{L}|\p{N}/u.test(next))
					? []
					: [{ nodeId, at, length: name.length }];
			}),
		)
		.sort((a, b) => a.at - b.at || b.length - a.length);
	const first = matches[0];
	if (!first) return;
	const nodes = new Set(
		matches
			.filter((m) => m.at === first.at && m.length === first.length)
			.map((m) => m.nodeId),
	);
	return nodes.size === 1 ? first.nodeId : undefined;
}
