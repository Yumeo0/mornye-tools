// Optimizer tab: search the captured echo inventory for the best five-echo
// build of one resonator inside a specific team and rotation.
//
// Everything here is presentation and request wiring; the damage model and the
// search itself stay in `@wuwacalc/core` (see `src/lib/calc/optimizer.ts`).

import { listResRttn } from "@wuwacalc/core/data/catalog/gameDataService";
import { DEF_ENEMY_PROF } from "@wuwacalc/core/domain/entities/enemy";
import type {
	EchoInstance,
	ResRuntime,
	TeamSlots,
} from "@wuwacalc/core/domain/entities/runtime";
import type {
	RotationNode,
	RotDef,
} from "@wuwacalc/core/domain/gameData/contracts";
import { listOptTrgt } from "@wuwacalc/core/engine/optimizer/target/skills";
import type {
	OptPrgr,
	OptResultEntry,
	OptResultStats,
} from "@wuwacalc/core/engine/optimizer/types";
import { ChevronDown, ChevronRight, Play, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	charactersById,
	EchoCard,
	echoCost,
	echoImage,
	echoName,
	sonataIcon128,
} from "@/components/echo/EchoCard";
import {
	type FilterOption,
	FilterSelect,
	MultiFilterSelect,
} from "@/components/tabs/FilterControls";
import { CardBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { type Echo, STAT_LABELS, type StatKey } from "@/lib/account";
import { ensureCoreReady, isCoreReady } from "@/lib/calc/core";
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
	withTeam,
} from "@/lib/calc/optimizer";
import {
	type AccountTranslation,
	type TranslatedBuild,
	type TranslationError,
	toEchoInstance,
	translateAccount,
} from "@/lib/calc/translate";
import {
	reviveString,
	reviveStringArray,
	usePersistedState,
} from "@/lib/persisted";
import { statIconAsset } from "@/lib/stats";
import { useAccountSnapshot } from "@/lib/useAccountSnapshot";
import echoData from "../../configs/echo_data.json";

const DEFAULT_RESULTS_LIMIT = 128;
const MIN_RESULTS_LIMIT = 8;
const MAX_RESULTS_LIMIT = 65536;
const EMPTY_TRANSLATION: AccountTranslation = { builds: [], errors: [] };

// --- Candidate filters -------------------------------------------------------
//
// The optimizer never assumes which echoes are interesting: the user picks the
// candidate pool explicitly (the "Recommended" button applies the derived
// main stats on request). Empty selections mean "no restriction"; echoes
// beyond the search-space cap are still ranked by stat weight (a technical
// necessity, see `selectOptimizerCandidates`).

/** Which equipped echoes may enter the candidate pool. */
type EquippedMode = "include" | "exclude-others" | "exclude-all";

const EQUIPPED_OPTIONS: FilterOption[] = [
	{ value: "include", label: "All echoes" },
	{ value: "exclude-others", label: "Exclude other resonators" },
	{ value: "exclude-all", label: "Exclude all equipped" },
];

const MAX_ECHO_LEVEL = 25;

interface OptimizerFilters {
	equipped: EquippedMode;
	/** Minimum echo level (+0 … +25); 0 = no restriction. */
	minLevel: number;
	/** Allowed sonata set ids (as strings); empty = every set. */
	sets: string[];
	/** Allowed main-stat keys; empty = every main stat. */
	mainStats: string[];
	/** Candidates must include one of these substats; empty = any substats. */
	substats: string[];
}

const EMPTY_OPTIMIZER_FILTERS: OptimizerFilters = {
	equipped: "include",
	minLevel: 0,
	sets: [],
	mainStats: [],
	substats: [],
};

function reviveOptimizerFilters(value: unknown): OptimizerFilters {
	if (typeof value !== "object" || value === null) {
		return EMPTY_OPTIMIZER_FILTERS;
	}
	const raw = value as Partial<OptimizerFilters>;
	return {
		equipped:
			raw.equipped === "exclude-others" || raw.equipped === "exclude-all"
				? raw.equipped
				: "include",
		minLevel:
			typeof raw.minLevel === "number"
				? Math.min(MAX_ECHO_LEVEL, Math.max(0, Math.round(raw.minLevel)))
				: 0,
		sets: reviveStringArray(raw.sets),
		mainStats: reviveStringArray(raw.mainStats).filter((key) =>
			MAIN_STAT_KEYS_SET.has(key),
		),
		substats: reviveStringArray(raw.substats).filter((key) =>
			SUBSTAT_KEYS_SET.has(key),
		),
	};
}

/** Main-stat keys an echo can actually roll as its main stat. */
const MAIN_STAT_KEYS: StatKey[] = [
	"atkPercent",
	"hpPercent",
	"defPercent",
	"energyRegen",
	"critRate",
	"critDmg",
	"healingBonus",
	"aero",
	"glacio",
	"electro",
	"fusion",
	"spectro",
	"havoc",
];
const MAIN_STAT_KEYS_SET = new Set<string>(MAIN_STAT_KEYS);

const SUBSTAT_KEYS = Object.keys(STAT_LABELS) as StatKey[];
const SUBSTAT_KEYS_SET = new Set<string>(SUBSTAT_KEYS);

function statOption(key: StatKey): FilterOption {
	return {
		value: key,
		label: STAT_LABELS[key],
		icon: statIconAsset(STAT_LABELS[key]),
	};
}

const mainStatOptions: FilterOption[] = MAIN_STAT_KEYS.map(statOption);
const substatOptions: FilterOption[] = SUBSTAT_KEYS.map(statOption);

// Sonata set options from the echo catalog (id-keyed, like the inventory).
interface EchoSetEntry {
	id: number;
	name: string;
	icon: string;
}

const echoSetsById = new Map<number, EchoSetEntry>();
for (const entry of echoData as { echo_sets?: EchoSetEntry[] }[]) {
	for (const set of entry.echo_sets ?? []) {
		if (!echoSetsById.has(set.id)) echoSetsById.set(set.id, set);
	}
}
const optimizerSetOptions: FilterOption[] = [...echoSetsById.values()]
	.sort((a, b) => a.name.localeCompare(b.name))
	.map((set) => ({
		value: String(set.id),
		label: set.name,
		icon: sonataIcon128(set.icon),
	}));

const reviveResultsLimit = (value: unknown): number => {
	const next =
		typeof value === "number"
			? value
			: Number.parseInt(reviveString(value), 10);
	if (!Number.isFinite(next)) return DEFAULT_RESULTS_LIMIT;
	return Math.min(
		MAX_RESULTS_LIMIT,
		Math.max(MIN_RESULTS_LIMIT, Math.round(next)),
	);
};

const reviveEngine = (value: unknown): "gpu" | "cpu" => {
	if (value === "gpu" && hasWebGpu()) return "gpu";
	if (value === "cpu") return "cpu";
	return hasWebGpu() ? "gpu" : "cpu";
};

function hasWebGpu(): boolean {
	return (
		typeof navigator !== "undefined" &&
		(navigator as Navigator & { gpu?: unknown }).gpu != null
	);
}

function roleLabel(build: TranslatedBuild): string {
	return (
		charactersById.get(Number(build.roleId))?.character_name ||
		build.resonator.name ||
		`Role ${build.roleId}`
	);
}

function roleIcon(build: TranslatedBuild): string | undefined {
	return charactersById.get(Number(build.roleId))?.icon_head_256;
}

function formatDamage(value: number): string {
	if (!Number.isFinite(value)) return "—";
	if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
	return value.toFixed(0);
}

function formatMs(ms: number): string {
	if (!Number.isFinite(ms) || ms <= 0) return "—";
	const seconds = Math.round(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function statPercent(value: number): string {
	return `${value.toFixed(1)}%`;
}

function RoleSelect({
	label,
	value,
	onChange,
	builds,
	disabledRoleIds,
	allowNone,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	builds: TranslatedBuild[];
	disabledRoleIds: string[];
	allowNone: boolean;
}) {
	const selected = builds.find((build) => build.roleId === value);
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span className="text-[10px] leading-none text-muted-foreground">
				{label}
			</span>
			<Select
				value={value === "" ? null : value}
				onValueChange={(next) =>
					onChange(typeof next === "string" && next !== "__none" ? next : "")
				}
			>
				<SelectTrigger size="sm" className="w-full">
					{selected && roleIcon(selected) ? (
						<img
							src={roleIcon(selected)}
							alt=""
							className="size-4 shrink-0 object-contain"
						/>
					) : null}
					<span className="truncate">
						{selected
							? roleLabel(selected)
							: allowNone
								? "None"
								: "Select resonator"}
					</span>
				</SelectTrigger>
				<SelectContent>
					{allowNone && <SelectItem value="__none">None</SelectItem>}
					{builds.map((build) => (
						<SelectItem
							key={build.roleId}
							value={build.roleId}
							disabled={disabledRoleIds.includes(build.roleId)}
						>
							{roleIcon(build) ? (
								<img
									src={roleIcon(build)}
									alt=""
									className="size-4 shrink-0 object-contain"
								/>
							) : null}
							{roleLabel(build)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function StatChips({ stats }: { stats: OptResultStats }) {
	const entries: Array<[string, string]> = [
		["ATK", Math.round(stats.atk).toLocaleString()],
		["CR", statPercent(stats.cr)],
		["CD", statPercent(stats.cd)],
		["ER", statPercent(stats.er)],
		["DMG", statPercent(stats.bonus)],
	];
	return (
		<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
			{entries.map(([label, value]) => (
				<span key={label}>
					{label} <span className="font-semibold text-foreground">{value}</span>
				</span>
			))}
		</div>
	);
}

function FullStats({ stats }: { stats: OptResultStats }) {
	const entries: Array<[string, string]> = [
		["ATK", stats.atk.toFixed(0)],
		["HP", stats.hp.toFixed(0)],
		["DEF", stats.def.toFixed(0)],
		["Energy Regen", statPercent(stats.er)],
		["Crit. Rate", statPercent(stats.cr)],
		["Crit. DMG", statPercent(stats.cd)],
		["DMG Bonus", statPercent(stats.bonus)],
		["Amplify", statPercent(stats.amp)],
	];
	return (
		<div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
			{entries.map(([label, value]) => (
				<div key={label} className="flex items-center justify-between gap-2">
					<span className="text-[11px] text-muted-foreground">{label}</span>
					<span className="text-[11px] font-semibold">{value}</span>
				</div>
			))}
		</div>
	);
}

function EchoThumb({ echo }: { echo?: Echo }) {
	if (!echo) {
		return <span className="size-8 bg-muted/60" />;
	}
	const image = echoImage(echo);
	return image ? (
		<img
			src={image}
			alt={echoName(echo)}
			title={`${echoName(echo)} +${echo.level}`}
			className="size-8 shrink-0 bg-black/30 object-contain"
		/>
	) : (
		<span className="size-8 bg-black/30" />
	);
}

function ResultRow({
	index,
	result,
	baseline,
	expanded,
	current,
	onToggle,
	echoByUid,
}: {
	index: number;
	result: OptResultEntry;
	baseline: number | null;
	expanded: boolean;
	/** The currently equipped build (highlighted reference row). */
	current?: boolean;
	onToggle: () => void;
	echoByUid: Map<string, Echo>;
}) {
	const echoes = result.uids.map((uid) => echoByUid.get(uid));
	const delta =
		baseline != null && baseline > 0 ? result.damage / baseline - 1 : null;
	const cost = echoes.reduce(
		(sum, echo) => sum + (echo ? (echoCost(echo) ?? 0) : 0),
		0,
	);

	return (
		<div
			className={`border-b border-border/60 last:border-b-0 ${
				current ? "bg-amber-400/10" : ""
			}`}
		>
			<button
				type="button"
				onClick={onToggle}
				className={`flex w-full flex-col gap-1.5 px-3 py-2 text-left transition-colors ${
					current ? "hover:bg-amber-400/15" : "hover:bg-muted/40"
				}`}
			>
				<div className="flex items-center gap-3">
					<span className="flex w-14 shrink-0 justify-start">
						{current ? (
							<CardBadge
								title="Currently equipped build"
								className="bg-amber-500/80"
							>
								Current
							</CardBadge>
						) : (
							<span className="text-[11px] text-muted-foreground">
								#{index + 1}
							</span>
						)}
					</span>
					<span className="w-20 shrink-0 text-sm font-semibold tabular-nums">
						{formatDamage(result.damage)}
					</span>
					{delta != null && (
						<span
							className={`w-16 shrink-0 text-[11px] font-semibold ${
								delta >= 0 ? "text-emerald-400" : "text-red-400"
							}`}
						>
							{delta >= 0 ? "+" : ""}
							{(delta * 100).toFixed(1)}%
						</span>
					)}
					{result.stats && (
						<span className="hidden min-w-0 flex-1 md:block">
							<StatChips stats={result.stats} />
						</span>
					)}
					<span className="ml-auto flex shrink-0 items-center gap-1">
						{echoes.map((echo, slot) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: slots are positional
							<EchoThumb key={slot} echo={echo} />
						))}
						<ChevronDown
							className={`size-4 shrink-0 text-muted-foreground transition-transform ${
								expanded ? "rotate-180" : ""
							}`}
						/>
					</span>
				</div>
			</button>
			{expanded && (
				<div className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-3 py-3">
					{result.stats && <FullStats stats={result.stats} />}
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
						{echoes.map((echo, slot) =>
							echo ? (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: slots are positional
									key={slot}
									className="bg-card ring-1 ring-foreground/10"
								>
									<EchoCard
										echo={echo}
										footer={
											slot === 0 ? (
												<CardBadge title="Main echo">Main</CardBadge>
											) : undefined
										}
									/>
								</div>
							) : null,
						)}
					</div>
					<p className="text-[11px] text-muted-foreground">
						Total cost {cost} / 12
					</p>
				</div>
			)}
		</div>
	);
}

export function OptimizerTab({ active }: { active: boolean }) {
	const { snapshot } = useAccountSnapshot();
	const [coreReady, setCoreReady] = useState(() => isCoreReady());
	const [coreError, setCoreError] = useState<string | null>(null);

	useEffect(() => {
		if (!active || coreReady) return;
		let cancelled = false;
		ensureCoreReady()
			.then(() => {
				if (!cancelled) setCoreReady(true);
			})
			.catch((error: unknown) => {
				if (!cancelled) setCoreError(String(error));
			});
		return () => {
			cancelled = true;
		};
	}, [active, coreReady]);

	const translation: AccountTranslation = useMemo(
		() => (coreReady ? translateAccount(snapshot) : EMPTY_TRANSLATION),
		[coreReady, snapshot],
	);
	const builds = translation.builds;
	const buildsByRoleId = useMemo(
		() => new Map(builds.map((build) => [build.roleId, build])),
		[builds],
	);

	const [targetRoleId, setTargetRoleId] = usePersistedState(
		"optimizer.targetRoleId",
		"",
		reviveString,
	);
	const [mateOne, setMateOne] = usePersistedState(
		"optimizer.mateOne",
		"",
		reviveString,
	);
	const [mateTwo, setMateTwo] = usePersistedState(
		"optimizer.mateTwo",
		"",
		reviveString,
	);
	const [filters, setFilters] = usePersistedState(
		"optimizer.filters",
		EMPTY_OPTIMIZER_FILTERS,
		reviveOptimizerFilters,
	);

	useEffect(() => {
		if (builds.length === 0) return;
		if (!targetRoleId || !buildsByRoleId.has(targetRoleId)) {
			setTargetRoleId(builds[0].roleId);
		}
	}, [builds, buildsByRoleId, targetRoleId, setTargetRoleId]);

	// The target cannot also fill a teammate slot.
	useEffect(() => {
		if (mateOne && mateOne === targetRoleId) setMateOne("");
		if (mateTwo && mateTwo === targetRoleId) setMateTwo("");
	}, [targetRoleId, mateOne, mateTwo, setMateOne, setMateTwo]);

	const rotations: RotDef[] = useMemo(() => {
		if (!coreReady || !targetRoleId) return [];
		try {
			return listResRttn(targetRoleId);
		} catch {
			return [];
		}
	}, [coreReady, targetRoleId]);

	const [rotationId, setRotationId] = usePersistedState(
		"optimizer.rotationId",
		"",
		reviveString,
	);
	useEffect(() => {
		if (rotations.length === 0) {
			if (rotationId) setRotationId("");
			return;
		}
		if (!rotations.some((rotation) => rotation.id === rotationId)) {
			setRotationId(rotations[0].id);
		}
	}, [rotations, rotationId, setRotationId]);
	const rotation = rotations.find((entry) => entry.id === rotationId) ?? null;

	const targetBuild = targetRoleId
		? buildsByRoleId.get(targetRoleId)
		: undefined;
	const mateBuilds = useMemo(
		() =>
			[mateOne, mateTwo]
				.filter((id): id is string => id !== "")
				.map((id) => buildsByRoleId.get(id))
				.filter((build): build is TranslatedBuild => build != null),
		[mateOne, mateTwo, buildsByRoleId],
	);

	// Skill fallback for resonators without an authored rotation.
	const targetSkillId = useMemo(() => {
		if (!coreReady || rotations.length > 0 || !targetBuild?.runtime) {
			return null;
		}
		try {
			return listOptTrgt(targetBuild.runtime)[0]?.id ?? null;
		} catch {
			return null;
		}
	}, [coreReady, rotations.length, targetBuild]);

	const targetResonatorId = targetBuild?.resonator.id ?? null;

	// Candidate inventory: equipped-echo mode and the level filter are applied
	// before translation so excluded echoes never enter the pool.
	const inventory = useMemo(() => {
		if (!coreReady) return [];
		const echoes = snapshot.echoes.filter((echo) => {
			if (echo.level < filters.minLevel) return false;
			if (echo.equippedBy == null) return true;
			if (filters.equipped === "exclude-all") return false;
			return (
				filters.equipped !== "exclude-others" ||
				echo.equippedBy === targetResonatorId
			);
		});
		return echoes
			.map((echo) => toEchoInstance(echo).instance)
			.filter(
				(instance): instance is NonNullable<typeof instance> =>
					instance != null,
			);
	}, [
		coreReady,
		snapshot.echoes,
		filters.equipped,
		filters.minLevel,
		targetResonatorId,
	]);

	const inventoryErrors = useMemo(() => {
		if (!coreReady) return [];
		const errors: TranslationError[] = [];
		for (const echo of snapshot.echoes) {
			const { error } = toEchoInstance(echo);
			if (error) errors.push(error);
		}
		return errors;
	}, [coreReady, snapshot.echoes]);

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

	const [resultsLimit, setResultsLimit] = usePersistedState(
		"optimizer.resultsLimit",
		DEFAULT_RESULTS_LIMIT,
		reviveResultsLimit,
	);
	const [engine, setEngine] = usePersistedState<"gpu" | "cpu">(
		"optimizer.engine",
		hasWebGpu() ? "gpu" : "cpu",
		reviveEngine,
	);

	const [running, setRunning] = useState(false);
	const [phase, setPhase] = useState<"baseline" | "search" | null>(null);
	const [progress, setProgress] = useState<OptPrgr | null>(null);
	const [results, setResults] = useState<OptResultEntry[]>([]);
	// The equipped build's evaluated damage, snapshotted at run time so the
	// results row always matches the run it belongs to.
	const [baseline, setBaseline] = useState<{
		damage: number;
		stats: OptResultStats | null;
		uids: string[];
	} | null>(null);
	const [runError, setRunError] = useState<string | null>(null);
	const [expandedIndex, setExpandedIndex] = useState<
		number | "baseline" | null
	>(null);

	// Terminate optimizer workers when the tab is disposed.
	useEffect(() => () => disposeOptimizerRun(), []);

	// Teammate runtimes with the full team slots filled in.
	const companionRuntimes = useMemo(() => {
		if (!targetBuild?.runtime) return {} as Record<string, ResRuntime>;
		const team: TeamSlots = [
			targetBuild.roleId,
			mateOne || null,
			mateTwo || null,
		];
		const runtimes: Record<string, ResRuntime> = {};
		for (const mate of mateBuilds) {
			if (mate.runtime) runtimes[mate.roleId] = withTeam(mate.runtime, team);
		}
		return runtimes;
	}, [targetBuild, mateBuilds, mateOne, mateTwo]);

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
		const mainIndex = Math.max(
			0,
			equipped.findIndex((echo) => echo.mainEcho),
		);
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
	const hasOptimizerFilters =
		filters.equipped !== "include" ||
		filters.minLevel > 0 ||
		filters.sets.length > 0 ||
		filters.mainStats.length > 0 ||
		filters.substats.length > 0;

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
	}, [targetBuild, companionRuntimes, setFilters]);

	const canRun =
		coreReady &&
		hasTarget &&
		hasTargetMode &&
		matesReady &&
		hasCandidates &&
		!running;

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

	// Result rows with the equipped build merged in at its ranked position.
	type ResultRowModel =
		| { kind: "baseline" }
		| { kind: "result"; result: OptResultEntry; index: number };
	const rows = useMemo<ResultRowModel[]>(() => {
		if (!baseline) {
			return results.map((result, index) => ({
				kind: "result",
				result,
				index,
			}));
		}
		const insertAt = results.findIndex(
			(entry) => entry.damage < baseline.damage,
		);
		const position = insertAt === -1 ? results.length : insertAt;
		const rows: ResultRowModel[] = [];
		for (let index = 0; index < results.length; index += 1) {
			if (index === position) rows.push({ kind: "baseline" });
			rows.push({ kind: "result", result: results[index], index });
		}
		if (position === results.length) rows.push({ kind: "baseline" });
		return rows;
	}, [results, baseline]);

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<section className="bg-card text-card-foreground ring-foreground/10 flex shrink-0 flex-col gap-4 p-4 ring-1">
				<div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
					<RoleSelect
						label="Target"
						value={targetRoleId}
						onChange={setTargetRoleId}
						builds={builds}
						disabledRoleIds={[]}
						allowNone={false}
					/>
					<RoleSelect
						label="Teammate 1"
						value={mateOne}
						onChange={setMateOne}
						builds={builds}
						disabledRoleIds={[targetRoleId, mateTwo]}
						allowNone
					/>
					<RoleSelect
						label="Teammate 2"
						value={mateTwo}
						onChange={setMateTwo}
						builds={builds}
						disabledRoleIds={[targetRoleId, mateOne]}
						allowNone
					/>
					<div className="flex min-w-0 flex-col gap-1">
						<span className="text-[10px] leading-none text-muted-foreground">
							Rotation
						</span>
						<Select
							value={rotation ? rotation.id : null}
							onValueChange={(next) =>
								setRotationId(typeof next === "string" ? next : "")
							}
							disabled={rotations.length === 0}
						>
							<SelectTrigger size="sm" className="w-full">
								<span className="truncate">
									{rotation
										? `${rotation.label} · ${rotation.items.length} steps`
										: coreReady
											? "No rotation — first skill"
											: "Loading…"}
								</span>
							</SelectTrigger>
							<SelectContent>
								{rotations.map((entry) => (
									<SelectItem key={entry.id} value={entry.id}>
										{entry.label} · {entry.items.length} steps
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-t border-border/60 pt-3">
					<div className="w-40">
						<FilterSelect
							label="Equipped Echoes"
							value={filters.equipped}
							options={EQUIPPED_OPTIONS}
							onChange={(value) =>
								setFilters((prev) => ({
									...prev,
									equipped:
										value === "exclude-others" || value === "exclude-all"
											? value
											: "include",
								}))
							}
						/>
					</div>
					<div className="w-28">
						<div className="flex min-w-0 flex-col gap-1">
							<span
								className={`text-[10px] leading-none ${filters.minLevel > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
							>
								Min Lv +{filters.minLevel}
							</span>
							<Slider
								min={0}
								max={MAX_ECHO_LEVEL}
								value={[filters.minLevel]}
								onValueChange={(next) =>
									setFilters((prev) => ({ ...prev, minLevel: next[0] }))
								}
								className="h-3.5"
							/>
						</div>
					</div>
					<div className="w-44">
						<MultiFilterSelect
							label="Echo Sets"
							values={filters.sets}
							options={optimizerSetOptions}
							onChange={(values) =>
								setFilters((prev) => ({ ...prev, sets: values }))
							}
						/>
					</div>
					<div className="w-44">
						<MultiFilterSelect
							label="Main Stats"
							values={filters.mainStats}
							options={mainStatOptions}
							onChange={(values) =>
								setFilters((prev) => ({ ...prev, mainStats: values }))
							}
						/>
					</div>
					<div className="w-44">
						<MultiFilterSelect
							label="Substats"
							values={filters.substats}
							options={substatOptions}
							onChange={(values) =>
								setFilters((prev) => ({ ...prev, substats: values }))
							}
						/>
					</div>
					<Button
						variant="outline"
						size="sm"
						title="Recommended echo filters: the main stats this resonator's kit cares about, max-level echoes only"
						disabled={!coreReady || !targetBuild?.runtime}
						onClick={applyRecommended}
					>
						Recommended
					</Button>
					{hasOptimizerFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setFilters(EMPTY_OPTIMIZER_FILTERS)}
						>
							Reset filters
						</Button>
					)}
					{plan && (
						<span
							className="ml-auto self-center text-[11px] text-muted-foreground"
							title="Echoes eligible after the filters; when pruning applies, echoes beyond the search cap are ranked by stat weight"
						>
							{plan.selection.echoes.length}/{plan.selection.inventoryTotal}{" "}
							echoes · {formatDamage(plan.selection.combos)} builds
						</span>
					)}
				</div>

				<div className="flex flex-wrap items-end gap-4">
					<div className="flex flex-col gap-1">
						<span className="text-[10px] leading-none text-muted-foreground">
							Results kept
						</span>
						<Input
							type="number"
							min={MIN_RESULTS_LIMIT}
							max={MAX_RESULTS_LIMIT}
							value={String(resultsLimit)}
							onChange={(event) => {
								const next = Number.parseInt(event.target.value, 10);
								if (Number.isFinite(next)) {
									setResultsLimit(
										Math.min(
											MAX_RESULTS_LIMIT,
											Math.max(MIN_RESULTS_LIMIT, next),
										),
									);
								}
							}}
							className="h-8 w-24"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<span className="text-[10px] leading-none text-muted-foreground">
							Engine
						</span>
						<Select
							value={engine}
							onValueChange={(next) =>
								setEngine(next === "gpu" ? "gpu" : "cpu")
							}
						>
							<SelectTrigger size="sm" className="w-34">
								{engine === "gpu" ? "GPU (WebGPU)" : "CPU (workers)"}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="gpu" disabled={!hasWebGpu()}>
									GPU (WebGPU)
								</SelectItem>
								<SelectItem value="cpu">CPU (workers)</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<span className="flex-1" />
					<Button
						onClick={running ? handleCancel : () => void handleRun()}
						disabled={!running && !canRun}
						variant={running ? "destructive" : "default"}
						size="lg"
					>
						{running ? (
							<>
								<Square className="size-4" /> Cancel
							</>
						) : (
							<>
								<Play className="size-4" /> Run optimizer
							</>
						)}
					</Button>
				</div>

				{coreReady && hasTarget && hasTargetMode && !hasCandidates && (
					<p className="text-xs text-destructive">
						Not enough captured echoes match the current filters (at least 5 are
						needed).
					</p>
				)}

				{running && (
					<div className="flex flex-col gap-1.5">
						<div className="h-1.5 w-full overflow-hidden bg-muted">
							<div
								className="h-full bg-primary transition-[width] duration-200"
								style={{ width: `${progressPercent}%` }}
							/>
						</div>
						<p className="text-[11px] text-muted-foreground">
							{phase === "baseline"
								? "Evaluating the current build…"
								: progress
									? `${progressPercent}% · ${Math.round(progress.processed).toLocaleString()}${
											progress.total != null
												? ` / ${progress.total.toLocaleString()}`
												: ""
										} builds · ${formatMs(progress.elapsedMs)} elapsed · ~${formatMs(
											progress.remainingMs,
										)} left`
									: "Preparing search…"}
						</p>
					</div>
				)}

				{coreError && (
					<p className="text-xs text-destructive">
						Calculator data failed to load: {coreError}
					</p>
				)}
				{runError && <p className="text-xs text-destructive">{runError}</p>}
				{snapshot.resonators.length === 0 && (
					<p className="text-[11px] text-muted-foreground">
						No account data captured yet. Open the game with the sniffer running
						(Character / Echo / Weapon menus once) so the optimizer has a roster
						and inventory.
					</p>
				)}
				{snapshot.resonators.length > 0 && inventory.length === 0 && (
					<p className="text-[11px] text-muted-foreground">
						{snapshot.echoes.length === 0
							? "No echoes captured yet. Open the Echo inventory once while the sniffer is running."
							: "No echoes available: the equipped-echoes and level filters exclude everything captured so far."}
					</p>
				)}
				{selectionErrors.length > 0 && (
					<ul className="flex flex-col gap-0.5">
						{selectionErrors.slice(0, 4).map((error) => (
							<li
								key={`${error.kind}:${error.id}`}
								className="text-[11px] text-destructive"
							>
								{error.message}
							</li>
						))}
						{selectionErrors.length > 4 && (
							<li className="text-[11px] text-muted-foreground">
								…and {selectionErrors.length - 4} more translation errors.
							</li>
						)}
					</ul>
				)}
				{inventoryErrors.length > 0 && (
					<p className="text-[11px] text-muted-foreground">
						{inventoryErrors.length} inventory{" "}
						{inventoryErrors.length === 1 ? "echo is" : "echoes are"} unknown to
						the calculator catalog and{" "}
						{inventoryErrors.length === 1 ? "was" : "were"} skipped.
					</p>
				)}
			</section>

			<section className="bg-card text-card-foreground ring-foreground/10 flex min-h-0 flex-1 flex-col ring-1">
				<header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
					<h3 className="text-sm font-medium">Results</h3>
				</header>
				{rows.length === 0 ? (
					<p className="px-3 py-6 text-center text-[11px] text-muted-foreground">
						{running
							? "Searching the captured inventory…"
							: "Pick a target, team and rotation, then run the optimizer."}
					</p>
				) : (
					<div className="min-h-0 flex-1 overflow-y-auto pr-1">
						{rows.map((row) =>
							row.kind === "baseline" && baseline ? (
								<ResultRow
									key="baseline"
									index={0}
									current
									result={{
										uids: baseline.uids,
										damage: baseline.damage,
										stats: baseline.stats,
									}}
									baseline={null}
									expanded={expandedIndex === "baseline"}
									onToggle={() =>
										setExpandedIndex(
											expandedIndex === "baseline" ? null : "baseline",
										)
									}
									echoByUid={echoByUid}
								/>
							) : row.kind === "result" ? (
								<ResultRow
									key={row.index}
									index={row.index}
									result={row.result}
									baseline={baseline?.damage ?? null}
									expanded={expandedIndex === row.index}
									onToggle={() =>
										setExpandedIndex(
											expandedIndex === row.index ? null : row.index,
										)
									}
									echoByUid={echoByUid}
								/>
							) : null,
						)}
					</div>
				)}
			</section>

			<p className="flex shrink-0 items-center gap-1 pb-2 text-[10px] text-muted-foreground">
				<ChevronRight className="size-3" />
				Enemy: Lv. 100 Calamity, Tower of Adversity rules (all RES 20%). Only
				the target's five echoes change; teammates, weapon and rotation stay
				fixed.
			</p>
		</div>
	);
}
