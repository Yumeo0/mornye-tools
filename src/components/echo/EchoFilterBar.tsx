import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import {
	ECHO_SORT_OPTIONS,
	type EchoFilters,
	type EchoSortKey,
	EMPTY_ECHO_FILTERS,
} from "@/components/echo/echoFilters";
import {
	activeFilterChips,
	EquippedCharacterFilter,
	FilterField,
	type FilterOption,
	FilterPanel,
	FilterSearch,
	FilterSummary,
	MultiSelect,
	RangeFilter,
	SortButtons,
	statFilterOptions,
	toggleInArray,
} from "@/components/filters";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { sonataIconByName } from "@/lib/catalog";
import { ECHO_MARK_ICONS, type EchoMark } from "@/lib/echoMark";
import echoData from "../../configs/echo_data.json";

interface EchoCostEntry {
	echo_cost?: number;
}

const setOptions: FilterOption[] = [...sonataIconByName.keys()]
	.sort()
	.map((name) => ({
		value: name,
		label: name,
		icon: sonataIconByName.get(name),
	}));

const costOptions: FilterOption[] = [
	...new Set(
		(echoData as EchoCostEntry[])
			.map((echo) => echo.echo_cost)
			.filter((cost): cost is number => cost !== undefined),
	),
]
	.sort((a, b) => b - a)
	.map((cost) => ({ value: String(cost), label: `${cost} Cost` }));

const mainStatOptions = statFilterOptions();

/** Vertical echo filters and sorting, plus the "Add echo" action. */
export function EchoFilterBar({
	filters,
	onFiltersChange,
	sortBy,
	sortAsc,
	onSortChange,
	resultCount,
	totalCount,
	characterOptions,
	onAddEcho,
	children,
}: {
	filters: EchoFilters;
	onFiltersChange: (
		update: EchoFilters | ((previous: EchoFilters) => EchoFilters),
	) => void;
	sortBy: EchoSortKey;
	sortAsc: boolean;
	onSortChange: (sortBy: EchoSortKey, sortAsc: boolean) => void;
	resultCount: number;
	totalCount: number;
	characterOptions: FilterOption[];
	onAddEcho?: () => void;
	children?: ReactNode;
}) {
	const hasActiveFilters =
		JSON.stringify(filters) !== JSON.stringify(EMPTY_ECHO_FILTERS) ||
		sortBy !== "none" ||
		sortAsc;

	const setFilter = (key: "set" | "substat" | "character", value: string[]) => {
		onFiltersChange((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<FilterPanel
			label="Echo filters"
			activeFilters={activeFilterChips(
				filters,
				EMPTY_ECHO_FILTERS,
				onFiltersChange,
				{
					search: (value) => `“${value}”`,
					minLevel: (value) => `Min +${value}`,
					maxLevel: (value) => `Max +${value}`,
					cost: (value) => `${value.join(" / ")} cost`,
					set: (value) => value.join(" / "),
					mainStat: (value) =>
						mainStatOptions.find((option) => option.value === value)?.label ??
						value,
					substat: (value) => `Substats: ${value.length}`,
					character: (value) =>
						value
							.map(
								(id) =>
									characterOptions.find((option) => option.value === id)
										?.label ?? id,
							)
							.join(" / "),
					marks: (value) => value.join(" / "),
				},
			)}
		>
			<div className="flex min-w-0 flex-col gap-4">
				<FilterSearch
					value={filters.search}
					onChange={(search) =>
						onFiltersChange((prev) => ({ ...prev, search }))
					}
					placeholder="Echo name..."
				/>
				<FilterField label="Marks" active={filters.marks.length > 0}>
					<ToggleGroup
						multiple
						value={filters.marks}
						spacing={1}
						aria-label="Filter echo marks"
						onValueChange={(marks) =>
							onFiltersChange((prev) => ({
								...prev,
								marks: marks as EchoMark[],
							}))
						}
					>
						{(
							[
								["none", "Unmarked echoes", ECHO_MARK_ICONS.unlocked],
								["locked", "Locked echoes", ECHO_MARK_ICONS.locked],
								["discarded", "Discarded echoes", ECHO_MARK_ICONS.discarded],
							] as const
						).map(([value, label, icon]) => (
							<ToggleGroupItem
								key={value}
								value={value}
								size="icon-sm"
								variant="outline"
								title={label}
								aria-label={label}
							>
								<img src={icon} alt="" className="size-5 object-contain" />
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</FilterField>

				<FilterField label="Cost" active={filters.cost.length > 0}>
					<div className="flex gap-1">
						{costOptions.map((option) => {
							const cost = Number(option.value);
							const pressed = filters.cost.includes(cost);
							return (
								<Button
									key={option.value}
									type="button"
									variant={pressed ? "default" : "outline"}
									size="icon-sm"
									title={`${cost}-cost echoes`}
									onClick={() =>
										onFiltersChange((prev) => ({
											...prev,
											cost: toggleInArray(prev.cost, cost),
										}))
									}
								>
									{cost}
								</Button>
							);
						})}
					</div>
				</FilterField>

				<div className="w-full">
					<RangeFilter
						label="Lvl"
						value={[filters.minLevel, filters.maxLevel]}
						min={0}
						max={25}
						onChange={([minLevel, maxLevel]) =>
							onFiltersChange((prev) => ({ ...prev, minLevel, maxLevel }))
						}
					/>
				</div>

				<FilterField label="Main Stat" active={filters.mainStat !== "any"}>
					<div className="flex flex-wrap gap-1">
						{mainStatOptions.map((option) => {
							const pressed = filters.mainStat === option.value;
							return (
								<Button
									key={option.value}
									type="button"
									variant={pressed ? "default" : "outline"}
									size="icon-sm"
									title={option.label}
									onClick={() =>
										onFiltersChange((prev) => ({
											...prev,
											mainStat: pressed ? "any" : option.value,
										}))
									}
								>
									{option.icon && (
										<img
											src={option.icon}
											alt=""
											className={`size-5 object-contain ${pressed ? "" : "brightness-0 dark:brightness-100"}`}
										/>
									)}
								</Button>
							);
						})}
					</div>
				</FilterField>
			</div>

			<div className="flex min-w-0 flex-col gap-4">
				<div className="w-full">
					<MultiSelect
						label="Echo Sets"
						values={filters.set}
						options={setOptions}
						onChange={(values) => setFilter("set", values)}
					/>
				</div>

				<div className="w-full">
					<MultiSelect
						label="Substats"
						values={filters.substat}
						options={mainStatOptions}
						onChange={(values) => setFilter("substat", values)}
					/>
				</div>

				<EquippedCharacterFilter
					values={filters.character}
					onChange={(values) => setFilter("character", values)}
					characterOptions={characterOptions}
				/>

				<SortButtons
					options={ECHO_SORT_OPTIONS}
					value={sortBy}
					desc={!sortAsc}
					onChange={(key, desc) => onSortChange(key, !desc)}
				/>

				<FilterSummary
					label={`Showing ${resultCount} of ${totalCount} echoes`}
					onReset={
						hasActiveFilters
							? () => {
									onFiltersChange(EMPTY_ECHO_FILTERS);
									onSortChange("none", false);
								}
							: undefined
					}
				>
					{onAddEcho && (
						<Button size="sm" onClick={onAddEcho}>
							<Plus className="mr-1 size-3.5" /> Add echo
						</Button>
					)}
				</FilterSummary>
			</div>
			{children}
		</FilterPanel>
	);
}
