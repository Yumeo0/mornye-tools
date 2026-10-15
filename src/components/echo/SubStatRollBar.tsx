import type { CSSProperties } from "react";
import { subStatRoll, subStatSegmentColor } from "@/lib/stats";
import { cn } from "@/lib/utils";

/**
 * Segmented substat roll bar: one segment per possible roll (8 for most
 * substats, 4 for flat ATK/DEF) with the rolled tier filled, each segment
 * colored by its roll band (green → blue → purple → gold, two segments per
 * band for 8-roll stats, one for 4-roll stats). With `revealOnHover` the
 * segments stay neutral until the surrounding `group/card` is hovered. With
 * `dimmed` the whole bar renders gray (stat not wanted by the active
 * character).
 */
export function SubStatRollBar({
	statName,
	value,
	className,
	revealOnHover,
	dimmed,
}: {
	statName: string;
	value: number;
	className?: string;
	revealOnHover?: boolean;
	dimmed?: boolean;
}) {
	const roll = subStatRoll(statName, value);
	if (!roll) return null;

	return (
		<div
			className={cn("flex gap-1", className)}
			title={`Roll ${roll.tier}/${roll.tierCount}`}
		>
			{roll.rolls.map((_, index) => {
				const filled = index < roll.tier;
				const color = subStatSegmentColor(index, roll.tierCount);
				return (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
						key={index}
						className={cn(
							"h-full flex-1 rounded-[1px]",
							filled
								? dimmed
									? "bg-zinc-500/50"
									: revealOnHover
										? "bg-muted-foreground/40 transition-colors group-hover/card:bg-[var(--roll-color)]"
										: ""
								: dimmed
									? "bg-zinc-500/15"
									: "bg-black/30",
						)}
						style={
							filled && !dimmed
								? revealOnHover
									? ({ "--roll-color": color } as CSSProperties)
									: { backgroundColor: color }
								: undefined
						}
					/>
				);
			})}
		</div>
	);
}
