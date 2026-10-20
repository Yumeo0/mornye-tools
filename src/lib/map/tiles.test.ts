import { describe, expect, test } from "bun:test";
import { tileBounds } from "./tiles";

describe("map tile coordinates", () => {
	test("the transform preserves negative blocks and the flipped Y axis", () => {
		expect(tileBounds(0, 2, 85000)).toEqual({
			left: -85000,
			top: -170000,
			size: 85000,
		});
		expect(tileBounds(-1, -1, 85000)).toEqual({
			left: -170000,
			top: 85000,
			size: 85000,
		});
	});
	test("the captured Jinzhou position falls in the city tile, not its northern neighbour", () => {
		const city = tileBounds(0, -1, 85000);
		const captured = { x: -48725.59, y: 100703.31 };
		expect(captured.x).toBeGreaterThan(city.left);
		expect(captured.x).toBeLessThan(city.left + city.size);
		expect(captured.y).toBeGreaterThan(city.top);
		expect(captured.y).toBeLessThan(city.top + city.size);
	});
});
