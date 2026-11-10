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
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

/** Candidate-pool filters for the optimizer search. */
export function OptimizerFilterRow({
	filters,
	onFiltersChange,
	recommendedEnabled,
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
	counts: { eligible: number; total: number; combos: number } | null;
	/** Tooltip over the counts; team mode ranks by the role guide instead. */
	countsHint?: string;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-5 [&_[data-slot=filter-label]]:text-[11px] [&_[data-slot=filter-label]]:leading-4 [&_[data-slot=filter-label]]:font-medium">
			<FieldGroup className="gap-6">
				<FieldSet className="min-w-0 gap-3">
					<FieldLegend className="mb-1 font-semibold leading-5">
						Echo pool
					</FieldLegend>
					<div className="flex flex-col gap-4">
						<Field orientation="horizontal">
							<FieldLabel
								htmlFor="optimizer-recommended"
								className="font-medium"
							>
								Use recommended
							</FieldLabel>
							<Switch
								id="optimizer-recommended"
								checked={filters.useRecommended}
								disabled={!recommendedEnabled && !filters.useRecommended}
								onCheckedChange={(useRecommended) =>
									onFiltersChange((previous) => ({
										...previous,
										useRecommended,
										minLevel: useRecommended
											? MAX_ECHO_LEVEL
											: previous.minLevel,
									}))
								}
							/>
						</Field>
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
				{!filters.useRecommended && (
					<FieldSet className="min-w-0 gap-2">
						<FieldLegend
							variant="label"
							className="mb-1 font-semibold leading-5"
						>
							Set & stat requirements
						</FieldLegend>
						<div className="flex flex-col gap-4">
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
				)}
			</FieldGroup>
			<div className="flex flex-col items-start gap-2">
				{counts && (
					<div
						className="text-[11px] leading-5 text-muted-foreground tabular-nums"
						title={countsHint}
					>
						<p>
							<span className="font-medium text-foreground">
								{counts.eligible.toLocaleString()}
							</span>{" "}
							/ {counts.total.toLocaleString()} echoes
						</p>
						<p>
							<span className="font-medium text-foreground">
								{formatDamage(counts.combos)}
							</span>{" "}
							builds before legality checks
						</p>
					</div>
				)}
				{hasOptimizerFilters(filters) && (
					<Button
						variant="link"
						size="sm"
						className="h-auto px-0"
						onClick={() => onFiltersChange(EMPTY_OPTIMIZER_FILTERS)}
					>
						Reset filters
					</Button>
				)}
			</div>
		</div>
	);
}
