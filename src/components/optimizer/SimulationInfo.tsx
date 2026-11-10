import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export function SimulationInfo({ custom = false }: { custom?: boolean }) {
	return (
		<TooltipProvider delay={150}>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Simulation assumptions"
						/>
					}
				>
					<HugeiconsIcon icon={InformationCircleIcon} />
				</TooltipTrigger>
				<TooltipContent
					side="bottom"
					align="end"
					className="w-80 max-w-[calc(100vw-2rem)]"
				>
					<div className="flex flex-col gap-1.5">
						<p>Lv. 90 · max skills & weapons</p>
						<p>
							{custom ? "Custom flow" : "Opener + 3 loops"} · full starting
							Liberation energy
						</p>
						<p>Enemy: Lv. 100 · 20% RES</p>
						<p>Each member must meet rotation and kit ER minimums.</p>
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
