import {
	ArrowDown01Icon,
	GridViewIcon,
	LayoutListIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";
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
	type RewardState,
	STATE_LABELS,
} from "@/lib/map/types";
import {
	isQuestStatusVisible,
	type QuestStatusRow,
} from "@/lib/progression/state";
import type { QuestStatus } from "@/lib/progression/types";
import { readSetting, writeSetting } from "@/lib/settings";
import { cn } from "@/lib/utils";

const VISIBILITIES: MapVisibility[] = ["all", "remaining", "collected"];
type FilterView = "list" | "box";

/** One toggleable list entry; item types and quest statuses share the shape. */
interface FilterEntry {
	id: string;
	label: string;
	icon: string;
	count: number;
	checked: boolean;
	onToggle: (visible: boolean) => void;
}
type FilterRow =
	| {
			id: string;
			view: "header";
			label: string;
			count: number;
			checked: boolean;
			indeterminate: boolean;
			expanded: boolean;
			onExpand: () => void;
			onToggle: (visible: boolean) => void;
	  }
	| { id: string; view: "row"; row: FilterEntry }
	| { id: string; view: "boxes"; boxes: FilterEntry[] }
	| { id: string; view: "note"; text: string; error: boolean };
const filterKey = (entry: FilterRow) => entry.id;

export function MapFilters({
	itemRows,
	overrides,
	visibility,
	search,
	markerCount,
	stateTotals,
	questRows,
	questOverrides,
	questSynced,
	questError,
	onQuestStatusChange,
	onSearchChange,
	onVisibilityChange,
	onTypesChange,
	onReset,
	onFirstMatch,
}: {
	itemRows: ItemRow[];
	overrides: Record<string, boolean>;
	visibility: MapVisibility;
	search: string;
	markerCount: number;
	stateTotals: Record<RewardState, number>;
	questRows: QuestStatusRow[];
	questOverrides: Record<string, boolean>;
	questSynced: boolean;
	questError: string | null;
	onQuestStatusChange: (statuses: QuestStatus[], visible: boolean) => void;
	onSearchChange: (value: string) => void;
	onVisibilityChange: (value: MapVisibility) => void;
	onTypesChange: (types: string[], visible: boolean) => void;
	onReset: () => void;
	onFirstMatch: () => void;
}) {
	const [filterView, setFilterView] = useState<FilterView>("list");
	const [expandedSections, setExpandedSections] = useState<
		Record<string, boolean>
	>({});
	const [statusExpanded, setStatusExpanded] = useState(false);
	// The view is remembered across sessions; unusable stored values are ignored.
	useEffect(() => {
		void readSetting<string>("mapFilterView").then((saved) => {
			if (saved === "list" || saved === "box") setFilterView(saved);
		});
	}, []);
	const selectView = (view: FilterView) => {
		setFilterView(view);
		void writeSetting("mapFilterView", view).catch((error) =>
			console.error("[map] Failed to save the filter view:", error),
		);
	};
	const filtersActive =
		Object.keys(overrides).length > 0 ||
		Object.keys(questOverrides).length > 0 ||
		visibility !== "all" ||
		search.trim() !== "";
	const filterRows = useMemo(() => {
		const result: FilterRow[] = [];
		const countOf = (row: ItemRow) =>
			visibility === "all" ? row.total : row[visibility];
		/** Append list rows or boxed rows for one block of entries. */
		const addEntries = (entries: FilterEntry[], prefix: string) => {
			if (filterView === "list") {
				for (const row of entries)
					result.push({ id: row.id, view: "row", row });
				return;
			}
			for (const boxes of chunkIntoRows(entries, 3))
				result.push({
					id: `boxes:${prefix}:${boxes[0].id}`,
					view: "boxes",
					boxes,
				});
		};
		// The search narrows this list, never the map markers themselves.
		const query = search.trim().toLowerCase();
		// Search reveals matches without changing the normal disclosure state.
		// Each search can still be collapsed independently.
		const expansion = (id: string) => {
			const key = `${query}:${id}`;
			const expanded = expandedSections[key] ?? Boolean(query);
			return {
				expanded,
				onExpand: () =>
					setExpandedSections((current) => ({ ...current, [key]: !expanded })),
			};
		};
		const matches = (text: string) =>
			!query || text.toLowerCase().includes(query);
		// Side quests lead the list, so the view toggle covers them too.
		const visibleQuestRows = questRows.filter(
			(row) => matches(row.label) || matches("Side quests"),
		);
		if (visibleQuestRows.length) {
			const disclosure = expansion("quests");
			const visibleCount = visibleQuestRows.filter((row) =>
				isQuestStatusVisible(questOverrides, row.status),
			).length;
			result.push({
				id: "quests",
				view: "header",
				...disclosure,
				label: "Side quests",
				count: visibleQuestRows.reduce((sum, row) => sum + row.total, 0),
				checked: visibleCount === visibleQuestRows.length,
				indeterminate:
					visibleCount > 0 && visibleCount < visibleQuestRows.length,
				onToggle: (visible) =>
					onQuestStatusChange(
						visibleQuestRows.map((row) => row.status),
						visible,
					),
			});
			if (disclosure.expanded)
				addEntries(
					visibleQuestRows.map((row) => ({
						id: `quest:${row.status}`,
						label: row.label,
						icon: row.icon,
						count: row.total,
						checked: isQuestStatusVisible(questOverrides, row.status),
						onToggle: (visible: boolean) =>
							onQuestStatusChange([row.status], visible),
					})),
					"quests",
				);
		}
		for (const kind of REWARD_KINDS) {
			const rows = itemRows.filter(
				(row) =>
					row.kind === kind &&
					(matches(row.label) || matches(KIND_LABELS[kind])),
			);
			if (!rows.length) continue;
			const disclosure = expansion(kind);
			const visibleCount = rows.filter((row) =>
				isItemVisible(overrides, row),
			).length;
			result.push({
				id: `kind:${kind}`,
				view: "header",
				...disclosure,
				label: KIND_LABELS[kind],
				count: rows.reduce((sum, row) => sum + countOf(row), 0),
				checked: visibleCount === rows.length,
				indeterminate: visibleCount > 0 && visibleCount < rows.length,
				onToggle: (visible) =>
					onTypesChange(
						rows.map((row) => row.type),
						visible,
					),
			});
			if (disclosure.expanded)
				addEntries(
					rows.map((row) => ({
						id: row.type,
						label: row.label,
						icon: row.icon,
						count: countOf(row),
						checked: isItemVisible(overrides, row),
						onToggle: (visible: boolean) => onTypesChange([row.type], visible),
					})),
					kind,
				);
		}
		if (!questSynced)
			result.push({
				id: "quest-note",
				view: "note",
				text: "Waiting for quest status from login.",
				error: false,
			});
		if (questError)
			result.push({
				id: "quest-error",
				view: "note",
				text: questError,
				error: true,
			});
		if (query && !result.some((row) => row.view !== "note"))
			result.push({
				id: "search-note",
				view: "note",
				text: `No filters match “${search.trim()}”.`,
				error: false,
			});
		return result;
	}, [
		itemRows,
		overrides,
		visibility,
		search,
		filterView,
		expandedSections,
		questRows,
		questOverrides,
		questSynced,
		questError,
		onQuestStatusChange,
		onTypesChange,
	]);
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
						<Button
							variant="ghost"
							size="icon-xs"
							aria-label="List view"
							title="List view"
							aria-pressed={filterView === "list"}
							className={
								filterView === "list" ? "bg-primary/15 text-primary" : undefined
							}
							onClick={() => selectView("list")}
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
							onClick={() => selectView("box")}
						>
							<HugeiconsIcon icon={GridViewIcon} />
						</Button>
						{filtersActive && (
							<Button
								variant="ghost"
								size="xs"
								className="h-5 px-1 text-[10px]"
								onClick={() => {
									setExpandedSections({});
									setStatusExpanded(false);
									onReset();
								}}
							>
								Reset
							</Button>
						)}
						<Badge variant="secondary">{markerCount.toLocaleString()}</Badge>
					</span>
				</div>
				<Input
					aria-label="Filter items"
					placeholder="Filter items and quests…"
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
						<button
							type="button"
							aria-expanded={statusExpanded}
							aria-controls="map-reward-status"
							onClick={() => setStatusExpanded((expanded) => !expanded)}
							className="flex w-full items-center justify-between gap-2 py-1 text-left outline-none focus-visible:ring-1 focus-visible:ring-ring"
						>
							REWARD STATUS
							<HugeiconsIcon
								icon={ArrowDown01Icon}
								size={12}
								className={cn(
									"shrink-0 transition-transform",
									!statusExpanded && "-rotate-90",
								)}
							/>
						</button>
					</h2>
					<fieldset
						id="map-reward-status"
						hidden={!statusExpanded}
						className={cn("flex-col gap-2", statusExpanded && "flex")}
					>
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
			<VirtualGrid
				items={filterRows}
				columns={1}
				gap={0}
				estimateRowHeight={filterView === "box" ? 106 : 28}
				getItemKey={filterKey}
				className="min-h-0 flex-1 overflow-y-auto pb-2"
				renderItem={(entry) => {
					if (entry.view === "header")
						return (
							<div
								key={entry.id}
								className="flex items-center gap-2 border-b border-t pl-2.5 text-[10px] tracking-[.1em] text-muted-foreground"
							>
								<input
									type="checkbox"
									aria-label={`Show ${entry.label}`}
									className="accent-primary"
									checked={entry.checked}
									ref={(element) => {
										if (element) element.indeterminate = entry.indeterminate;
									}}
									onChange={(e) => entry.onToggle(e.target.checked)}
								/>
								<button
									type="button"
									aria-expanded={entry.expanded}
									onClick={entry.onExpand}
									className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2.5 text-left outline-none hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring"
								>
									<span className="min-w-0 flex-1 truncate">{entry.label}</span>
									<span className="tabular-nums">
										{entry.count.toLocaleString()}
									</span>
									<HugeiconsIcon
										icon={ArrowDown01Icon}
										size={12}
										className={cn(
											"shrink-0 transition-transform",
											!entry.expanded && "-rotate-90",
										)}
									/>
								</button>
							</div>
						);
					if (entry.view === "row")
						return (
							<label
								key={entry.id}
								className="flex cursor-pointer items-center gap-2 py-1 pl-5 pr-2.5 text-[11px] hover:bg-muted/50"
							>
								<input
									type="checkbox"
									className="accent-primary"
									checked={entry.row.checked}
									onChange={(e) => entry.row.onToggle(e.target.checked)}
								/>
								<img
									src={entry.row.icon}
									alt=""
									className={cn(
										"size-5 shrink-0 object-contain",
										!entry.row.checked && "opacity-40",
									)}
								/>
								<span className="min-w-0 flex-1 truncate">
									{entry.row.label}
								</span>
								<span className="text-[10px] text-muted-foreground tabular-nums">
									{entry.row.count.toLocaleString()}
								</span>
							</label>
						);
					if (entry.view === "boxes")
						return (
							<div
								key={entry.id}
								className="grid grid-cols-3 gap-1.5 px-2.5 py-1.5"
							>
								{entry.boxes.map((row) => (
									<label
										key={row.id}
										className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-0.5 border border-transparent pt-0.5 text-center hover:border-border hover:bg-muted/40"
									>
										<span className="flex w-full items-center justify-between px-0.5">
											<input
												type="checkbox"
												className="accent-primary"
												checked={row.checked}
												onChange={(e) => row.onToggle(e.target.checked)}
											/>
											<span className="text-[9px] text-muted-foreground tabular-nums">
												{row.count.toLocaleString()}
											</span>
										</span>
										<img
											src={row.icon}
											alt=""
											className={cn(
												"size-12 shrink-0 object-contain",
												!row.checked && "opacity-40",
											)}
										/>
										<span className="line-clamp-2 w-full px-0.5 text-[9px] leading-tight">
											{row.label}
										</span>
									</label>
								))}
							</div>
						);
					return (
						<p
							key={entry.id}
							className={cn(
								"px-2.5 py-1 text-[10px]",
								entry.error ? "text-destructive" : "text-muted-foreground",
							)}
						>
							{entry.text}
						</p>
					);
				}}
			/>
		</aside>
	);
}
