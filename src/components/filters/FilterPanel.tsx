import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A scrollable filter rail, kept beside the results at every window size. */
export function FilterPanel({
	label,
	children,
	className,
	contentClassName,
}: {
	label: string;
	children: ReactNode;
	className?: string;
	contentClassName?: string;
}) {
	return (
		<aside
			aria-label={label}
			data-slot="filter-panel"
			className={cn(
				"min-h-0 w-64 min-w-0 shrink-0 overflow-x-hidden overflow-y-auto overscroll-contain border bg-card text-card-foreground max-[1100px]:w-56",
				className,
			)}
		>
			<div className={cn("flex min-w-0 flex-col gap-4 p-3", contentClassName)}>
				{children}
			</div>
		</aside>
	);
}

/** Shared two-column shell with independent filter and result scrolling. */
export function FilterLayout({
	filters,
	children,
}: {
	filters: ReactNode;
	children: ReactNode;
}) {
	return (
		<div
			data-slot="filter-layout"
			className="flex min-h-0 min-w-0 flex-1 gap-4 overflow-hidden"
		>
			{filters}
			<div
				data-slot="filter-results"
				className="flex min-h-0 min-w-0 flex-1 flex-col"
			>
				{children}
			</div>
		</div>
	);
}
