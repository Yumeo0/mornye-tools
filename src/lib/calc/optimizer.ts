// Optimizer transport for the in-app Optimizer tab.
//
// The core compiles an account-derived request into a packed payload in the
// `optimizer-compile` worker, searches through the core worker pool, and
// materializes the ranked results back into UID-based entries. This module
// owns that single-run lifecycle, the request construction, and the candidate
// selection; all damage math stays in `@wuwacalc/core`.

import { getResSeedBy } from "@wuwacalc/core/data/catalog/resonatorSeedService";
import { createCoreWorker } from "@wuwacalc/core/data/coreEnvironment";
import { getEchoSetDe } from "@wuwacalc/core/data/gameData/echoSets/effects";
import { getGameDataMode } from "@wuwacalc/core/data/gameData/index";
import type { EnemyProfile } from "@wuwacalc/core/domain/entities/appState";
import {
	combatScenarioId,
	teamMemberId,
} from "@wuwacalc/core/domain/entities/combatScenario";
import { DEF_ENEMY_PROF } from "@wuwacalc/core/domain/entities/enemy";
import type {
	OptSetChoice,
	OptSets,
} from "@wuwacalc/core/domain/entities/optimizer";
import type {
	EchoInstance,
	ResRuntime,
	TeamSlots,
} from "@wuwacalc/core/domain/entities/runtime";
import {
	cloneSntSet,
	DEF_SET_COND,
} from "@wuwacalc/core/domain/entities/sonataSetConditionals";
import type { RotationNode } from "@wuwacalc/core/domain/gameData/contracts";
import type {
	OptBaselineInput,
	OptCompInMsg,
	OptCompOutMs,
} from "@wuwacalc/core/engine/optimizer/compiler/compileWorker.types";
import { optSetIdSet } from "@wuwacalc/core/engine/optimizer/config/allowedSets";
import { deriveOptSets } from "@wuwacalc/core/engine/optimizer/config/defaultSettings";
import { countOptCombos } from "@wuwacalc/core/engine/optimizer/search/counting";
import {
	makeStatWeights,
	scrEchoByWgh,
} from "@wuwacalc/core/engine/optimizer/search/filtering";
import { listOptTrgt } from "@wuwacalc/core/engine/optimizer/target/skills";
import type {
	OptPrgr,
	OptRawResult,
	OptResultEntry,
	OptResultStats,
	OptStartPay,
	OptStoredResult,
	PrepOptPay,
} from "@wuwacalc/core/engine/optimizer/types";
import { payloadTransfers } from "@wuwacalc/core/engine/optimizer/workers/payloadBuffers";
import {
	cnclActOptWr,
	rstOptWrkrPo,
	runOptWithWr,
} from "@wuwacalc/core/engine/optimizer/workers/poolClient";
import {
	makeSkillCtx,
	prepareSkill,
} from "@wuwacalc/core/engine/pipeline/prepareRuntimeSkill";
import { cloneOptSets } from "@wuwacalc/core/engine/runtime/defaults";
import { makeRuntimeMap } from "@wuwacalc/core/engine/runtime/runtimeAdapters";

const ABORT_MESSAGE = "Optimizer run cancelled";

/**
 * The GPU backend stores combinadic combo/row ranks in 32-bit fields (and the
 * rotation shader packs a 29-bit combo rank per window), so the search space
 * must keep `rows = C(n, 5) * 5` below 2^32. Larger candidate pools silently
 * truncate the search. The default is also a practical CPU budget.
 */
const MAX_CANDIDATE_ECHOES = 160;
const MAX_SEARCH_ROWS = 0xffffffff;

export function abortError(): DOMException {
	return new DOMException(ABORT_MESSAGE, "AbortError");
}

/** Whether a rejected optimizer promise was cancelled rather than failed. */
export function isOptimizerAbort(error: unknown): boolean {
	return (
		(error instanceof DOMException || error instanceof Error) &&
		error.name === "AbortError"
	);
}

/**
 * Single-run compile/materialize session owning the compile worker. The worker
 * is kept warm between requests (game data stays hydrated); `stop` invalidates
 * the run, rejects in-flight requests, and terminates it.
 */
class OptimizerCompileSession {
	private worker: Worker | null = null;
	private runToken = 0;
	private active = false;
	private activeReject: ((error: Error) => void) | null = null;

	begin(): number {
		this.runToken += 1;
		this.active = true;
		return this.runToken;
	}

	isCurrent(token: number): boolean {
		return this.runToken === token;
	}

	hasActiveRun(): boolean {
		return this.active;
	}

	finish(token: number): void {
		if (this.runToken === token) this.active = false;
	}

	private ensureWorker(): Worker {
		if (!this.worker) {
			this.worker = createCoreWorker("optimizer-compile");
		}
		return this.worker;
	}

	stop(): void {
		this.runToken += 1;
		this.active = false;
		const worker = this.worker;
		this.worker = null;
		this.rejectActive(abortError());
		worker?.terminate();
	}

	private rejectActive(error: Error): void {
		const reject = this.activeReject;
		this.activeReject = null;
		reject?.(error);
	}

	async request<T extends OptCompOutMs["type"]>(
		runId: number,
		expectedType: T,
		dispatch: (worker: Worker) => void,
	): Promise<Extract<OptCompOutMs, { type: T }>> {
		const worker = this.ensureWorker();
		return await new Promise((resolve, reject) => {
			const cleanup = () => {
				worker.removeEventListener("message", onMessage);
				worker.removeEventListener("error", onError);
				if (this.activeReject === fail) this.activeReject = null;
			};
			const fail = (error: Error) => {
				cleanup();
				reject(error);
			};
			const onMessage = (event: MessageEvent<OptCompOutMs>) => {
				const message = event.data;
				if (message.runId !== runId) return;
				cleanup();
				if (message.type === "error") {
					reject(new Error(message.message));
					return;
				}
				if (message.type !== expectedType) {
					reject(
						new Error(`Unexpected optimizer compile response: ${message.type}`),
					);
					return;
				}
				resolve(message as Extract<OptCompOutMs, { type: T }>);
			};
			const onError = (event: ErrorEvent) =>
				fail(new Error(event.message || "Optimizer compile worker failed"));
			worker.addEventListener("message", onMessage);
			worker.addEventListener("error", onError);
			this.activeReject = fail;
			try {
				dispatch(worker);
			} catch (error) {
				fail(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}
}

const session = new OptimizerCompileSession();

/** Cancel the run in flight, if any (no-op otherwise). */
export function cancelOptimizerRun(): void {
	if (session.hasActiveRun()) disposeOptimizerRun();
}

/** Release optimizer resources: stop the pool and terminate the compile worker. */
export function disposeOptimizerRun(): void {
	session.stop();
	cnclActOptWr();
	rstOptWrkrPo();
}

async function compilePayload(
	runId: number,
	input: OptStartPay,
): Promise<PrepOptPay> {
	const message = await session.request(runId, "done", (worker) => {
		worker.postMessage({
			type: "start",
			runId,
			payload: input,
		} satisfies OptCompInMsg);
	});
	return message.payload;
}

async function materializeResults(
	runId: number,
	payload: PrepOptPay,
	results: OptRawResult[],
	uidByIndex: string[],
): Promise<OptStoredResult[]> {
	const message = await session.request(runId, "materialized", (worker) => {
		worker.postMessage(
			{
				type: "materialize",
				runId,
				payload,
				results,
				uidByIndex,
				limit: payload.resultsLimit,
			} satisfies OptCompInMsg,
			payloadTransfers(payload),
		);
	});
	return message.results;
}

function isResultEntry(result: OptStoredResult): result is OptResultEntry {
	return "uids" in result && !("echoes" in result) && !("theory" in result);
}

export interface OptimizerRunOptions {
	onProgress?: (progress: OptPrgr) => void;
}

/**
 * Evaluate the equipped build with the optimizer's own metric (the compile
 * worker's baseline job), so the "current build" number is directly comparable
 * to the search results. `equippedEchoes` is the build in slot order and
 * `mainIndex` points at its main echo.
 */
export async function runOptimizerBaseline(
	input: OptStartPay,
	equippedEchoes: EchoInstance[],
	mainIndex: number,
): Promise<{ damage: number; stats: OptResultStats | null } | null> {
	const payload: OptBaselineInput = {
		scenarioId: input.scenarioId,
		memberId: input.memberId,
		resonatorId: input.resonatorId,
		gameDataMode: input.gameDataMode,
		resSeed: input.resSeed,
		runtime: input.runtime,
		runtimesById: input.runtimesById,
		invChs: equippedEchoes,
		enemyProfile: input.enemyProfile,
		selectedTargets: input.selectedTargets,
		rotTms: input.rotTms,
		settings: {
			rotationMode: input.settings.rotationMode,
			targetSkillId: input.settings.targetSkillId,
		},
	};
	const token = session.begin();
	try {
		const message = await session.request(-1, "baselineDone", (worker) => {
			worker.postMessage({
				type: "baseline",
				runId: -1,
				payload,
				// A build without a main echo (findIndex -> -1) scores from slot 0.
				mainIndex: Math.max(0, mainIndex),
				setConds: cloneSntSet(DEF_SET_COND),
			} satisfies OptCompInMsg);
		});
		return message.result;
	} finally {
		session.finish(token);
	}
}

/**
 * Run one inventory search for the prepared request and return the ranked
 * result entries. Cancellation rejects with an `AbortError`.
 */
export async function runOptimizerSearch(
	input: OptStartPay,
	options: OptimizerRunOptions = {},
): Promise<OptResultEntry[]> {
	cancelOptimizerRun();

	const token = session.begin();
	const current = () => session.isCurrent(token);

	try {
		const compiled = await compilePayload(token, input);
		if (!current()) throw abortError();

		const backend = input.settings.enableGpu ? "gpu" : "cpu";
		const raw = await runOptWithWr(compiled, backend, {
			isCancelled: () => !current(),
			onProgress: (progress) => {
				if (current()) options.onProgress?.(progress);
			},
		});
		if (!current()) throw abortError();

		const stored = await materializeResults(
			token,
			compiled,
			raw,
			input.invChs.map((echo) => echo.uid),
		);
		if (!current()) throw abortError();

		return stored.filter(isResultEntry);
	} finally {
		session.finish(token);
	}
}

/** Clone a runtime with the full team slots filled in. */
export function withTeam(runtime: ResRuntime, team: TeamSlots): ResRuntime {
	return {
		...runtime,
		build: { ...runtime.build, team },
	};
}

export interface OptimizerInputParams {
	targetRoleId: string;
	/** Translated account runtime for the optimized resonator. */
	targetRuntime: ResRuntime;
	/** Up to two teammates; `null` slots leave the team incomplete. */
	mateRoleIds: [string | null, string | null];
	/** Translated runtime per teammate role id. */
	companionRuntimes: Record<string, ResRuntime>;
	/** Selected rotation timeline; `null` optimizes a single direct skill. */
	rotationItems: RotationNode[] | null;
	settings: OptSets;
	inventory: EchoInstance[];
	enemyProfile: EnemyProfile;
}

/** Build the core optimizer request from account-derived state. */
export function makeOptimizerInput(params: OptimizerInputParams): OptStartPay {
	const team: TeamSlots = [
		params.targetRoleId,
		params.mateRoleIds[0],
		params.mateRoleIds[1],
	];
	const runtimesById: Record<string, ResRuntime> = {};
	for (const mateId of params.mateRoleIds) {
		if (!mateId) continue;
		const runtime = params.companionRuntimes[mateId];
		if (runtime) runtimesById[mateId] = withTeam(runtime, team);
	}

	return {
		scenarioId: combatScenarioId("mny:optimizer"),
		memberId: teamMemberId(params.targetRoleId),
		resonatorId: params.targetRoleId,
		gameDataMode: getGameDataMode(),
		resSeed: getResSeedBy(params.targetRoleId) ?? undefined,
		runtime: withTeam(params.targetRuntime, team),
		runtimesById,
		settings: params.settings,
		invChs: params.inventory,
		enemyProfile: params.enemyProfile,
		rotTms: params.rotationItems,
	};
}

// Echo main-stat keys that represent an elemental DMG bonus main.
const ELEMENT_MAIN_KEYS = new Set<string>([
	"aero",
	"glacio",
	"electro",
	"fusion",
	"spectro",
	"havoc",
]);

/** Echo main-stat keys -> the core optimizer's coarse filter buckets. */
const BUCKET_BY_MAIN_KEY: Record<string, string> = {
	atkPercent: "atk%",
	hpPercent: "hp%",
	defPercent: "def%",
	energyRegen: "er",
	critRate: "cr",
	critDmg: "cd",
	healingBonus: "healing",
};

/** Core optimizer filter bucket -> echo main-stat key (inverse of the above). */
const MAIN_KEY_BY_BUCKET: Record<string, string> = Object.fromEntries(
	Object.entries(BUCKET_BY_MAIN_KEY).map(([key, bucket]) => [bucket, key]),
);

function statKeyBucket(key: string): string | null {
	return (
		BUCKET_BY_MAIN_KEY[key] ?? (ELEMENT_MAIN_KEYS.has(key) ? "bonus" : null)
	);
}

function filterStatKey(filter: string): string | null {
	return MAIN_KEY_BY_BUCKET[filter] ?? null;
}

/** Bucket allowed set ids into the core's piece-count selector shape. */
function bucketAllowedSets(setIds: readonly number[]): OptSetChoice {
	const choice: OptSetChoice = { 1: [], 3: [], 5: [] };
	for (const id of setIds) {
		const def = getEchoSetDe(id);
		// Sets unknown to the catalog stay usable in the 5-piece bucket.
		choice[def ? def.setMax : 5].push(id);
	}
	return choice;
}

export interface OptimizerSettingsOptions {
	/** Whether a rotation target is available (else a direct skill is used). */
	rotationAvailable: boolean;
	/** Target skill id for the direct-skill fallback. */
	targetSkillId?: string | null;
	resultsLimit: number;
	enableGpu: boolean;
	lowMemoryMode?: boolean;
	/** Allowed main-stat echo keys; empty = every main stat. */
	mainStatKeys?: readonly string[];
	/** Allowed sonata set ids; empty = every set. */
	allowedSetIds?: readonly number[];
}

/** Optimizer settings for one inventory search, from explicit user filters. */
export function makeOptimizerSettings(
	options: OptimizerSettingsOptions,
): OptSets {
	const mainStatFilter: string[] = [];
	let selectedBonus: string | null = null;
	for (const key of options.mainStatKeys ?? []) {
		const bucket = statKeyBucket(key);
		if (!bucket) continue;
		if (!mainStatFilter.includes(bucket)) mainStatFilter.push(bucket);
		if (selectedBonus === null && ELEMENT_MAIN_KEYS.has(key)) {
			selectedBonus = key;
		}
	}

	return cloneOptSets({
		targetMode: options.rotationAvailable ? "combo" : "skill",
		targetSkillId: options.rotationAvailable
			? null
			: (options.targetSkillId ?? null),
		rotationMode: options.rotationAvailable,
		searchMode: "inventory",
		resultsLimit: options.resultsLimit,
		enableGpu: options.enableGpu,
		lowMemoryMode: options.lowMemoryMode ?? false,
		includeWeapons: false,
		mainStatFilter,
		selectedBonus,
		allowedSets: bucketAllowedSets(options.allowedSetIds ?? []),
	});
}

/**
 * Recommended main-stat keys for one resonator, derived from the stat weights
 * of its first optimization target (the core's `deriveOptSets` heuristic).
 * Used by the optimizer tab's "Recommended" button; never applied on its own.
 */
export function deriveRecommendedMainStats(
	runtime: ResRuntime,
	runtimesById: Record<string, ResRuntime> = {},
): string[] {
	const defaults = deriveOptSets({
		runtime,
		runtimesById,
		enemy: DEF_ENEMY_PROF,
		selectedTargets: {},
	});
	const keys: string[] = [];
	for (const filter of defaults.mainStatFilter ?? []) {
		// The elemental-bonus bucket resolves to the derived element itself.
		if (filter === "bonus") {
			if (defaults.selectedBonus) keys.push(defaults.selectedBonus);
			continue;
		}
		const key = filterStatKey(filter);
		if (key) keys.push(key);
	}
	return keys;
}

/** Stat weights used to rank candidate echoes for space pruning. */
function makeCandidateWeights(
	runtime: ResRuntime,
	runtimesById: Record<string, ResRuntime>,
	enemy: EnemyProfile,
) {
	const seed = getResSeedBy(runtime.id);
	const target = listOptTrgt(runtime)[0] ?? null;
	if (!seed || !target) return null;
	try {
		const { context } = makeSkillCtx({
			runtime,
			seed,
			enemy,
			runtimesById: makeRuntimeMap(runtime, runtimesById),
			selectedTargets: {},
		});
		const skill = prepareSkill(runtime, target.id, context);
		if (!skill) return null;
		return makeStatWeights({
			finalStats: context.finalStats,
			skill,
			enemy,
			level: runtime.base.level,
			combat: runtime.state.combat,
		});
	} catch {
		return null;
	}
}

export interface OptimizerSelection {
	echoes: EchoInstance[];
	/** Captured inventory size before pruning. */
	inventoryTotal: number;
	/** Exact number of legal five-echo builds in the selection. */
	combos: number;
	/** Rows the backend walks: `combos` when the main is locked, else ×5. */
	rows: number;
	/** Whether any candidate was dropped. */
	pruned: boolean;
}

/**
 * Select the candidate inventory for one search.
 *
 * Applies the explicit user filters (allowed sets, main stats, required
 * substats), then a stat-weighted slice bounded so the 32-bit combinadic
 * search space cannot overflow. `alwaysKeep` pins echoes into the selection
 * (e.g. the equipped build) even when filters would drop them.
 */
export function selectOptimizerCandidates(params: {
	inventory: EchoInstance[];
	/** Echoes that must stay in the selection regardless of filters. */
	alwaysKeep?: readonly EchoInstance[];
	settings: OptSets;
	targetRuntime: ResRuntime;
	companionRuntimes?: Record<string, ResRuntime>;
	enemy?: EnemyProfile;
	/** Allowed main-stat keys; empty = every main stat. */
	mainStatKeys?: readonly string[];
	/** Required substat keys (any-of); empty = any substats. */
	substatKeys?: readonly string[];
}): OptimizerSelection {
	const inventoryTotal = params.inventory.length;

	const allowedSets = optSetIdSet(params.settings.allowedSets);
	const wantedMains = new Set(params.mainStatKeys ?? []);
	const wantedSubstats = new Set(params.substatKeys ?? []);

	const eligible = params.inventory.filter((echo) => {
		if (allowedSets.size > 0 && !allowedSets.has(echo.set)) return false;
		if (wantedMains.size > 0 && !wantedMains.has(echo.mainStats.primary.key)) {
			return false;
		}
		if (
			wantedSubstats.size > 0 &&
			!Object.keys(echo.substats).some((key) => wantedSubstats.has(key))
		) {
			return false;
		}
		return true;
	});

	const weights = makeCandidateWeights(
		params.targetRuntime,
		{ ...(params.companionRuntimes ?? {}) },
		params.enemy ?? DEF_ENEMY_PROF,
	);

	const ranked = [...eligible].sort((left, right) => {
		if (!weights) return 0;
		return scrEchoByWgh(right, weights) - scrEchoByWgh(left, weights);
	});

	// Keep the equipped build plus the best-weighted candidates, then shrink
	// until the backend row space fits the core's 32-bit combinadic window.
	const byUid = new Map<string, EchoInstance>();
	const required = params.alwaysKeep ?? [];
	for (const echo of required) byUid.set(echo.uid, echo);
	for (const echo of ranked) {
		if (byUid.size >= MAX_CANDIDATE_ECHOES) break;
		byUid.set(echo.uid, echo);
	}

	// Prefer dropping the lowest-ranked optional echoes when the row space
	// still overflows: `ranked` is best-first, so its tail is the drop order.
	const keep = [...byUid.values()];
	const requiredUids = new Set(required.map((echo) => echo.uid));
	const droppable = ranked.filter((echo) => !requiredUids.has(echo.uid));
	while (
		keep.length > 5 &&
		countOptCombos(keep, params.settings.lockedMainEchoId, "combinadic") >
			MAX_SEARCH_ROWS
	) {
		const drop = droppable.pop();
		if (!drop) break;
		const index = keep.findIndex((echo) => echo.uid === drop.uid);
		if (index >= 0) keep.splice(index, 1);
	}

	const echoes = keep;
	const combos = countOptCombos(
		echoes,
		params.settings.lockedMainEchoId,
		"combos",
	);
	const rows = countOptCombos(echoes, params.settings.lockedMainEchoId, "rows");

	return {
		echoes,
		inventoryTotal,
		combos,
		rows,
		pruned: echoes.length < inventoryTotal,
	};
}
