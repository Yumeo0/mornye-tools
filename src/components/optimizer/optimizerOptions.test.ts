import { expect, test } from "bun:test";
import { optimizerFiltersSchema } from "@/lib/filterSchemas";
import {
	EMPTY_OPTIMIZER_FILTERS,
	optimizerPoolFilters,
} from "./optimizerOptions";

test("recommended mode follows the character without applying or overwriting hidden manual filters", () => {
	const manual = {
		...EMPTY_OPTIMIZER_FILTERS,
		sets: ["1"],
		mainStats: ["hpPercent"],
		substats: ["critDmg"],
	};
	const recommended = { ...manual, useRecommended: true };
	expect(optimizerPoolFilters(recommended, ["atkPercent"])).toEqual({
		sets: [],
		mainStats: ["atkPercent"],
		substats: [],
	});
	expect(optimizerPoolFilters(recommended, ["defPercent"])).toEqual({
		sets: [],
		mainStats: ["defPercent"],
		substats: [],
	});
	expect(
		optimizerPoolFilters({ ...recommended, useRecommended: false }, [
			"defPercent",
		]),
	).toEqual(manual);
	expect(manual.mainStats).toEqual(["hpPercent"]);
	expect(
		optimizerPoolFilters({ ...recommended, minEnergyRegen: 140 }, [
			"atkPercent",
		]).mainStats,
	).toEqual(["atkPercent", "energyRegen"]);
	expect(
		optimizerPoolFilters({ ...recommended, minEnergyRegen: 140 }, []).mainStats,
	).toEqual([]);
});

test("saved optimizer filters migrate without losing previous manual selections", () => {
	const legacy = {
		equipped: "exclude-others" as const,
		minLevel: 25,
		sets: ["1"],
		mainStats: ["atkPercent"],
		substats: [],
	};
	expect(optimizerFiltersSchema.parse(legacy)).toEqual({
		...legacy,
		useRecommended: false,
		minEnergyRegen: 0,
	});
	const chosen = { ...legacy, useRecommended: true, minEnergyRegen: 140.5 };
	expect(
		optimizerFiltersSchema.parse(JSON.parse(JSON.stringify(chosen))),
	).toEqual(chosen);
	expect(
		optimizerFiltersSchema.safeParse({ ...chosen, minEnergyRegen: -1 }).success,
	).toBe(false);
});
