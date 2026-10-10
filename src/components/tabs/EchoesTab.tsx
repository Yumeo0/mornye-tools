import { ArrowDown, ArrowUp, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	charactersById,
	EchoCard,
	echoCost,
	echoKey,
	echoName,
	echoSet,
	equippedCharacter,
	sonataIcon128,
} from "@/components/echo/EchoCard";
import {
	characterFilterOptions,
	type FilterOption,
	MultiFilterSelect,
} from "@/components/tabs/FilterControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
	type Echo,
	formatStatValue,
	STAT_LABELS,
	type StatKey,
	setEquippedOverride,
	statLabel,
} from "@/lib/account";
import {
	type CharacterInfo,
	calculateRating,
	findEchoById,
	getCharacterInfo,
} from "@/lib/rating";
import { statIconAsset } from "@/lib/stats";
import { useAccountSnapshot } from "@/lib/useAccountSnapshot";
import echoData from "../../configs/echo_data.json";

interface EchoEntry {
	echo_name: string;
	echo_cost?: number;
	monster_id?: number | null;
	echo_sets?: { name: string; icon: string }[];
}

// First sonata icon for each set name (assets only ship in the 128 resolution)
const setIconByName = new Map<string, string>();
for (const echo of echoData as EchoEntry[]) {
	for (const set of echo.echo_sets ?? []) {
		if (!setIconByName.has(set.name)) {
			setIconByName.set(set.name, sonataIcon128(set.icon));
		}
	}
}

const setOptions: FilterOption[] = [...setIconByName.keys()]
	.sort()
	.map((name) => ({ value: name, label: name, icon: setIconByName.get(name) }));

const costOptions: FilterOption[] = [
	...new Set(
		(echoData as EchoEntry[])
			.map((echo) => echo.echo_cost)
			.filter((cost): cost is number => cost !== undefined),
	),
]
	.sort((a, b) => b - a)
	.map((cost) => ({ value: String(cost), label: `${cost} Cost` }));

const statKeys = Object.keys(STAT_LABELS) as StatKey[];
const mainStatOptions: FilterOption[] = statKeys.map((key) => ({
	value: key,
	label: STAT_LABELS[key],
	icon: statIconAsset(STAT_LABELS[key]),
}));

type SortKey =
	| "none"
	| "relevance"
	| "level"
	| "cost"
	| "set"
	| "name"
	| "character";

// `desc` is the natural default direction per key
const ECHO_SORT_OPTIONS: { value: SortKey; label: string; desc: boolean }[] = [
	{ value: "none", label: "Newest", desc: true },
	{ value: "relevance", label: "Relevance", desc: true },
	{ value: "level", label: "Lv", desc: true },
	{ value: "cost", label: "Cost", desc: true },
	{ value: "set", label: "Set", desc: false },
	{ value: "name", label: "Name", desc: false },
	{ value: "character", label: "Equipped", desc: false },
];

interface Filters {
	search: string;
	minLevel: number;
	cost: number[];
	set: string[];
	mainStat: string;
	substat: string[];
	character: string[];
}

const EMPTY_FILTERS: Filters = {
	search: "",
	minLevel: 0,
	cost: [],
	set: [],
	mainStat: "any",
	substat: [],
	character: [],
};

function matchesFilters(echo: Echo, filters: Filters): boolean {
	if (
		filters.search &&
		!echoName(echo).toLowerCase().includes(filters.search.toLowerCase())
	) {
		return false;
	}
	if (echo.level < filters.minLevel) {
		return false;
	}

	if (filters.cost.length > 0) {
		const cost = echoCost(echo);
		if (cost === undefined || !filters.cost.includes(cost)) {
			return false;
		}
	}

	if (
		filters.set.length > 0 &&
		!filters.set.includes(echoSet(echo)?.name ?? "")
	) {
		return false;
	}

	if (
		filters.mainStat !== "any" &&
		!echo.mainProps.some((prop) => prop.key === filters.mainStat)
	) {
		return false;
	}

	if (
		filters.substat.length > 0 &&
		!echo.subProps.some((prop) => filters.substat.includes(prop.key))
	) {
		return false;
	}

	if (filters.character.length > 0) {
		const matchesNone =
			echo.equippedBy == null && filters.character.includes("none");
		const matchesCharacter =
			echo.equippedBy != null &&
			filters.character.includes(String(echo.equippedBy));
		if (!matchesNone && !matchesCharacter) return false;
	}

	return true;
}

export function EchoesTab() {
	const { snapshot, error } = useAccountSnapshot();
	const echoes = snapshot.echoes;
	const [actionError, setActionError] = useState<string | null>(null);
	const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
	const [sortBy, setSortBy] = useState<SortKey>("none");
	const [sortAsc, setSortAsc] = useState(false);
	// Character used for the relevance sort (required)
	const [ratingCharacterId, setRatingCharacterId] = useState<string>("");

	useEffect(() => {
		if (!ratingCharacterId && snapshot.resonators.length > 0) {
			setRatingCharacterId(String(snapshot.resonators[0].id));
		}
	}, [ratingCharacterId, snapshot.resonators]);

	const characterOptions: FilterOption[] = useMemo(
		() => characterFilterOptions(snapshot.resonators),
		[snapshot.resonators],
	);

	const filteredEchoes = echoes.filter((echo) => matchesFilters(echo, filters));
	const hasActiveFilters =
		JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS) ||
		sortBy !== "none" ||
		sortAsc;

	// Character-relevance rating per echo for the selected character (same
	// percent as the overlay)
	const ratingsByEcho = useMemo(() => {
		const map = new Map<string, number>();
		const characterInfoCache = new Map<number, CharacterInfo | null>();
		const ratingCharacter = Number.parseInt(ratingCharacterId, 10);
		if (Number.isNaN(ratingCharacter)) return map;
		for (const echo of echoes) {
			let info = characterInfoCache.get(echo.monsterId);
			if (info === undefined) {
				const entry = findEchoById(echo.monsterId);
				info = entry
					? getCharacterInfo(
							ratingCharacter,
							entry.echo_sets.map((set) => set.name),
						)
					: null;
				characterInfoCache.set(echo.monsterId, info);
			}
			if (!info) {
				map.set(echoKey(echo), 0);
				continue;
			}
			const mains = echo.mainProps.map(
				(prop) =>
					`${statLabel(prop.key)} ${formatStatValue(prop.key, prop.value)}`,
			);
			const subs = echo.subProps.map(
				(prop) =>
					`${statLabel(prop.key)} ${formatStatValue(prop.key, prop.value)}`,
			);
			map.set(echoKey(echo), calculateRating(info, mains, subs));
		}
		return map;
	}, [echoes, ratingCharacterId]);

	const sortedEchoes = useMemo(() => {
		if (sortBy === "none") {
			return sortAsc ? [...filteredEchoes].reverse() : filteredEchoes;
		}
		const dir = sortAsc ? 1 : -1;
		const arr = [...filteredEchoes];
		arr.sort((a, b) => {
			if (sortBy === "character") {
				// Unequipped echoes always sort last
				const nameA = a.equippedBy != null;
				const nameB = b.equippedBy != null;
				if (nameA && !nameB) return -1;
				if (!nameA && nameB) return 1;
			}
			let cmp = 0;
			switch (sortBy) {
				case "name":
					cmp = echoName(a).localeCompare(echoName(b));
					break;
				case "level":
					cmp = a.level - b.level;
					break;
				case "cost":
					cmp = (echoCost(a) ?? 0) - (echoCost(b) ?? 0);
					break;
				case "set":
					cmp = (echoSet(a)?.name ?? "").localeCompare(echoSet(b)?.name ?? "");
					break;
				case "relevance":
					cmp =
						(ratingsByEcho.get(echoKey(a)) ?? 0) -
						(ratingsByEcho.get(echoKey(b)) ?? 0);
					break;
				case "character":
					cmp = (a.equippedBy ?? 0) - (b.equippedBy ?? 0);
					break;
			}
			return cmp * dir;
		});
		return arr;
	}, [filteredEchoes, sortBy, sortAsc, ratingsByEcho]);

	const setFilter = (key: keyof Filters, value: string | string[]) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const changeEquippedBy = useCallback(async (echo: Echo, value: string) => {
		try {
			if (value === "unequipped") {
				await setEquippedOverride(echo.incrId, null, null);
			} else {
				await setEquippedOverride(
					echo.incrId,
					Number(value),
					echo.slot ?? null,
				);
			}
			// `account_set_equipped_override` emits `account-updated`, so the
			// hook refreshes without an explicit refetch.
		} catch (e) {
			setActionError(String(e));
		}
	}, []);

	const equippedValue = (echo: Echo): string =>
		echo.equippedBy != null ? String(echo.equippedBy) : "unequipped";

	if (echoes.length === 0) {
		return (
			<p className="py-8 text-center text-sm text-muted-foreground">
				No echoes captured yet. Open the Echo inventory once while the sniffer
				is running; the capture fills this list automatically.
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
							placeholder="Echo name..."
							value={filters.search}
							onChange={(e) =>
								setFilters((prev) => ({ ...prev, search: e.target.value }))
							}
						/>
					</div>

					<div className="flex flex-col gap-1">
						<span
							className={`text-[10px] leading-none ${filters.cost.length > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
						>
							Cost
						</span>
						<div className="flex gap-1">
							{costOptions.map((option) => {
								const cost = Number(option.value);
								const pressed = filters.cost.includes(cost);
								return (
									<Button
										key={option.value}
										type="button"
										variant={pressed ? "default" : "outline"}
										size="icon-sm"
										title={`${cost}-cost echoes`}
										onClick={() =>
											setFilters((prev) => ({
												...prev,
												cost: pressed
													? prev.cost.filter((c) => c !== cost)
													: [...prev.cost, cost],
											}))
										}
									>
										{cost}
									</Button>
								);
							})}
						</div>
					</div>

					<div className="w-32">
						<div className="flex min-w-0 flex-col gap-1">
							<span
								className={`text-[10px] leading-none ${filters.minLevel > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
							>
								Min Lv +{filters.minLevel}
							</span>
							<Slider
								min={0}
								max={25}
								value={[filters.minLevel]}
								onValueChange={(next) =>
									setFilters((prev) => ({ ...prev, minLevel: next[0] }))
								}
								className="h-3.5"
							/>
						</div>
					</div>

					<div className="flex min-w-0 flex-col gap-1">
						<span
							className={`text-[10px] leading-none ${filters.mainStat !== "any" ? "font-semibold text-foreground" : "text-muted-foreground"}`}
						>
							Main Stat
						</span>
						<div className="flex flex-wrap gap-1">
							{mainStatOptions.map((option) => {
								const pressed = filters.mainStat === option.value;
								return (
									<Button
										key={option.value}
										type="button"
										variant={pressed ? "default" : "outline"}
										size="icon-sm"
										title={option.label}
										onClick={() =>
											setFilters((prev) => ({
												...prev,
												mainStat: pressed ? "any" : option.value,
											}))
										}
									>
										{option.icon && (
											<img
												src={option.icon}
												alt=""
												className={`size-5 object-contain ${pressed ? "" : "brightness-0 dark:brightness-100"}`}
											/>
										)}
									</Button>
								);
							})}
						</div>
					</div>
				</div>

				<div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-t px-4 pt-2">
					<div className="w-48">
						<MultiFilterSelect
							label="Echo Sets"
							values={filters.set}
							options={setOptions}
							onChange={(values) => setFilter("set", values)}
						/>
					</div>

					<div className="w-44">
						<MultiFilterSelect
							label="Substats"
							values={filters.substat}
							options={mainStatOptions}
							onChange={(values) => setFilter("substat", values)}
						/>
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
						{ECHO_SORT_OPTIONS.map((option) => {
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
											// `sortAsc` flips the legacy ascending flag against
											// the natural (desc) default per key
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
						{sortBy === "relevance" && (
							<Select
								value={ratingCharacterId}
								onValueChange={(value) => setRatingCharacterId(value ?? "")}
							>
								<SelectTrigger
									size="sm"
									className="w-40"
									title="Character for relevance"
								>
									{characterOptions.find(
										(option) => option.value === ratingCharacterId,
									)?.label ?? "Character"}
								</SelectTrigger>
								<SelectContent>
									{characterOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.icon && (
												<img
													src={option.icon}
													alt=""
													className="size-5 object-contain"
												/>
											)}
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>

					<div className="ml-auto flex items-center gap-2">
						<p className="text-xs text-muted-foreground">
							Showing {filteredEchoes.length} of {echoes.length} echoes
						</p>
						{hasActiveFilters && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setFilters(EMPTY_FILTERS);
									setSortBy("none");
									setSortAsc(false);
								}}
							>
								Reset
							</Button>
						)}
					</div>
				</div>
			</div>

			{filteredEchoes.length === 0 ? (
				<p className="py-8 text-center text-sm text-muted-foreground">
					No echoes match the current filters.
				</p>
			) : (
				<div className="min-h-0 flex-1 overflow-y-auto pr-1">
					<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
						{sortedEchoes.map((echo, index) => {
							const character = equippedCharacter(echo.equippedBy);
							return (
								<EchoCard
									// biome-ignore lint/suspicious/noArrayIndexKey: the list can contain exact duplicate echoes
									key={`${echoKey(echo)}-${index}`}
									echo={echo}
									actions={
										<Select
											value={equippedValue(echo)}
											onValueChange={(value) =>
												changeEquippedBy(echo, value ?? "unequipped")
											}
										>
											<SelectTrigger
												title={
													charactersById.get(echo.equippedBy ?? -1)
														?.character_name || "Not equipped"
												}
												className="size-8 w-8 justify-center p-0.5 [&>svg:last-child]:hidden"
											>
												{character ? (
													<img
														src={character.icon_head_256}
														alt={character.character_name}
														className="size-full object-contain"
													/>
												) : (
													<UserRound className="size-4 text-muted-foreground" />
												)}
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="unequipped">Not equipped</SelectItem>
												{characterOptions.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.icon && (
															<img
																src={option.icon}
																alt=""
																className="size-5 object-contain"
															/>
														)}
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									}
								/>
							);
						})}
					</div>
				</div>
			)}

			{(error ?? actionError) && (
				<p className="text-sm text-destructive">{error ?? actionError}</p>
			)}
		</div>
	);
}
