import { useMemo, useState } from "react";
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

const COLUMNS = [
	{ minWidth: 1536, columns: 7 },
	{ minWidth: 1280, columns: 6 },
	{ minWidth: 1024, columns: 5 },
	{ minWidth: 768, columns: 4 },
	{ minWidth: 640, columns: 3 },
];
const weaponKey = (weapon: Weapon, index: number) =>
	`incr:${weapon.incrId}-${index}`;

export function WeaponsTab() {
	const { snapshot, error } = useAccount();
	const columns = useResponsiveColumns(COLUMNS, 2);
	const weapons = snapshot.weapons;
	const [filters, setFilters] = useState<WeaponFilters>(EMPTY_WEAPON_FILTERS);
	const [sortBy, setSortBy] = useState<WeaponSortKey>(WEAPON_DEFAULT_SORT);
	const [sortAsc, setSortAsc] = useState(false);

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
					renderItem={(weapon) => <WeaponCard weapon={weapon} />}
					className="min-h-0 flex-1 overflow-y-auto pr-1"
				/>
			)}

			{error && <p className="text-sm text-destructive">{error}</p>}
		</FilterLayout>
	);
}
