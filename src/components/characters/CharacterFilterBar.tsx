import type { ComponentProps } from "react";
import {
	FilterField,
	FilterIconButton,
	FilterSearch,
	FilterSummary,
	RangeFilter,
	SortButtons,
	toggleInArray,
} from "@/components/filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
	CHAIN_RANGE,
	CHARACTER_SORT_OPTIONS,
	type CharacterFilters,
	type CharacterSortKey,
	DEFAULT_FILTERS,
	LEVEL_RANGE,
} from "@/lib/characterFilters";
import { elementOptions, weaponTypeOptions } from "@/lib/characters";
import { rarityTextClass } from "@/lib/rarity";
import { cn } from "@/lib/utils";

/**
 * Filter and sort controls above the character grid: search, element, weapon
 * type, rarity, ownership, level/chain ranges and the sort buttons. The
 * optimizer's picker dialog reuses this bar with restyled chrome (`className`)
 * and its own search-input behaviour (`searchInputProps`).
 */
export function CharacterFilterBar({
	filters,
	onFiltersChange,
	sortKey,
	sortDesc,
	onSortChange,
	resultCount,
	totalCount,
	className,
	contentClassName,
	searchInputProps,
}: {
	filters: CharacterFilters;
	onFiltersChange: (
		update:
			| CharacterFilters
			| ((previous: CharacterFilters) => CharacterFilters),
	) => void;
	sortKey: CharacterSortKey;
	sortDesc: boolean;
	onSortChange: (key: CharacterSortKey, desc: boolean) => void;
	resultCount: number;
	totalCount: number;
	/** Extra classes on the card (dialogs restyle the chrome). */
	className?: string;
	/** Extra classes on the content row. */
	contentClassName?: string;
	/** Forwarded to the search input (focus, key handling, styling). */
	searchInputProps?: ComponentProps<"input">;
}) {
	const hasActiveFilters =
		JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS) ||
		sortKey !== "name" ||
		sortDesc !== (CHARACTER_SORT_OPTIONS[0].desc ?? false);

	const toggleFilterValue = (
		key: "elements" | "weaponTypes",
		value: string,
	) => {
		onFiltersChange((prev) => ({
			...prev,
			[key]: toggleInArray(prev[key], value),
		}));
	};

	const toggleRarity = (rarity: number) => {
		onFiltersChange((prev) => ({
			...prev,
			rarity: toggleInArray(prev.rarity, rarity),
		}));
	};

	return (
		<Card className={cn("shrink-0", className)}>
			<CardContent
				className={cn(
					"flex flex-wrap items-end gap-x-4 gap-y-2",
					contentClassName,
				)}
			>
				<FilterSearch
					value={filters.search}
					onChange={(search) =>
						onFiltersChange((prev) => ({ ...prev, search }))
					}
					placeholder="Character name..."
					inputProps={searchInputProps}
				/>

				<FilterField label="Element">
					<div className="flex gap-1">
						{elementOptions.map((option) => (
							<FilterIconButton
								key={option.value}
								icon={option.icon ?? ""}
								title={option.value}
								colored
								pressed={filters.elements.includes(option.value)}
								onClick={() => toggleFilterValue("elements", option.value)}
							/>
						))}
					</div>
				</FilterField>

				<FilterField label="Weapon">
					<div className="flex gap-1">
						{weaponTypeOptions.map((option) => (
							<FilterIconButton
								key={option.value}
								icon={option.icon ?? ""}
								title={option.value}
								pressed={filters.weaponTypes.includes(option.value)}
								onClick={() => toggleFilterValue("weaponTypes", option.value)}
							/>
						))}
					</div>
				</FilterField>

				<FilterField label="Rarity">
					<div className="flex gap-1">
						{[4, 5].map((rarity) => (
							<Button
								key={rarity}
								type="button"
								variant={
									filters.rarity.includes(rarity) ? "default" : "outline"
								}
								size="sm"
								title={`${rarity}★ only`}
								className={rarityTextClass(rarity)}
								onClick={() => toggleRarity(rarity)}
							>
								{rarity}★
							</Button>
						))}
					</div>
				</FilterField>

				<FilterField label="Ownership">
					<span className="flex h-7 items-center gap-1.5 text-xs">
						<Switch
							checked={filters.ownedOnly}
							onCheckedChange={(checked) =>
								onFiltersChange((prev) => ({ ...prev, ownedOnly: checked }))
							}
						/>
						Owned
					</span>
				</FilterField>

				<div className="flex w-full flex-wrap items-end gap-x-6 gap-y-2 border-t pt-2">
					<div className="w-48">
						<RangeFilter
							label="Lvl"
							min={LEVEL_RANGE[0]}
							max={LEVEL_RANGE[1]}
							value={filters.levelRange}
							onChange={(levelRange) =>
								onFiltersChange((prev) => ({ ...prev, levelRange }))
							}
						/>
					</div>

					<div className="w-40">
						<RangeFilter
							label="Chain"
							min={CHAIN_RANGE[0]}
							max={CHAIN_RANGE[1]}
							value={filters.chainRange}
							onChange={(chainRange) =>
								onFiltersChange((prev) => ({ ...prev, chainRange }))
							}
						/>
					</div>

					<SortButtons
						options={CHARACTER_SORT_OPTIONS}
						value={sortKey}
						desc={sortDesc}
						onChange={onSortChange}
					/>

					<FilterSummary
						label={`Showing ${resultCount} of ${totalCount}`}
						onReset={
							hasActiveFilters
								? () => {
										onFiltersChange(DEFAULT_FILTERS);
										onSortChange("name", false);
									}
								: undefined
						}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
