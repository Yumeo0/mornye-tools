// Team-damage search: score a teammate's rotation while swapping the searched
// character's five echoes.
//
// The packed optimizer ranks combos by the optimized resonator's own damage,
// which is the wrong objective for a support: their value only shows up in a
// teammate's numbers. This module evaluates that directly - each candidate
// combo is applied to the searched character's runtime and the measured
// teammate's rotation runs through the same simulation the rotation optimizer
// compiles with, summing the measured teammate's optimizer-eligible damage
// rows.
//
// One evaluation costs a few milliseconds, so the search is a seeded local
// search (single-echo swaps plus main-echo moves) that yields to the event
// loop between slices and can be cancelled at any point.

import { getResSeedBy } from "@wuwacalc/core/data/catalog/resonatorSeedService";
import { getEchoCatBy } from "@wuwacalc/core/data/gameData/catalog/echoes";
import type { EnemyProfile } from "@wuwacalc/core/domain/entities/appState";
import type {
	EchoInstance,
	ResRuntime,
	TeamSlots,
} from "@wuwacalc/core/domain/entities/runtime";
import type { RotationNode } from "@wuwacalc/core/domain/gameData/contracts";
import { sumOptRotDmg } from "@wuwacalc/core/engine/optimizer/rules/eligibility";
import type { OptResultStats } from "@wuwacalc/core/engine/optimizer/types";
import { materializeResRotation } from "@wuwacalc/core/engine/pipeline/index";
import { makeSkillCtx } from "@wuwacalc/core/engine/pipeline/prepareRuntimeSkill";
import { makeRuntimeMap } from "@wuwacalc/core/engine/runtime/runtimeAdapters";

/** Cost ceiling for one legal five-echo build (4+3+3+1+1). */
export const TEAM_ECHO_COST_LIMIT = 12;

/** Echoes that enter the local search before the pool is ranked and sliced. */
export const TEAM_POOL_CAP = 220;

/** Total exact evaluations one team run may spend (~2 ms each). */
export const TEAM_MAX_EVALUATIONS = 6000;

/** Random restarts on top of the equipped and greedy seeds. */
export const TEAM_RANDOM_SEEDS = 3;

/** Evaluations between event-loop yields. */
const SLICE_EVALUATIONS = 24;

const EPSILON = 1e-6;

function echoCost(echo: EchoInstance): number {
	return getEchoCatBy()[echo.id]?.cost ?? 1;
}

export function comboCost(combo: readonly EchoInstance[]): number {
	return combo.reduce((total, echo) => total + echoCost(echo), 0);
}

/** Five distinct echoes within the cost ceiling. */
export function isLegalCombo(combo: readonly EchoInstance[]): boolean {
	if (combo.length !== 5) return false;
	if (new Set(combo.map((echo) => echo.uid)).size !== 5) return false;
	return comboCost(combo) <= TEAM_ECHO_COST_LIMIT;
}

/**
 * One combo order: index 0 is the main echo (the optimizer's result order),
 * the rest keep slot order for display only.
 */
export function comboKey(combo: readonly EchoInstance[]): string {
	const rest = combo
		.slice(1)
		.map((echo) => echo.uid)
		.sort()
		.join("|");
	return `${combo[0].uid}::${rest}`;
}

/** The runtime carrying one candidate combo; the first echo is the main one. */
export function withComboEchoes(
	runtime: ResRuntime,
	combo: readonly EchoInstance[],
): ResRuntime {
	return {
		...runtime,
		build: {
			...runtime.build,
			echoes: combo.map((echo, index) => ({
				...echo,
				mainEcho: index === 0,
			})),
		},
	};
}

export interface TeamMetricInput {
	/** Runtime of the character whose rotation is measured (the active one). */
	measured: ResRuntime;
	/** The runtime whose five echoes are searched. */
	searched: ResRuntime;
	/** Every other teammate, keyed by role id (excluding `searched`). */
	otherMates: Record<string, ResRuntime>;
	/** Team slots shared by every runtime, measured character first. */
	team: TeamSlots;
	/** Rotation of the measured character; `null` makes the metric unusable. */
	rotationItems: RotationNode[] | null;
	enemy: EnemyProfile;
}

export interface TeamMetric {
	/** Sum of the measured character's optimizer-eligible rotation damage. */
	score(combo: readonly EchoInstance[]): number;
	/** Final stats of the searched character for one combo (display only). */
	stats(combo: readonly EchoInstance[]): OptResultStats | null;
}

/** Build the exact team metric for one searched/measured character pair. */
export function createTeamMetric(input: TeamMetricInput): TeamMetric {
	const { measured, searched, otherMates, team, rotationItems, enemy } = input;
	if (!rotationItems || rotationItems.length === 0) {
		throw new Error("Team metric needs a rotation for the measured character");
	}

	const measuredRt: ResRuntime = {
		...measured,
		build: { ...measured.build, team },
	};
	// Participant map for the simulation: the fixed mates plus the searched
	// character carrying the candidate combo.
	const matesFor = (
		combo: readonly EchoInstance[],
	): Record<string, ResRuntime> => {
		const runtimes: Record<string, ResRuntime> = {};
		for (const [roleId, runtime] of Object.entries(otherMates)) {
			runtimes[roleId] = { ...runtime, build: { ...runtime.build, team } };
		}
		const primed = withComboEchoes(searched, combo);
		runtimes[searched.id] = { ...primed, build: { ...primed.build, team } };
		return runtimes;
	};

	const seed = getResSeedBy(measuredRt.id);

	return {
		score(combo) {
			if (!seed) return 0;
			const { entries } = materializeResRotation({
				runtime: measuredRt,
				seed,
				enemy,
				items: rotationItems,
				runtimesById: matesFor(combo),
				detail: "summary",
				captureEntries: true,
			});
			return sumOptRotDmg(entries, measuredRt.id);
		},
		stats(combo) {
			const runtime = withComboEchoes(searched, combo);
			const searchedSeed = getResSeedBy(runtime.id);
			if (!searchedSeed) return null;
			try {
				const { context } = makeSkillCtx({
					runtime,
					seed: searchedSeed,
					enemy,
					runtimesById: makeRuntimeMap(runtime, matesFor(combo)),
					selectedTargets: {},
				});
				const stats = context.finalStats;
				return {
					atk: stats.atk.final,
					hp: stats.hp.final,
					def: stats.def.final,
					er: stats.energyRegen,
					cr: stats.critRate * 100,
					cd: stats.critDmg * 100,
					bonus: stats.dmgBonus,
					amp: stats.amplify,
				};
			} catch {
				return null;
			}
		},
	};
}

export interface TeamPoolOptions {
	inventory: readonly EchoInstance[];
	/** Allowed sonata set ids; empty = every set. */
	allowedSetIds?: readonly number[];
	/** Allowed main-stat keys; empty = every main stat. */
	mainStatKeys?: readonly string[];
	/** Required substat keys (any-of); empty = any substats. */
	substatKeys?: readonly string[];
	/** Echoes that stay in the pool regardless of the filters. */
	alwaysKeep?: readonly EchoInstance[];
	/** Relevance score; decides which echoes survive the cap. */
	rank: (echo: EchoInstance) => number;
	/** Maximum pool size after ranking. */
	cap?: number;
}

export interface TeamPool {
	echoes: EchoInstance[];
	/** Inventory size before the filters. */
	inventoryTotal: number;
	/** Echoes that passed the filters (before the cap). */
	eligible: number;
}

/**
 * Candidate pool for a team search: the user's filters, then the most
 * relevant echoes up to the cap. Relevance is the caller's ranking (the role
 * guide for supports), because damage-weighted pruning would drop exactly the
 * ER/HP echoes a support search is after.
 */
export function selectTeamPool(options: TeamPoolOptions): TeamPool {
	const allowedSets = new Set(options.allowedSetIds ?? []);
	const wantedMains = new Set(options.mainStatKeys ?? []);
	const wantedSubstats = new Set(options.substatKeys ?? []);

	const eligible = options.inventory.filter((echo) => {
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

	const cap = options.cap ?? TEAM_POOL_CAP;
	const byUid = new Map<string, EchoInstance>();
	for (const echo of options.alwaysKeep ?? []) byUid.set(echo.uid, echo);
	const ranked = [...eligible].sort(
		(left, right) => options.rank(right) - options.rank(left),
	);
	for (const echo of ranked) {
		if (byUid.size >= cap) break;
		byUid.set(echo.uid, echo);
	}

	return {
		echoes: [...byUid.values()],
		inventoryTotal: options.inventory.length,
		eligible: eligible.length,
	};
}

export interface TeamSeedOptions {
	pool: readonly EchoInstance[];
	/** Ranked-echo score; higher is more relevant for the search. */
	rank: (echo: EchoInstance) => number;
	/** The currently equipped build, always evaluated first. */
	equipped: readonly EchoInstance[];
	randomSeeds?: number;
}

function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Cost plans a legal build can follow: one 4-cost plus two 3-costs and two
 * 1-costs, or no 4-cost at all.
 */
const COST_PLANS: number[][] = [
	[4, 3, 3, 1, 1],
	[3, 3, 3, 1, 1],
];

function pickByPlan(
	pool: readonly EchoInstance[],
	plan: readonly number[],
	rank: (echo: EchoInstance) => number,
	pick: (bucket: EchoInstance[]) => EchoInstance | null,
): EchoInstance[] | null {
	const used = new Set<string>();
	const combo: EchoInstance[] = [];
	for (const cost of plan) {
		const bucket = pool.filter(
			(echo) => echoCost(echo) === cost && !used.has(echo.uid),
		);
		const chosen =
			pick([...bucket].sort((left, right) => rank(right) - rank(left))) ?? null;
		if (!chosen) return null;
		used.add(chosen.uid);
		combo.push(chosen);
	}
	return combo;
}

/**
 * Starting combos for the local search: the equipped build, a greedy build per
 * cost plan, and a few random restarts so a bad equipped build cannot trap the
 * search in its own basin.
 */
export function buildTeamSeeds(options: TeamSeedOptions): EchoInstance[][] {
	const { pool, rank, equipped } = options;
	const seeds: EchoInstance[][] = [];
	const seen = new Set<string>();

	const push = (combo: EchoInstance[] | null) => {
		if (!combo || !isLegalCombo(combo)) return;
		const key = comboKey(combo);
		if (seen.has(key)) return;
		seen.add(key);
		seeds.push(combo);
	};

	if (equipped.length === 5) push([...equipped]);

	for (const plan of COST_PLANS) {
		push(pickByPlan(pool, plan, rank, (bucket) => bucket[0]));
	}

	const restarts = options.randomSeeds ?? TEAM_RANDOM_SEEDS;
	if (restarts > 0 && pool.length > 0) {
		const random = mulberry32(0x5eed ^ pool.length);
		for (let index = 0; index < restarts; index += 1) {
			const plan = COST_PLANS[index % COST_PLANS.length];
			push(
				pickByPlan(pool, plan, rank, (bucket) =>
					bucket.length === 0
						? null
						: bucket[Math.floor(random() * bucket.length)],
				),
			);
		}
	}

	return seeds;
}

export interface TeamSearchProgress {
	evaluations: number;
	maxEvaluations: number;
	best: number;
	bestSeed: number;
	/** Number of accepted improving moves so far. */
	moves: number;
}

export interface TeamSearchOptions {
	score: (combo: readonly EchoInstance[]) => number;
	pool: readonly EchoInstance[];
	seeds: readonly EchoInstance[][];
	maxEvaluations?: number;
	/** Results kept in the ranked output. */
	resultsLimit?: number;
	onProgress?: (progress: TeamSearchProgress) => void;
	isCancelled?: () => boolean;
}

export interface TeamSearchEntry {
	combo: EchoInstance[];
	score: number;
}

export interface TeamSearchOutcome {
	/** Every distinct combo that was evaluated, best first. */
	ranked: TeamSearchEntry[];
	evaluations: number;
	/** Best score among the seeds (the search's starting point). */
	seedBest: number;
	cancelled: boolean;
}

const waitForLoop = () =>
	new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Seeded local search over the exact team metric. First-improvement single
 * swaps run over every slot; when swaps stall, the main echo moves between
 * slots. Every evaluated combo is cached and kept for the ranked output.
 */
export async function runTeamSearch(
	options: TeamSearchOptions,
): Promise<TeamSearchOutcome> {
	const {
		score,
		pool,
		seeds,
		maxEvaluations = TEAM_MAX_EVALUATIONS,
		resultsLimit = Number.POSITIVE_INFINITY,
		onProgress,
		isCancelled,
	} = options;

	const cache = new Map<string, number>();
	const evaluated: TeamSearchEntry[] = [];
	let evaluations = 0;
	let moves = 0;
	let cancelled = false;

	const evaluate = (combo: readonly EchoInstance[]): number => {
		const key = comboKey(combo);
		const cached = cache.get(key);
		if (cached !== undefined) return cached;
		evaluations += 1;
		const value = score(combo);
		cache.set(key, value);
		evaluated.push({ combo: [...combo], score: value });
		return value;
	};

	const stop = () => cancelled || (isCancelled?.() ?? false);

	// Seeds first: they anchor the search and give the baseline for progress.
	let best: TeamSearchEntry | null = null;
	for (const seed of seeds) {
		const value = evaluate(seed);
		if (!best || value > best.score) best = { combo: [...seed], score: value };
	}
	const seedBest = best?.score ?? 0;
	onProgress?.({
		evaluations,
		maxEvaluations,
		best: best?.score ?? 0,
		bestSeed: seedBest,
		moves,
	});

	if (!best) {
		return { ranked: [], evaluations, seedBest, cancelled: false };
	}

	let current = best.combo;
	let currentScore = best.score;

	const moveToMain = (combo: EchoInstance[], slot: number): EchoInstance[] => [
		combo[slot],
		...combo.filter((_, index) => index !== slot),
	];

	while (evaluations < maxEvaluations && !stop()) {
		let improved = false;
		let sliceCount = 0;

		for (let slot = 0; slot < 5 && !stop(); slot += 1) {
			for (const candidate of pool) {
				if (evaluations >= maxEvaluations || stop()) break;
				if (candidate.uid === current[slot].uid) continue;
				const next = [...current];
				next[slot] = candidate;
				if (!isLegalCombo(next)) continue;
				const nextScore = evaluate(next);
				sliceCount += 1;
				if (sliceCount >= SLICE_EVALUATIONS) {
					sliceCount = 0;
					onProgress?.({
						evaluations,
						maxEvaluations,
						best: Math.max(currentScore, best?.score ?? 0),
						bestSeed: seedBest,
						moves,
					});
					await waitForLoop();
				}
				if (nextScore > currentScore + EPSILON) {
					current = next;
					currentScore = nextScore;
					moves += 1;
					improved = true;
					break;
				}
			}
		}

		// Swaps stalled: try every other echo as the main one.
		if (!improved && !stop() && evaluations < maxEvaluations) {
			let bestSlot = -1;
			let bestMainScore = currentScore;
			for (let slot = 1; slot < 5; slot += 1) {
				if (evaluations >= maxEvaluations || stop()) break;
				const candidate = moveToMain(current, slot);
				const value = evaluate(candidate);
				if (value > bestMainScore + EPSILON) {
					bestMainScore = value;
					bestSlot = slot;
				}
			}
			if (bestSlot > 0) {
				current = moveToMain(current, bestSlot);
				currentScore = bestMainScore;
				moves += 1;
				improved = true;
			}
		}

		if (!improved) break;
	}

	cancelled = stop();

	const ranked = [...evaluated]
		.sort((left, right) => right.score - left.score)
		.slice(0, Number.isFinite(resultsLimit) ? resultsLimit : undefined);

	onProgress?.({
		evaluations,
		maxEvaluations,
		best: ranked[0]?.score ?? 0,
		bestSeed: seedBest,
		moves,
	});

	return { ranked, evaluations, seedBest, cancelled };
}
