// Translation tests. These cover the parts that do not need initialized core
// game data (aliasing, formatting, catalog-miss errors); the end-to-end
// evaluation fixture lives in the manual acceptance checklist because it needs
// the worker + synced data.

import { describe, expect, test } from "bun:test";

import type { ResRuntime } from "@wuwacalc/core/domain/entities/runtime";

import { type Echo, formatStatValue, type StatKey } from "@/lib/account";
import {
	aliasRoleId,
	applyControlOverrides,
	EMPTY_OPTIMIZER_OVERRIDES,
	hasOptimizerOverrides,
	toEchoInstance,
	toWeaponState,
} from "@/lib/calc/translate";

describe("aliasRoleId", () => {
	test("applies legacy Rover aliases", () => {
		expect(aliasRoleId(9990)).toBe("1501");
		expect(aliasRoleId(9991)).toBe("1502");
	});

	test("passes through current catalog ids", () => {
		expect(aliasRoleId(1503)).toBe("1503");
	});
});

describe("formatStatValue", () => {
	test("formats percent stats with a suffix", () => {
		expect(formatStatValue("critRate", 6.3)).toBe("6.3%");
		expect(formatStatValue("atkPercent", 12)).toBe("12%");
	});

	test("keeps flat stats bare", () => {
		expect(formatStatValue("atkFlat", 150)).toBe("150");
		expect(formatStatValue("hpFlat", 2280)).toBe("2280");
	});
});

function makeEcho(overrides: Partial<Echo> = {}): Echo {
	return {
		incrId: 42,
		itemId: 60000325,
		monsterId: 390080007,
		setId: 2,
		level: 25,
		mainProps: [
			{ propId: 5002, key: "critDmg", raw: 4400, value: 44 },
			{ propId: 50001, key: "atkFlat", raw: 150, value: 150 },
		],
		subProps: [
			{ propId: 11, key: "critRate", raw: 630, value: 6.3 },
			{ propId: 1, key: "hpFlat", raw: 470, value: 470 },
		],
		equippedBy: 1503,
		slot: 0,
		...overrides,
	};
}

describe("toEchoInstance", () => {
	test("reports unknown catalog ids instead of repairing", () => {
		// Without initialized game data the catalog is empty, so every id is
		// unknown - exactly the visible-error path the plan requires.
		const { instance, error } = toEchoInstance(makeEcho());
		expect(instance).toBeNull();
		expect(error?.kind).toBe("echo");
		expect(error?.id).toBe(390080007);
	});
});

describe("toWeaponState", () => {
	test("returns null state with no weapon", () => {
		expect(toWeaponState(undefined)).toEqual({ state: null });
	});

	test("reports unknown weapon ids", () => {
		const { state, error } = toWeaponState({
			incrId: 1,
			itemId: 21010044,
			level: 90,
			breach: 6,
			rank: 1,
			equippedBy: 1503,
		});
		expect(state).toBeNull();
		expect(error?.kind).toBe("weapon");
	});
});

describe("optimizer overrides", () => {
	test("only counts non-empty control edits as overrides", () => {
		expect(hasOptimizerOverrides(EMPTY_OPTIMIZER_OVERRIDES)).toBe(false);
		expect(
			hasOptimizerOverrides({
				...EMPTY_OPTIMIZER_OVERRIDES,
				controls: {},
			}),
		).toBe(false);
		expect(
			hasOptimizerOverrides({
				...EMPTY_OPTIMIZER_OVERRIDES,
				controls: { "resonator:1:mode:value": "b" },
			}),
		).toBe(true);
	});

	test("merges control edits over the built runtime", () => {
		const runtime = {
			state: { controls: { a: true, b: 2 } },
		} as unknown as ResRuntime;
		const next = applyControlOverrides(runtime, { b: 3, c: "on" });
		expect(next.state.controls).toEqual({ a: true, b: 3, c: "on" });
		// The input runtime is not mutated.
		expect(runtime.state.controls).toEqual({ a: true, b: 2 });
		// No controls or no actual change return the same object.
		expect(applyControlOverrides(runtime, null)).toBe(runtime);
		expect(applyControlOverrides(runtime, { a: true })).toBe(runtime);
	});
});

describe("percent stat keys", () => {
	test("every percent key is formatted as a percentage", () => {
		const percentKeys: StatKey[] = [
			"hpPercent",
			"atkPercent",
			"defPercent",
			"critRate",
			"critDmg",
			"energyRegen",
			"basicAtk",
			"heavyAtk",
			"resonanceSkill",
			"resonanceLiberation",
			"healingBonus",
			"aero",
			"glacio",
			"electro",
			"fusion",
			"spectro",
			"havoc",
		];
		for (const key of percentKeys) {
			expect(formatStatValue(key, 10)).toBe("10%");
		}
	});
});
