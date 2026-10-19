import {
	FilterSelect,
	MinLevelSlider,
	MultiSelect,
} from "@/components/filters";
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
		<div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-t border-border/60 pt-3">
			<div className="w-40">
				<FilterSelect
					label="Equipped Echoes"
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
			</div>
			<div className="w-28">
				<MinLevelSlider
					value={filters.minLevel}
					min={0}
					max={MAX_ECHO_LEVEL}
					plus
					onChange={(minLevel) =>
						onFiltersChange((prev) => ({ ...prev, minLevel }))
					}
				/>
			</div>
			<div className="w-44">
				<MultiSelect
					label="Echo Sets"
					values={filters.sets}
					options={optimizerSetOptions}
					onChange={(values) =>
						onFiltersChange((prev) => ({ ...prev, sets: values }))
					}
				/>
			</div>
			<div className="w-44">
				<MultiSelect
					label="Main Stats"
					values={filters.mainStats}
					options={mainStatOptions}
					onChange={(values) =>
						onFiltersChange((prev) => ({ ...prev, mainStats: values }))
					}
				/>
			</div>
			<div className="w-44">
				<MultiSelect
					label="Substats"
					values={filters.substats}
					options={substatOptions}
					onChange={(values) =>
						onFiltersChange((prev) => ({ ...prev, substats: values }))
					}
				/>
			</div>
			<Button
				variant="outline"
				size="sm"
				title="Recommended echo filters: the main stats this resonator's kit cares about, max-level echoes only"
				disabled={!recommendedEnabled}
				onClick={onRecommended}
			>
				Recommended
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
	);
}
