import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	EMPTY_OPTIMIZER_FILTERS,
	type OptimizerFilters,
} from "@/components/optimizer/optimizerOptions";
import type { AccountSnapshot } from "@/lib/account";
import { evaluateScenario, startSearch } from "@/lib/calc/core";
import { selectCandidates } from "@/lib/calc/optimizer";
import { aliasRoleId, inventoryRevision } from "@/lib/calc/translate";
import type {
	OptResultEntry,
	Scenario,
	SearchUpdate,
	SimulationResult,
} from "@/lib/calc/types";
import { optimizerFiltersSchema } from "@/lib/filterSchemas";
import { useOptimizerPreferences } from "@/lib/optimizerPreferences";
import {
	type ExpandedOptimizerResult,
	matchingOptimizerRun,
	type OptimizerResultContext,
	optimizerRunSelectionKey,
	optimizerRunStateKey,
	type SavedOptimizerRun,
	savedOptimizerRunSchema,
} from "@/lib/optimizerRunState";
import { useFilterState } from "@/lib/persistentState";
import type { useOptimizerTeam } from "./useOptimizerTeam";
export type OptimizerMode = "damage" | "team";
export type OptimizerBaseline = OptResultEntry;

export function useOptimizerRun(
	snapshot: AccountSnapshot,
	team: ReturnType<typeof useOptimizerTeam>,
	mode: OptimizerMode,
) {
	const [filters, setFilters] = useFilterState<OptimizerFilters>(
		"optimizer.filters",
		EMPTY_OPTIMIZER_FILTERS,
		optimizerFiltersSchema,
	);
	const { preferences } = useOptimizerPreferences();
	const [savedRun, setSavedRun] = useFilterState<SavedOptimizerRun | null>(
		optimizerRunStateKey(snapshot.profile?.id),
		null,
		savedOptimizerRunSchema,
	);
	const revision = useMemo(() => inventoryRevision(snapshot), [snapshot]);
	const scenario = useMemo<Scenario | null>(
		() =>
			team.profile && team.targetId
				? {
						profileId: team.profile.id,
						members: team.members,
						cycles: 4,
						...(team.profile.customRotation
							? { rotation: team.profile.customRotation }
							: {}),
					}
				: null,
		[team.profile, team.members, team.targetId],
	);
	const selectionKey = optimizerRunSelectionKey({
		catalogRevision: team.catalogRevision,
		revision,
		scenario,
		targetId: team.targetId,
		mode,
		filters,
		resultsLimit: preferences.resultsLimit,
	});
	const latestKey = useRef(selectionKey);
	latestKey.current = selectionKey;
	const [running, setRunning] = useState(false);
	const [liveUpdate, setUpdate] = useState<SearchUpdate | null>(null);
	const [evaluation, setEvaluation] = useState<SimulationResult | null>(null);
	const [evaluationError, setEvaluationError] = useState<string | null>(null);
	const [liveRunError, setRunError] = useState<string | null>(null);
	const [liveExpandedIndex, setLiveExpandedIndex] =
		useState<ExpandedOptimizerResult>(null);
	const cancel = useRef<(() => void) | null>(null);
	const generation = useRef(0);
	const [context, setContext] = useState<OptimizerResultContext | null>(null);
	const profileId = snapshot.profile?.id ?? null;
	const roleId =
		snapshot.resonators.find((r) => Number(aliasRoleId(r.id)) === team.targetId)
			?.id ?? team.targetId;
	const restored =
		scenario && team.catalogRevision
			? matchingOptimizerRun(savedRun, { key: selectionKey, profileId, roleId })
			: null;
	const hasLiveContext = context?.key === selectionKey;
	const update = hasLiveContext ? liveUpdate : (restored?.update ?? null);
	const runError = hasLiveContext ? liveRunError : (restored?.error ?? null);
	const expandedIndex = hasLiveContext
		? liveExpandedIndex
		: (restored?.expandedIndex ?? null);
	const latestExpanded = useRef(expandedIndex);
	latestExpanded.current = expandedIndex;
	const setExpandedIndex = (index: ExpandedOptimizerResult) => {
		setLiveExpandedIndex(index);
		latestExpanded.current = index;
		if (restored && !running)
			setSavedRun((previous) =>
				previous?.key === selectionKey
					? { ...previous, expandedIndex: index }
					: previous,
			);
	};
	const pool = useMemo(
		() =>
			team.profile && team.targetId
				? selectCandidates(
						snapshot,
						team.profile,
						team.members,
						team.targetId,
						filters,
					)
				: null,
		[snapshot, team.profile, team.members, team.targetId, filters],
	);
	const errors = [...team.errors];
	if (team.profile)
		for (const [i, m] of team.members.entries())
			if (m.characterId !== team.targetId && m.echoSource !== "rotation") {
				const d = team.profile.members[i];
				if (m.echoes.length !== 5 || m.echoes[0]?.typeId !== d.mainEcho.typeId)
					errors.push(
						`${d.name}: equip five echoes with ${d.mainEcho.name} in slot one.`,
					);
			}
	const canRun =
		!!scenario && !errors.length && !!pool?.mainCount && pool.pool.length >= 5;
	// biome-ignore lint/correctness/useExhaustiveDependencies: Every scenario/filter revision invalidates an in-flight run, even if no other effect input changes.
	useEffect(() => {
		generation.current++;
		cancel.current?.();
		cancel.current = null;
		setRunning(false);
		setUpdate(null);
		setContext(null);
		setRunError(null);
		setLiveExpandedIndex(null);
	}, [selectionKey]);
	useEffect(() => () => cancel.current?.(), []);
	// Preview and search resolve the same fixed teammate rotation stats.
	useEffect(() => {
		setEvaluation(null);
		setEvaluationError(null);
		if (!scenario || team.errors.length) return;
		// There is no equipped baseline for an unowned target (or an unequipped
		// owned target). Candidate simulations supply their stats and ER after search.
		if (
			!scenario.members.find((m) => m.characterId === team.targetId)?.echoes
				.length
		)
			return;
		let live = true;
		const stop = evaluateScenario(
			scenario,
			(value, error) => {
				if (live) {
					setEvaluation(value);
					setEvaluationError(error);
				}
			},
			team.targetId,
		);
		return () => {
			live = false;
			stop();
		};
	}, [scenario, team.errors.length, team.targetId]);
	const handleCancel = useCallback(() => {
		generation.current++;
		cancel.current?.();
		cancel.current = null;
		setRunning(false);
		if (context?.key === selectionKey && liveUpdate) {
			const stopped: SearchUpdate = { ...liveUpdate, status: "cancelled" };
			setUpdate(stopped);
			setSavedRun({
				key: context.key,
				profileId: context.profileId,
				roleId: context.roleId,
				update: stopped,
				error: liveRunError,
				expandedIndex: latestExpanded.current,
			});
		}
	}, [context, selectionKey, liveUpdate, liveRunError, setSavedRun]);
	const handleRun = () => {
		if (!canRun || !scenario || !pool) return;
		const key = selectionKey;
		const token = ++generation.current;
		setRunning(true);
		setRunError(null);
		setUpdate(null);
		setLiveExpandedIndex(null);
		latestExpanded.current = null;
		const runContext = {
			profileId,
			roleId,
			revision,
			key,
		};
		setContext(runContext);
		cancel.current = startSearch(
			{
				scenario,
				targetId: team.targetId,
				objective:
					mode === "team"
						? { kind: "teamDamage" }
						: { kind: "memberDamage", characterId: team.targetId },
				inventory: pool.pool,
				mainTypeId: team.profile!.members.find(
					(m) => m.characterId === team.targetId,
				)!.mainEcho.typeId,
				resultsLimit: preferences.resultsLimit,
				budget: 1500,
			},
			(value) => {
				if (latestKey.current === key && generation.current === token)
					setUpdate(value);
			},
			(value) => {
				if (latestKey.current !== key || generation.current !== token) return;
				setUpdate(value);
				setRunning(false);
				cancel.current = null;
				const error = !value.results.length
					? "No feasible build found within this search budget. Check resource diagnostics and inventory filters."
					: null;
				setRunError(error);
				setSavedRun({
					key,
					profileId: runContext.profileId,
					roleId: runContext.roleId,
					update: value,
					error,
					expandedIndex: latestExpanded.current,
				});
			},
			(message) => {
				if (latestKey.current !== key || generation.current !== token) return;
				setRunError(message);
				setRunning(false);
				cancel.current = null;
			},
		);
	};
	return {
		filters,
		setFilters,
		pool,
		errors,
		canRun,
		running,
		handleCancel,
		handleRun,
		runError,
		update,
		evaluation,
		evaluationError,
		expandedIndex,
		setExpandedIndex,
		resultContext: hasLiveContext
			? context
			: restored
				? {
						profileId: restored.profileId,
						roleId: restored.roleId,
						revision,
						key: selectionKey,
					}
				: null,
		revision,
		echoByUid: useMemo(
			() => new Map(snapshot.echoes.map((e) => [`incr:${e.incrId}`, e])),
			[snapshot.echoes],
		),
	};
}
