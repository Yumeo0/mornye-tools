import { describe, expect, test } from "bun:test";
import { EMPTY_ECHO_FILTERS } from "@/components/echo/echoFilters";
import { EMPTY_OPTIMIZER_FILTERS } from "@/components/optimizer/optimizerOptions";
import { EMPTY_WEAPON_FILTERS } from "@/components/weapon/weaponFilters";
import { DEFAULT_FILTERS } from "./characterFilters";
import {
	characterFiltersSchema,
	echoFiltersSchema,
	echoSortSchema,
	optimizerFiltersSchema,
	visibilityOverridesSchema,
	weaponFiltersSchema,
} from "./filterSchemas";
import { createPersistentState, restoreFilterState } from "./persistentState";

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

describe("persistent filter state", () => {
	test("restores filters and cleared choices in a fresh app session", async () => {
		let disk: unknown;
		const storage = {
			read: async () => disk,
			write: async (value: unknown) => {
				disk = JSON.parse(JSON.stringify(value));
			},
			onError: (error: unknown) => {
				throw error;
			},
		};
		const initial = {
			search: "",
			minLevel: 1,
			type: [],
			rarity: [],
			character: [],
		};
		const session = () =>
			createPersistentState(
				initial,
				(saved) => restoreFilterState(saved, initial, weaponFiltersSchema),
				storage,
			);
		const first = session();
		await first.flush();
		const chosen = {
			...initial,
			search: "sword",
			minLevel: 60,
			character: ["none"],
		};
		first.set(chosen);
		await first.flush();
		const second = session();
		await second.flush();
		expect(second.getSnapshot()).toEqual(chosen);
		second.set(initial);
		await second.flush();
		const third = session();
		await third.flush();
		expect(third.getSnapshot()).toEqual(initial);
	});

	test("does not overwrite disk defaults on mount or lose edits during loading", async () => {
		const read = deferred<unknown>();
		const writes: unknown[] = [];
		const entry = createPersistentState(
			"",
			(saved) => restoreFilterState(saved, ""),
			{
				read: () => read.promise,
				write: async (value) => {
					writes.push(value);
				},
				onError: (error) => {
					throw error;
				},
			},
		);
		const unsubscribe = entry.subscribe(() => {});
		expect(writes).toEqual([]);
		entry.set("new search");
		unsubscribe();
		read.resolve("old search");
		await entry.flush();
		expect(entry.getSnapshot()).toBe("new search");
		expect(writes).toEqual(["new search"]);
	});

	test("serializes rapid functional updates and keeps saving after a failure", async () => {
		const gate = deferred<void>();
		const writes: unknown[] = [];
		const errors: unknown[] = [];
		const entry = createPersistentState(
			0,
			(saved) => restoreFilterState(saved, 0),
			{
				read: async () => 4,
				write: async (value) => {
					writes.push(value);
					if (value === 5) {
						await gate.promise;
						throw new Error("Disk unavailable");
					}
				},
				onError: (error) => {
					errors.push(error);
				},
			},
		);
		await entry.flush();
		entry.set((previous) => previous + 1);
		entry.set((previous) => previous + 1);
		await Promise.resolve();
		expect(writes).toEqual([5]);
		gate.resolve();
		await entry.flush();
		expect(writes).toEqual([5, 6]);
		expect(entry.getSnapshot()).toBe(6);
		expect(errors).toHaveLength(1);
	});

	test("ignores malformed preferences and validates enum and nested values", () => {
		expect(restoreFilterState(null, "all")).toBe("all");
		expect(restoreFilterState(42, "all")).toBe("all");
		expect(restoreFilterState("unknown", "level", echoSortSchema)).toBe(
			"level",
		);
		expect(
			restoreFilterState({ chest: "false" }, {}, visibilityOverridesSchema),
		).toEqual({});
		expect(
			characterFiltersSchema.safeParse({ ...DEFAULT_FILTERS, levelRange: null })
				.success,
		).toBe(false);
		expect(
			echoFiltersSchema.safeParse({ ...EMPTY_ECHO_FILTERS, marks: ["invalid"] })
				.success,
		).toBe(false);
		expect(
			optimizerFiltersSchema.safeParse({
				...EMPTY_OPTIMIZER_FILTERS,
				equipped: "invalid",
			}).success,
		).toBe(false);
	});

	test("round trips all filter shapes, empty selections, and false toggles", () => {
		const characters: typeof DEFAULT_FILTERS = {
			...DEFAULT_FILTERS,
			ownedOnly: true,
			rarity: [5],
			levelRange: [40, 90],
		};
		const echoes: typeof EMPTY_ECHO_FILTERS = {
			...EMPTY_ECHO_FILTERS,
			cost: [1, 3],
			marks: ["none", "locked"],
			substat: ["critRate"],
		};
		const optimizer: typeof EMPTY_OPTIMIZER_FILTERS = {
			...EMPTY_OPTIMIZER_FILTERS,
			equipped: "exclude-others",
			sets: ["1"],
		};
		for (const [schema, value] of [
			[characterFiltersSchema, characters],
			[echoFiltersSchema, echoes],
			[weaponFiltersSchema, EMPTY_WEAPON_FILTERS],
			[optimizerFiltersSchema, optimizer],
			[visibilityOverridesSchema, { chest: false, challenge: true }],
		] as const) {
			expect(schema.parse(JSON.parse(JSON.stringify(value)))).toEqual(value);
		}
		expect(restoreFilterState(false, true)).toBe(false);
		expect(restoreFilterState("", "previous search")).toBe("");
	});
});
