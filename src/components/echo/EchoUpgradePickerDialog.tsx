import { useMemo, useState } from "react";
import { EchoCard, echoKey, echoName } from "@/components/echo/EchoCard";
import { EchoFilterBar } from "@/components/echo/EchoFilterBar";
import {
	type EchoFilters,
	type EchoSortKey,
	EMPTY_ECHO_FILTERS,
	matchesEchoFilters,
	sortEchoes,
} from "@/components/echo/echoFilters";
import { computeEchoRolls } from "@/components/echo/echoRolls";
import { characterFilterOptions, FilterLayout } from "@/components/filters";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useResponsiveColumns, VirtualGrid } from "@/components/VirtualGrid";
import { type Echo, useAccount } from "@/lib/account";
import { isUpgradeableEcho } from "@/lib/echoUpgrade";
import { echoFiltersSchema, echoSortSchema } from "@/lib/filterSchemas";
import { useFilterState } from "@/lib/persistentState";
import { cn } from "@/lib/utils";

const COLUMNS = [
	{ minWidth: 1536, columns: 5 },
	{ minWidth: 1280, columns: 4 },
	{ minWidth: 1024, columns: 3 },
	{ minWidth: 640, columns: 2 },
];
const echoId = (echo: Echo) => echo.incrId;

export function EchoUpgradePickerDialog({
	selected,
	onConfirm,
	onClose,
}: {
	selected: Echo[];
	onConfirm: (echoes: Echo[]) => void;
	onClose: () => void;
}) {
	const { snapshot } = useAccount();
	const [selectedCounts, setSelectedCounts] = useState(() => {
		const counts = new Map<number, number>();
		for (const echo of selected)
			counts.set(echo.incrId, (counts.get(echo.incrId) ?? 0) + 1);
		return counts;
	});
	const copies = (echo: Echo) =>
		Math.min(
			Math.max(1, echo.stackCount),
			selectedCounts.get(echo.incrId) ?? 0,
		);
	const selectCopies = (echo: Echo, count: number) =>
		setSelectedCounts((previous) => {
			const next = new Map(previous);
			next.set(
				echo.incrId,
				Math.max(
					0,
					Math.min(Math.max(1, echo.stackCount), Math.trunc(count) || 0),
				),
			);
			return next;
		});
	const [filters, setFilters] = useFilterState<EchoFilters>(
		"echo-upgrade-picker.filters",
		EMPTY_ECHO_FILTERS,
		echoFiltersSchema,
	);
	const [sortBy, setSortBy] = useFilterState<EchoSortKey>(
		"echo-upgrade-picker.sort",
		"level",
		echoSortSchema,
	);
	const [sortAsc, setSortAsc] = useFilterState(
		"echo-upgrade-picker.sortAsc",
		false,
	);
	const columns = useResponsiveColumns(COLUMNS, 1);
	const echoes = useMemo(
		() => snapshot.echoes.filter(isUpgradeableEcho),
		[snapshot.echoes],
	);
	const characterOptions = useMemo(
		() => characterFilterOptions(snapshot.resonators),
		[snapshot.resonators],
	);
	const rolls = useMemo(() => computeEchoRolls(echoes), [echoes]);
	const filtered = echoes.filter((echo) => matchesEchoFilters(echo, filters));
	const sorted = sortEchoes(
		filtered,
		sortBy,
		sortAsc,
		(echo) => rolls.get(echoKey(echo))?.rating ?? 0,
	);
	const selectedEchoes = echoes.flatMap((echo) =>
		Array.from({ length: copies(echo) }, () => echo),
	);
	const allSelected =
		filtered.length > 0 &&
		filtered.every((echo) => copies(echo) === Math.max(1, echo.stackCount));

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="flex h-[calc(100dvh-2rem)] min-h-0 w-[calc(100vw-2rem)] max-w-none flex-col sm:max-w-none">
				<DialogHeader className="shrink-0 pr-7">
					<DialogTitle>Select echoes</DialogTitle>
					<DialogDescription>
						Choose echoes for your upgrade queue and how many copies to upgrade
						from each stack.
					</DialogDescription>
				</DialogHeader>
				<FilterLayout
					filters={
						<EchoFilterBar
							filters={filters}
							onFiltersChange={setFilters}
							sortBy={sortBy}
							sortAsc={sortAsc}
							onSortChange={(key, asc) => {
								setSortBy(key);
								setSortAsc(asc);
							}}
							resultCount={filtered.length}
							totalCount={echoes.length}
							characterOptions={characterOptions}
						>
							<div className="flex flex-col items-start gap-3">
								<Field orientation="horizontal" className="w-auto">
									<Checkbox
										id="select-filtered-upgrade-echoes"
										checked={allSelected}
										indeterminate={
											!allSelected && filtered.some((echo) => copies(echo) > 0)
										}
										disabled={!filtered.length}
										onCheckedChange={(checked) =>
											setSelectedCounts((previous) => {
												const next = new Map(previous);
												for (const echo of filtered) {
													next.set(
														echo.incrId,
														checked ? Math.max(1, echo.stackCount) : 0,
													);
												}
												return next;
											})
										}
									/>
									<FieldLabel htmlFor="select-filtered-upgrade-echoes">
										Select all filtered copies
									</FieldLabel>
								</Field>
								<Button
									size="sm"
									variant="ghost"
									disabled={!selectedEchoes.length}
									onClick={() => setSelectedCounts(new Map())}
								>
									Clear selection
								</Button>
								<span
									className="text-xs text-muted-foreground"
									aria-live="polite"
								>
									{selectedEchoes.length} selected
								</span>
							</div>
						</EchoFilterBar>
					}
				>
					{sorted.length ? (
						<VirtualGrid
							items={sorted}
							columns={columns}
							minItemWidth={260}
							gap={8}
							estimateRowHeight={280}
							overscan={3}
							getItemKey={echoId}
							className="min-h-0 flex-1 overflow-y-auto p-1"
							renderItem={(echo) => (
								<div
									key={echo.incrId}
									className={cn(
										"h-full ring-1 ring-transparent",
										copies(echo) > 0 && "ring-primary",
									)}
								>
									<EchoCard
										echo={echo}
										rollValue={rolls.get(echoKey(echo))?.rating}
										rollSubstatTiers={
											rolls.get(echoKey(echo))?.character.stats.subs
										}
										rollErBreakpoint={
											rolls.get(echoKey(echo))?.character.stats.erBreakpoint
										}
										actions={
											<Checkbox
												aria-label={`Select ${echoName(echo)} +${echo.level} for automatic upgrades`}
												checked={copies(echo) > 0}
												onCheckedChange={(checked) =>
													selectCopies(echo, checked ? 1 : 0)
												}
											/>
										}
										footer={
											echo.stackCount > 1 ? (
												<Field orientation="horizontal" className="gap-2">
													<FieldLabel htmlFor={`echo-copies-${echo.incrId}`}>
														Copies
													</FieldLabel>
													<Input
														id={`echo-copies-${echo.incrId}`}
														type="number"
														min={0}
														max={echo.stackCount}
														step={1}
														className="w-16"
														aria-label={`Copies of ${echoName(echo)} +${echo.level}`}
														value={copies(echo)}
														onChange={(event) =>
															selectCopies(echo, Number(event.target.value))
														}
													/>
													<span className="text-xs text-muted-foreground">
														/ {echo.stackCount}
													</span>
													<Button
														variant="ghost"
														size="xs"
														className="ml-auto"
														onClick={() => selectCopies(echo, echo.stackCount)}
													>
														All
													</Button>
												</Field>
											) : undefined
										}
									/>
								</div>
							)}
						/>
					) : (
						<Empty>
							<EmptyHeader>
								<EmptyTitle>No echoes found</EmptyTitle>
								<EmptyDescription>
									No upgradeable echoes match these filters.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}
				</FilterLayout>
				<DialogFooter className="shrink-0">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={() => onConfirm(selectedEchoes)}>
						Use {selectedEchoes.length}{" "}
						{selectedEchoes.length === 1 ? "echo" : "echoes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
