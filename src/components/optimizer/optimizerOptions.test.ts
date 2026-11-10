import { expect, test } from "bun:test";
import { optimizerFiltersSchema } from "@/lib/filterSchemas";
import {
	EMPTY_OPTIMIZER_FILTERS,
	optimizerPoolFilters,
} from "./optimizerOptions";

test("legacy manual ER is discarded while inventory filters survive", () => {
	const saved = {
		...EMPTY_OPTIMIZER_FILTERS,
		sets: ["4"],
		minEnergyRegen: 999,
	};
	expect(optimizerFiltersSchema.parse(saved)).toEqual({
		...EMPTY_OPTIMIZER_FILTERS,
		sets: ["4"],
	});
});
test("recommended mains always leave ER eligible for rotation feasibility", () => {
	expect(
		optimizerPoolFilters({ ...EMPTY_OPTIMIZER_FILTERS, useRecommended: true }, [
			"aero",
		]).mainStats,
	).toEqual(["aero", "energyRegen"]);
});
