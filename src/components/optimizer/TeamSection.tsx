import type { RotDef } from "@wuwacalc/core/domain/gameData/contracts";
import { useState } from "react";
import {
	CharacterSlotBox,
	SLOT_LABELS,
	type SlotKey,
} from "@/components/optimizer/CharacterSlotBox";
import { roleLabel } from "@/components/optimizer/display";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import type { MeasuredSlot } from "@/hooks/useOptimizerTeam";
import type { OptimizerOverrides, TranslatedBuild } from "@/lib/calc/translate";
import { hasOptimizerOverrides } from "@/lib/calc/translate";
import { cn } from "@/lib/utils";

const SLOTS: SlotKey[] = ["target", "mateOne", "mateTwo"];

const TEAM_SLOT_LABELS: Record<SlotKey, string> = {
	target: "Support (searched)",
	mateOne: "Teammate 1",
	mateTwo: "Teammate 2",
};

/**
 * Team row: the three character slots (with drag-and-drop swapping), the
 * rotation picker and, in team mode, the teammate whose rotation is measured.
 * Slot state lives in the tab; only the drag state is local.
 */
export function TeamSection({
	slotRoleIds,
	buildsByRoleId,
	ownedRoleIds,
	overrides,
	slotSummary,
	swapSlots,
	onOpenPicker,
	onOpenEditor,
	rotations,
	rotation,
	coreReady,
	onRotationChange,
	mode,
	measuredSlot,
	onMeasuredSlotChange,
}: {
	slotRoleIds: Record<SlotKey, string>;
	buildsByRoleId: Map<string, TranslatedBuild>;
	ownedRoleIds: Set<string>;
	overrides: Record<string, OptimizerOverrides>;
	slotSummary: (roleId: string) => string;
	swapSlots: (a: SlotKey, b: SlotKey) => void;
	onOpenPicker: (slot: SlotKey) => void;
	onOpenEditor: (slot: SlotKey) => void;
	rotations: RotDef[];
	rotation: RotDef | null;
	coreReady: boolean;
	onRotationChange: (id: string) => void;
	/** Search mode; team mode adds the measured-teammate picker. */
	mode: "damage" | "team";
	measuredSlot: MeasuredSlot;
	onMeasuredSlotChange: (slot: MeasuredSlot) => void;
}) {
	const [dragSlot, setDragSlot] = useState<SlotKey | null>(null);
	const [dragOverSlot, setDragOverSlot] = useState<SlotKey | null>(null);
	const teamMode = mode === "team";

	const slotLabels = teamMode ? TEAM_SLOT_LABELS : SLOT_LABELS;
	// Label shown on a slot: team mode marks the measured teammate.
	const labelFor = (slot: SlotKey) =>
		teamMode && slot === measuredSlot
			? `${slotLabels[slot]} · measured`
			: slotLabels[slot];

	const renderSlot = (slot: SlotKey) => {
		const roleId = slotRoleIds[slot];
		const build = roleId ? buildsByRoleId.get(roleId) : undefined;
		return (
			<div key={slot} className="flex min-w-0 flex-col gap-1">
				<span className="text-[10px] leading-none text-muted-foreground">
					{labelFor(slot)}
				</span>
				<CharacterSlotBox
					label={labelFor(slot)}
					build={build}
					summary={roleId ? slotSummary(roleId) : ""}
					owned={roleId != null && ownedRoleIds.has(roleId)}
					modified={hasOptimizerOverrides(overrides[roleId])}
					dragActive={dragSlot != null && dragSlot !== slot}
					dragOver={
						dragOverSlot === slot && dragSlot != null && dragSlot !== slot
					}
					onOpenPicker={() => onOpenPicker(slot)}
					onOpenEditor={() => onOpenEditor(slot)}
					onDragStart={(event) => {
						setDragSlot(slot);
						event.dataTransfer.setData("text/plain", slot);
						event.dataTransfer.effectAllowed = "move";
					}}
					onDragOver={(event) => {
						event.preventDefault();
						event.dataTransfer.dropEffect = "move";
						if (dragSlot && dragSlot !== slot) setDragOverSlot(slot);
					}}
					onDragLeave={() =>
						setDragOverSlot((current) => (current === slot ? null : current))
					}
					onDrop={(event) => {
						event.preventDefault();
						if (dragSlot && dragSlot !== slot) swapSlots(dragSlot, slot);
						setDragSlot(null);
						setDragOverSlot(null);
					}}
					onDragEnd={() => {
						setDragSlot(null);
						setDragOverSlot(null);
					}}
				/>
			</div>
		);
	};

	const measuredOptions = (["mateOne", "mateTwo"] as MeasuredSlot[]).map(
		(slot) => {
			const roleId = slotRoleIds[slot];
			const build = roleId ? buildsByRoleId.get(roleId) : undefined;
			const fallback = `${SLOT_LABELS[slot]} (empty)`;
			return {
				slot,
				roleId,
				name: build ? roleLabel(build) : fallback,
				label: build ? `${SLOT_LABELS[slot]} · ${roleLabel(build)}` : fallback,
				disabled: !build,
			};
		},
	);

	return (
		<div
			className={cn(
				"grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2",
				teamMode ? "xl:grid-cols-5" : "xl:grid-cols-4",
			)}
		>
			{SLOTS.map(renderSlot)}
			{teamMode && (
				<div className="flex min-w-0 flex-col gap-1">
					<span className="text-[10px] leading-none text-muted-foreground">
						Measured
					</span>
					<Select
						value={measuredSlot}
						onValueChange={(next) =>
							onMeasuredSlotChange(next === "mateTwo" ? "mateTwo" : "mateOne")
						}
					>
						<SelectTrigger size="sm" className="w-full">
							<span className="truncate">
								{measuredOptions.find((option) => option.slot === measuredSlot)
									?.name ?? "Pick a teammate"}
							</span>
						</SelectTrigger>
						<SelectContent>
							{measuredOptions.map((option) => (
								<SelectItem
									key={option.slot}
									value={option.slot}
									disabled={option.disabled}
								>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}
			<div className="flex min-w-0 flex-col gap-1">
				<span className="text-[10px] leading-none text-muted-foreground">
					{teamMode ? "Measured rotation" : "Rotation"}
				</span>
				<Select
					value={rotation ? rotation.id : null}
					onValueChange={(next) =>
						onRotationChange(typeof next === "string" ? next : "")
					}
					disabled={rotations.length === 0}
				>
					<SelectTrigger size="sm" className="w-full">
						<span className="truncate">
							{rotation
								? `${rotation.label} · ${rotation.items.length} steps`
								: coreReady
									? teamMode
										? "No rotation for the measured teammate"
										: "No rotation — first skill"
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
	);
}
