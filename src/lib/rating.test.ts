// Roll value weights presence and roll quality by guide priority, provided
// the primary main stat is suitable for the echo's cost.

import { describe, expect, test } from "bun:test";
import { computeEchoRolls } from "@/components/echo/echoRolls";
import { type Echo, statPropLines } from "@/lib/account";
import { echoesByMonsterId } from "@/lib/catalog";
import { bestPossibleEchoRating } from "@/lib/echoUpgradeBatch";

import {
	type CharacterInfo,
	calculateRating,
	getRelevantCharacters,
	hasWantedMainStat,
	mainStatForEcho,
	maxPossibleRating,
	rollValueForWantedSubstats,
	statsForRole,
} from "@/lib/rating";
import { substatPriorityWeights } from "@/lib/stats";

const critMain = { name: "Crit. DMG", cost: 4 };
const healingMain = { name: "Healing Bonus", cost: 4 };

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

/** Verina's scoring priority: ATK% > ATK, with ER sharing the lowest base tier. */
const verina: CharacterInfo = {
	character_id: 1503,
	character_name: "Verina",
	icon_pile: "",
	stats: {
		"4cost": [["Healing Bonus"]],
		"3cost": [["Energy Regen"]],
		"1cost": [["ATK%"]],
		subs: [["ATK%"], ["ATK", "Energy Regen"]],
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
		expect(calculateRating(fiveWant, subs, critMain)).toBe(100);
	});

	test("roll tiers scale the value", () => {
		// Crit. Rate 6.3% is tier 1; Crit. DMG 15% is tier 3.
		expect(
			calculateRating(fiveWant, ["Crit. Rate 6.3%", "Crit. DMG 15%"], critMain),
		).toBe(28);
		expect(
			calculateRating(
				fiveWant,
				["Crit. Rate 10.5%", "Crit. DMG 15%"],
				critMain,
			),
		).toBe(35);
	});

	test("unwanted substats do not count", () => {
		expect(
			calculateRating(fiveWant, ["HP 580", "DEF 70", "HP% 11.6%"], critMain),
		).toBe(0);
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
		// ATK% ×1.5, ATK ×1, ER ×1, normalized to 100 at max rolls.
		expect(calculateRating(verina, subs, healingMain)).toBe(91);
	});

	test("flat stats earn two points per tier", () => {
		// Flat ATK 40 is tier 2/4: 25.33 presence + 2 x 2 points.
		expect(calculateRating(verina, ["ATK 40"], healingMain)).toBe(25);
	});

	test("explicit wanted lists power the character detail", () => {
		// Two wanted stats: 100/2 - 8 = 42 presence each, +8 max rolls → 100.
		expect(
			rollValueForWantedSubstats(
				[["Crit. Rate", "Crit. DMG"]],
				["Crit. Rate 10.5%", "Crit. DMG 21%"],
			),
		).toBe(100);
		expect(rollValueForWantedSubstats([], ["Crit. Rate 10.5%"])).toBe(0);
	});
});

describe("maxPossibleRating", () => {
	test("honors the smaller number of substat slots on lower-rarity echoes", () => {
		expect(maxPossibleRating(fiveWant, [], critMain, 3)).toBe(60);
		expect(maxPossibleRating(fiveWant, [], critMain, 4)).toBe(80);
	});
	test("unrevealed slots count as maxed wanted stats", () => {
		// Nothing revealed: five slots can host the five wanted stats.
		expect(maxPossibleRating(fiveWant, [], critMain)).toBe(100);

		// A filler already occupies one slot, so only four wanted stats fit.
		expect(
			maxPossibleRating(
				fiveWant,
				["Crit. Rate 10.5%", "Crit. DMG 21%", "HP 580"],
				critMain,
			),
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
		expect(maxPossibleRating(fiveWant, subs, critMain)).toBe(40);
		expect(calculateRating(fiveWant, subs, critMain)).toBe(40);
	});

	test("a piece rolled entirely off the wanted stats cannot recover", () => {
		const subs = [
			"HP 580",
			"DEF 70",
			"HP% 11.6%",
			"Crit. Rate 6.3%",
			"Crit. DMG 12.6%",
		];
		expect(maxPossibleRating(verina, subs, healingMain)).toBe(0);
	});
});

describe("priority weighting and main-stat suitability", () => {
	test("Suisui's 260% ER breakpoint boosts ER rolls and uses the same weights for upgrade potential", () => {
		const suisui = getRelevantCharacters(["Song of Feathered Trace"]).find(
			(character) => character.character_name === "Suisui",
		);
		if (!suisui) throw new Error("Missing Suisui guide");
		expect(suisui.stats.erBreakpoint).toBe(260);
		expect(
			substatPriorityWeights(suisui.stats.subs, suisui.stats.erBreakpoint).get(
				"energy regen",
			),
		).toBe(2.6);
		const erRoll = ["Energy Regen 12.4%"];
		const withTarget = (erBreakpoint: number): CharacterInfo => ({
			...suisui,
			stats: { ...suisui.stats, erBreakpoint },
		});
		const scores = [100, 120, 200, 260].map((target) =>
			calculateRating(withTarget(target), erRoll, critMain),
		);
		for (let i = 1; i < scores.length; i++)
			expect(scores[i]).toBeGreaterThan(scores[i - 1]);
		expect(calculateRating(suisui, erRoll, critMain)).toBe(27);
		const full = [
			"Energy Regen 12.4%",
			"Crit. DMG 21%",
			"Crit. Rate 10.5%",
			"HP% 11.6%",
			"Basic Attack DMG Bonus 11.6%",
		];
		expect(calculateRating(suisui, full, critMain)).toBe(100);
		expect(maxPossibleRating(suisui, [], critMain)).toBe(100);
		const revealed = [
			"Energy Regen 10.8%",
			"Crit. DMG 15%",
			"HP 580",
			"DEF 70",
			"ATK 40",
		];
		expect(maxPossibleRating(suisui, revealed, critMain)).toBe(
			calculateRating(suisui, revealed, critMain),
		);
		expect(maxPossibleRating(suisui, erRoll, critMain, 1)).toBe(
			calculateRating(suisui, erRoll, critMain),
		);
	});

	test("Song of Feathered Trace Havoc pieces never choose Suisui, including in upgrade potential", () => {
		const characters = getRelevantCharacters(["Song of Feathered Trace"]);
		const suisui = characters.find(
			(character) => character.character_name === "Suisui",
		);
		const yangyang = characters.find(
			(character) => character.character_name === "Yangyang: Xuanling",
		);
		if (!suisui || !yangyang)
			throw new Error("Missing Song of Feathered Trace guides");
		const variants = [...echoesByMonsterId.values()].filter(
			(entry) =>
				entry.echo_cost === 3 && entry.echo_sets.some((set) => set.id === 33),
		);
		expect(variants.length).toBeGreaterThan(0);
		for (const variant of variants) {
			if (!variant.monster_id) throw new Error("Missing echo monster ID");
			const echo: Echo = {
				incrId: 1,
				itemId: variant.echo_id,
				monsterId: variant.monster_id,
				setId: 33,
				level: 20,
				funcValue: 0,
				stackCount: 1,
				source: "sniffer",
				mainProps: [{ propId: 1, key: "havoc", raw: 3000, value: 30 }],
				subProps: [
					{ propId: 2, key: "hpPercent", raw: 1160, value: 11.6 },
					{ propId: 3, key: "critDmg", raw: 2100, value: 21 },
					{ propId: 4, key: "energyRegen", raw: 1240, value: 12.4 },
					{ propId: 5, key: "basicAtk", raw: 1160, value: 11.6 },
				],
			};
			const main = mainStatForEcho(echo);
			const subs = statPropLines(echo.subProps);
			expect(hasWantedMainStat(suisui, main)).toBe(false);
			expect(calculateRating(suisui, subs, main)).toBe(0);
			expect(maxPossibleRating(suisui, subs, main)).toBe(0);
			expect(
				computeEchoRolls([echo]).get("incr:1")?.character.character_name,
			).toBe("Yangyang: Xuanling");
			expect(bestPossibleEchoRating(echo)).toBe(
				maxPossibleRating(yangyang, subs, main),
			);
			expect(bestPossibleEchoRating(echo)).toBeLessThan(75);
		}
	});

	test("Jinhsi values damage stats above Energy Regen despite the guide's breakpoint priority", () => {
		const jinhsi = getRelevantCharacters(["Celestial Light"]).find(
			(character) => character.character_name === "Jinhsi",
		);
		if (!jinhsi) throw new Error("Missing Jinhsi guide");
		const weights = substatPriorityWeights(jinhsi.stats.subs);
		expect(weights.get("energy regen")).toBe(1);
		expect(weights.get("crit rate")).toBe(3);
		expect(weights.get("crit dmg")).toBe(3);
		expect(weights.get("atk%")).toBe(2.5);
		expect(weights.get("resonance skill dmg bonus")).toBe(2);
		expect(
			calculateRating(jinhsi, ["Crit. Rate 10.5%"], critMain),
		).toBeGreaterThan(
			calculateRating(jinhsi, ["Energy Regen 12.4%"], critMain),
		);
	});

	test("higher priority stats and their roll improvements contribute more", () => {
		expect(calculateRating(verina, ["Energy Regen 12.4%"], healingMain)).toBe(
			29,
		);
		expect(calculateRating(verina, ["ATK% 11.6%"], healingMain)).toBe(43);
		expect(calculateRating(verina, ["ATK 60"], healingMain)).toBe(29);
		const erGain =
			calculateRating(verina, ["Energy Regen 12.4%"], healingMain) -
			calculateRating(verina, ["Energy Regen 6.8%"], healingMain);
		const atkGain =
			calculateRating(verina, ["ATK% 11.6%"], healingMain) -
			calculateRating(verina, ["ATK% 6.4%"], healingMain);
		expect(atkGain).toBeGreaterThan(erGain);
		expect(
			calculateRating(
				verina,
				["Energy Regen 12.4%", "ATK% 11.6%", "ATK 60"],
				healingMain,
			),
		).toBe(100);
	});

	test("tied priorities use equal weights and duplicates are counted once", () => {
		const tiers = [["Crit. Rate", "Crit. DMG"], ["ATK%"], ["crit rate"]];
		expect([...substatPriorityWeights(tiers).values()]).toEqual([2, 2, 1.5]);
		expect(rollValueForWantedSubstats(tiers, ["Crit. Rate 10.5%"])).toBe(
			rollValueForWantedSubstats(tiers, ["Crit. DMG 21%"]),
		);
		expect(
			rollValueForWantedSubstats(tiers, [
				"Crit. Rate 10.5%",
				"Crit. DMG 21%",
				"ATK% 11.6%",
			]),
		).toBe(100);
	});

	test("potential fills the highest-weight missing stats first", () => {
		expect(maxPossibleRating(verina, [], healingMain, 1)).toBe(43);
		expect(maxPossibleRating(verina, ["ATK 60"], healingMain, 2)).toBe(71);
		expect(
			maxPossibleRating(
				verina,
				["ATK 60", "HP 580", "DEF 70", "HP% 11.6%", "DEF% 14.7%"],
				healingMain,
			),
		).toBe(calculateRating(verina, ["ATK 60"], healingMain));
	});

	test("more than five wanted stats can reach 100 with the best five", () => {
		const character = {
			...fiveWant,
			stats: {
				...fiveWant.stats,
				subs: [
					["Energy Regen"],
					["Crit. Rate", "Crit. DMG"],
					["ATK%"],
					["ATK"],
					["HP%"],
				],
			},
		};
		const subs = [
			"Energy Regen 12.4%",
			"Crit. Rate 10.5%",
			"Crit. DMG 21%",
			"ATK% 11.6%",
			"ATK 60",
		];
		expect(calculateRating(character, subs, critMain)).toBe(100);
		expect(maxPossibleRating(character, [], critMain)).toBe(100);
		expect(
			calculateRating(character, [...subs.slice(0, 4), "HP% 11.6%"], critMain),
		).toBeLessThan(100);
	});

	test("an unwanted main stat zeros current and potential value", () => {
		const subs = ["Energy Regen 12.4%", "ATK% 11.6%", "ATK 60"];
		const main = { name: "DEF%", cost: 4 };
		expect(calculateRating(verina, subs, main)).toBe(0);
		expect(maxPossibleRating(verina, [], main)).toBe(0);
		// ATK% is wanted only on 1-cost echoes by this guide.
		expect(calculateRating(verina, subs, { name: "ATK%", cost: 4 })).toBe(0);
		expect(calculateRating(verina, subs, { name: "ATK%", cost: 1 })).toBe(100);
	});

	test("missing main stats or unknown costs cannot produce a value", () => {
		for (const main of [
			{ name: undefined, cost: 4 },
			{ name: "Healing Bonus", cost: undefined },
		]) {
			expect(calculateRating(verina, ["Energy Regen 12.4%"], main)).toBe(0);
			expect(maxPossibleRating(verina, [], main)).toBe(0);
		}
	});

	test("role guides preserve tiers and fallback priorities", () => {
		const stats = statsForRole(
			{
				substats_priority: null,
				echo_sets: {
					variant: "43311",
					main_stats: ["CR/CD", "ER", "ATK%", "ATK%", "ATK%"],
					sets: [],
				},
			},
			"ER:120%>CR=CD>ATK%",
		);
		expect(stats.subs).toEqual([
			["Crit. Rate", "Crit. DMG"],
			["ATK%", "Energy Regen"],
		]);
		expect(stats.erBreakpoint).toBe(120);
		expect(stats["4cost"]).toEqual([["Crit. Rate", "Crit. DMG"]]);
		const relevant = getRelevantCharacters(["Rejuvenating Glow"]).find(
			(char) => char.character_name === "Verina",
		);
		expect(relevant?.stats.subs).toEqual(verina.stats.subs);
	});

	test("inventory and upgrade ratings reject an unwanted primary despite wanted secondary stats", () => {
		const catalog = [...echoesByMonsterId.values()].find(
			(entry) =>
				entry.echo_cost === 3 &&
				entry.echo_sets.some((set) => set.name === "Rejuvenating Glow"),
		);
		if (!catalog?.monster_id) throw new Error("Missing test catalog echo");
		const set = catalog.echo_sets.find(
			(set) => set.name === "Rejuvenating Glow",
		);
		if (!set) throw new Error("Missing test sonata set");
		const echo: Echo = {
			incrId: 1,
			itemId: 60000015,
			monsterId: catalog.monster_id,
			setId: set.id,
			level: 0,
			funcValue: 0,
			stackCount: 1,
			source: "sniffer",
			mainProps: [
				{ propId: 1, key: "glacio", raw: 3000, value: 30 },
				{ propId: 2, key: "atkFlat", raw: 100, value: 100 },
			],
			subProps: [{ propId: 3, key: "energyRegen", raw: 1240, value: 12.4 }],
		};
		expect(mainStatForEcho(echo)).toEqual({
			name: "Glacio DMG Bonus",
			cost: 3,
		});
		expect(computeEchoRolls([echo]).has("incr:1")).toBe(false);
		expect(bestPossibleEchoRating(echo)).toBe(0);
		const suitable: Echo = {
			...echo,
			mainProps: [
				{ propId: 4, key: "energyRegen", raw: 3200, value: 32 },
				echo.mainProps[1],
			],
		};
		expect(computeEchoRolls([suitable]).get("incr:1")?.rating).toBeGreaterThan(
			0,
		);
		expect(bestPossibleEchoRating(suitable)).toBe(100);

		// A suitable piece with no wanted rolls still has a legitimate 0% RV.
		// Cache entries shared by species/set must not mix up main-stat suitability.
		const noRolls: Echo = {
			...echo,
			incrId: 2,
			mainProps: [{ propId: 5, key: "atkPercent", raw: 3000, value: 30 }],
			subProps: [],
		};
		const rolls = computeEchoRolls([echo, noRolls, { ...suitable, incrId: 3 }]);
		expect(rolls.has("incr:1")).toBe(false);
		const zeroRoll = rolls.get("incr:2");
		if (!zeroRoll) throw new Error("Missing suitable zero-value piece");
		expect(zeroRoll.rating).toBe(0);
		expect(zeroRoll.options).toEqual([]);
		expect(
			hasWantedMainStat(zeroRoll.character, mainStatForEcho(noRolls)),
		).toBe(true);
		expect(rolls.get("incr:3")?.rating).toBeGreaterThan(0);
	});

	test("inventory offers every nonzero Resonator RV in descending order", () => {
		const catalog = [...echoesByMonsterId.values()].find(
			(entry) =>
				entry.echo_cost === 1 &&
				entry.echo_sets.some((set) => set.name === "Rejuvenating Glow"),
		);
		const set = catalog?.echo_sets.find(
			(entry) => entry.name === "Rejuvenating Glow",
		);
		if (!catalog?.monster_id || !set)
			throw new Error("Missing test catalog echo");
		const echo: Echo = {
			incrId: 1,
			itemId: 60000015,
			monsterId: catalog.monster_id,
			setId: set.id,
			level: 25,
			funcValue: 0,
			stackCount: 1,
			source: "sniffer",
			mainProps: [{ propId: 1, key: "atkPercent", raw: 3000, value: 30 }],
			subProps: [{ propId: 2, key: "atkFlat", raw: 40, value: 40 }],
		};
		const roll = computeEchoRolls([echo]).get("incr:1");
		if (!roll) throw new Error("Missing inventory RVs");
		expect(roll.options.length).toBeGreaterThan(1);
		expect(roll.character).toEqual(roll.options[0].character);
		expect(roll.rating).toBe(roll.options[0].rating);
		expect(
			roll.options.map(({ character, rating }) => [
				character.character_name,
				rating,
			]),
		).toContainEqual(["Verina", 20]);
		expect(
			roll.options.some(
				({ character }) => character.character_name === "Baizhi",
			),
		).toBe(false);
		const eligible = getRelevantCharacters([set.name]).filter(
			(character) =>
				calculateRating(
					character,
					statPropLines(echo.subProps),
					mainStatForEcho(echo),
				) > 0,
		);
		expect(
			roll.options.map(({ character }) => character.character_id).sort(),
		).toEqual(eligible.map((character) => character.character_id).sort());
		expect(roll.options.map(({ rating }) => rating)).toEqual(
			roll.options.map(({ rating }) => rating).sort((a, b) => b - a),
		);
		expect(roll.options.every(({ rating }) => rating > 0)).toBe(true);
	});
});
