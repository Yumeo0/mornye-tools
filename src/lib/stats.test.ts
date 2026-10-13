// Substat roll tiers: each roll lands on one of the fixed values from
// stats.json, which the segmented bars render.

import { describe, expect, test } from "bun:test";

import { subStatRoll, subStatRolls } from "@/lib/stats";

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
