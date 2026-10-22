import { describe, expect, test } from "bun:test";
import { allEchoSpecies } from "@/components/echo/EchoCard";
import {
	type CatalogEcho,
	echoesByMonsterId,
	echoSpeciesVariantForSet,
	groupEchoSpecies,
} from "./catalog";

describe("manual echo species", () => {
	test("Autopuppet Scout appears once while retaining all three game variants", () => {
		const matches = allEchoSpecies.filter(
			(entry) => entry.echo_name === "Autopuppet Scout",
		);
		expect(matches).toHaveLength(1);
		expect(matches[0].variants).toHaveLength(3);
		expect(matches[0].echo_sets.map((set) => set.id)).toEqual([5, 1]);
	});
	test("merges variant-specific sets and selects the right item/monster pair", () => {
		const tickTack = allEchoSpecies.find(
			(entry) => entry.echo_name === "Tick Tack",
		);
		expect(tickTack).toBeDefined();
		if (!tickTack) return;
		expect(new Set(tickTack.echo_sets.map((set) => set.id))).toEqual(
			new Set([9, 7, 6, 5, 1]),
		);
		const variant = echoSpeciesVariantForSet(tickTack, 5);
		expect(variant?.echo_id).toBe(60200024);
		expect(variant?.monster_id).toBe(6020024);
		expect(echoSpeciesVariantForSet(tickTack, -1)).toBeUndefined();
		// Grouping must not add unsupported sets to the raw ID-based catalog.
		expect(
			echoesByMonsterId.get(390070069)?.echo_sets.map((set) => set.id),
		).toEqual([9, 7, 6]);
	});
	test("keeps different costs and named forms separate and excludes invalid IDs", () => {
		const entry: CatalogEcho = {
			echo_name: "Scout",
			echo_id: 1,
			monster_id: 1,
			echo_cost: 1,
			echo_sets: [],
		};
		const grouped = groupEchoSpecies([
			entry,
			{ ...entry, echo_id: 2, monster_id: 2, echo_name: " scout " },
			{ ...entry, monster_id: 3, echo_cost: 3 },
			{ ...entry, monster_id: 4, echo_name: "Phantom: Scout" },
			{ ...entry, monster_id: null },
		]);
		expect(grouped).toHaveLength(3);
		expect(grouped[0].variants).toHaveLength(2);
	});
});
