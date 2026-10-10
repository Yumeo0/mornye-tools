import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo } from "react";
import {
	characterFilterOptions,
	FilterIconButton,
	type FilterOption,
	MultiFilterSelect,
} from "@/components/tabs/FilterControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
	WEAPON_TYPE_ICONS,
	WeaponCard,
	weaponEntry,
	weaponName,
	weaponsById,
} from "@/components/weapon/WeaponCard";
import type { Weapon } from "@/lib/account";
import {
	reviveBoolean,
	reviveString,
	reviveStringArray,
	usePersistedState,
} from "@/lib/persisted";
import { rarityTextClass } from "@/lib/rarity";
import { useAccountSnapshot } from "@/lib/useAccountSnapshot";

const MIN_WEAPON_LEVEL = 1;

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

interface WeaponFilters {
	search: string;
	minLevel: number;
	type: string[];
	rarity: string[];
	character: string[];
}

const EMPTY_WEAPON_FILTERS: WeaponFilters = {
	search: "",
	minLevel: MIN_WEAPON_LEVEL,
	type: [],
	rarity: [],
	character: [],
};

const WEAPON_SORT_KEYS = new Set<string>([
	"none",
	"level",
	"rarity",
	"name",
	"type",
	"character",
]);

// Saved filters are coerced onto the current shape so stale persisted data
// cannot break the tab.
function reviveWeaponFilters(value: unknown): WeaponFilters {
	if (typeof value !== "object" || value === null) {
		return EMPTY_WEAPON_FILTERS;
	}
	const raw = value as Partial<WeaponFilters>;
	return {
		search: reviveString(raw.search),
		minLevel:
			typeof raw.minLevel === "number"
				? Math.max(MIN_WEAPON_LEVEL, Math.round(raw.minLevel))
				: MIN_WEAPON_LEVEL,
		type: reviveStringArray(raw.type),
		rarity: reviveStringArray(raw.rarity),
		character: reviveStringArray(raw.character),
	};
}

const reviveWeaponSort = (value: unknown): WeaponSortKey => {
	const key = reviveString(value);
	return WEAPON_SORT_KEYS.has(key) ? (key as WeaponSortKey) : "rarity";
};

function matchesWeaponFilters(weapon: Weapon, filters: WeaponFilters): boolean {
	if (
		filters.search &&
		!weaponName(weapon).toLowerCase().includes(filters.search.toLowerCase())
	) {
		return false;
	}
	if (weapon.level < filters.minLevel) {
		return false;
	}

	const entry = weaponEntry(weapon);

	if (
		filters.type.length > 0 &&
		(!entry || !filters.type.includes(String(entry.type)))
	) {
		return false;
	}

	if (
		filters.rarity.length > 0 &&
		(!entry || !filters.rarity.includes(String(entry.rarity)))
	) {
		return false;
	}

	if (filters.character.length > 0) {
		const matchesNone =
			weapon.equippedBy == null && filters.character.includes("none");
		const matchesCharacter =
			weapon.equippedBy != null &&
			filters.character.includes(String(weapon.equippedBy));
		if (!matchesNone && !matchesCharacter) return false;
	}

	return true;
}

type WeaponSortKey =
	| "none"
	| "level"
	| "rarity"
	| "name"
	| "type"
	| "character";

// `desc` is the natural default direction per key
const weaponSortOptions: {
	value: WeaponSortKey;
	label: string;
	desc: boolean;
}[] = [
	{ value: "none", label: "Newest", desc: true },
	{ value: "level", label: "Lv", desc: true },
	{ value: "rarity", label: "Rarity", desc: true },
	{ value: "name", label: "Name", desc: false },
	{ value: "type", label: "Type", desc: false },
	{ value: "character", label: "Equipped", desc: false },
];

export function WeaponsTab() {
	const { snapshot, error } = useAccountSnapshot();
	const weapons = snapshot.weapons;
	const [filters, setFilters] = usePersistedState(
		"weapons.filters",
		EMPTY_WEAPON_FILTERS,
		reviveWeaponFilters,
	);
	// Rarity descending: signature weapons first, like the in-game list
	const DEFAULT_SORT: WeaponSortKey = "rarity";
	const [sortBy, setSortBy] = usePersistedState(
		"weapons.sortBy",
		DEFAULT_SORT,
		reviveWeaponSort,
	);
	const [sortAsc, setSortAsc] = usePersistedState(
		"weapons.sortAsc",
		false,
		reviveBoolean,
	);

	const characterOptions: FilterOption[] = useMemo(
		() => characterFilterOptions(snapshot.resonators),
		[snapshot.resonators],
	);

	const filteredWeapons = weapons.filter((weapon) =>
		matchesWeaponFilters(weapon, filters),
	);
	const hasActiveFilters =
		JSON.stringify(filters) !== JSON.stringify(EMPTY_WEAPON_FILTERS) ||
		sortBy !== DEFAULT_SORT ||
		sortAsc;

	const sortedWeapons = useMemo(() => {
		if (sortBy === "none") {
			return sortAsc ? [...filteredWeapons].reverse() : filteredWeapons;
		}
		const dir = sortAsc ? 1 : -1;
		const arr = [...filteredWeapons];
		arr.sort((a, b) => {
			if (sortBy === "character") {
				// Unequipped weapons always sort last
				const nameA = a.equippedBy != null;
				const nameB = b.equippedBy != null;
				if (nameA && !nameB) return -1;
				if (!nameA && nameB) return 1;
			}
			let cmp = 0;
			switch (sortBy) {
				case "name":
					cmp = weaponName(a).localeCompare(weaponName(b));
					break;
				case "level":
					cmp = a.level - b.level;
					break;
				case "rarity":
					cmp = (weaponEntry(a)?.rarity ?? 0) - (weaponEntry(b)?.rarity ?? 0);
					break;
				case "type":
					cmp = (weaponEntry(a)?.type_name ?? "").localeCompare(
						weaponEntry(b)?.type_name ?? "",
					);
					break;
				case "character":
					cmp = (a.equippedBy ?? 0) - (b.equippedBy ?? 0);
					break;
			}
			return cmp * dir;
		});
		return arr;
	}, [filteredWeapons, sortBy, sortAsc]);

	const setFilter = (key: keyof WeaponFilters, value: string | string[]) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

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
			<div className="bg-card text-card-foreground ring-foreground/10 flex flex-col gap-2 rounded-none py-3 ring-1">
				<div className="flex flex-wrap items-end gap-x-4 gap-y-2 px-4">
					<div className="flex min-w-44 flex-1 flex-col gap-1">
						<span className="text-[10px] leading-none text-muted-foreground">
							Search
						</span>
						<Input
							type="text"
							placeholder="Weapon name..."
							value={filters.search}
							onChange={(e) =>
								setFilters((prev) => ({ ...prev, search: e.target.value }))
							}
						/>
					</div>

					<div className="flex flex-col gap-1">
						<span
							className={`text-[10px] leading-none ${filters.type.length > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
						>
							Weapon
						</span>
						<div className="flex gap-1">
							{weaponTypeOptions.map((option) => (
								<FilterIconButton
									key={option.value}
									icon={option.icon ?? ""}
									title={option.label}
									pressed={filters.type.includes(option.value)}
									onClick={() =>
										setFilters((prev) => ({
											...prev,
											type: prev.type.includes(option.value)
												? prev.type.filter((t) => t !== option.value)
												: [...prev.type, option.value],
										}))
									}
								/>
							))}
						</div>
					</div>

					<div className="flex flex-col gap-1">
						<span
							className={`text-[10px] leading-none ${filters.rarity.length > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
						>
							Rarity
						</span>
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
											setFilters((prev) => ({
												...prev,
												rarity: pressed
													? prev.rarity.filter((r) => r !== option.value)
													: [...prev.rarity, option.value],
											}))
										}
									>
										{option.label}
									</Button>
								);
							})}
						</div>
					</div>
				</div>

				<div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-t px-4 pt-2">
					<div className="w-32">
						<div className="flex min-w-0 flex-col gap-1">
							<span
								className={`text-[10px] leading-none ${filters.minLevel > MIN_WEAPON_LEVEL ? "font-semibold text-foreground" : "text-muted-foreground"}`}
							>
								Min Lv {filters.minLevel}
							</span>
							<Slider
								min={MIN_WEAPON_LEVEL}
								max={90}
								value={[filters.minLevel]}
								onValueChange={(next) =>
									setFilters((prev) => ({ ...prev, minLevel: next[0] }))
								}
								className="h-3.5"
							/>
						</div>
					</div>

					<div className="w-48">
						<MultiFilterSelect
							label="Equipped"
							values={filters.character}
							options={[
								{ value: "none", label: "Not equipped" },
								...characterOptions,
							]}
							onChange={(values) => setFilter("character", values)}
						/>
					</div>

					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-[10px] text-muted-foreground">Sort</span>
						{weaponSortOptions.map((option) => {
							const active = sortBy === option.value;
							return (
								<Button
									key={option.value}
									type="button"
									variant={active ? "default" : "outline"}
									size="sm"
									title={
										active
											? `${option.label} (${sortAsc ? "ascending" : "descending"})`
											: `Sort by ${option.label}`
									}
									onClick={() => {
										if (active) {
											setSortAsc((a) => !a);
										} else {
											setSortBy(option.value);
											setSortAsc(!option.desc);
										}
									}}
								>
									{option.label}
									{active &&
										(sortAsc ? (
											<ArrowUp className="size-3" />
										) : (
											<ArrowDown className="size-3" />
										))}
								</Button>
							);
						})}
					</div>

					<div className="ml-auto flex items-center gap-2">
						<p className="text-xs text-muted-foreground">
							Showing {filteredWeapons.length} of {weapons.length} weapons
						</p>
						{hasActiveFilters && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setFilters(EMPTY_WEAPON_FILTERS);
									setSortBy(DEFAULT_SORT);
									setSortAsc(false);
								}}
							>
								Reset
							</Button>
						)}
					</div>
				</div>
			</div>

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
