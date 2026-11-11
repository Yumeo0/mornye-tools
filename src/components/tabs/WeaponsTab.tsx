import { useMemo } from "react";
import {
	characterFilterOptions,
	FilterLayout,
	type FilterOption,
} from "@/components/filters";
import { useResponsiveColumns, VirtualGrid } from "@/components/VirtualGrid";
import { WeaponCard } from "@/components/weapon/WeaponCard";
import { WeaponFilterBar } from "@/components/weapon/WeaponFilterBar";
import {
	EMPTY_WEAPON_FILTERS,
	matchesWeaponFilters,
	sortWeapons,
	WEAPON_DEFAULT_SORT,
	type WeaponFilters,
	type WeaponSortKey,
} from "@/components/weapon/weaponFilters";
import { useAccount, type Weapon } from "@/lib/account";
import { weaponFiltersSchema, weaponSortSchema } from "@/lib/filterSchemas";
import { useFilterState } from "@/lib/persistentState";
import { catalogWeapons } from "@/lib/weapons";

const COLUMNS = [
	{ minWidth: 1536, columns: 7 },
	{ minWidth: 1280, columns: 6 },
	{ minWidth: 1024, columns: 5 },
	{ minWidth: 768, columns: 4 },
	{ minWidth: 640, columns: 3 },
];
type DisplayWeapon = Weapon & { previewOnly?: boolean };
const weaponKey = (weapon: DisplayWeapon, index: number) =>
	weapon.previewOnly
		? `preview:${weapon.itemId}`
		: `incr:${weapon.incrId}-${index}`;

export function WeaponsTab() {
	const { snapshot, error } = useAccount();
	const columns = useResponsiveColumns(COLUMNS, 2);
	// Catalog previews are display-only: never insert them into account inventory.
	const weapons = useMemo<DisplayWeapon[]>(
		() => [
			...snapshot.weapons,
			...catalogWeapons
				.filter(
					(entry) =>
						entry.preview &&
						!snapshot.weapons.some((w) => w.itemId === entry.item_id),
				)
				.map(
					(entry): DisplayWeapon => ({
						itemId: entry.item_id,
						incrId: 0,
						previewOnly: true,
						level: 1,
						rank: 1,
						breach: 0,
					}),
				),
		],
		[snapshot.weapons],
	);
	const [filters, setFilters] = useFilterState<WeaponFilters>(
		"weapons.filters",
		EMPTY_WEAPON_FILTERS,
		weaponFiltersSchema,
	);
	const [sortBy, setSortBy] = useFilterState<WeaponSortKey>(
		"weapons.sort",
		WEAPON_DEFAULT_SORT,
		weaponSortSchema,
	);
	const [sortAsc, setSortAsc] = useFilterState("weapons.sortAsc", false);

	const characterOptions: FilterOption[] = useMemo(
		() => characterFilterOptions(snapshot.resonators),
		[snapshot.resonators],
	);

	const filteredWeapons = weapons.filter((weapon) =>
		matchesWeaponFilters(weapon, filters),
	);
	const sortedWeapons = useMemo(
		() => sortWeapons(filteredWeapons, sortBy, sortAsc),
		[filteredWeapons, sortBy, sortAsc],
	);

	if (weapons.length === 0) {
		return (
			<p className="py-8 text-center text-sm text-muted-foreground">
				No weapons captured yet. Open the Weapon inventory once while the
				sniffer is running; the capture fills this list automatically.
			</p>
		);
	}

	return (
		<FilterLayout
			filters={
				<WeaponFilterBar
					filters={filters}
					onFiltersChange={setFilters}
					sortBy={sortBy}
					sortAsc={sortAsc}
					onSortChange={(key, asc) => {
						setSortBy(key);
						setSortAsc(asc);
					}}
					resultCount={filteredWeapons.length}
					totalCount={weapons.length}
					characterOptions={characterOptions}
				/>
			}
		>
			{filteredWeapons.length === 0 ? (
				<p className="py-8 text-center text-sm text-muted-foreground">
					No weapons match the current filters.
				</p>
			) : (
				<VirtualGrid
					items={sortedWeapons}
					columns={columns}
					minItemWidth={150}
					gap={12}
					estimateRowHeight={280}
					getItemKey={weaponKey}
					renderItem={(weapon) => (
						<WeaponCard
							weapon={weapon}
							previewOnly={(weapon as DisplayWeapon).previewOnly}
						/>
					)}
					className="min-h-0 flex-1 overflow-y-auto pr-1"
				/>
			)}

			{error && <p className="text-sm text-destructive">{error}</p>}
		</FilterLayout>
	);
}
