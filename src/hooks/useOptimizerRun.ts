// Search execution state for the optimizer: filters, the pruned candidate
// inventory, the request plan, the worker run and its results.

import { DEF_ENEMY_PROF } from "@wuwacalc/core/domain/entities/enemy";
import type { EchoInstance } from "@wuwacalc/core/domain/entities/runtime";
import type { RotationNode } from "@wuwacalc/core/domain/gameData/contracts";
import type {
	OptPrgr,
	OptResultEntry,
	OptResultStats,
} from "@wuwacalc/core/engine/optimizer/types";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { type TranslationError, toEchoInstance } from "@/lib/calc/translate";

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

export function useOptimizerRun({
	coreReady,
	snapshot,
	team,
}: {
	coreReady: boolean;
	snapshot: AccountSnapshot;
	team: ReturnType<typeof useOptimizerTeam>;
}) {
	const {
		targetBuild,
		mateBuilds,
		mateOne,
		mateTwo,
		companionRuntimes,
		rotation,
		targetSkillId,
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
	const [phase, setPhase] = useState<"baseline" | "search" | null>(null);
	const [progress, setProgress] = useState<OptPrgr | null>(null);
	const [results, setResults] = useState<OptResultEntry[]>([]);
	// The equipped build's evaluated damage, snapshotted at run time so the
	// results row always matches the run it belongs to.
	const [baseline, setBaseline] = useState<OptimizerBaseline | null>(null);
	const [runError, setRunError] = useState<string | null>(null);
	const [expandedIndex, setExpandedIndex] = useState<
		number | "baseline" | null
	>(null);

	// Terminate optimizer workers when the tab is disposed.
	useEffect(() => () => disposeOptimizerRun(), []);

	// Request plan: the user's filters plus the pruned candidate inventory.
	// Kept in a memo so the counts shown in the UI match what a run would use.
	const plan = useMemo(() => {
		if (!coreReady || !targetBuild?.runtime) return null;
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
		resultsLimit,
		rotation,
		targetBuild,
		targetSkillId,
	]);

	const matesReady =
		mateBuilds.length === (mateOne ? 1 : 0) + (mateTwo ? 1 : 0);
	const hasTarget = Boolean(targetBuild?.runtime);
	const hasTargetMode = rotation != null || targetSkillId != null;
	const hasCandidates = (plan?.selection.echoes.length ?? 0) >= 5;

	// "Recommended": preselect the main stats the target's kit cares about
	// (stat-weight derived) and restrict candidates to max-level echoes.
	// Only ever applied on this explicit click.
	const applyRecommended = useCallback(() => {
		if (!targetBuild?.runtime) return;
		const recommended = deriveRecommendedMainStats(
			targetBuild.runtime,
			companionRuntimes,
		);
		setFilters((prev) => ({
			...prev,
			mainStats: recommended,
			minLevel: MAX_ECHO_LEVEL,
		}));
	}, [targetBuild, companionRuntimes]);

	const canRun =
		coreReady && hasTarget && hasTargetMode && matesReady && !running;

	const handleRun = useCallback(async () => {
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
	}, [companionRuntimes, mateOne, mateTwo, plan, rotation, targetBuild]);

	const handleCancel = useCallback(() => {
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
		hasCandidates,
		canRun,
		applyRecommended,
		handleRun,
		handleCancel,
		progressPercent,
	};
}
