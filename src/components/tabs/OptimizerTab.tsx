import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FilterLayout, FilterPanel } from "@/components/filters";
import { OptimizerFilterRow } from "@/components/optimizer/OptimizerFilterRow";
import { OptimizerInfo } from "@/components/optimizer/OptimizerInfo";
import { OptimizerMemberCard } from "@/components/optimizer/OptimizerMemberCard";
import { OptimizerResultsPanel } from "@/components/optimizer/OptimizerResultsPanel";
import { OptimizerRunBar } from "@/components/optimizer/OptimizerRunBar";
import { SimulationInfo } from "@/components/optimizer/SimulationInfo";
import { TeamProfilePicker } from "@/components/optimizer/TeamProfilePicker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { useOptimizerRun } from "@/hooks/useOptimizerRun";
import { useOptimizerTeam } from "@/hooks/useOptimizerTeam";
import { readAccount, refreshAccount, useAccount } from "@/lib/account";
import { ensureCoreReady, getCalculatorCatalog } from "@/lib/calc/core";
import { aliasRoleId, inventoryRevision } from "@/lib/calc/translate";
import type { CalculatorCatalog, OptResultEntry } from "@/lib/calc/types";
import { charactersById } from "@/lib/catalog";
import { useDangerousFeatures } from "@/lib/dangerous";
import {
	isOptimizerBuildEquipped,
	optimizerEquipError,
	requestOptimizerEquip,
} from "@/lib/echoEquip";
import { useEchoUpgradeBatch } from "@/lib/echoUpgradeBatch";

export function OptimizerTab({ active }: { active: boolean }) {
	const { snapshot } = useAccount();
	const { status: connection } = useDangerousFeatures();
	const batch = useEchoUpgradeBatch();
	const equipLock = useRef(false);
	const [equipping, setEquipping] = useState(false);
	const [catalog, setCatalog] = useState<CalculatorCatalog | null>(
		getCalculatorCatalog,
	);
	const [coreError, setCoreError] = useState<string | null>(null);
	useEffect(() => {
		if (!active || catalog) return;
		let live = true;
		ensureCoreReady()
			.then((c) => {
				if (live) setCatalog(c);
			})
			.catch((e) => {
				if (live) setCoreError(String(e));
			});
		return () => {
			live = false;
		};
	}, [active, catalog]);
	const team = useOptimizerTeam(snapshot, catalog);
	const { mode, setMode } = team;
	const run = useOptimizerRun(snapshot, team, mode);
	const equipResult = async (result: OptResultEntry) => {
		const context = run.resultContext;
		if (
			context &&
			inventoryRevision(readAccount().snapshot) !== context.revision
		) {
			toast.error("Inventory changed. Run the optimizer again.");
			return;
		}
		if (
			equipLock.current ||
			run.running ||
			batch.phase === "running" ||
			batch.phase === "stopping" ||
			!context?.profileId ||
			context.profileId !== snapshot.profile?.id ||
			context.revision !== run.revision
		)
			return;
		const reason = optimizerEquipError(
			snapshot,
			connection,
			context.roleId,
			result.uids,
		);
		if (reason) {
			toast.error(reason);
			return;
		}
		equipLock.current = true;
		setEquipping(true);
		try {
			const echoes = result.uids.map((uid) => run.echoByUid.get(uid));
			if (echoes.some((echo) => !echo))
				throw new Error("An echo is unavailable. Run the optimizer again.");
			const ids = await requestOptimizerEquip(
				context.profileId,
				context.roleId,
				echoes.filter((echo) => echo !== undefined),
			);
			await refreshAccount();
			if (readAccount().snapshot.profile?.id === context.profileId) {
				void ids;
				toast.success("Optimizer echoes equipped.");
			}
		} catch (error) {
			await refreshAccount().catch(() => {});
			toast.error(String(error));
		} finally {
			equipLock.current = false;
			setEquipping(false);
		}
	};

	const preview = run.update?.baselineEvaluation ?? run.evaluation;
	const energy = run.update?.results[0]?.energy ?? preview?.energy;
	const errors = [
		...(coreError ? [coreError] : []),
		...run.errors,
		...(run.runError ? [run.runError] : []),
	];
	const targetName =
		charactersById.get(team.targetId)?.character_name ?? "character";
	const pool = run.pool;
	return (
		<FilterLayout
			filters={
				<FilterPanel label="Optimizer filters">
					<OptimizerFilterRow
						filters={run.filters}
						onFiltersChange={run.setFilters}
						recommendedEnabled={!!team.profile}
						counts={
							pool
								? {
										eligible: pool.eligible,
										total: pool.total,
										combos:
											(pool.mainCount *
												(pool.pool.length - 1) *
												(pool.pool.length - 2) *
												(pool.pool.length - 3) *
												(pool.pool.length - 4)) /
											24,
									}
								: null
						}
					/>
				</FilterPanel>
			}
		>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-px pt-px">
				<Card size="sm">
					<CardHeader className="items-center">
						<div className="flex items-center gap-1">
							<CardTitle>Rotation</CardTitle>
							<SimulationInfo custom={!!team.profile?.customRotation} />
						</div>
						<CardAction className="row-span-1 self-center">
							<TeamProfilePicker
								profiles={team.profiles}
								snapshot={snapshot}
								selected={team.profile}
								onSelect={team.setProfileId}
								loading={!catalog && !coreError}
							/>
						</CardAction>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{team.profile && (
							<div className="flex flex-col gap-2">
								<ToggleGroup
									aria-label="Character to optimize"
									value={team.targetId ? [String(team.targetId)] : []}
									onValueChange={(values) => {
										if (values[0]) team.setTargetId(Number(values[0]));
									}}
									className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] items-stretch gap-2"
								>
									{team.profile.members.map((member, index) => (
										<OptimizerMemberCard
											key={member.characterId}
											member={member}
											build={team.members[index]}
											selected={member.characterId === team.targetId}
											owned={snapshot.resonators.some(
												(r) => Number(aliasRoleId(r.id)) === member.characterId,
											)}
											snapshot={snapshot}
											edit={team.overrides[member.characterId]}
											stats={preview?.stats[member.characterId]}
											onPatch={(patch) =>
												team.patchRole(member.characterId, patch)
											}
										/>
									))}
								</ToggleGroup>
							</div>
						)}
						{!!team.targetId && (
							<OptimizerRunBar
								energy={energy}
								mode={mode}
								onModeChange={setMode}
								running={run.running}
								phase={run.running ? "search" : null}
								progress={run.update?.progress ?? null}
								progressPercent={Math.round(
									(run.update?.progress.progress ?? 0) * 100,
								)}
								canRun={run.canRun && !equipping}
								onRun={run.handleRun}
								onCancel={run.handleCancel}
							/>
						)}
						{!!team.targetId && run.evaluationError && (
							<Alert>
								<AlertDescription>{run.evaluationError}</AlertDescription>
							</Alert>
						)}
						{run.update?.baselineError && (
							<Alert>
								<AlertDescription>
									Baseline: {run.update.baselineError}
								</AlertDescription>
							</Alert>
						)}
						{!run.update && preview && !preview.feasible && (
							<Alert>
								<AlertDescription>
									{preview.diagnostics.join(" ")}
								</AlertDescription>
							</Alert>
						)}
						{errors.length > 0 && (
							<Alert variant="destructive">
								<AlertDescription>
									{errors.slice(0, 5).join(" ")}
								</AlertDescription>
							</Alert>
						)}
						{team.profile && pool && !pool.mainCount && (
							<Alert>
								<AlertDescription>
									No eligible owned copy of{" "}
									{
										team.profile.members.find(
											(m) => m.characterId === team.targetId,
										)?.mainEcho.name
									}{" "}
									for slot one. Check filters.
								</AlertDescription>
							</Alert>
						)}
						{(pool?.truncated || !!pool?.errors.length) && (
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<span>
									{pool?.pool.length} / {pool?.eligible} echoes
								</span>
								<OptimizerInfo label="Echo pool">
									<p>
										The search keeps main echoes and a mix of sets and stats.
										The evaluation budget may miss better builds.
									</p>
									{!!pool?.errors.length && (
										<p>
											{pool.errors.length} skipped: {pool.errors[0]}
										</p>
									)}
								</OptimizerInfo>
							</div>
						)}
					</CardContent>
				</Card>
				<OptimizerResultsPanel
					results={run.update?.results ?? []}
					characterId={run.resultContext?.roleId ?? null}
					baseline={run.update?.baseline ?? null}
					running={run.running}
					expandedIndex={run.expandedIndex}
					onExpandedChange={run.setExpandedIndex}
					echoByUid={run.echoByUid}
					title={mode === "team" ? "Total team damage" : "Own damage"}
					idleText="Load a rotation to start."
					summary={
						run.update &&
						!run.running && (
							<div className="flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
								<span>
									{run.update.results.length} results ·{" "}
									{(run.update.progress.elapsedMs / 1000).toFixed(1)}s
								</span>
								<OptimizerInfo label="Search summary">
									<p>
										{run.update.status === "budget"
											? "Evaluation budget reached"
											: run.update.status === "complete"
												? "Search complete"
												: "Search cancelled"}{" "}
										· {run.update.progress.processed.toLocaleString()} builds
										evaluated.
									</p>
								</OptimizerInfo>
							</div>
						)
					}
					equipAction={(result) => {
						const context = run.resultContext;
						const stale =
							!context ||
							context.profileId !== snapshot.profile?.id ||
							context.revision !== run.revision;
						const equipped =
							!!context &&
							isOptimizerBuildEquipped(snapshot, context.roleId, result.uids);
						const reason = stale
							? "Run the optimizer for the current account and inventory before equipping."
							: optimizerEquipError(
									snapshot,
									connection,
									context.roleId,
									result.uids,
								);
						return {
							label: equipping
								? "Equipping…"
								: equipped
									? "Equipped"
									: `Equip on ${targetName}`,
							disabled:
								equipping ||
								run.running ||
								batch.phase === "running" ||
								batch.phase === "stopping" ||
								equipped ||
								!!reason,
							reason: reason ?? undefined,
							onEquip: () => void equipResult(result),
						};
					}}
				/>
			</div>
		</FilterLayout>
	);
}
