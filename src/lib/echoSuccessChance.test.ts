import { describe, expect, test } from "bun:test";
import { echoRollProbabilities } from "./echoRollProbabilities";
import {
	type CharacterInfo,
	calculateRating,
	ratingSuccessChance,
} from "./rating";
import { subStatRolls } from "./stats";

const main = { name: "Crit. DMG", cost: 4 };
function character(subs: string[][], erBreakpoint?: number): CharacterInfo {
	return {
		character_id: 1,
		character_name: "Test",
		icon_pile: "",
		stats: {
			"4cost": [["Crit. DMG"]],
			"3cost": [],
			"1cost": [],
			subs,
			erBreakpoint,
		},
	};
}
const crit = character([["Crit. Rate"]]);
const damage = character([["Crit. DMG"]]);
const unwanted = ["HP 320", "HP% 6.4%", "DEF 40", "DEF% 8.1%"];

describe("echo success probabilities", () => {
	test("fresh echoes draw five distinct types with the published value odds", () => {
		const maxCrit = 3 / (23.3333 * 3 + 8 * 3 + 3 * 2);
		expect(ratingSuccessChance([crit], [], main, 1)).toBeCloseTo(
			(5 / 13) * 100,
			10,
		);
		expect(ratingSuccessChance([crit], [], main, 100)).toBeCloseTo(
			(5 / 13) * maxCrit * 100,
			10,
		);
	});

	test("flat ATK and DEF have different distributions and four roll tiers", () => {
		const known = ["HP 320", "HP% 6.4%", "ATK% 6.4%", "Energy Regen 6.8%"];
		const atk = character([["ATK"]]);
		const def = character([["DEF"]]);
		const atkMax = 2.9126 / (6.7961 + 52.4272 + 37.8641 + 2.9126);
		const defMax = 8.7379 / (14.5631 + 44.6602 + 32.0388 + 8.7379);
		expect(ratingSuccessChance([atk], known, main, 100)).toBeCloseTo(
			(atkMax / 9) * 100,
			10,
		);
		expect(ratingSuccessChance([def], known, main, 100)).toBeCloseTo(
			(defMax / 9) * 100,
			10,
		);
	});

	test("uses Kuro's weighted values and excludes all revealed stat types", () => {
		const distribution = echoRollProbabilities.find(
			(stat) => stat.name === "crit rate",
		);
		if (!distribution) throw new Error("Missing crit probabilities");
		const maxCrit = 3 / (23.3333 * 3 + 8 * 3 + 3 * 2);
		expect(ratingSuccessChance([crit], unwanted, main, 100)).toBeCloseTo(
			(maxCrit / 9) * 100,
			10,
		);
		expect(ratingSuccessChance([crit], unwanted, main, 1)).toBeCloseTo(
			100 / 9,
			10,
		);
		expect(
			distribution.probabilities.reduce((sum, value) => sum + value, 0),
		).toBeCloseTo(1, 12);
	});

	test("unions guides without counting overlaps or duplicate guides twice", () => {
		const known = unwanted.slice(0, 3);
		const expected = (1 - (8 * 7) / (10 * 9)) * 100;
		expect(ratingSuccessChance([crit, damage], known, main, 1)).toBeCloseTo(
			expected,
			10,
		);
		expect(
			ratingSuccessChance([crit, damage, crit], known, main, 1),
		).toBeCloseTo(expected, 10);
	});

	test("matches exhaustive weighted outcomes and rounded RV with fractional ER weights", () => {
		const guides = [
			character([["Crit. Rate", "Crit. DMG"], ["ATK%"], ["Energy Regen"]], 260),
			character([["ATK%", "Energy Regen"], ["HP%"]], 120),
		];
		const known = ["Crit. Rate 7.5%", "DEF 40", "HP 320"];
		const pool = echoRollProbabilities.filter(
			(stat) => !["crit rate", "def", "hp"].includes(stat.name),
		);
		for (const target of [42, 59.3, 75, 95]) {
			let expected = 0;
			for (let a = 0; a < pool.length; a++) {
				for (let b = a + 1; b < pool.length; b++) {
					const first = pool[a];
					const second = pool[b];
					for (const [i, x] of (subStatRolls(first.name) ?? []).entries()) {
						for (const [j, y] of (subStatRolls(second.name) ?? []).entries()) {
							const stats = [
								...known,
								`${first.name} ${x}`,
								`${second.name} ${y}`,
							];
							if (
								guides.some(
									(guide) => calculateRating(guide, stats, main) >= target,
								)
							)
								expected += first.probabilities[i] * second.probabilities[j];
						}
					}
				}
			}
			expected *= 100 / ((pool.length * (pool.length - 1)) / 2);
			expect(ratingSuccessChance(guides, known, main, target)).toBeCloseTo(
				expected,
				8,
			);
		}
	});

	test("respects lower-rarity slot caps, completed echoes, and main-stat requirements", () => {
		expect(
			ratingSuccessChance([crit], unwanted.slice(0, 2), main, 1, 3),
		).toBeCloseTo(100 / 11, 10);
		expect(ratingSuccessChance([crit], unwanted.slice(0, 3), main, 1, 3)).toBe(
			0,
		);
		expect(
			ratingSuccessChance([crit], [...unwanted, "Crit. Rate 10.5%"], main, 100),
		).toBe(100);
		expect(
			ratingSuccessChance([crit], unwanted, { name: "HP%", cost: 4 }, 1),
		).toBe(0);
		expect(ratingSuccessChance([crit], [], main, 0)).toBe(100);
	});

	test("never rerolls known stats and rejects malformed or duplicate captured stats", () => {
		expect(ratingSuccessChance([crit], ["Crit. Rate 6.3%"], main, 100)).toBe(0);
		expect(
			ratingSuccessChance(
				[crit],
				["Crit. Rate 6.3%", "Crit. Rate 7.5%"],
				main,
				100,
			),
		).toBeNull();
		expect(ratingSuccessChance([crit], ["invalid"], main, 100)).toBeNull();
		expect(ratingSuccessChance([crit], ["Unknown 1"], main, 100)).toBeNull();
		expect(() => ratingSuccessChance([crit], [], main, NaN)).toThrow();
	});
});
