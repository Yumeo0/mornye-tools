import { describe, expect, test } from "bun:test";
import { compileTeamGuides } from "../../../scripts/lib/teamGuides";
import {
	recommendedTeamPresets,
	savedTeamPresets,
	teammatesForPreset,
} from "./teamPresets";

describe("team presets", () => {
	test("keeps a support as target and preserves teammate order", () => {
		expect(teammatesForPreset("1505", ["1404", "1204", "1505"])).toEqual([
			"1404",
			"1204",
		]);
		expect(teammatesForPreset("1505", ["1505"])).toEqual(["", ""]);
		expect(teammatesForPreset("1505", ["1404", "1204"])).toBeNull();
		expect(teammatesForPreset("1505", ["1505", "1404", "1404"])).toBeNull();
	});
	test("offers only captured formations containing the target, resolving legacy Rover ids", () => {
		expect(
			savedTeamPresets("1501", [
				{
					id: 1,
					name: "Exploration",
					roleIds: [1404, 9990, 0],
					isCurrent: true,
				},
				{ id: 2, name: "Other", roleIds: [1404, 1204], isCurrent: false },
			]),
		).toEqual([
			{
				id: "saved:1",
				name: "Exploration · Current",
				roleIds: ["1404", "1501"],
				notes: [],
			},
		]);
	});
	test("compiles slot alternatives and annotations without duplicate characters or invented ids", () => {
		const teams = compileTeamGuides(
			[
				{
					name: "Support",
					guides: [
						{
							role: "Healer",
							teamCompositions: [
								{
									variant: "Hypercarry",
									compositions: [
										["DPS", "Unknown"],
										["Sub\nMoonlit Clouds", "Support"],
										["Support"],
									],
								},
							],
						},
					],
				},
			],
			{ DPS: 1, Sub: 2, Support: 3 },
		);
		expect(teams["3"]).toEqual([
			{
				name: "Hypercarry",
				role: "Healer",
				roleIds: ["1", "2", "3"],
				notes: ["Sub: Moonlit Clouds"],
			},
		]);
	});
	test("bundled recommendations include the guide's target and three distinct characters", () => {
		const teams = recommendedTeamPresets("1404");
		expect(teams.length).toBeGreaterThan(0);
		for (const team of teams) {
			expect(team.roleIds).toContain("1404");
			expect(new Set(team.roleIds).size).toBe(3);
			expect(team.url).toStartWith("https://tethys.gg/resonators/1404?");
		}
	});
});
