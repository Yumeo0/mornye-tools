import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dark chip for stats shown on top of card imagery (level, echoes, rank). */
function CardBadge({
	title,
	children,
	className,
}: {
	title: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<span
			title={title}
			className={cn(
				"flex items-center gap-1 bg-black/50 px-1.5 py-0.5 text-[10px] leading-none font-medium text-white/90",
				className,
			)}
		>
			{children}
		</span>
	);
}

export { CardBadge };
