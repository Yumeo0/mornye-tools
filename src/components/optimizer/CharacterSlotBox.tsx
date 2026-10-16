import { Pencil, UserRound } from "lucide-react";
import { roleIcon, roleLabel } from "@/components/optimizer/display";
import { Button } from "@/components/ui/button";
import type { TranslatedBuild } from "@/lib/calc/translate";
import { cn } from "@/lib/utils";

export type SlotKey = "target" | "mateOne" | "mateTwo";

export const SLOT_LABELS: Record<SlotKey, string> = {
	target: "Target",
	mateOne: "Teammate 1",
	mateTwo: "Teammate 2",
};

/**
 * One team slot in the optimizer: a character box instead of a dropdown.
 * Clicking opens the character picker, the pencil opens the loadout editor,
 * and dragging a box onto another swaps the two slots.
 */
export function CharacterSlotBox({
	label,
	build,
	summary,
	owned,
	modified,
	dragActive,
	dragOver,
	onOpenPicker,
	onOpenEditor,
	onDragStart,
	onDragOver,
	onDragLeave,
	onDrop,
	onDragEnd,
}: {
	label: string;
	build?: TranslatedBuild;
	summary: string;
	owned: boolean;
	modified: boolean;
	dragActive: boolean;
	dragOver: boolean;
	onOpenPicker: () => void;
	onOpenEditor: () => void;
	onDragStart: (event: React.DragEvent) => void;
	onDragOver: (event: React.DragEvent) => void;
	onDragLeave: () => void;
	onDrop: (event: React.DragEvent) => void;
	onDragEnd: () => void;
}) {
	const empty = !build;
	return (
		<fieldset
			aria-label={`${label} slot`}
			draggable={!empty}
			onDragStart={empty ? undefined : onDragStart}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
			onDragEnd={onDragEnd}
			className={cn(
				"bg-card text-card-foreground ring-foreground/10 relative flex min-h-14 min-w-0 items-center gap-2 p-2 ring-1",
				!empty && "cursor-grab active:cursor-grabbing",
				empty && "border border-dashed border-border bg-transparent",
				dragOver && dragActive && "ring-2 ring-primary",
			)}
		>
			<button
				type="button"
				title={empty ? `Choose ${label.toLowerCase()}` : "Choose character"}
				onClick={onOpenPicker}
				className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
			>
				<span className="relative shrink-0">
					{build && roleIcon(build) ? (
						<img
							src={roleIcon(build)}
							alt=""
							className="size-10 object-contain"
						/>
					) : empty ? (
						<UserRound className="size-7 text-muted-foreground" />
					) : (
						<span className="size-10 bg-black/30" />
					)}
					{modified && build && (
						<span
							className="absolute -top-1 -left-1 size-2.5 rounded-full bg-amber-400 ring-2 ring-card"
							title="Edited from saved data"
						/>
					)}
				</span>
				<span className="min-w-0 flex-1">
					<span className="block truncate text-sm font-medium">
						{build ? roleLabel(build) : `Select ${label.toLowerCase()}`}
					</span>
					{build && (
						<span className="flex items-center gap-1.5 text-[10px] leading-none text-muted-foreground">
							{summary && <span className="truncate">{summary}</span>}
							{!owned && (
								<span
									className="shrink-0 text-amber-400"
									title="No saved data; defaults are used"
								>
									not owned
								</span>
							)}
						</span>
					)}
				</span>
			</button>
			{!empty && (
				<Button
					variant="ghost"
					size="icon-sm"
					title="Edit loadout (level, chain, weapon)"
					onClick={onOpenEditor}
				>
					<Pencil className="size-3.5" />
				</Button>
			)}
		</fieldset>
	);
}
