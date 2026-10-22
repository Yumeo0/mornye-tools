import { expect, test } from "bun:test";
import { normalizeOptimizerPreferences } from "./optimizerPreferences";

test("optimizer preferences clamp saved limits and recover invalid values", () => {
	expect(
		normalizeOptimizerPreferences({ engine: "cpu", resultsLimit: 999999 }),
	).toEqual({ engine: "cpu", resultsLimit: 65536 });
	expect(
		normalizeOptimizerPreferences({ engine: "gpu", resultsLimit: -2 }),
	).toEqual({ engine: "gpu", resultsLimit: 8 });
	expect(
		normalizeOptimizerPreferences({ engine: "cpu", resultsLimit: 32.8 })
			.resultsLimit,
	).toBe(32);
	expect(
		normalizeOptimizerPreferences({ resultsLimit: Number.NaN }).resultsLimit,
	).toBe(128);
	expect(normalizeOptimizerPreferences(null).resultsLimit).toBe(128);
});
