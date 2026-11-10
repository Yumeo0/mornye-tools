// Substat roll tiers: each roll lands on one of the fixed values from
// stats.json, which the segmented bars render.

import { describe, expect, test } from "bun:test";

import {
	energyRegenBreakpoint,
	rollValueSubstatTiers,
	subStatRoll,
	subStatRolls,
	subStatSegmentColor,
	subStatTierColor,
	substatPriorityWeights,
} from "@/lib/stats";

describe("roll value substat priorities", () => {
	test("ER weight grows with the guide target without changing other weights", () => {
		const tiers = [["Crit. DMG"], ["HP%"], ["Energy Regen"]];
		for (const [target, weight] of [
			[100, 1],
			[120, 1.2],
			[200, 2],
			[260, 2.6],
		]) {
			const weights = substatPriorityWeights(tiers, target);
			expect(weights.get("energy regen")).toBe(weight);
			expect(weights.get("crit dmg")).toBe(2);
			expect(weights.get("hp%")).toBe(1.5);
		}
		expect(substatPriorityWeights(tiers, 90).get("energy regen")).toBe(1);
		expect(substatPriorityWeights(tiers, Number.NaN).get("energy regen")).toBe(
			1,
		);
	});

	test("ER targets support exact, approximate and ranged guide breakpoints", () => {
		expect(energyRegenBreakpoint("ER:260%>CD>HP%")).toBe(260);
		expect(energyRegenBreakpoint("CR:70%>ER:~110-130%+")).toBe(110);
		expect(energyRegenBreakpoint("ER:200-250%+>HP%")).toBe(200);
		expect(energyRegenBreakpoint("ER:120.5%>CD")).toBe(120.5);
		expect(energyRegenBreakpoint("ER>CD")).toBeUndefined();
		expect(energyRegenBreakpoint("CR:70%>HP%")).toBeUndefined();
		expect(energyRegenBreakpoint(null)).toBeUndefined();
	});

	test("breakpoint stats move below uncapped stats and use a shared utility weight", () => {
		const tiers = rollValueSubstatTiers("ER:~110-130%+>CR:70%=CD>ATK%>HA%=ATK");
		expect(tiers.map((tier) => tier.map((stat) => stat.code))).toEqual([
			["CD"],
			["ATK%"],
			["HA%", "ATK"],
			["ER", "CR"],
		]);
		expect(tiers.at(-1)?.map((stat) => stat.breakpoint)).toEqual([
			"~110-130%+",
			"70%",
		]);
		const weights = substatPriorityWeights(
			tiers.map((tier) => tier.map((stat) => stat.name)),
		);
		expect([...weights.values()]).toEqual([2.5, 2, 1.5, 1.5, 1, 1]);
	});

	test("Energy Regen is utility even without an explicit breakpoint", () => {
		const tiers = rollValueSubstatTiers("ER=CR>CD");
		expect(tiers.map((tier) => tier.map((stat) => stat.code))).toEqual([
			["CR"],
			["CD"],
			["ER"],
		]);
	});

	test("all-utility and missing guides retain sensible tiers", () => {
		expect(rollValueSubstatTiers(null)).toEqual([]);
		const tiers = rollValueSubstatTiers("ER:120%>CR:70%");
		expect([
			...substatPriorityWeights(
				tiers.map((tier) => tier.map((stat) => stat.name)),
			).values(),
		]).toEqual([1, 1]);
	});
});

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
