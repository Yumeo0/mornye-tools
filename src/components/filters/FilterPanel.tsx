import {
	ArrowLeft01Icon,
	FilterHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ReactNode, useId } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFilterState } from "@/lib/persistentState";
import { cn } from "@/lib/utils";

export interface ActiveFilter {
	id?: string;
	label: string;
	onRemove: () => void;
}

/** Filters stay mounted when folded, preserving control and scroll state. */
export function FilterPanel({
	label,
	children,
	className,
	contentClassName,
	activeFilters = [],
}: {
	label: string;
	children: ReactNode;
	className?: string;
	contentClassName?: string;
	activeFilters?: ActiveFilter[];
}) {
	const [collapsed, setCollapsed] = useFilterState(
		`filters.${label}.collapsed`,
		false,
	);
	const contentId = useId();
	return (
		<aside
			aria-label={label}
			data-slot="filter-panel"
			className={cn(
				"flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border bg-card text-card-foreground",
				collapsed ? "w-12" : "w-64 max-[1100px]:w-56",
				className,
			)}
		>
			<header
				className={cn(
					"flex shrink-0 items-center gap-2 p-2",
					!collapsed && "border-b",
				)}
			>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label={`${collapsed ? "Show" : "Hide"} ${label.toLowerCase()}`}
					aria-expanded={!collapsed}
					aria-controls={contentId}
					onClick={() => setCollapsed(!collapsed)}
					title={
						collapsed
							? [label, ...activeFilters.map((f) => f.label)].join(" · ")
							: "Hide filters"
					}
				>
					<HugeiconsIcon
						icon={collapsed ? FilterHorizontalIcon : ArrowLeft01Icon}
					/>
				</Button>
				{!collapsed && (
					<span className="flex-1 text-xs font-medium">Filters</span>
				)}
				{!collapsed && activeFilters.length > 0 && (
					<Badge variant="secondary">{activeFilters.length}</Badge>
				)}
			</header>
			{collapsed && activeFilters.length > 0 && (
				<span
					className="text-center text-xs tabular-nums text-primary"
					title={activeFilters.map((f) => f.label).join(" · ")}
				>
					{activeFilters.length}
				</span>
			)}
			<div
				id={contentId}
				hidden={collapsed}
				className={cn(
					"min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain",
					collapsed && "hidden",
				)}
			>
				<div
					className={cn("flex min-w-0 flex-col gap-4 p-3", contentClassName)}
				>
					{activeFilters.length > 0 && (
						<fieldset
							className="flex flex-wrap gap-1"
							aria-label="Active filters"
						>
							{activeFilters.map((filter) => (
								<Button
									key={filter.id ?? filter.label}
									variant="secondary"
									size="xs"
									aria-label={`Remove filter: ${filter.label}`}
									onClick={filter.onRemove}
									className="h-auto max-w-full whitespace-normal text-left"
								>
									<span className="min-w-0 break-words">{filter.label}</span>
									<span aria-hidden="true">×</span>
								</Button>
							))}
						</fieldset>
					)}
					{children}
				</div>
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
