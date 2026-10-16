import type { ResRuntime } from "@wuwacalc/core/domain/entities/runtime";
import { useState } from "react";
import { roleIcon, roleLabel } from "@/components/optimizer/display";
import { LoadoutEffectsPanel } from "@/components/optimizer/LoadoutEffectsPanel";
import { LoadoutForm } from "@/components/optimizer/LoadoutForm";
import { Button } from "@/components/ui/button";
import { Modal, ModalHeader } from "@/components/ui/modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	hasOptimizerOverrides,
	type OptimizerOverrides,
	type TranslatedBuild,
} from "@/lib/calc/translate";

/**
 * Edit dialog for one optimizer slot: loadout fields plus the effects tab,
 * with every deviation from the captured account data marked by an amber `*`
 * (and an overall amber dot on the slot's select trigger).
 */
export function LoadoutDialog({
	build,
	owned,
	ownedWeaponItemIds,
	override,
	baselineRuntime,
	onPatch,
	onClose,
}: {
	build: TranslatedBuild;
	owned: boolean;
	ownedWeaponItemIds: Set<number>;
	override: OptimizerOverrides;
	/** Same runtime without control overrides; anchors the effects tab. */
	baselineRuntime: ResRuntime | null;
	onPatch: (patch: Partial<OptimizerOverrides>) => void;
	onClose: () => void;
}) {
	const [tab, setTab] = useState<"loadout" | "effects">("loadout");

	return (
		<Modal className="h-160 max-h-[85vh] max-w-2xl gap-4" onClose={onClose}>
			<ModalHeader
				icon={roleIcon(build)}
				title={roleLabel(build)}
				subtitle={
					!owned ? (
						<span
							className="text-[10px] text-amber-400"
							title="No saved data for this character; defaults are used until you edit"
						>
							Not owned
						</span>
					) : undefined
				}
				onClose={onClose}
			/>

			<Tabs
				value={tab}
				onValueChange={(value) =>
					setTab(value === "effects" ? "effects" : "loadout")
				}
				className="min-h-0 flex-1"
			>
				<TabsList variant="line" className="shrink-0 self-start">
					<TabsTrigger value="loadout">Loadout</TabsTrigger>
					<TabsTrigger value="effects">Effects</TabsTrigger>
				</TabsList>

				<TabsContent value="loadout" className="min-h-0 overflow-y-auto py-4">
					<LoadoutForm
						build={build}
						owned={owned}
						ownedWeaponItemIds={ownedWeaponItemIds}
						override={override}
						onPatch={onPatch}
					/>
				</TabsContent>

				<TabsContent value="effects" className="flex min-h-0 flex-col">
					<div className="min-h-0 flex-1 overflow-y-auto pr-1">
						<LoadoutEffectsPanel
							roleId={build.roleId}
							runtime={build.runtime}
							baseline={baselineRuntime}
							controls={override.controls}
							onChange={(controls) => onPatch({ controls })}
						/>
					</div>
				</TabsContent>
			</Tabs>

			<footer className="flex shrink-0 items-center justify-end gap-2">
				{hasOptimizerOverrides(override) && (
					<Button
						variant="ghost"
						size="sm"
						title={
							owned ? "Revert all edits to the saved data" : "Reset all edits"
						}
						onClick={() =>
							onPatch({
								weaponItemId: null,
								weaponLevel: null,
								weaponRank: null,
								level: null,
								chain: null,
								controls: null,
							})
						}
					>
						Revert
					</Button>
				)}
				<Button size="sm" onClick={onClose}>
					Done
				</Button>
			</footer>
		</Modal>
	);
}
