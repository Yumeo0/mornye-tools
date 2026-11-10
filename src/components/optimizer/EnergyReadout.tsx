import type { EnergyStatus } from "@/lib/calc/types";
import { charactersById } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { OptimizerInfo } from "./OptimizerInfo";

export function EnergyReadout({ energy }: { energy: EnergyStatus[] }) {
	return (
		<div className="flex flex-wrap items-center gap-0.5 text-xs">
			<span className="mr-1 text-[10px] text-muted-foreground">ER</span>
			{energy.map((e) => {
				const icon = charactersById.get(e.characterId)?.icon_head_256;
				return (
					<OptimizerInfo
						key={e.characterId}
						label={`${e.name}: ${e.actual.toFixed(1)}% ER, needs ${Math.max(e.required, e.kitMinimum).toFixed(1)}%${e.feasible ? "" : ", insufficient"}`}
						triggerContent={
							<>
								{icon && (
									<img src={icon} alt="" className="size-5 object-contain" />
								)}
								<span
									className={cn(
										"whitespace-nowrap text-[11px] tabular-nums",
										!e.feasible && "text-destructive",
									)}
								>
									{e.actual.toFixed(1)}{" "}
									<span className="text-muted-foreground">
										/ {Math.max(e.required, e.kitMinimum).toFixed(1)}%
									</span>
								</span>
							</>
						}
					>
						<p>
							{e.name}: {e.actual.toFixed(1)}% ER. Rotation:{" "}
							{e.required.toFixed(1)}%.
							{e.kitMinimum > 0 && ` Kit: ${e.kitMinimum.toFixed(1)}%.`}
						</p>
					</OptimizerInfo>
				);
			})}
		</div>
	);
}
