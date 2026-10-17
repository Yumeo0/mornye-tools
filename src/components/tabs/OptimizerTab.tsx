// Optimizer tab: search the captured echo inventory for the best five-echo
// build of one resonator inside a specific team and rotation.
//
// Everything here is presentation and request wiring; the damage model and the
// search itself stay in `@wuwacalc/core` (see `src/lib/calc/optimizer.ts`).

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
	SLOT_LABELS,
	type SlotKey,
} from "@/components/optimizer/CharacterSlotBox";
import { LoadoutDialog } from "@/components/optimizer/LoadoutDialog";
import { OptimizerFilterRow } from "@/components/optimizer/OptimizerFilterRow";
import { OptimizerResultsPanel } from "@/components/optimizer/OptimizerResultsPanel";
import { OptimizerRunBar } from "@/components/optimizer/OptimizerRunBar";
import { TeamSection } from "@/components/optimizer/TeamSection";
import { CharacterPickerDialog } from "@/components/tabs/CharacterPickerDialog";
import { useOptimizerRun } from "@/hooks/useOptimizerRun";
import { useOptimizerTeam } from "@/hooks/useOptimizerTeam";
import { useAccount } from "@/lib/account";
import { ensureCoreReady, isCoreReady } from "@/lib/calc/core";

export function OptimizerTab({ active }: { active: boolean }) {
	const { snapshot } = useAccount();
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

	const team = useOptimizerTeam({ coreReady, snapshot });
	const run = useOptimizerRun({ coreReady, snapshot, team });

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

	const hasTarget = Boolean(targetBuild?.runtime);
	const hasTargetMode = rotation != null || targetSkillId != null;

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
				/>

				<OptimizerFilterRow
					filters={run.filters}
					onFiltersChange={run.setFilters}
					recommendedEnabled={coreReady && hasTarget}
					onRecommended={run.applyRecommended}
					counts={
						run.plan
							? {
									eligible: run.plan.selection.echoes.length,
									total: run.plan.selection.inventoryTotal,
									combos: run.plan.selection.combos,
								}
							: null
					}
				/>

				<OptimizerRunBar
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
			/>

			<p className="flex shrink-0 items-center gap-1 pb-2 text-[10px] text-muted-foreground">
				<ChevronRight className="size-3" />
				Enemy: Lvl. 100 Calamity, Tower of Adversity rules (all RES 20%). Only
				the target's five echoes change; teammates and rotation stay fixed.
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
					title={`Select ${SLOT_LABELS[pickingSlot]}`}
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
