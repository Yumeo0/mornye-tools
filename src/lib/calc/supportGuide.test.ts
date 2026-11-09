import { expect, test } from "bun:test";
import { guideEnergyRegenRequirement } from "./supportGuide";

test("ER defaults read exact and approximate character requirements", () => {
	expect(guideEnergyRegenRequirement(1210)).toBe(122);
	expect(guideEnergyRegenRequirement(1209)).toBe(260);
	expect(guideEnergyRegenRequirement(1205)).toBe(125);
});

test("minimum ER uses the lower bound of guide ranges", () => {
	expect(guideEnergyRegenRequirement(1304)).toBe(110);
	expect(guideEnergyRegenRequirement(1107)).toBe(110);
	expect(guideEnergyRegenRequirement(1206)).toBe(200);
	expect(guideEnergyRegenRequirement(1503)).toBe(200);
});

test("no selection, missing guides and unquantified ER priorities clear the requirement", () => {
	expect(guideEnergyRegenRequirement(0)).toBe(0);
	expect(guideEnergyRegenRequirement(-1)).toBe(0);
	expect(guideEnergyRegenRequirement(1608)).toBe(0);
	expect(guideEnergyRegenRequirement(1307)).toBe(0);
});
