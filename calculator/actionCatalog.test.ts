import { expect, test } from "bun:test";
import type { RotationAction } from "../src/lib/calc/types";
import { Action, IntroEntry } from "../wuwa_calc/src/engine/rotation";
import { groupIntroPaletteActions } from "./actionCatalog";

test("Intro palette grouping compares actual choices, not names or preset chain kinds", () => {
	const quietus = new Action("Intro - Quietus");
	const immortality = new Action("Intro - Immortality");
	const entries = [
		new IntroEntry("main", [quietus, immortality]),
		new IntroEntry("opener", [immortality, quietus]),
		new IntroEntry("main", [quietus]),
		new IntroEntry("main", [new Action(quietus.name), immortality]),
	];
	const actions: RotationAction[] = entries.map((entry, i) => ({
		id: `${i}`,
		baseId: `${i}`,
		name: entry.name,
		kind: "Intro",
		seconds: 0,
		variant: "",
	}));
	const registry = new Map(entries.map((entry, i) => [`${i}`, entry]));
	groupIntroPaletteActions(actions, registry);
	expect(actions.map((a) => a.paletteId)).toEqual(["0", "0", "2", "3"]);
	expect(actions.map((a) => a.baseId)).toEqual(["0", "1", "2", "3"]);
	expect([...registry.values()]).toEqual(entries);
});
