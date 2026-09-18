import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
	ArrowDown,
	ArrowUp,
	ChevronDown,
	Trash2,
	UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	allCharacters,
	EchoCard,
	echoCost,
	echoKey,
	echoSet,
	equippedCharacter,
	type InventoryEcho,
	sonataIcon128,
} from "@/components/echo/EchoCard";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import {
	type CharacterInfo,
	calculateRating,
	findEcho,
	getCharacterInfo,
} from "@/lib/rating";
import { parseStatLines, statIconAsset } from "@/lib/stats";
import echoData from "../../configs/echo_data.json";
import statsConfig from "../../configs/stats.json";

interface InventoryProgress {
	scanned: number;
	echo: InventoryEcho;
}

interface EchoEntry {
	echo_name: string;
	echo_cost?: number;
	icon_middle?: string;
	echo_sets?: { name: string; icon: string }[];
}

// Filter option lists derived from the game data
interface FilterOption {
	value: string;
	label: string;
	icon?: string;
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

const mainStatOptions: FilterOption[] = [
	...new Set([
		...Object.keys(statsConfig.main),
		...(echoData as EchoEntry[]).flatMap(
			(echo) =>
				(echo as { possible_mainstats?: string[] }).possible_mainstats ?? [],
		),
		"HP",
		"ATK",
		"DEF",
	]),
]
	.sort()
	.map((stat) => ({ value: stat, label: stat, icon: statIconAsset(stat) }));

const subStatOptions: FilterOption[] = Object.keys(statsConfig.sub)
	.sort()
	.map((stat) => ({ value: stat, label: stat, icon: statIconAsset(stat) }));

const characterOptions: FilterOption[] = allCharacters
	.map((character) => ({
		value: character.character_name,
		label: character.character_name,
		icon: character.icon_head_256,
	}))
	.sort((a, b) => a.label.localeCompare(b.label));

const levelOptions = [0, 5, 10, 15, 20, 25];

type SortKey =
	| "none"
	| "relevance"
	| "level"
	| "cost"
	| "set"
	| "name"
	| "character";

const sortOptions: { value: SortKey; label: string }[] = [
	{ value: "none", label: "Newest First" },
	{ value: "relevance", label: "Character Relevance" },
	{ value: "level", label: "Level" },
	{ value: "cost", label: "Cost" },
	{ value: "set", label: "Set" },
	{ value: "name", label: "Name" },
	{ value: "character", label: "Equipped Character" },
];

interface Filters {
	minLevel: string;
	set: string[];
	cost: string[];
	mainStat: string;
	substat: string[];
	character: string[];
}

const EMPTY_FILTERS: Filters = {
	minLevel: "any",
	set: [],
	cost: [],
	mainStat: "any",
	substat: [],
	character: [],
};

function echoLevel(echo: InventoryEcho): number {
	return Number.parseInt(echo.level.replace("+", ""), 10) || 0;
}

function matchesFilters(echo: InventoryEcho, filters: Filters): boolean {
	if (
		filters.minLevel !== "any" &&
		echoLevel(echo) < Number(filters.minLevel)
	) {
		return false;
	}

	if (
		filters.set.length > 0 &&
		!filters.set.includes(echoSet(echo.echo_name)?.name ?? "")
	) {
		return false;
	}

	if (filters.cost.length > 0) {
		const cost = echoCost(echo.echo_name);
		if (cost === undefined || !filters.cost.includes(String(cost)))
			return false;
	}

	if (filters.mainStat !== "any") {
		const mains = parseStatLines(echo.main_stats).map((line) => line.name);
		if (!mains.includes(filters.mainStat)) return false;
	}

	if (filters.substat.length > 0) {
		const subs = parseStatLines(echo.sub_stats).map((line) => line.name);
		if (!subs.some((sub) => filters.substat.includes(sub))) return false;
	}

	const character = equippedCharacter(echo.equippedBy)?.character_name;
	if (filters.character.length > 0) {
		const matchesNone =
			character === undefined && filters.character.includes("none");
		const matchesCharacter =
			character !== undefined && filters.character.includes(character);
		if (!matchesNone && !matchesCharacter) return false;
	}

	return true;
}

function FilterSelect({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: FilterOption[];
	onChange: (value: string) => void;
}) {
	const selected = options.find((option) => option.value === value);
	return (
		<label className="flex min-w-0 flex-col gap-0.5">
			<span className="text-[10px] text-muted-foreground">{label}</span>
			<Select value={value} onValueChange={(v) => onChange(v ?? "any")}>
				<SelectTrigger size="sm" className="w-full">
					{selected?.icon && (
						<img
							src={selected.icon}
							alt=""
							className="size-3.5 shrink-0 object-contain"
						/>
					)}
					{selected?.label ?? value}
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.icon && (
								<img
									src={option.icon}
									alt=""
									className="size-3.5 shrink-0 object-contain"
								/>
							)}
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</label>
	);
}

function MultiFilterSelect({
	label,
	values,
	options,
	onChange,
}: {
	label: string;
	values: string[];
	options: FilterOption[];
	onChange: (values: string[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open) return;
		const onClickOutside = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, [open]);

	const summary =
		values.length === 0
			? "Any"
			: values.length === 1
				? (options.find((option) => option.value === values[0])?.label ??
					values[0])
				: `${values.length} selected`;

	const toggle = (value: string) => {
		onChange(
			values.includes(value)
				? values.filter((v) => v !== value)
				: [...values, value],
		);
	};

	return (
		<div ref={containerRef} className="relative flex min-w-0 flex-col gap-0.5">
			<span className="text-[10px] text-muted-foreground">{label}</span>
			<Button
				type="button"
				variant={values.length > 0 ? "default" : "outline"}
				size="sm"
				title={summary}
				className="w-full justify-between font-normal"
				onClick={() => setOpen((o) => !o)}
			>
				<span className="truncate">{summary}</span>
				<ChevronDown className="size-3.5 shrink-0 opacity-60" />
			</Button>
			{open && (
				<div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto bg-popover p-1 shadow-md ring-1 ring-border">
					{options.map((option) => (
						<label
							key={option.value}
							className="flex cursor-pointer items-center gap-2 rounded-none px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
						>
							<input
								type="checkbox"
								checked={values.includes(option.value)}
								onChange={() => toggle(option.value)}
								className="accent-primary"
							/>
							{option.icon && (
								<img
									src={option.icon}
									alt=""
									className="size-3.5 shrink-0 object-contain"
								/>
							)}
							<span className="truncate">{option.label}</span>
						</label>
					))}
				</div>
			)}
		</div>
	);
}

export function InventoryTab({ onOpenScanner }: { onOpenScanner: () => void }) {
	const [error, setError] = useState<string | null>(null);
	const [echoes, setEchoes] = useState<InventoryEcho[]>([]);
	const [confirmingClear, setConfirmingClear] = useState(false);
	const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
	const [sortBy, setSortBy] = useState<SortKey>("none");
	const [sortAsc, setSortAsc] = useState(false);
	// Character used for the relevance sort (required)
	const [ratingCharacterId, setRatingCharacterId] = useState<string>(
		String(allCharacters[0]?.character_id ?? ""),
	);

	const filteredEchoes = echoes.filter((echo) => matchesFilters(echo, filters));
	const hasActiveFilters =
		JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

	// Character-relevance rating per echo for the selected character (same
	// percent as the overlay)
	const ratingsByEcho = useMemo(() => {
		const map = new Map<string, number>();
		const characterInfoCache = new Map<string, CharacterInfo | null>();
		const ratingCharacter = Number.parseInt(ratingCharacterId, 10);
		if (Number.isNaN(ratingCharacter)) return map;
		for (const echo of echoes) {
			const lower = echo.echo_name.toLowerCase();
			let info = characterInfoCache.get(lower);
			if (info === undefined) {
				const entry = findEcho(echo.echo_name);
				info = entry
					? getCharacterInfo(
							ratingCharacter,
							entry.echo_sets.map((set) => set.name),
						)
					: null;
				characterInfoCache.set(lower, info);
			}
			if (!info) {
				map.set(echoKey(echo), 0);
				continue;
			}
			const mains = parseStatLines(echo.main_stats).map(
				(line) => `${line.name} ${line.value}`,
			);
			const subs = parseStatLines(echo.sub_stats).map(
				(line) => `${line.name} ${line.value}`,
			);
			map.set(echoKey(echo), calculateRating(info, mains, subs));
		}
		return map;
	}, [echoes, ratingCharacterId]);

	const sortedEchoes = useMemo(() => {
		if (sortBy === "none") return filteredEchoes;
		const dir = sortAsc ? 1 : -1;
		const arr = [...filteredEchoes];
		arr.sort((a, b) => {
			if (sortBy === "character") {
				// Unequipped echoes always sort last
				const nameA = equippedCharacter(a.equippedBy)?.character_name;
				const nameB = equippedCharacter(b.equippedBy)?.character_name;
				if (nameA && !nameB) return -1;
				if (!nameA && nameB) return 1;
			}
			let cmp = 0;
			switch (sortBy) {
				case "name":
					cmp = a.echo_name.localeCompare(b.echo_name);
					break;
				case "level":
					cmp = echoLevel(a) - echoLevel(b);
					break;
				case "cost":
					cmp = (echoCost(a.echo_name) ?? 0) - (echoCost(b.echo_name) ?? 0);
					break;
				case "set":
					cmp = (echoSet(a.echo_name)?.name ?? "").localeCompare(
						echoSet(b.echo_name)?.name ?? "",
					);
					break;
				case "relevance":
					cmp =
						(ratingsByEcho.get(echoKey(a)) ?? 0) -
						(ratingsByEcho.get(echoKey(b)) ?? 0);
					break;
				case "character":
					cmp = (
						equippedCharacter(a.equippedBy)?.character_name ?? ""
					).localeCompare(
						equippedCharacter(b.equippedBy)?.character_name ?? "",
					);
					break;
			}
			return cmp * dir;
		});
		return arr;
	}, [filteredEchoes, sortBy, sortAsc, ratingsByEcho]);

	const setFilter = (key: keyof Filters, value: string | string[]) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	useEffect(() => {
		invoke<InventoryEcho[]>("get_saved_echoes")
			.then(setEchoes)
			.catch(console.error);

		const unlistenProgress = listen<InventoryProgress>(
			"inventory-progress",
			(event) => {
				setEchoes((prev) => {
					const key = echoKey(event.payload.echo);
					if (prev.some((echo) => echoKey(echo) === key)) {
						return prev;
					}
					return [event.payload.echo, ...prev];
				});
			},
		);

		return () => {
			unlistenProgress.then((fn) => fn());
		};
	}, []);

	const clearSaved = async () => {
		try {
			await invoke("clear_saved_echoes");
			setEchoes([]);
		} catch (e) {
			setError(String(e));
		} finally {
			setConfirmingClear(false);
		}
	};

	const deleteEcho = async (echo: InventoryEcho) => {
		try {
			await invoke("delete_saved_echo", { echo });
			// Remove only the exact instance that was deleted; identical
			// duplicates must stay
			setEchoes((prev) => {
				const index = prev.indexOf(echo);
				if (index === -1) return prev;
				return [...prev.slice(0, index), ...prev.slice(index + 1)];
			});
		} catch (e) {
			setError(String(e));
		}
	};

	const changeEquippedBy = async (echo: InventoryEcho, value: string) => {
		const equippedBy =
			value === "unequipped"
				? ""
				: `Equipped by ${
						allCharacters.find(
							(character) => String(character.character_id) === value,
						)?.character_name ?? ""
					}`;
		try {
			await invoke("set_echo_equipped_by", { echo, equippedBy });
			// Update only the exact instance; identical duplicates are separate
			// echoes and must keep their own equipped character
			setEchoes((prev) =>
				prev.map((e) => (e === echo ? { ...e, equippedBy } : e)),
			);
		} catch (e) {
			setError(String(e));
		}
	};

	const equippedValue = (echo: InventoryEcho): string => {
		const character = equippedCharacter(echo.equippedBy);
		return character ? String(character.character_id) : "unequipped";
	};

	if (echoes.length === 0) {
		return (
			<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
				<p className="text-sm text-muted-foreground">
					No echoes scanned yet. Head to the scanner to capture your echoes.
				</p>
				<Button onClick={onOpenScanner}>Open Scanner</Button>
				{error && <p className="text-sm text-destructive">{error}</p>}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
				<FilterSelect
					label="Min Level"
					value={filters.minLevel}
					onChange={(value) => setFilter("minLevel", value)}
					options={[
						{ value: "any", label: "Any" },
						...levelOptions.map((level) => ({
							value: String(level),
							label: `≥ +${level}`,
						})),
					]}
				/>
				<MultiFilterSelect
					label="Echo Cost"
					values={filters.cost}
					options={costOptions}
					onChange={(values) => setFilter("cost", values)}
				/>
				<MultiFilterSelect
					label="Echo Sets"
					values={filters.set}
					options={setOptions}
					onChange={(values) => setFilter("set", values)}
				/>
				<FilterSelect
					label="Main Stat"
					value={filters.mainStat}
					onChange={(value) => setFilter("mainStat", value)}
					options={[{ value: "any", label: "Any" }, ...mainStatOptions]}
				/>
				<MultiFilterSelect
					label="Substats"
					values={filters.substat}
					options={subStatOptions}
					onChange={(values) => setFilter("substat", values)}
				/>
				<MultiFilterSelect
					label="Equipped Characters"
					values={filters.character}
					options={[
						{ value: "none", label: "Not equipped" },
						...characterOptions,
					]}
					onChange={(values) => setFilter("character", values)}
				/>
			</div>

			<div className="flex items-center justify-between">
				<p className="text-xs text-muted-foreground">
					Showing {filteredEchoes.length} of {echoes.length} echoes
				</p>
				<div className="flex items-center gap-2">
					{confirmingClear ? (
						<>
							<span className="text-xs text-destructive">
								Delete all {echoes.length} echoes?
							</span>
							<Button variant="destructive" size="sm" onClick={clearSaved}>
								Confirm
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setConfirmingClear(false)}
							>
								Cancel
							</Button>
						</>
					) : (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setConfirmingClear(true)}
						>
							Clear Saved
						</Button>
					)}
					{hasActiveFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setFilters(EMPTY_FILTERS)}
						>
							Clear Filters
						</Button>
					)}
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-end gap-1.5">
				<span className="text-[10px] text-muted-foreground">Sort</span>
				<Select
					value={sortBy}
					onValueChange={(value) => {
						const next = (value ?? "none") as SortKey;
						setSortBy(next);
					}}
				>
					<SelectTrigger size="sm" className="w-44">
						{sortOptions.find((option) => option.value === sortBy)?.label}
					</SelectTrigger>
					<SelectContent>
						{sortOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
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
							{allCharacters.find(
								(character) =>
									String(character.character_id) === ratingCharacterId,
							)?.character_name ?? "Character"}
						</SelectTrigger>
						<SelectContent>
							{allCharacters.map((character) => (
								<SelectItem
									key={character.character_id}
									value={String(character.character_id)}
								>
									<img
										src={character.icon_head_256}
										alt=""
										className="size-5 object-contain"
									/>
									{character.character_name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
				<Button
					variant="outline"
					size="sm"
					className="size-7 p-0"
					disabled={sortBy === "none"}
					title={sortAsc ? "Ascending" : "Descending"}
					onClick={() => setSortAsc((asc) => !asc)}
				>
					{sortAsc ? (
						<ArrowUp className="size-3.5" />
					) : (
						<ArrowDown className="size-3.5" />
					)}
				</Button>
			</div>

			{filteredEchoes.length === 0 ? (
				<p className="py-8 text-center text-sm text-muted-foreground">
					No echoes match the current filters.
				</p>
			) : (
				<div className="max-h-[60vh] overflow-y-auto pr-1">
					<div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
						{sortedEchoes.map((echo, index) => {
							const character = equippedCharacter(echo.equippedBy);
							return (
								<EchoCard
									key={`${echoKey(echo)}-${index}`}
									echo={echo}
									actions={
										<>
											<Select
												value={equippedValue(echo)}
												onValueChange={(value) =>
													changeEquippedBy(echo, value ?? "unequipped")
												}
											>
												<SelectTrigger
													title={echo.equippedBy || "Not equipped"}
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
													<SelectItem value="unequipped">
														Not equipped
													</SelectItem>
													{allCharacters.map((character) => (
														<SelectItem
															key={character.character_id}
															value={String(character.character_id)}
														>
															<img
																src={character.icon_head_256}
																alt=""
																className="size-5 object-contain"
															/>
															{character.character_name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<Button
												variant="ghost"
												size="sm"
												title="Delete echo"
												className="size-8 p-0 text-muted-foreground hover:text-destructive"
												onClick={() => deleteEcho(echo)}
											>
												<Trash2 className="size-3.5" />
											</Button>
										</>
									}
								/>
							);
						})}
					</div>
				</div>
			)}

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
