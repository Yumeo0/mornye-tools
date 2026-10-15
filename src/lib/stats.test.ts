// Substat roll tiers: each roll lands on one of the fixed values from
// stats.json, which the segmented bars render.

import { describe, expect, test } from "bun:test";

import {
	subStatRoll,
	subStatRolls,
	subStatSegmentColor,
	subStatTierColor,
} from "@/lib/stats";

describe("subStatRoll", () => {
	test("maps values to their roll tier", () => {
		expect(subStatRoll("Crit. Rate", 6.3)?.tier).toBe(1);
		expect(subStatRoll("Crit. Rate", 8.7)?.tier).toBe(5);
		expect(subStatRoll("Crit. Rate", 9.3)?.tier).toBe(6);
		expect(subStatRoll("Crit. Rate", 10.5)?.tier).toBe(8);
		expect(subStatRoll("Crit. Rate", 10.5)?.tierCount).toBe(8);
	});

	test("flat ATK and DEF only have four rolls", () => {
		expect(subStatRoll("ATK", 30)?.tierCount).toBe(4);
		expect(subStatRoll("ATK", 60)?.tier).toBe(4);
		expect(subStatRoll("DEF", 50)?.tier).toBe(2);
	});

	test("rounding noise still lands on the nearest tier", () => {
		// Raw packet values are fixed-point; small drift must not fall through.
		expect(subStatRoll("Crit. DMG", 15.0000000001)?.tier).toBe(3);
		expect(subStatRoll("Energy Regen", 7.55)?.tier).toBe(2);
	});

	test("unknown stats have no roll table", () => {
		expect(subStatRolls("Healing Bonus")).toBeNull();
		expect(subStatRoll("Healing Bonus", 10)).toBeNull();
	});
});

describe("subStatSegmentColor", () => {
	test("steps every two segments on 8-roll stats", () => {
		const segments = Array.from({ length: 8 }, (_, index) =>
			subStatSegmentColor(index, 8),
		);
		expect(segments).toEqual([
			"#7bcf7d",
			"#7bcf7d",
			"#5198fe",
			"#5198fe",
			"#c85cff",
			"#c85cff",
			"#f7eba6",
			"#f7eba6",
		]);
	});

	test("steps every segment on 4-roll stats", () => {
		const segments = Array.from({ length: 4 }, (_, index) =>
			subStatSegmentColor(index, 4),
		);
		expect(segments).toEqual(["#7bcf7d", "#5198fe", "#c85cff", "#f7eba6"]);
	});

	test("tier colors match the last filled segment", () => {
		expect(subStatTierColor(1, 8)).toBe("#7bcf7d");
		expect(subStatTierColor(2, 8)).toBe("#7bcf7d");
		expect(subStatTierColor(3, 8)).toBe("#5198fe");
		expect(subStatTierColor(5, 8)).toBe("#c85cff");
		expect(subStatTierColor(8, 8)).toBe("#f7eba6");
		expect(subStatTierColor(2, 4)).toBe("#5198fe");
		expect(subStatTierColor(4, 4)).toBe("#f7eba6");
	});
});
