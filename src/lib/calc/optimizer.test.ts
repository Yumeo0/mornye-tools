import { expect, test } from "bun:test";
import type {
	EchoInstance,
	ResRuntime,
} from "@wuwacalc/core/domain/entities/runtime";
import {
	encStatCstrs,
	encTgtStatCstrs,
	psssCstrs,
} from "@wuwacalc/core/engine/search/score/statConstraints";
import { makeOptimizerSettings, selectOptimizerCandidates } from "./optimizer";

test("minimum ER encodes as total display percent for rotation and skill searches", () => {
	for (const rotationAvailable of [false, true]) {
		const settings = makeOptimizerSettings({
			rotationAvailable,
			minEnergyRegen: 140,
			resultsLimit: 8,
			enableGpu: false,
		});
		for (const encode of [encStatCstrs, encTgtStatCstrs]) {
			const constraints = encode(settings);
			expect(psssCstrs(constraints, 0, 0, 0, 0, 0, 139.9, 0, 0)).toBe(false);
			expect(psssCstrs(constraints, 0, 0, 0, 0, 0, 140, 0, 0)).toBe(true);
			expect(psssCstrs(constraints, 0, 0, 0, 0, 0, 180, 0, 0)).toBe(true);
		}
		const disabled = makeOptimizerSettings({
			rotationAvailable,
			minEnergyRegen: 0,
			resultsLimit: 8,
			enableGpu: true,
		});
		expect(disabled.statConstraints.er).toBeUndefined();
	}
});

test("candidate pruning retains ER options even when damage ranking would omit them", () => {
	const inventory = Array.from(
		{ length: 180 },
		(_, index): EchoInstance => ({
			uid: String(index),
			id: "unknown",
			set: 1,
			mainEcho: false,
			mainStats: {
				primary: { key: "atkPercent", value: 33 },
				secondary: { key: "atkFlat", value: 150 },
			},
			substats: index >= 170 ? { energyRegen: 10 } : { critRate: 10 },
		}),
	);
	const settings = makeOptimizerSettings({
		rotationAvailable: false,
		minEnergyRegen: 140,
		resultsLimit: 8,
		enableGpu: false,
	});
	const result = selectOptimizerCandidates({
		inventory,
		settings,
		targetRuntime: { id: "unknown" } as ResRuntime,
	});
	expect(result.echoes.length).toBeLessThanOrEqual(160);
	expect(
		result.echoes.filter((echo) => echo.substats.energyRegen).length,
	).toBeGreaterThan(0);
});
