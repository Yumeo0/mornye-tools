import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BuildStats } from "@/components/characters/BuildStats";
import { EMPTY_OPTIMIZER_FILTERS } from "@/components/optimizer/optimizerOptions";
import { type AccountSnapshot, EMPTY_ACCOUNT } from "./account";
import {
	inventoryRevision,
	optimizerInventoryRevision,
} from "./calc/translate";
import type { CalcEcho, Scenario, SearchUpdate } from "./calc/types";
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
	const stats = {
		atk: 2100,
		hp: 17000,
		def: 1100,
		er: 130,
		cr: 75,
		cd: 270,
		bonuses: { heavyAtk: 12, healingBonus: 0, havoc: 60, glacio: 0 },
	};
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

test("restored optimizer details keep nonzero bonuses while hiding attributes and zero bonuses", () => {
	const saved = savedOptimizerRunSchema.parse(
		JSON.parse(JSON.stringify(fixture())),
	);
	const stats = saved?.update.results[0]?.stats;
	if (!stats) throw new Error("Missing restored result stats");
	const html = renderToStaticMarkup(
		createElement(BuildStats, {
			stats,
			showAttributes: false,
			hideZeroBonuses: true,
		}),
	);
	expect(html).toContain("Heavy Attack DMG Bonus");
	expect(html).toContain("12.0%");
	expect(html).toContain("Havoc DMG Bonus");
	expect(html).toContain("60.0%");
	expect(html).not.toContain("Attributes");
	expect(html).not.toContain("Healing Bonus");
	expect(html).not.toContain("Glacio DMG Bonus");
	expect(html).not.toContain(">0.0%</dd>");
});

test("equipment changes retain results while material inventory and teammate changes invalidate them", () => {
	const snapshot: AccountSnapshot = {
		...EMPTY_ACCOUNT,
		weapons: [{ incrId: 1, itemId: 21050024, level: 90, breach: 6, rank: 1 }],
		echoes: Array.from({ length: 7 }, (_, index) => ({
			incrId: index + 1,
			itemId: 60001195,
			monsterId: 6000119,
			setId: 19,
			level: 25,
			funcValue: 0,
			stackCount: 1,
			mainProps: [{ propId: 1, key: "atkPercent", raw: 1800, value: 18 }],
			subProps: [],
			equippedBy: index < 5 ? 1406 : null,
			slot: index < 5 ? index : null,
			source: "sniffer",
		})),
	};
	const echo = (id: number): CalcEcho => ({
		uid: `incr:${id}`,
		typeId: 6000119,
		name: "Echo",
		cost: 1,
		setId: 19,
		level: 25,
		mainStats: [],
		substats: [],
	});
	const scenario: Scenario = {
		profileId: "rotation",
		cycles: 4,
		members: [
			{
				characterId: 1406,
				chain: 0,
				weaponId: 21050024,
				weaponRank: 1,
				echoSource: "equipped",
				echoes: [1, 2, 3, 4, 5].map(echo),
			},
			{
				characterId: 1503,
				chain: 0,
				weaponId: 21050024,
				weaponRank: 1,
				echoSource: "equipped",
				echoes: [echo(7)],
			},
		],
	};
	const key = (inventory: AccountSnapshot, team = scenario) =>
		optimizerRunSelectionKey({
			...input,
			revision: optimizerInventoryRevision(inventory),
			scenario: team,
		});
	const equipped = structuredClone(snapshot);
	Object.assign(equipped.echoes[0], { equippedBy: null, slot: null });
	Object.assign(equipped.echoes[5], { equippedBy: 1406, slot: 0 });
	equipped.echoes.reverse();
	const after = structuredClone(scenario);
	after.members[0].echoes = [6, 2, 3, 4, 5].map(echo);
	expect(inventoryRevision(equipped)).not.toBe(inventoryRevision(snapshot));
	expect(key(equipped, after)).toBe(key(snapshot));
	const legacy = fixture();
	legacy.key = JSON.stringify([
		input.catalogRevision,
		inventoryRevision(snapshot),
		scenario,
		input.targetId,
		input.mode,
		input.filters,
		input.resultsLimit,
	]);
	const restored = savedOptimizerRunSchema.parse(
		JSON.parse(JSON.stringify(legacy)),
	);
	expect(restored?.key).toBe(key(snapshot));
	expect(
		matchingOptimizerRun(restored, { ...context, key: key(equipped, after) }),
	).toBe(restored);
	const current = { ...legacy, key: key(equipped, after) };
	expect(savedOptimizerRunSchema.parse(current)).toEqual(current);

	const upgraded = structuredClone(equipped);
	upgraded.echoes[0].mainProps[0].value += 1;
	expect(key(upgraded, after)).not.toBe(key(snapshot));
	expect(
		matchingOptimizerRun(restored, { ...context, key: key(upgraded, after) }),
	).toBeNull();
	expect(
		key({ ...equipped, echoes: equipped.echoes.slice(1) }, after),
	).not.toBe(key(snapshot));
	const weaponChanged = structuredClone(equipped);
	weaponChanged.weapons[0].rank += 1;
	expect(key(weaponChanged, after)).not.toBe(key(snapshot));
	const teammateChanged = structuredClone(after);
	teammateChanged.members[1].echoes = [echo(1)];
	expect(key(equipped, teammateChanged)).not.toBe(key(snapshot));
	const chainChanged = structuredClone(after);
	chainChanged.members[0].chain += 1;
	expect(key(equipped, chainChanged)).not.toBe(key(snapshot));
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
