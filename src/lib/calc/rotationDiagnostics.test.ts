import { expect, test } from "bun:test";
import {
	castConcerto,
	conditionProblems,
	type DiagnosticAction,
	exceptionNode,
} from "../../../calculator/rotationDiagnostics";

const action = (name: string): DiagnosticAction => ({
	name,
	cancelOf: null,
	formOf: null,
});

test("condition diagnostics distinguish required gauges, missing buffs and forbidden buffs", () => {
	expect(
		conditionProblems({
			action: {
				castMin: [-Infinity, 10000, 2500, -Infinity],
				castMax: [Infinity, Infinity, Infinity, 4],
			},
			castUnmet: [false, true, true, true],
			forteScale: [0.01, 1],
			buffUnmet: [{ name: "Camellya: Blossom Mode" }],
			buffForbidden: [{ name: "Camellya: Budding Mode" }],
			// Settled display gauges can already include hits that had not landed at cast.
			shownAfter: [0, 10000, 0, 10000, 6],
		}),
	).toEqual([
		"Requires: Concerto >= 100",
		"Requires: Forte 1 >= 25",
		"Requires: Forte 2 <= 4",
		"missing buff: Camellya: Blossom Mode",
		"blocked by buff: Camellya: Budding Mode",
	]);
	expect(
		conditionProblems({
			action: { castMin: [0], castMax: [0] },
			castUnmet: [true],
		}),
	).toEqual(["Requires: Energy = 0"]);
	expect(
		conditionProblems({
			action: { castMin: [100], castMax: [500] },
			castUnmet: [true],
		}),
	).toEqual(["Requires: Energy 1–5"]);
});

test("Concerto requirements show the cast balance including background gains, excluding current-action gains", () => {
	const snapshot = {
		action: { castMin: [-Infinity, 10000] },
		castUnmet: [false, true],
		concertoBefore: 2500,
		adds: [
			{ background: true, gains: [0, 500] },
			{ background: true, gains: [0, 25] },
			{ gains: [0, 7000] },
		],
		// Settled gauges include future hits; neither is the cast's balance.
		shownBefore: [0, 10000],
		shownAfter: [0, 10000],
	};
	expect(castConcerto(snapshot)).toBe(3025);
	expect(conditionProblems(snapshot, castConcerto(snapshot))).toEqual([
		"Requires: Concerto >= 100 (current: 30.25)",
	]);
	expect(conditionProblems(snapshot, 0)).toEqual([
		"Requires: Concerto >= 100 (current: 0)",
	]);
	expect(conditionProblems(snapshot, -4000)).toEqual([
		"Requires: Concerto >= 100 (current: -40)",
	]);
	expect(castConcerto({})).toBeUndefined();
	expect(conditionProblems(snapshot, Number.NaN)).toEqual([
		"Requires: Concerto >= 100",
	]);
});

test("resource deficits use game units, skip off-tune, and retain transient shortages", () => {
	expect(
		conditionProblems({
			action: {},
			forteScale: [0.01],
			shownShort: [true, true, true, true],
			shownAfter: [-1250, 50, -20000, -1234],
		}),
	).toEqual(["Energy: short by 12.5", "Concerto: depleted during action"]);
	expect(conditionProblems({ action: {} })).toEqual([]);
});

test("Forte report counters can drain past empty without hiding actual cast or buff requirements", () => {
	const snapshot = {
		action: {},
		forteScale: [1, 0.01],
		shownAfter: [0, 0, 0, 0, -422],
		shownShort: [false, false, false, false, true],
	};
	expect(conditionProblems(snapshot)).toEqual([]);
	expect(
		conditionProblems({
			...snapshot,
			action: { castMin: [-Infinity, -Infinity, -Infinity, 10000] },
			castUnmet: [false, false, false, true],
			buffUnmet: [{ name: "Mechanism Dominion" }],
		}),
	).toEqual(["Requires: Forte 2 >= 100", "missing buff: Mechanism Dominion"]);
});

test("engine exceptions select the failing press, not the expected next press or an ambiguous duplicate", () => {
	const first = action("Basic 1"),
		next = action("Basic 2");
	const entries = [
		{ nodeId: "wrong", action: first },
		{ nodeId: "next", action: next },
	];
	expect(
		exceptionNode(
			"Phrolova: swaps in GROUNDED on Basic 1 — a swap-in opens on Basic 2",
			entries,
		),
	).toBe("wrong");
	expect(
		exceptionNode(
			"Basic 1: cancel into Basic 2 at frame 12 — its cast priority doesn't beat 9 there",
			entries,
		),
	).toBe("wrong");
	expect(
		exceptionNode("Basic 1: invalid cut", [
			...entries,
			{ nodeId: "duplicate", action: first },
		]),
	).toBeUndefined();
	expect(exceptionNode("Basic 123: invalid cut", entries)).toBeUndefined();
	expect(exceptionNode("action queue did not drain", entries)).toBeUndefined();
	const group: DiagnosticAction = {
		...action("Basic 12"),
		actions: [first, next],
	};
	expect(
		exceptionNode("Basic 2: invalid cut", [{ nodeId: "combo", action: group }]),
	).toBe("combo");
});

test("a swap-in failure links the opening block even when the action repeats later in the turn", () => {
	const opening = action("Basic - Illumining Form: Pillars Aligned 1");
	const entries = [
		{ nodeId: "opening", action: opening },
		{ nodeId: "later", action: opening },
	];
	expect(
		exceptionNode(
			"Hsin: swaps in GROUNDED on Basic - Illumining Form: Pillars Aligned 1 — a swap-in opens on Basic - Answering Form 1",
			entries,
		),
	).toBe("opening");
	// A nested press belongs to its authored combo, including when repeated.
	expect(
		exceptionNode(
			"Hsin: swaps in MIDAIR on Basic - Illumining Form: Pillars Aligned 1 — a swap-in opens on Plunge",
			[
				{ nodeId: "combo", action: { name: "Combo", actions: [opening] } },
				...entries,
			],
		),
	).toBe("combo");
	expect(
		exceptionNode(`${opening.name}: invalid cut`, entries),
	).toBeUndefined();
});
