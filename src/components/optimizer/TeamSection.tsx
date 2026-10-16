import type { RotDef } from "@wuwacalc/core/domain/gameData/contracts";
import { useState } from "react";
import {
	CharacterSlotBox,
	SLOT_LABELS,
	type SlotKey,
} from "@/components/optimizer/CharacterSlotBox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import type { OptimizerOverrides, TranslatedBuild } from "@/lib/calc/translate";
import { hasOptimizerOverrides } from "@/lib/calc/translate";

const SLOTS: SlotKey[] = ["target", "mateOne", "mateTwo"];

/**
 * Team row: the three character slots (with drag-and-drop swapping) and the
 * rotation picker. Slot state lives in the tab; only the drag state is local.
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
}) {
	const [dragSlot, setDragSlot] = useState<SlotKey | null>(null);
	const [dragOverSlot, setDragOverSlot] = useState<SlotKey | null>(null);

	const renderSlot = (slot: SlotKey) => {
		const roleId = slotRoleIds[slot];
		const build = roleId ? buildsByRoleId.get(roleId) : undefined;
		return (
			<div key={slot} className="flex min-w-0 flex-col gap-1">
				<span className="text-[10px] leading-none text-muted-foreground">
					{SLOT_LABELS[slot]}
				</span>
				<CharacterSlotBox
					label={SLOT_LABELS[slot]}
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

	return (
		<div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
			{SLOTS.map(renderSlot)}
			<div className="flex min-w-0 flex-col gap-1">
				<span className="text-[10px] leading-none text-muted-foreground">
					Rotation
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
	);
}
