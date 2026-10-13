// Roll value metric: each wanted substat is worth an even share of 100
// (presence on the piece + one point per roll tier; two per tier for flat
// stats). A five-stat character therefore reads 12% presence + up to 8% rolls
// per stat, and a piece only reaches 100 when every wanted stat is maxed.

import { describe, expect, test } from "bun:test";

import {
	type CharacterInfo,
	calculateRating,
	maxPossibleRating,
	rollValueForWantedSubstats,
} from "@/lib/rating";

/** Five wanted stats: 12% presence each, up to 8 roll points each. */
const fiveWant: CharacterInfo = {
	character_id: 1,
	character_name: "Five",
	icon_pile: "",
	stats: {
		"4cost": [["Crit. DMG"]],
		"3cost": [["Spectro DMG"]],
		"1cost": [["ATK%"]],
		subs: [
			[
				"Energy Regen",
				"Crit. Rate",
				"Crit. DMG",
				"ATK%",
				"Resonance Skill DMG Bonus",
			],
		],
	},
};

/** Verina's priority: ER > ATK% > ATK (three wanted stats). */
const verina: CharacterInfo = {
	character_id: 1503,
	character_name: "Verina",
	icon_pile: "",
	stats: {
		"4cost": [["Healing Bonus"]],
		"3cost": [["Energy Regen"]],
		"1cost": [["ATK%"]],
		subs: [["Energy Regen", "ATK%", "ATK"]],
	},
};

describe("calculateRating", () => {
	test("every wanted stat at max rolls is 100", () => {
		const subs = [
			"Energy Regen 12.4%",
			"Crit. Rate 10.5%",
			"Crit. DMG 21%",
			"ATK% 11.6%",
			"Resonance Skill DMG Bonus 11.6%",
		];
		expect(calculateRating(fiveWant, subs)).toBe(100);
	});

	test("roll tiers scale the value", () => {
		// Crit. Rate 6.3% is tier 1; Crit. DMG 15% is tier 3.
		expect(
			calculateRating(fiveWant, ["Crit. Rate 6.3%", "Crit. DMG 15%"]),
		).toBe(28);
		expect(
			calculateRating(fiveWant, ["Crit. Rate 10.5%", "Crit. DMG 15%"]),
		).toBe(35);
	});

	test("unwanted substats do not count", () => {
		expect(calculateRating(fiveWant, ["HP 580", "DEF 70", "HP% 11.6%"])).toBe(
			0,
		);
	});

	test("a three-stat character is not 100 with seven missing rolls", () => {
		// The reported case: ATK tier 2/4, ER tier 6/8, ATK% tier 5/8.
		const subs = [
			"ATK 40",
			"Energy Regen 10.8%",
			"Resonance Liberation DMG Bonus 7.9%",
			"ATK% 9.4%",
			"Resonance Skill DMG Bonus 10.1%",
		];
		// Presence 100/3 - 8 = 25.33 each; roll points 4 + 6 + 5.
		expect(calculateRating(verina, subs)).toBe(91);
	});

	test("flat stats earn two points per tier", () => {
		// Flat ATK 40 is tier 2/4: 25.33 presence + 2 x 2 points.
		expect(calculateRating(verina, ["ATK 40"])).toBe(29);
	});

	test("explicit wanted lists power the character detail", () => {
		// Two wanted stats: 100/2 - 8 = 42 presence each, +8 max rolls → 100.
		expect(
			rollValueForWantedSubstats(
				["Crit. Rate", "Crit. DMG"],
				["Crit. Rate 10.5%", "Crit. DMG 21%"],
			),
		).toBe(100);
		expect(rollValueForWantedSubstats([], ["Crit. Rate 10.5%"])).toBe(0);
	});
});

describe("maxPossibleRating", () => {
	test("unrevealed slots count as maxed wanted stats", () => {
		// Nothing revealed: five slots can host the five wanted stats.
		expect(maxPossibleRating(fiveWant, [])).toBe(100);

		// A filler already occupies one slot, so only four wanted stats fit.
		expect(
			maxPossibleRating(fiveWant, [
				"Crit. Rate 10.5%",
				"Crit. DMG 21%",
				"HP 580",
			]),
		).toBe(80);
	});

	test("equals calculateRating once five substats are revealed", () => {
		const subs = [
			"Crit. Rate 10.5%",
			"Crit. DMG 21%",
			"HP 580",
			"DEF 70",
			"HP% 11.6%",
		];
		expect(maxPossibleRating(fiveWant, subs)).toBe(40);
		expect(calculateRating(fiveWant, subs)).toBe(40);
	});

	test("a piece rolled entirely off the wanted stats cannot recover", () => {
		const subs = [
			"HP 580",
			"DEF 70",
			"HP% 11.6%",
			"Crit. Rate 6.3%",
			"Crit. DMG 12.6%",
		];
		expect(maxPossibleRating(verina, subs)).toBe(0);
	});
});
