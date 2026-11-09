import { expect, test } from "bun:test";
import type { OptResultEntry } from "@wuwacalc/core/engine/optimizer/types";
import { optimizerResultRows } from "./optimizerResults";

const result = (uids: string[], damage: number): OptResultEntry => ({
	uids,
	damage,
	stats: null,
});
const current = ["a", "b", "c", "d", "e"];

test("current build appears once, including passive slot permutations", () => {
	const best = result(["f", "b", "c", "d", "e"], 120);
	const worse = result(["g", "b", "c", "d", "e"], 80);
	expect(
		optimizerResultRows(
			[
				best,
				result(current, 100),
				result(["a", "e", "d", "c", "b"], 100),
				worse,
			],
			{ uids: current, damage: 100 },
		),
	).toEqual([
		{ kind: "result", result: best, index: 0, rank: 0 },
		{ kind: "baseline", rank: 1 },
		{ kind: "result", result: worse, index: 3, rank: 2 },
	]);
});

test("equal damage and a different main echo remain distinct results", () => {
	const differentMain = result(["b", "a", "c", "d", "e"], 100);
	const differentPiece = result(["a", "b", "c", "d", "f"], 100);
	expect(
		optimizerResultRows([differentMain, differentPiece], {
			uids: current,
			damage: 100,
		}),
	).toHaveLength(3);
	expect(optimizerResultRows([], { uids: current, damage: 100 })).toEqual([
		{ kind: "baseline", rank: 0 },
	]);
	expect(optimizerResultRows([differentMain], null)).toEqual([
		{ kind: "result", result: differentMain, index: 0, rank: 0 },
	]);
});
