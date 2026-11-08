import { describe, expect, test } from "bun:test";
import { DEFAULT_UPGRADE_OPTIONS } from "./echoUpgrade";
import { parseEchoUpgradeRules } from "./echoUpgradeRules";

describe("saved echo batch rules", () => {
	test("restores the full rule set, including intentionally empty material choices", () => {
		const rules = {
			threshold: 82,
			options: {
				autoDiscard: true,
				materials: { discard_echoes: false, exp_material_ids: [] },
			},
		};
		expect(parseEchoUpgradeRules(JSON.parse(JSON.stringify(rules)))).toEqual(
			rules,
		);
	});
	test("migrates the previous threshold without changing default material choices", () => {
		expect(parseEchoUpgradeRules(undefined, 67)).toEqual({
			threshold: 67,
			options: DEFAULT_UPGRADE_OPTIONS,
		});
	});
	test("ignores malformed settings and unknown material IDs", () => {
		expect(
			parseEchoUpgradeRules({
				threshold: NaN,
				options: {
					autoDiscard: "false",
					materials: {
						discard_echoes: 1,
						exp_material_ids: [36000004, 123, 36000004],
					},
				},
			}),
		).toEqual({
			threshold: 75,
			options: {
				autoDiscard: false,
				materials: { discard_echoes: true, exp_material_ids: [36000004] },
			},
		});
		expect(parseEchoUpgradeRules({ threshold: -10 }).threshold).toBe(0);
		expect(parseEchoUpgradeRules({ threshold: 200 }).threshold).toBe(100);
	});
});
