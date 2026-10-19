// Optimizer tab: search the captured echo inventory for the best five-echo
// build of one resonator inside a specific team and rotation.
//
// Two modes:
// - Own damage: the packed optimizer maximizes the target's own damage.
// - Team damage: the searched character is a support, and every combo is
//   scored by the team damage a chosen teammate's rotation deals.
//
// Everything here is presentation and request wiring; the damage model, the
// packed search (`@wuwacalc/core`) and the exact team metric
// (`src/lib/calc/teamOptimizer.ts`) stay out of the components.

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
	SLOT_LABELS,
	type SlotKey,
} from "@/components/optimizer/CharacterSlotBox";
import { roleLabel } from "@/components/optimizer/display";
import { LoadoutDialog } from "@/components/optimizer/LoadoutDialog";
import { OptimizerFilterRow } from "@/components/optimizer/OptimizerFilterRow";
import { OptimizerResultsPanel } from "@/components/optimizer/OptimizerResultsPanel";
import { OptimizerRunBar } from "@/components/optimizer/OptimizerRunBar";
import { TeamSection } from "@/components/optimizer/TeamSection";
import { CharacterPickerDialog } from "@/components/tabs/CharacterPickerDialog";
import { type OptimizerMode, useOptimizerRun } from "@/hooks/useOptimizerRun";
import { type MeasuredSlot, useOptimizerTeam } from "@/hooks/useOptimizerTeam";
import { useAccount } from "@/lib/account";
import { ensureCoreReady, isCoreReady } from "@/lib/calc/core";

export function OptimizerTab({ active }: { active: boolean }) {
	const { snapshot } = useAccount();
	const [coreReady, setCoreReady] = useState(() => isCoreReady());
	const [coreError, setCoreError] = useState<string | null>(null);
	const [mode, setMode] = useState<OptimizerMode>("damage");
	const [measuredSlot, setMeasuredSlot] = useState<MeasuredSlot>("mateOne");

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

	const team = useOptimizerTeam({ coreReady, snapshot, mode, measuredSlot });
	const run = useOptimizerRun({ coreReady, snapshot, team, mode });

	const {
		slotRoleIds,
		buildsByRoleId,
		ownedRoleIds,
		overrides,
		slotSummary,
		swapSlots,
		rotations,
		rotation,
		setRotationId,
		targetBuild,
		targetSkillId,
		measuredBuild,
		editingSlot,
		editingBuild,
		editingOverride,
		editingBaselineRuntime,
		ownedWeaponItemIds,
		pickingSlot,
		setPickingSlot,
		setEditingSlot,
		setSlotRoleId,
		patchRole,
	} = team;

	const teamMode = mode === "team";
	const hasTarget = Boolean(targetBuild?.runtime);
	const hasTargetMode = rotation != null || targetSkillId != null;
	const measuredName = measuredBuild ? roleLabel(measuredBuild) : null;

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<section className="bg-card text-card-foreground ring-foreground/10 flex shrink-0 flex-col gap-4 p-4 ring-1">
				<TeamSection
					slotRoleIds={slotRoleIds}
					buildsByRoleId={buildsByRoleId}
					ownedRoleIds={ownedRoleIds}
					overrides={overrides}
					slotSummary={slotSummary}
					swapSlots={swapSlots}
					onOpenPicker={setPickingSlot}
					onOpenEditor={setEditingSlot}
					rotations={rotations}
					rotation={rotation}
					coreReady={coreReady}
					onRotationChange={setRotationId}
					mode={mode}
					measuredSlot={measuredSlot}
					onMeasuredSlotChange={setMeasuredSlot}
				/>

				<OptimizerFilterRow
					filters={run.filters}
					onFiltersChange={run.setFilters}
					recommendedEnabled={coreReady && hasTarget}
					onRecommended={run.applyRecommended}
					countsHint={
						teamMode
							? "Echoes eligible after the filters; beyond the search cap they are ranked by the role guide's main stats and substat priorities"
							: undefined
					}
					counts={run.counts}
				/>

				<OptimizerRunBar
					mode={mode}
					onModeChange={setMode}
					resultsLimit={run.resultsLimit}
					onResultsLimitChange={run.setResultsLimit}
					engine={run.engine}
					onEngineChange={run.setEngine}
					running={run.running}
					phase={run.phase}
					progress={run.progress}
					progressPercent={run.progressPercent}
					canRun={run.canRun}
					gpuAvailable={run.gpuAvailable}
					onRun={() => void run.handleRun()}
					onCancel={run.handleCancel}
				/>

				{coreReady && hasTarget && hasTargetMode && !run.hasCandidates && (
					<p className="text-xs text-destructive">
						Not enough captured echoes match the current filters (at least 5 are
						needed).
					</p>
				)}

				{coreReady && teamMode && !rotation && (
					<p className="text-xs text-destructive">
						{measuredName
							? `${measuredName} has no authored rotation, so there is nothing to measure. Pick another teammate or switch to own damage.`
							: "Pick a teammate with an authored rotation to measure."}
					</p>
				)}

				{coreError && (
					<p className="text-xs text-destructive">
						Calculator data failed to load: {coreError}
					</p>
				)}
				{run.runError && (
					<p className="text-xs text-destructive">{run.runError}</p>
				)}
				{snapshot.resonators.length === 0 && (
					<p className="text-[11px] text-muted-foreground">
						No account data captured yet. Unowned characters run with default
						builds (level 90, no echoes); open the game with the sniffer running
						to search real inventories.
					</p>
				)}
				{snapshot.resonators.length > 0 && run.inventory.length === 0 && (
					<p className="text-[11px] text-muted-foreground">
						{snapshot.echoes.length === 0
							? "No echoes captured yet. Open the Echo inventory once while the sniffer is running."
							: "No echoes available: the equipped-echoes and level filters exclude everything captured so far."}
					</p>
				)}
				{run.selectionErrors.length > 0 && (
					<ul className="flex flex-col gap-0.5">
						{run.selectionErrors.slice(0, 4).map((error) => (
							<li
								key={`${error.kind}:${error.id}`}
								className="text-[11px] text-destructive"
							>
								{error.message}
							</li>
						))}
						{run.selectionErrors.length > 4 && (
							<li className="text-[11px] text-muted-foreground">
								…and {run.selectionErrors.length - 4} more translation errors.
							</li>
						)}
					</ul>
				)}
				{run.inventoryErrors.length > 0 && (
					<p className="text-[11px] text-muted-foreground">
						{run.inventoryErrors.length} inventory{" "}
						{run.inventoryErrors.length === 1 ? "echo is" : "echoes are"}{" "}
						unknown to the calculator catalog and{" "}
						{run.inventoryErrors.length === 1 ? "was" : "were"} skipped.
					</p>
				)}
			</section>

			<OptimizerResultsPanel
				results={run.results}
				baseline={run.baseline}
				running={run.running}
				expandedIndex={run.expandedIndex}
				onExpandedChange={run.setExpandedIndex}
				echoByUid={run.echoByUid}
				title={
					teamMode
						? measuredName
							? `Team damage · ${measuredName}'s rotation`
							: "Team damage"
						: "Results"
				}
				runningText={
					teamMode
						? "Scoring the team rotation for every candidate combo…"
						: "Searching the captured inventory…"
				}
				idleText={
					teamMode
						? "Give the support a team and a teammate rotation to measure, then run the team search."
						: "Pick a target, team and rotation, then run the optimizer."
				}
			/>

			<p className="flex shrink-0 items-center gap-1 pb-2 text-[10px] text-muted-foreground">
				<ChevronRight className="size-3" />
				{teamMode ? (
					<>
						Enemy: Lvl. 100 Calamity, Tower of Adversity rules (all RES 20%).
						The support&apos;s five echoes change; every combo is scored by the
						measured teammate&apos;s rotation damage in the same simulation the
						rotation view runs.
					</>
				) : (
					<>
						Enemy: Lvl. 100 Calamity, Tower of Adversity rules (all RES 20%).
						Only the target&apos;s five echoes change; teammates and rotation
						stay fixed.
					</>
				)}
			</p>

			{editingSlot && editingBuild && (
				<LoadoutDialog
					build={editingBuild}
					owned={ownedRoleIds.has(editingBuild.roleId)}
					ownedWeaponItemIds={ownedWeaponItemIds}
					override={editingOverride}
					baselineRuntime={editingBaselineRuntime}
					onPatch={(patch) => patchRole(editingBuild.roleId, patch)}
					onClose={() => setEditingSlot(null)}
				/>
			)}

			{pickingSlot && (
				<CharacterPickerDialog
					title={`Select ${
						teamMode && pickingSlot === "target"
							? "support"
							: SLOT_LABELS[pickingSlot]
					}`}
					currentRoleId={slotRoleIds[pickingSlot]}
					assignmentLabels={Object.fromEntries(
						(["target", "mateOne", "mateTwo"] as SlotKey[])
							.filter((slot) => slot !== pickingSlot && slotRoleIds[slot])
							.map((slot) => [slotRoleIds[slot], SLOT_LABELS[slot]]),
					)}
					allowNone={pickingSlot !== "target"}
					onPick={(roleId) => {
						setSlotRoleId(pickingSlot, roleId ?? "");
						setPickingSlot(null);
					}}
					onClose={() => setPickingSlot(null)}
				/>
			)}
		</div>
	);
}
