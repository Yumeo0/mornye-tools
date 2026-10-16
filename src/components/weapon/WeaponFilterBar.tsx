import {
	EquippedCharacterFilter,
	FilterField,
	FilterIconButton,
	type FilterOption,
	FilterSearch,
	FilterSummary,
	MinLevelSlider,
	SortButtons,
	toggleInArray,
} from "@/components/filters";
import { Button } from "@/components/ui/button";
import { WEAPON_TYPE_ICONS, weaponsById } from "@/components/weapon/WeaponCard";
import {
	EMPTY_WEAPON_FILTERS,
	MIN_WEAPON_LEVEL,
	WEAPON_DEFAULT_SORT,
	WEAPON_SORT_OPTIONS,
	type WeaponFilters,
	type WeaponSortKey,
} from "@/components/weapon/weaponFilters";
import { rarityTextClass } from "@/lib/rarity";

const weaponTypeOptions: FilterOption[] = [
	...new Map(
		[...weaponsById.values()].map((weapon) => [weapon.type, weapon.type_name]),
	).entries(),
]
	.sort((a, b) => a[1].localeCompare(b[1]))
	.map(([value, label]) => ({
		value: String(value),
		label,
		icon: WEAPON_TYPE_ICONS[Number(value)],
	}));

const weaponRarityOptions: FilterOption[] = [
	...new Set([...weaponsById.values()].map((weapon) => weapon.rarity)),
]
	.sort((a, b) => b - a)
	.map((rarity) => ({ value: String(rarity), label: `${rarity}★` }));

/** Filter and sort controls above the weapon grid. */
export function WeaponFilterBar({
	filters,
	onFiltersChange,
	sortBy,
	sortAsc,
	onSortChange,
	resultCount,
	totalCount,
	characterOptions,
}: {
	filters: WeaponFilters;
	onFiltersChange: (
		update: WeaponFilters | ((previous: WeaponFilters) => WeaponFilters),
	) => void;
	sortBy: WeaponSortKey;
	sortAsc: boolean;
	onSortChange: (sortBy: WeaponSortKey, sortAsc: boolean) => void;
	resultCount: number;
	totalCount: number;
	characterOptions: FilterOption[];
}) {
	const hasActiveFilters =
		JSON.stringify(filters) !== JSON.stringify(EMPTY_WEAPON_FILTERS) ||
		sortBy !== WEAPON_DEFAULT_SORT ||
		sortAsc;

	return (
		<div className="bg-card text-card-foreground ring-foreground/10 flex flex-col gap-2 rounded-none py-3 ring-1">
			<div className="flex flex-wrap items-end gap-x-4 gap-y-2 px-4">
				<FilterSearch
					value={filters.search}
					onChange={(search) =>
						onFiltersChange((prev) => ({ ...prev, search }))
					}
					placeholder="Weapon name..."
				/>

				<FilterField label="Weapon" active={filters.type.length > 0}>
					<div className="flex gap-1">
						{weaponTypeOptions.map((option) => (
							<FilterIconButton
								key={option.value}
								icon={option.icon ?? ""}
								title={option.label}
								pressed={filters.type.includes(option.value)}
								onClick={() =>
									onFiltersChange((prev) => ({
										...prev,
										type: toggleInArray(prev.type, option.value),
									}))
								}
							/>
						))}
					</div>
				</FilterField>

				<FilterField label="Rarity" active={filters.rarity.length > 0}>
					<div className="flex gap-1">
						{weaponRarityOptions.map((option) => {
							const pressed = filters.rarity.includes(option.value);
							return (
								<Button
									key={option.value}
									type="button"
									variant={pressed ? "default" : "outline"}
									size="sm"
									title={`${option.label} only`}
									className={rarityTextClass(Number(option.value))}
									onClick={() =>
										onFiltersChange((prev) => ({
											...prev,
											rarity: toggleInArray(prev.rarity, option.value),
										}))
									}
								>
									{option.label}
								</Button>
							);
						})}
					</div>
				</FilterField>
			</div>

			<div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-t px-4 pt-2">
				<div className="w-32">
					<MinLevelSlider
						value={filters.minLevel}
						min={MIN_WEAPON_LEVEL}
						max={90}
						onChange={(minLevel) =>
							onFiltersChange((prev) => ({ ...prev, minLevel }))
						}
					/>
				</div>

				<EquippedCharacterFilter
					values={filters.character}
					onChange={(values) =>
						onFiltersChange((prev) => ({ ...prev, character: values }))
					}
					characterOptions={characterOptions}
				/>

				<SortButtons
					options={WEAPON_SORT_OPTIONS}
					value={sortBy}
					desc={!sortAsc}
					onChange={(key, desc) => onSortChange(key, !desc)}
				/>

				<FilterSummary
					label={`Showing ${resultCount} of ${totalCount} weapons`}
					onReset={
						hasActiveFilters
							? () => {
									onFiltersChange(EMPTY_WEAPON_FILTERS);
									onSortChange(WEAPON_DEFAULT_SORT, false);
								}
							: undefined
					}
				/>
			</div>
		</div>
	);
}
