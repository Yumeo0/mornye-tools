import { expect, test } from "bun:test";
import {
	EMPTY_ROTATION_FILTERS,
	type RotationFilters,
} from "@/components/optimizer/rotationProfiles";
import { getCatalog } from "./calc/riley/engine.generated.js";
import { rotationFiltersSchema } from "./filterSchemas";
import {
	EMPTY_OPTIMIZER_SETUP,
	type OptimizerSetup,
	optimizerSetupKey,
	optimizerSetupSchema,
	resolveOptimizerSelection,
} from "./optimizerSetup";
import { createPersistentState, restoreFilterState } from "./persistentState";

test("restores the complete optimizer setup per account in a fresh session", async () => {
	const disk = new Map<string, unknown>();
	const session = (accountId: string) =>
		createPersistentState(
			EMPTY_OPTIMIZER_SETUP,
			(saved) =>
				restoreFilterState(saved, EMPTY_OPTIMIZER_SETUP, optimizerSetupSchema),
			{
				read: async () => disk.get(optimizerSetupKey(accountId)),
				write: async (value) => {
					disk.set(
						optimizerSetupKey(accountId),
						JSON.parse(JSON.stringify(value)),
					);
				},
				onError: (error) => {
					throw error;
				},
			},
		);
	const profile = getCatalog().teams[0];
	const chosen: OptimizerSetup = {
		profileId: profile.id,
		targetId: profile.members[0].characterId,
		mode: "team",
		overrides: {
			[profile.members[0].characterId]: { chain: 0, weaponRank: 1 },
			[profile.members[1].characterId]: {
				chain: 2,
				weaponItemId: profile.members[1].weapons[0].id,
				weaponRank: 5,
				echoSource: "rotation",
			},
			[profile.members[2].characterId]: { echoSource: "equipped" },
		},
	};
	const first = session("account-a");
	await first.flush();
	first.set(chosen);
	await first.flush();
	const reloaded = session("account-a");
	await reloaded.flush();
	expect(reloaded.getSnapshot()).toEqual(chosen);
	const otherAccount = session("account-b");
	await otherAccount.flush();
	expect(otherAccount.getSnapshot()).toEqual(EMPTY_OPTIMIZER_SETUP);
	expect(optimizerSetupKey(null)).not.toBe(optimizerSetupKey("none"));

	// Clearing a selection must also survive reloading.
	reloaded.set(EMPTY_OPTIMIZER_SETUP);
	await reloaded.flush();
	const cleared = session("account-a");
	await cleared.flush();
	expect(cleared.getSnapshot()).toEqual(EMPTY_OPTIMIZER_SETUP);
});

test("waits for the catalog and ignores removed rotations or stale targets", () => {
	const catalog = getCatalog();
	const profile = catalog.teams[0];
	const setup = {
		...EMPTY_OPTIMIZER_SETUP,
		profileId: profile.id,
		targetId: profile.members[0].characterId,
	};
	expect(resolveOptimizerSelection(setup, null)).toEqual({
		profile: null,
		targetId: 0,
	});
	expect(resolveOptimizerSelection(setup, catalog)).toEqual({
		profile,
		targetId: setup.targetId,
	});
	expect(
		resolveOptimizerSelection({ ...setup, profileId: "removed" }, catalog),
	).toEqual({ profile: null, targetId: 0 });
	expect(
		resolveOptimizerSelection({ ...setup, targetId: 999999 }, catalog),
	).toEqual({ profile, targetId: 0 });
	expect(setup.targetId).toBe(profile.members[0].characterId);
});

test("rejects malformed stored builds and restores rotation filters", () => {
	for (const invalid of [
		{ ...EMPTY_OPTIMIZER_SETUP, mode: "support" },
		{ ...EMPTY_OPTIMIZER_SETUP, targetId: -1 },
		{ ...EMPTY_OPTIMIZER_SETUP, overrides: { 1404: { chain: 7 } } },
		{ ...EMPTY_OPTIMIZER_SETUP, overrides: { 1404: { weaponRank: 0 } } },
		{
			...EMPTY_OPTIMIZER_SETUP,
			overrides: { 1404: { echoSource: "unknown" } },
		},
	]) {
		expect(
			restoreFilterState(invalid, EMPTY_OPTIMIZER_SETUP, optimizerSetupSchema),
		).toEqual(EMPTY_OPTIMIZER_SETUP);
	}
	const filters: RotationFilters = {
		search: "Phrolova",
		characterId: "1406",
		role: "dps",
		ownership: "owned",
		sort: "damage-desc",
	};
	expect(
		restoreFilterState(
			JSON.parse(JSON.stringify(filters)),
			EMPTY_ROTATION_FILTERS,
			rotationFiltersSchema,
		),
	).toEqual(filters);
	const { sort: _sort, ...legacy } = filters;
	expect(
		restoreFilterState(
			{ ...legacy, compatibility: "supported" },
			EMPTY_ROTATION_FILTERS,
			rotationFiltersSchema,
		),
	).toEqual({ ...legacy, sort: "name" });
});
