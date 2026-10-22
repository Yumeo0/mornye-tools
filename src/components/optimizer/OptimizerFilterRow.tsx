import { FilterSelect, MultiSelect } from "@/components/filters";
import { formatDamage } from "@/components/optimizer/display";
import {
	EMPTY_OPTIMIZER_FILTERS,
	EQUIPPED_OPTIONS,
	hasOptimizerFilters,
	MAX_ECHO_LEVEL,
	mainStatOptions,
	type OptimizerFilters,
	optimizerSetOptions,
	substatOptions,
} from "@/components/optimizer/optimizerOptions";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";

/** Candidate-pool filters for the optimizer search. */
export function OptimizerFilterRow({
	filters,
	onFiltersChange,
	recommendedEnabled,
	onRecommended,
	counts,
	countsHint = "Echoes eligible after the filters; when pruning applies, echoes beyond the search cap are ranked by stat weight",
}: {
	filters: OptimizerFilters;
	onFiltersChange: (
		update:
			| OptimizerFilters
			| ((previous: OptimizerFilters) => OptimizerFilters),
	) => void;
	recommendedEnabled: boolean;
	onRecommended: () => void;
	counts: { eligible: number; total: number; combos: number } | null;
	/** Tooltip over the counts; team mode ranks by the role guide instead. */
	countsHint?: string;
}) {
	return (
		<div className="flex flex-col gap-3 border-t border-border/60 pt-4">
			<FieldGroup className="grid gap-4 lg:grid-cols-[2fr_3fr]">
				<FieldSet className="min-w-0 gap-2">
					<FieldLegend variant="label">Echo pool</FieldLegend>
					<div className="grid grid-cols-2 gap-3">
						<FilterSelect
							label="Equipped echoes"
							value={filters.equipped}
							options={EQUIPPED_OPTIONS}
							onChange={(value) =>
								onFiltersChange((prev) => ({
									...prev,
									equipped:
										value === "exclude-others" || value === "exclude-all"
											? value
											: "include",
								}))
							}
						/>
						<FilterSelect
							label="Minimum level"
							value={String(filters.minLevel)}
							options={Array.from(
								{ length: MAX_ECHO_LEVEL + 1 },
								(_, level) => ({
									value: String(level),
									label: level === 0 ? "Any level" : `+${level} or higher`,
								}),
							)}
							onChange={(value) =>
								onFiltersChange((prev) => ({
									...prev,
									minLevel: Number(value),
								}))
							}
						/>
					</div>
				</FieldSet>
				<FieldSet className="min-w-0 gap-2">
					<FieldLegend variant="label">Set & stat requirements</FieldLegend>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
						<MultiSelect
							label="Echo sets"
							values={filters.sets}
							options={optimizerSetOptions}
							onChange={(sets) =>
								onFiltersChange((prev) => ({ ...prev, sets }))
							}
						/>
						<MultiSelect
							label="Main stats"
							values={filters.mainStats}
							options={mainStatOptions}
							onChange={(mainStats) =>
								onFiltersChange((prev) => ({ ...prev, mainStats }))
							}
						/>
						<MultiSelect
							label="Substats (any match)"
							values={filters.substats}
							options={substatOptions}
							onChange={(substats) =>
								onFiltersChange((prev) => ({ ...prev, substats }))
							}
						/>
					</div>
				</FieldSet>
			</FieldGroup>
			<div className="flex flex-wrap items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					title="Recommended echo filters: the main stats this resonator's kit cares about, max-level echoes only"
					disabled={!recommendedEnabled}
					onClick={onRecommended}
				>
					Use recommended filters
				</Button>
				{hasOptimizerFilters(filters) && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onFiltersChange(EMPTY_OPTIMIZER_FILTERS)}
					>
						Reset filters
					</Button>
				)}
				{counts && (
					<span
						className="ml-auto self-center text-[11px] text-muted-foreground"
						title={countsHint}
					>
						{counts.eligible}/{counts.total} echoes ·{" "}
						{formatDamage(counts.combos)} builds
					</span>
				)}
			</div>
		</div>
	);
}
