import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export function OptimizerInfo({
	label,
	children,
	triggerContent,
}: {
	label: string;
	children: ReactNode;
	triggerContent?: ReactNode;
}) {
	return (
		<TooltipProvider delay={150}>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size={triggerContent ? "sm" : "icon-xs"}
							aria-label={label}
						/>
					}
				>
					{triggerContent ?? <HugeiconsIcon icon={InformationCircleIcon} />}
				</TooltipTrigger>
				<TooltipContent
					side="bottom"
					align="end"
					className="w-72 max-w-[calc(100vw-2rem)]"
				>
					<div className="flex flex-col gap-3">{children}</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
