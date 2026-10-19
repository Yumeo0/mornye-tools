// Search execution state for the optimizer: filters, the pruned candidate
// inventory, the request plan, the worker run and its results.
//
// Two modes share this hook:
// - `damage` searches a character's own best build (the packed optimizer).
// - `team` searches a support's best build by scoring a teammate's rotation
//   (the exact team metric in `teamOptimizer.ts`).

import { DEF_ENEMY_PROF } from "@wuwacalc/core/domain/entities/enemy";
import type {
	EchoInstance,
	ResRuntime,
	TeamSlots,
} from "@wuwacalc/core/domain/entities/runtime";
import type { RotationNode } from "@wuwacalc/core/domain/gameData/contracts";
import { countOptCombos } from "@wuwacalc/core/engine/optimizer/search/counting";
import type {
	OptPrgr,
	OptResultEntry,
	OptResultStats,
} from "@wuwacalc/core/engine/optimizer/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	DEFAULT_RESULTS_LIMIT,
	EMPTY_OPTIMIZER_FILTERS,
	MAX_ECHO_LEVEL,
	type OptimizerFilters,
} from "@/components/optimizer/optimizerOptions";
import type { useOptimizerTeam } from "@/hooks/useOptimizerTeam";
import type { AccountSnapshot, Echo } from "@/lib/account";
import {
	cancelOptimizerRun,
	deriveRecommendedMainStats,
	disposeOptimizerRun,
	isOptimizerAbort,
	makeOptimizerInput,
	makeOptimizerSettings,
	runOptimizerBaseline,
	runOptimizerSearch,
	selectOptimizerCandidates,
} from "@/lib/calc/optimizer";
import {
	guideMainStatKeys,
	supportEchoScore,
	supportGuideFor,
} from "@/lib/calc/supportGuide";
import {
	buildTeamSeeds,
	createTeamMetric,
	isLegalCombo,
	runTeamSearch,
	selectTeamPool,
	TEAM_MAX_EVALUATIONS,
	type TeamSearchProgress,
} from "@/lib/calc/teamOptimizer";
import { type TranslationError, toEchoInstance } from "@/lib/calc/translate";

/** Which objective a run maximizes. */
export type OptimizerMode = "damage" | "team";

/** Result rows that get a displayed stat line in team mode (stat reads cost). */
const TEAM_STATS_ROWS = 64;

/** The equipped build's damage, snapshotted at run time. */
export interface OptimizerBaseline {
	damage: number;
	stats: OptResultStats | null;
	uids: string[];
}

export function hasWebGpu(): boolean {
	return (
		typeof navigator !== "undefined" &&
		(navigator as Navigator & { gpu?: unknown }).gpu != null
	);
}

const waitForLoop = () =>
	new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Map one exact-search progress snapshot onto the shared progress shape. */
function toTeamProgress(
	teamProgress: TeamSearchProgress,
	startedAt: number,
): OptPrgr {
	const elapsedMs = performance.now() - startedAt;
	const total = Math.max(1, teamProgress.maxEvaluations);
	const processed = teamProgress.evaluations;
	return {
		progress: Math.min(1, processed / total),
		elapsedMs,
		remainingMs:
			processed > 0 ? (elapsedMs / processed) * (total - processed) : 0,
		processed,
		speed: elapsedMs > 0 ? processed / (elapsedMs / 1000) : 0,
		total,
	};
}

export function useOptimizerRun({
	coreReady,
	snapshot,
	team,
	mode,
}: {
	coreReady: boolean;
	snapshot: AccountSnapshot;
	team: ReturnType<typeof useOptimizerTeam>;
	/** The search objective. */
	mode: OptimizerMode;
}) {
	const {
		targetBuild,
		mateBuilds,
		mateOne,
		mateTwo,
		companionRuntimes,
		rotation,
		targetSkillId,
		measuredBuild,
	} = team;

	const [filters, setFilters] = useState<OptimizerFilters>(
		EMPTY_OPTIMIZER_FILTERS,
	);

	const targetResonatorId = targetBuild?.resonator.id ?? null;

	// Candidate inventory and translation errors in one pass: every echo is
	// translated once, errors are collected for the whole account, and only
	// the echoes passing the equipped/level filters enter the pool.
	const { inventory, inventoryErrors } = useMemo(() => {
		const inventory: EchoInstance[] = [];
		const inventoryErrors: TranslationError[] = [];
		if (!coreReady) return { inventory, inventoryErrors };
		for (const echo of snapshot.echoes) {
			const { instance, error } = toEchoInstance(echo);
			if (error) inventoryErrors.push(error);
			if (!instance) continue;
			if (echo.level < filters.minLevel) continue;
			if (echo.equippedBy != null) {
				if (filters.equipped === "exclude-all") continue;
				if (
					filters.equipped === "exclude-others" &&
					echo.equippedBy !== targetResonatorId
				) {
					continue;
				}
			}
			inventory.push(instance);
		}
		return { inventory, inventoryErrors };
	}, [
		coreReady,
		snapshot.echoes,
		filters.equipped,
		filters.minLevel,
		targetResonatorId,
	]);

	const echoByUid = useMemo(() => {
		const map = new Map<string, Echo>();
		for (const echo of snapshot.echoes) {
			map.set(`incr:${echo.incrId}`, echo);
		}
		return map;
	}, [snapshot.echoes]);

	const selectionErrors = useMemo(() => {
		const errors: TranslationError[] = [];
		if (targetBuild) errors.push(...targetBuild.errors);
		for (const mate of mateBuilds) errors.push(...mate.errors);
		return errors;
	}, [targetBuild, mateBuilds]);

	const [resultsLimit, setResultsLimit] = useState(DEFAULT_RESULTS_LIMIT);
	const [engine, setEngine] = useState<"gpu" | "cpu">(
		hasWebGpu() ? "gpu" : "cpu",
	);

	const [running, setRunning] = useState(false);
	const [phase, setPhase] = useState<
		"baseline" | "search" | "team" | "stats" | null
	>(null);
	const [progress, setProgress] = useState<OptPrgr | null>(null);
	const [results, setResults] = useState<OptResultEntry[]>([]);
	// The equipped build's evaluated damage, snapshotted at run time so the
	// results row always matches the run it belongs to.
	const [baseline, setBaseline] = useState<OptimizerBaseline | null>(null);
	const [runError, setRunError] = useState<string | null>(null);
	const [expandedIndex, setExpandedIndex] = useState<
		number | "baseline" | null
	>(null);
	// Cooperative cancellation for the exact team search.
	const cancelRef = useRef(false);

	// Terminate optimizer workers when the tab is disposed.
	useEffect(() => () => disposeOptimizerRun(), []);

	// Request plan: the user's filters plus the pruned candidate inventory.
	// Kept in a memo so the counts shown in the UI match what a run would use.
	const plan = useMemo(() => {
		if (mode !== "damage" || !coreReady || !targetBuild?.runtime) return null;
		const equipped = targetBuild.echoes.filter(
			(echo): echo is EchoInstance => echo != null,
		);
		const settings = makeOptimizerSettings({
			rotationAvailable: rotation != null,
			targetSkillId,
			resultsLimit,
			enableGpu: engine === "gpu",
			mainStatKeys: filters.mainStats,
			allowedSetIds: filters.sets
				.map((value) => Number.parseInt(value, 10))
				.filter(Number.isFinite),
		});
		const selection = selectOptimizerCandidates({
			inventory,
			// The equipped build stays searchable unless the user excludes it.
			alwaysKeep: filters.equipped === "exclude-all" ? [] : equipped,
			settings,
			targetRuntime: targetBuild.runtime,
			companionRuntimes,
			mainStatKeys: filters.mainStats,
			substatKeys: filters.substats,
		});
		// Clamped by `runOptimizerBaseline`; -1 (no main echo) is fine here.
		const mainIndex = equipped.findIndex((echo) => echo.mainEcho);
		return { settings, selection, equipped, mainIndex };
	}, [
		companionRuntimes,
		coreReady,
		engine,
		filters,
		inventory,
		mode,
		resultsLimit,
		rotation,
		targetBuild,
		targetSkillId,
	]);

	// Team plan: the guide-ranked candidate pool the exact search walks.
	const teamPlan = useMemo(() => {
		if (mode !== "team" || !coreReady || !targetBuild?.runtime) return null;
		const equipped = targetBuild.echoes.filter(
			(echo): echo is EchoInstance => echo != null,
		);
		const guide = supportGuideFor(Number(targetBuild.roleId));
		const rank = (echo: EchoInstance) => supportEchoScore(echo, guide);
		const pool = selectTeamPool({
			inventory,
			// The equipped build stays searchable unless the user excludes it.
			alwaysKeep: filters.equipped === "exclude-all" ? [] : equipped,
			allowedSetIds: filters.sets
				.map((value) => Number.parseInt(value, 10))
				.filter(Number.isFinite),
			mainStatKeys: filters.mainStats,
			substatKeys: filters.substats,
			rank,
		});
		return { equipped, guide, rank, pool };
	}, [coreReady, filters, inventory, mode, targetBuild]);

	// Counts for the filter row: packed selection in damage mode, the guide
	// ranked team pool in team mode.
	const counts = useMemo(() => {
		if (mode === "team") {
			if (!teamPlan) return null;
			return {
				eligible: teamPlan.pool.echoes.length,
				total: teamPlan.pool.inventoryTotal,
				combos: countOptCombos(teamPlan.pool.echoes, null, "combos"),
			};
		}
		if (!plan) return null;
		return {
			eligible: plan.selection.echoes.length,
			total: plan.selection.inventoryTotal,
			combos: plan.selection.combos,
		};
	}, [mode, plan, teamPlan]);

	const matesReady =
		mateBuilds.length === (mateOne ? 1 : 0) + (mateTwo ? 1 : 0);
	const hasTarget = Boolean(targetBuild?.runtime);
	const hasTargetMode =
		mode === "team"
			? rotation != null
			: rotation != null || targetSkillId != null;
	const hasCandidates =
		mode === "team"
			? (teamPlan?.pool.echoes.length ?? 0) >= 5
			: (plan?.selection.echoes.length ?? 0) >= 5;
	const measuredReady = mode !== "team" || Boolean(measuredBuild?.runtime);

	// "Recommended": preselect the main stats this character's kit cares about
	// and restrict candidates to max-level echoes. In team mode the shipped
	// role guide leads (its mains are what the buffs scale with); the packed
	// stat-weight derivation leads otherwise. Only ever applied on this click.
	const applyRecommended = useCallback(() => {
		if (!targetBuild?.runtime) return;
		const recommended =
			mode === "team"
				? (() => {
						const guideKeys = guideMainStatKeys(Number(targetBuild.roleId));
						return guideKeys.length > 0
							? guideKeys
							: deriveRecommendedMainStats(
									targetBuild.runtime,
									companionRuntimes,
								);
					})()
				: deriveRecommendedMainStats(targetBuild.runtime, companionRuntimes);
		setFilters((prev) => ({
			...prev,
			mainStats: recommended,
			minLevel: MAX_ECHO_LEVEL,
		}));
	}, [companionRuntimes, mode, targetBuild]);

	const canRun =
		coreReady &&
		hasTarget &&
		hasTargetMode &&
		matesReady &&
		hasCandidates &&
		measuredReady &&
		!running;

	const handleRun = useCallback(async () => {
		if (mode === "team") {
			if (
				!teamPlan ||
				!targetBuild?.runtime ||
				!measuredBuild?.runtime ||
				!rotation
			) {
				return;
			}

			// The measured teammate is the active runtime of the simulation;
			// the searched character and the remaining mate follow.
			const otherMate = mateBuilds.find(
				(mate) => mate.roleId !== measuredBuild.roleId,
			);
			const teamSlots: TeamSlots = [
				measuredBuild.roleId,
				targetBuild.roleId,
				otherMate?.roleId ?? null,
			];
			const otherMates: Record<string, ResRuntime> = {};
			for (const mate of mateBuilds) {
				if (mate.roleId === measuredBuild.roleId || !mate.runtime) continue;
				otherMates[mate.roleId] = mate.runtime;
			}

			const metric = createTeamMetric({
				measured: measuredBuild.runtime,
				searched: targetBuild.runtime,
				otherMates,
				team: teamSlots,
				rotationItems: rotation.items as RotationNode[],
				enemy: DEF_ENEMY_PROF,
			});

			cancelRef.current = false;
			setRunning(true);
			setRunError(null);
			setResults([]);
			setBaseline(null);
			setProgress(null);
			setExpandedIndex(null);
			const startedAt = performance.now();

			try {
				const equipped = teamPlan.equipped;
				setPhase("baseline");
				if (equipped.length === 5 && isLegalCombo(equipped)) {
					setBaseline({
						damage: metric.score(equipped),
						stats: metric.stats(equipped),
						uids: equipped.map((echo) => echo.uid),
					});
				}

				setPhase("team");
				const outcome = await runTeamSearch({
					score: (combo) => metric.score(combo),
					pool: teamPlan.pool.echoes,
					seeds: buildTeamSeeds({
						pool: teamPlan.pool.echoes,
						rank: teamPlan.rank,
						equipped,
					}),
					maxEvaluations: TEAM_MAX_EVALUATIONS,
					resultsLimit,
					isCancelled: () => cancelRef.current,
					onProgress: (next) => setProgress(toTeamProgress(next, startedAt)),
				});
				if (cancelRef.current) return;

				// Stat lines are display-only: only the visible rows pay for them.
				setPhase("stats");
				const rows: OptResultEntry[] = [];
				for (const [index, entry] of outcome.ranked.entries()) {
					if (index >= resultsLimit) break;
					rows.push({
						uids: entry.combo.map((echo) => echo.uid),
						damage: entry.score,
						stats: index < TEAM_STATS_ROWS ? metric.stats(entry.combo) : null,
					});
					if (index % 16 === 15) await waitForLoop();
				}
				setResults(rows);
			} catch (error) {
				if (!isOptimizerAbort(error)) {
					setRunError(error instanceof Error ? error.message : String(error));
				}
			} finally {
				setRunning(false);
				setPhase(null);
				setProgress(null);
			}
			return;
		}

		if (!plan || !targetBuild?.runtime) return;
		const mateRoleIds: [string | null, string | null] = [
			mateOne || null,
			mateTwo || null,
		];
		const input = makeOptimizerInput({
			targetRoleId: targetBuild.roleId,
			targetRuntime: targetBuild.runtime,
			mateRoleIds,
			companionRuntimes,
			rotationItems: rotation ? (rotation.items as RotationNode[]) : null,
			settings: plan.settings,
			inventory: plan.selection.echoes,
			enemyProfile: DEF_ENEMY_PROF,
		});

		setRunning(true);
		setRunError(null);
		setResults([]);
		setBaseline(null);
		setProgress(null);
		setExpandedIndex(null);
		try {
			// Baseline first (same metric and worker as the search): the equipped
			// build scored through the optimizer's own evaluator, so it is
			// directly comparable to the result damages.
			setPhase("baseline");
			const baselineResult = await runOptimizerBaseline(
				input,
				plan.equipped,
				plan.mainIndex,
			);
			setBaseline(
				baselineResult
					? {
							damage: baselineResult.damage,
							stats: baselineResult.stats,
							uids: plan.equipped.map((echo) => echo.uid),
						}
					: null,
			);

			setPhase("search");
			const found = await runOptimizerSearch(input, {
				onProgress: (next) => setProgress(next),
			});
			setResults(found);
		} catch (error) {
			if (!isOptimizerAbort(error)) {
				setRunError(error instanceof Error ? error.message : String(error));
			}
		} finally {
			setRunning(false);
			setPhase(null);
			setProgress(null);
		}
	}, [
		companionRuntimes,
		mateBuilds,
		mateOne,
		mateTwo,
		measuredBuild,
		mode,
		plan,
		resultsLimit,
		rotation,
		targetBuild,
		teamPlan,
	]);

	const handleCancel = useCallback(() => {
		cancelRef.current = true;
		cancelOptimizerRun();
		setRunning(false);
		setProgress(null);
	}, []);

	const progressPercent = progress
		? Math.round(Math.min(1, Math.max(0, progress.progress)) * 100)
		: 0;

	return {
		filters,
		setFilters,
		inventory,
		inventoryErrors,
		echoByUid,
		selectionErrors,
		resultsLimit,
		setResultsLimit,
		engine,
		setEngine,
		gpuAvailable: hasWebGpu(),
		running,
		phase,
		progress,
		results,
		baseline,
		runError,
		expandedIndex,
		setExpandedIndex,
		plan,
		teamPlan,
		counts,
		hasCandidates,
		measuredReady,
		canRun,
		applyRecommended,
		handleRun,
		handleCancel,
		progressPercent,
	};
}
