import { describe, expect, test } from "bun:test";
import type { MapReward } from "./types";
import { wutheringMarkId } from "./wuthering";

describe("wuthering.gg mark ids", () => {
	test("the comment id is the sum of the raw marker coordinates", () => {
		// Chest 8:692750121 in Eastern Xuan Peaks: raw Transform (-63081425, -4974249)
		// backs https://api.wuthering.gg/comments/-68055674.
		const chest = { x: -630814.25, y: -49742.49 } as MapReward;
		expect(wutheringMarkId(chest)).toBe(-68055674);
	});
	test("negative and positive halves survive rounding", () => {
		expect(wutheringMarkId({ x: 2776, y: 312605 } as MapReward)).toBe(31538100);
	});
});
