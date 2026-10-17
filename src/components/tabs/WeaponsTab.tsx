import { useMemo, useState } from "react";
import {
	characterFilterOptions,
	type FilterOption,
} from "@/components/filters";
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
import { useAccount } from "@/lib/account";

export function WeaponsTab() {
	const { snapshot, error } = useAccount();
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
		<div className="flex min-h-0 flex-1 flex-col gap-4">
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

			{filteredWeapons.length === 0 ? (
				<p className="py-8 text-center text-sm text-muted-foreground">
					No weapons match the current filters.
				</p>
			) : (
				<div className="min-h-0 flex-1 overflow-y-auto pr-1">
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
						{sortedWeapons.map((weapon, index) => (
							<WeaponCard
								// biome-ignore lint/suspicious/noArrayIndexKey: the list can contain duplicate weapons with the same incr id
								key={`incr:${weapon.incrId}-${index}`}
								weapon={weapon}
							/>
						))}
					</div>
				</div>
			)}

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
