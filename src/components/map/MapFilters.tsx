import { GridViewIcon, LayoutListIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chunkIntoRows, VirtualGrid } from "@/components/VirtualGrid";
import {
	type ItemRow,
	isItemVisible,
	type MapVisibility,
} from "@/lib/map/filters";
import {
	KIND_LABELS,
	REWARD_KINDS,
	type RewardKind,
	type RewardState,
	STATE_LABELS,
} from "@/lib/map/types";
import { cn } from "@/lib/utils";

const VISIBILITIES: MapVisibility[] = ["all", "remaining", "collected"];
type FilterRow =
	| {
			id: string;
			view: "header";
			kind: RewardKind;
			rows: ItemRow[];
			count: number;
	  }
	| { id: string; view: "list"; row: ItemRow }
	| { id: string; view: "boxes"; boxes: ItemRow[] };
const filterKey = (entry: FilterRow) => entry.id;

export function MapFilters({
	itemRows,
	overrides,
	visibility,
	search,
	markerCount,
	stateTotals,
	onSearchChange,
	onVisibilityChange,
	onTypesChange,
	onReset,
	onFirstMatch,
	questFilters,
}: {
	itemRows: ItemRow[];
	overrides: Record<string, boolean>;
	visibility: MapVisibility;
	search: string;
	markerCount: number;
	stateTotals: Record<RewardState, number>;
	onSearchChange: (value: string) => void;
	onVisibilityChange: (value: MapVisibility) => void;
	onTypesChange: (types: string[], visible: boolean) => void;
	onReset: () => void;
	onFirstMatch: () => void;
	questFilters?: ReactNode;
}) {
	const [filterView, setFilterView] = useState<"list" | "box">("list");
	const countOf = (row: ItemRow) =>
		visibility === "all" ? row.total : row[visibility];
	const filtersActive =
		Object.keys(overrides).length > 0 ||
		visibility !== "all" ||
		search.trim() !== "";
	const filterRows = useMemo(() => {
		const result: FilterRow[] = [];
		for (const kind of REWARD_KINDS) {
			const rows = itemRows.filter((row) => row.kind === kind);
			if (!rows.length) continue;
			result.push({
				id: `kind:${kind}`,
				view: "header",
				kind,
				rows,
				count: rows.reduce(
					(sum, row) =>
						sum + (visibility === "all" ? row.total : row[visibility]),
					0,
				),
			});
			if (filterView === "list") {
				for (const row of rows)
					result.push({ id: row.type, view: "list", row });
			} else {
				for (const boxes of chunkIntoRows(rows, 3))
					result.push({
						id: `boxes:${kind}:${boxes[0].type}`,
						view: "boxes",
						boxes,
					});
			}
		}
		return result;
	}, [itemRows, visibility, filterView]);
	return (
		<aside
			className="flex w-72 shrink-0 flex-col border-r max-[1000px]:w-60 max-[900px]:w-48"
			aria-label="Map filters"
		>
			<div className="flex flex-col gap-3 p-4 pb-3">
				<div className="flex items-center justify-between gap-2">
					<span className="text-[10px] tracking-[.2em] text-muted-foreground">
						FILTERS
					</span>
					<span className="flex items-center gap-1">
						{filtersActive && (
							<Button
								variant="ghost"
								size="xs"
								className="h-5 px-1 text-[10px]"
								onClick={onReset}
							>
								Reset
							</Button>
						)}
						<Badge variant="secondary">{markerCount.toLocaleString()}</Badge>
					</span>
				</div>
				<Input
					aria-label="Search map"
					placeholder="Search name, area or ID…"
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
				{search.trim() && markerCount > 0 && (
					<Button variant="outline" size="xs" onClick={onFirstMatch}>
						Go to first match
					</Button>
				)}
				<section className="flex flex-col gap-2">
					<h2 className="text-[10px] tracking-[.15em] text-muted-foreground">
						REWARD STATUS
					</h2>
					<fieldset className="flex flex-col gap-2">
						<legend className="sr-only">Collection status</legend>
						{VISIBILITIES.map((value) => (
							<label
								key={value}
								className="flex cursor-pointer items-center gap-2 text-xs"
							>
								<input
									type="radio"
									name="map-visibility"
									className="accent-primary"
									checked={visibility === value}
									onChange={() => onVisibilityChange(value)}
								/>
								{value !== "all" && (
									<span className={`map-state-dot state-${value}`} />
								)}
								<span className="flex-1">
									{value === "all" ? "All" : STATE_LABELS[value]}
								</span>
								<span className="text-[10px] text-muted-foreground tabular-nums">
									{(value === "all"
										? stateTotals.collected + stateTotals.remaining
										: stateTotals[value]
									).toLocaleString()}
								</span>
							</label>
						))}
					</fieldset>
				</section>
			</div>
			{questFilters}
			<div className="flex items-center justify-between border-t px-4 pb-2 pt-3">
				<h2 className="text-[10px] tracking-[.15em] text-muted-foreground">
					ITEMS
				</h2>
				<span className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label="List view"
						title="List view"
						aria-pressed={filterView === "list"}
						className={
							filterView === "list" ? "bg-primary/15 text-primary" : undefined
						}
						onClick={() => setFilterView("list")}
					>
						<HugeiconsIcon icon={LayoutListIcon} />
					</Button>
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label="Box view"
						title="Box view"
						aria-pressed={filterView === "box"}
						className={
							filterView === "box" ? "bg-primary/15 text-primary" : undefined
						}
						onClick={() => setFilterView("box")}
					>
						<HugeiconsIcon icon={GridViewIcon} />
					</Button>
				</span>
			</div>
			<VirtualGrid
				items={filterRows}
				columns={1}
				gap={0}
				estimateRowHeight={filterView === "box" ? 106 : 28}
				getItemKey={filterKey}
				className="min-h-0 flex-1 overflow-y-auto pb-2"
				renderItem={(entry) => {
					if (entry.view === "header") {
						const visibleCount = entry.rows.filter((row) =>
							isItemVisible(overrides, row),
						).length;
						return (
							<label
								key={entry.id}
								className="flex cursor-pointer items-center gap-2 border-b border-t px-2.5 py-1.5 text-[10px] tracking-[.1em] text-muted-foreground hover:bg-muted/50"
							>
								<input
									type="checkbox"
									className="accent-primary"
									checked={visibleCount === entry.rows.length}
									ref={(element) => {
										if (element)
											element.indeterminate =
												visibleCount > 0 && visibleCount < entry.rows.length;
									}}
									onChange={(e) =>
										onTypesChange(
											entry.rows.map((row) => row.type),
											e.target.checked,
										)
									}
								/>
								<span className="min-w-0 flex-1 truncate">
									{KIND_LABELS[entry.kind]}
								</span>
								<span className="tabular-nums">
									{entry.count.toLocaleString()}
								</span>
							</label>
						);
					}
					if (entry.view === "list")
						return (
							<label
								key={entry.id}
								className="flex cursor-pointer items-center gap-2 py-1 pl-5 pr-2.5 text-[11px] hover:bg-muted/50"
							>
								<input
									type="checkbox"
									className="accent-primary"
									checked={isItemVisible(overrides, entry.row)}
									onChange={(e) =>
										onTypesChange([entry.row.type], e.target.checked)
									}
								/>
								<img
									src={entry.row.icon}
									alt=""
									className={cn(
										"size-5 shrink-0 object-contain",
										!isItemVisible(overrides, entry.row) && "opacity-40",
									)}
								/>
								<span className="min-w-0 flex-1 truncate">
									{entry.row.label}
								</span>
								<span className="text-[10px] text-muted-foreground tabular-nums">
									{countOf(entry.row).toLocaleString()}
								</span>
							</label>
						);
					return (
						<div
							key={entry.id}
							className="grid grid-cols-3 gap-1.5 px-2.5 py-1.5"
						>
							{entry.boxes.map((row) => (
								<label
									key={row.type}
									className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-0.5 border border-transparent pt-0.5 text-center hover:border-border hover:bg-muted/40"
								>
									<span className="flex w-full items-center justify-between px-0.5">
										<input
											type="checkbox"
											className="accent-primary"
											checked={isItemVisible(overrides, row)}
											onChange={(e) =>
												onTypesChange([row.type], e.target.checked)
											}
										/>
										<span className="text-[9px] text-muted-foreground tabular-nums">
											{countOf(row).toLocaleString()}
										</span>
									</span>
									<img
										src={row.icon}
										alt=""
										className={cn(
											"size-12 shrink-0 object-contain",
											!isItemVisible(overrides, row) && "opacity-40",
										)}
									/>
									<span className="line-clamp-2 w-full px-0.5 text-[9px] leading-tight">
										{row.label}
									</span>
								</label>
							))}
						</div>
					);
				}}
			/>
		</aside>
	);
}
