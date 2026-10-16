import { Plus } from "lucide-react";
import {
	ECHO_SORT_OPTIONS,
	type EchoFilters,
	type EchoSortKey,
	EMPTY_ECHO_FILTERS,
} from "@/components/echo/echoFilters";
import {
	EquippedCharacterFilter,
	FilterField,
	type FilterOption,
	FilterSearch,
	FilterSummary,
	MinLevelSlider,
	MultiSelect,
	SortButtons,
	statFilterOptions,
	toggleInArray,
} from "@/components/filters";
import { Button } from "@/components/ui/button";
import { sonataIconByName } from "@/lib/catalog";
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

/** Filter and sort controls above the echo grid, plus the "Add echo" action. */
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
	onAddEcho: () => void;
}) {
	const hasActiveFilters =
		JSON.stringify(filters) !== JSON.stringify(EMPTY_ECHO_FILTERS) ||
		sortBy !== "none" ||
		sortAsc;

	const setFilter = (key: "set" | "substat" | "character", value: string[]) => {
		onFiltersChange((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<div className="bg-card text-card-foreground ring-foreground/10 flex flex-col gap-2 rounded-none py-3 ring-1">
			<div className="flex flex-wrap items-end gap-x-4 gap-y-2 px-4">
				<FilterSearch
					value={filters.search}
					onChange={(search) =>
						onFiltersChange((prev) => ({ ...prev, search }))
					}
					placeholder="Echo name..."
				/>

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

				<div className="w-32">
					<MinLevelSlider
						value={filters.minLevel}
						min={0}
						max={25}
						plus
						onChange={(minLevel) =>
							onFiltersChange((prev) => ({ ...prev, minLevel }))
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

			<div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-t px-4 pt-2">
				<div className="w-48">
					<MultiSelect
						label="Echo Sets"
						values={filters.set}
						options={setOptions}
						onChange={(values) => setFilter("set", values)}
					/>
				</div>

				<div className="w-44">
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
					<Button size="sm" onClick={onAddEcho}>
						<Plus className="mr-1 size-3.5" /> Add echo
					</Button>
				</FilterSummary>
			</div>
		</div>
	);
}
