import { describe, expect, test } from "bun:test";
import type { Echo } from "@/lib/account";
import type { EchoMark } from "@/lib/echoMark";
import { EMPTY_ECHO_FILTERS, matchesEchoFilters } from "./echoFilters";

const echo: Echo = {
	incrId: 20,
	itemId: 60000015,
	monsterId: 390070051,
	setId: 1,
	level: 0,
	funcValue: 0,
	stackCount: 1,
	mainProps: [],
	subProps: [],
	source: "sniffer",
};

test("echo marks can be filtered individually, combined, and reset", () => {
	const echoes = [0, 1, 2].map((funcValue) => ({ ...echo, funcValue }));
	for (const [marks, expected] of [
		[[], [0, 1, 2]],
		[["none"], [0]],
		[["locked"], [1]],
		[["discarded"], [2]],
		[
			["locked", "discarded"],
			[1, 2],
		],
	] as [EchoMark[], number[]][]) {
		expect(
			echoes
				.filter((entry) =>
					matchesEchoFilters(entry, { ...EMPTY_ECHO_FILTERS, marks }),
				)
				.map((entry) => entry.funcValue),
		).toEqual(expected);
	}
	expect(
		matchesEchoFilters(
			{ ...echo, funcValue: 1, level: 5 },
			{ ...EMPTY_ECHO_FILTERS, marks: ["locked"], minLevel: 10 },
		),
	).toBe(false);
});

describe("echo level range", () => {
	test("includes both bounds and excludes levels outside the range", () => {
		const filters = { ...EMPTY_ECHO_FILTERS, minLevel: 5, maxLevel: 10 };
		expect(
			[0, 4, 5, 7, 10, 11, 25].filter((level) =>
				matchesEchoFilters({ ...echo, level }, filters),
			),
		).toEqual([5, 7, 10]);
	});
	test("allows an exact level, including only unlevelled echoes", () => {
		for (const level of [0, 10, 25]) {
			const filters = {
				...EMPTY_ECHO_FILTERS,
				minLevel: level,
				maxLevel: level,
			};
			expect(
				Array.from({ length: 26 }, (_, level) => level).filter((level) =>
					matchesEchoFilters({ ...echo, level }, filters),
				),
			).toEqual([level]);
		}
	});
	test("reset restores all levels", () => {
		for (let level = 0; level <= 25; level++) {
			expect(matchesEchoFilters({ ...echo, level }, EMPTY_ECHO_FILTERS)).toBe(
				true,
			);
		}
	});
});
