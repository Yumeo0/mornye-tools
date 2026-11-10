import { expect, test } from "bun:test";
import { EMPTY_OPTIMIZER_FILTERS } from "@/components/optimizer/optimizerOptions";
import type { SearchUpdate } from "./calc/types";
import {
	matchingOptimizerRun,
	optimizerRunSelectionKey,
	optimizerRunStateKey,
	type SavedOptimizerRun,
	savedOptimizerRunSchema,
} from "./optimizerRunState";
import { createPersistentState, restoreFilterState } from "./persistentState";

const input: Parameters<typeof optimizerRunSelectionKey>[0] = {
	catalogRevision: "calculator-revision",
	revision: "account-inventory-revision",
	scenario: { profileId: "rotation", members: [], cycles: 4 },
	targetId: 1406,
	mode: "team",
	filters: EMPTY_OPTIMIZER_FILTERS,
	resultsLimit: 128,
};
const context = {
	key: optimizerRunSelectionKey(input),
	profileId: "account-a",
	roleId: 1406,
};
function fixture(): SavedOptimizerRun {
	const stats = { atk: 2100, hp: 17000, def: 1100, er: 130, cr: 75, cd: 270 };
	const energy = [
		{
			characterId: 1406,
			name: "Phrolova",
			actual: 130,
			required: 120,
			kitMinimum: 0,
			feasible: true,
		},
	];
	return {
		...context,
		update: {
			results: [
				{
					uids: ["incr:2", "incr:3", "incr:4", "incr:5", "incr:6"],
					damage: 20000,
					stats,
					energy,
				},
			],
			baseline: {
				uids: ["incr:1", "incr:3", "incr:4", "incr:5", "incr:6"],
				damage: 15000,
				stats,
				energy,
			},
			baselineEvaluation: {
				feasible: true,
				damageByMember: { 1406: 15000 },
				teamDamage: 15000,
				duration: 90,
				energy,
				diagnostics: [],
				stats: { 1406: stats },
			},
			baselineError: null,
			progress: {
				processed: 1500,
				total: 1500,
				elapsedMs: 2000,
				remainingMs: 0,
				progress: 1,
				speed: 750,
			},
			status: "budget",
		},
		error: null,
		expandedIndex: 0,
	};
}

test("restores completed and stopped optimizer results in a fresh session per account", async () => {
	const disk = new Map<string, unknown>();
	const session = (accountId: string) =>
		createPersistentState<SavedOptimizerRun | null>(
			null,
			(saved) => restoreFilterState(saved, null, savedOptimizerRunSchema),
			{
				read: async () => disk.get(optimizerRunStateKey(accountId)),
				write: async (value) => {
					disk.set(
						optimizerRunStateKey(accountId),
						JSON.parse(JSON.stringify(value)),
					);
				},
				onError: (error) => {
					throw error;
				},
			},
		);
	for (const status of ["complete", "budget", "cancelled"] as const) {
		const saved = fixture();
		saved.update.status = status;
		const first = session("account-a");
		await first.flush();
		first.set(saved);
		await first.flush();
		const reloaded = session("account-a");
		await reloaded.flush();
		expect(matchingOptimizerRun(reloaded.getSnapshot(), context)).toEqual(
			saved,
		);
		const other = session("account-b");
		await other.flush();
		expect(other.getSnapshot()).toBeNull();
	}
});

test("startup delays retain saved results until all matching inputs are restored", async () => {
	const saved = fixture();
	const entry = createPersistentState<SavedOptimizerRun | null>(
		null,
		(value) => restoreFilterState(value, null, savedOptimizerRunSchema),
		{
			read: async () => JSON.parse(JSON.stringify(saved)),
			write: async () => {
				throw new Error("Startup must not overwrite saved results");
			},
			onError: (error) => {
				throw error;
			},
		},
	);
	const pendingKey = optimizerRunSelectionKey({
		...input,
		catalogRevision: null,
		scenario: null,
		targetId: 0,
	});
	expect(
		matchingOptimizerRun(entry.getSnapshot(), { ...context, key: pendingKey }),
	).toBeNull();
	await entry.flush();
	expect(
		matchingOptimizerRun(entry.getSnapshot(), { ...context, key: pendingKey }),
	).toBeNull();
	expect(matchingOptimizerRun(entry.getSnapshot(), context)).toEqual(saved);
});

test("hides results for changed inventory, settings, engine, account, or target", () => {
	const saved = fixture();
	for (const patch of [
		{ catalogRevision: "new-engine" },
		{ revision: "new-inventory" },
		{ scenario: { ...input.scenario!, profileId: "another-rotation" } },
		{
			scenario: {
				...input.scenario!,
				members: [
					{
						characterId: 1406,
						chain: 1,
						weaponId: 1,
						weaponRank: 1,
						echoes: [],
					},
				],
			},
		},
		{ targetId: 1505 },
		{ mode: "damage" as const },
		{ filters: { ...EMPTY_OPTIMIZER_FILTERS, minLevel: 25 } },
		{ resultsLimit: 256 },
	]) {
		expect(
			matchingOptimizerRun(saved, {
				...context,
				key: optimizerRunSelectionKey({ ...input, ...patch }),
			}),
		).toBeNull();
	}
	expect(
		matchingOptimizerRun(saved, { ...context, profileId: "account-b" }),
	).toBeNull();
	expect(matchingOptimizerRun(saved, { ...context, roleId: 1505 })).toBeNull();
	expect(matchingOptimizerRun(saved, context)).toEqual(saved);
});

test("preserves baseline diagnostics, impossible ER, empty results, and expansion", () => {
	const saved = fixture();
	saved.update.results = [];
	saved.update.baseline = null;
	saved.update.baselineEvaluation!.feasible = false;
	saved.update.baselineEvaluation!.energy[0].required = Infinity;
	saved.update.baselineEvaluation!.energy[0].feasible = false;
	saved.update.baselineError = "Cannot execute the equipped baseline.";
	saved.error = "No feasible build found.";
	saved.expandedIndex = "baseline";
	expect(
		savedOptimizerRunSchema.parse(JSON.parse(JSON.stringify(saved))),
	).toEqual(saved);
});

test("ignores malformed and in-progress saved result snapshots", () => {
	const saved = fixture();
	const invalidUpdates: SearchUpdate[] = [
		{ ...saved.update, status: "searching" },
		{
			...saved.update,
			results: [{ ...saved.update.results[0], uids: ["incr:1"] }],
		},
		{ ...saved.update, results: [{ ...saved.update.results[0], damage: NaN }] },
	];
	for (const update of invalidUpdates) {
		expect(
			restoreFilterState(
				JSON.parse(JSON.stringify({ ...saved, update })),
				null,
				savedOptimizerRunSchema,
			),
		).toBeNull();
	}
	expect(
		restoreFilterState(
			{ ...saved, expandedIndex: -1 },
			null,
			savedOptimizerRunSchema,
		),
	).toBeNull();
});
