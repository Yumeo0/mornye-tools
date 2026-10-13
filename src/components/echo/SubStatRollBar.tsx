import type { CSSProperties } from "react";
import { maxSubStatValue, subStatRoll, subStatRollColor } from "@/lib/stats";
import { cn } from "@/lib/utils";

/**
 * Segmented substat roll bar: one segment per possible roll (8 for most
 * substats, 4 for flat ATK/DEF) with the rolled tier filled, colored by how
 * close the value is to the maximum roll. With `revealOnHover` the segments
 * stay neutral until the surrounding `group/card` is hovered.
 */
export function SubStatRollBar({
	statName,
	value,
	className,
	revealOnHover,
}: {
	statName: string;
	value: number;
	className?: string;
	revealOnHover?: boolean;
}) {
	const roll = subStatRoll(statName, value);
	const maxValue = maxSubStatValue(statName);
	if (!roll || !maxValue) return null;
	const color = subStatRollColor(value, maxValue);

	return (
		<div
			className={cn("flex gap-0.5", className)}
			title={`Roll ${roll.tier}/${roll.tierCount}`}
		>
			{roll.rolls.map((_, index) => {
				const filled = index < roll.tier;
				return (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
						key={index}
						className={cn(
							"h-full flex-1 rounded-[1px]",
							filled
								? revealOnHover
									? "bg-muted-foreground/40 transition-colors group-hover/card:bg-[var(--roll-color)]"
									: ""
								: "bg-black/30",
						)}
						style={
							filled
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
