import { expect, test } from "bun:test";
import type { OptResultEntry } from "@/lib/calc/types";
import {
	optimizerEchoDifference,
	optimizerResultRows,
} from "./optimizerResults";

const result = (uids: string[], damage: number): OptResultEntry => ({
	uids,
	damage,
	stats: null,
});
const current = ["a", "b", "c", "d", "e"];
const equipped = { uids: current, mainUid: "a" };

test("echo differences ignore passive order but identify new owned instances", () => {
	expect(optimizerEchoDifference(["a", "e", "d", "c", "b"], equipped)).toEqual({
		added: [],
		removed: [],
		mainChanged: false,
		changes: ["kept", "kept", "kept", "kept", "kept"],
	});
	expect(optimizerEchoDifference(["a", "f", "e", "c", "g"], equipped)).toEqual({
		added: ["f", "g"],
		removed: ["b", "d"],
		mainChanged: false,
		changes: ["kept", "new", "kept", "kept", "new"],
	});
});

test("main echo changes are distinct from replacing owned echoes", () => {
	expect(optimizerEchoDifference(["b", "e", "a", "d", "c"], equipped)).toEqual({
		added: [],
		removed: [],
		mainChanged: true,
		changes: ["main", "kept", "passive", "kept", "kept"],
	});
	expect(optimizerEchoDifference(["f", "e", "a", "d", "c"], equipped)).toEqual({
		added: ["f"],
		removed: ["b"],
		mainChanged: true,
		changes: ["new", "kept", "passive", "kept", "kept"],
	});
});

test("compares incomplete equipment and handles absent account context", () => {
	expect(
		optimizerEchoDifference(current, { uids: ["c", "b"], mainUid: null }),
	).toEqual({
		added: ["a", "d", "e"],
		removed: [],
		mainChanged: true,
		changes: ["new", "kept", "kept", "new", "new"],
	});
	expect(
		optimizerEchoDifference(current, { uids: [], mainUid: null })?.added,
	).toEqual(current);
	expect(optimizerEchoDifference(current, null)).toBeNull();
});

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
