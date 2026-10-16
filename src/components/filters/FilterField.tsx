import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Labeled filter facet: a small caption above its control. */
export function FilterField({
	label,
	active,
	className,
	children,
}: {
	label: string;
	/** Highlights the caption while the facet narrows the list. */
	active?: boolean;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className={cn("flex min-w-0 flex-col gap-1", className)}>
			<span
				className={`text-[10px] leading-none ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}
			>
				{label}
			</span>
			{children}
		</div>
	);
}
