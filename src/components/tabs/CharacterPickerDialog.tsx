// Character picker for the optimizer slots: the Characters tab's filtering
// (search, element, weapon, rarity, ownership, level/chain ranges, sort) in a
// modal. Picking a character assigns it to the slot that opened the dialog.

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { charactersById } from "@/components/echo/EchoCard";
import {
	allCharacters,
	type CardAccount,
	CHAIN_RANGE,
	CHARACTER_SORT_OPTIONS,
	type CharacterEntry,
	type CharacterFilters,
	type CharacterSortKey,
	DEFAULT_FILTERS,
	elementOptions,
	LEVEL_RANGE,
	matchesCharacterFilters,
	RangeFilter,
	sortCharacters,
	weaponTypeOptions,
} from "@/components/tabs/CharactersTab";
import { FilterIconButton } from "@/components/tabs/FilterControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { weaponName } from "@/components/weapon/WeaponCard";
import { echoesForResonator, weaponForResonator } from "@/lib/account";
import { rarityTextClass } from "@/lib/rarity";
import { useAccountSnapshot } from "@/lib/useAccountSnapshot";
import { cn } from "@/lib/utils";

export function CharacterPickerDialog({
	title,
	currentRoleId,
	assignmentLabels,
	allowNone,
	onPick,
	onClose,
}: {
	title: string;
	/** Character currently occupying the slot ("" = empty slot). */
	currentRoleId: string;
	/** roleId -> slot label, for characters held by other slots. */
	assignmentLabels: Record<string, string>;
	allowNone: boolean;
	onPick: (roleId: string | null) => void;
	onClose: () => void;
}) {
	const { snapshot } = useAccountSnapshot();
	const [filters, setFilters] = useState<CharacterFilters>(DEFAULT_FILTERS);
	const [sortKey, setSortKey] = useState<CharacterSortKey>("name");
	const [sortDesc, setSortDesc] = useState(
		CHARACTER_SORT_OPTIONS[0].desc ?? false,
	);
	// Focus the search bar as soon as the dialog opens. Retried on the next
	// frame so nothing that steals focus after mount wins, and the ring is
	// forced visible via `focus:` (programmatic focus is not `focus-visible`).
	const searchRef = useRef<HTMLInputElement>(null);
	useEffect(() => {
		searchRef.current?.focus();
		const frame = requestAnimationFrame(() => searchRef.current?.focus());
		return () => cancelAnimationFrame(frame);
	}, []);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	// The Characters tab's list: static catalog plus captured resonators that
	// are missing from it.
	const characters: CharacterEntry[] = useMemo(() => {
		const list = [...allCharacters];
		const known = new Set(list.map((character) => character.id));
		for (const resonator of snapshot.resonators) {
			if (known.has(resonator.id)) continue;
			known.add(resonator.id);
			list.push({
				id: resonator.id,
				name:
					charactersById.get(resonator.id)?.character_name ||
					resonator.name ||
					String(resonator.id),
				image: charactersById.get(resonator.id)?.icon_head_256 ?? "",
			});
		}
		return list.sort((a, b) => a.name.localeCompare(b.name));
	}, [snapshot.resonators]);

	const accountByCharacterId = useMemo(() => {
		const map = new Map<number, CardAccount>();
		for (const resonator of snapshot.resonators) {
			const weapon = weaponForResonator(snapshot, resonator.id);
			map.set(resonator.id, {
				level: resonator.level,
				chain: resonator.chain,
				echoCount: echoesForResonator(snapshot, resonator.id).length,
				weapon: weapon
					? {
							itemId: weapon.itemId,
							level: weapon.level,
							rank: weapon.rank,
							name: weaponName(weapon),
						}
					: null,
			});
		}
		return map;
	}, [snapshot]);

	const sorted = sortCharacters(
		characters.filter((character) =>
			matchesCharacterFilters(
				character,
				accountByCharacterId.get(character.id),
				filters,
			),
		),
		accountByCharacterId,
		sortKey,
		sortDesc,
	);
	const hasActiveFilters =
		JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS) ||
		sortKey !== "name" ||
		sortDesc !== (CHARACTER_SORT_OPTIONS[0].desc ?? false);

	const toggleFilterValue = (
		key: "elements" | "weaponTypes",
		value: string,
	) => {
		setFilters((prev) => ({
			...prev,
			[key]: prev[key].includes(value)
				? prev[key].filter((v) => v !== value)
				: [...prev[key], value],
		}));
	};

	const toggleRarity = (rarity: number) => {
		setFilters((prev) => ({
			...prev,
			rarity: prev.rarity.includes(rarity)
				? prev.rarity.filter((r) => r !== rarity)
				: [...prev.rarity, rarity],
		}));
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="Close"
				title="Close"
				className="absolute inset-0 cursor-default bg-black/60"
				onClick={onClose}
			/>
			<div className="bg-card text-card-foreground ring-foreground/20 relative flex max-h-full w-full max-w-2xl flex-col gap-3 p-4 shadow-2xl ring-1">
				<header className="flex shrink-0 items-center gap-3">
					<h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
						{title}
					</h3>
					{allowNone && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPick(null)}
							disabled={currentRoleId === ""}
						>
							None
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon-sm"
						title="Close"
						onClick={onClose}
					>
						<X className="size-4" />
					</Button>
				</header>

				<div className="flex shrink-0 flex-col gap-2 rounded-none bg-muted/40 p-3 ring-1 ring-border">
					<div className="flex flex-wrap items-end gap-x-4 gap-y-2">
						<div className="flex min-w-40 flex-1 flex-col gap-1">
							<span className="text-[10px] leading-none text-muted-foreground">
								Search
							</span>
							<Input
								ref={searchRef}
								autoFocus
								type="text"
								placeholder="Character name..."
								value={filters.search}
								onChange={(e) =>
									setFilters((prev) => ({ ...prev, search: e.target.value }))
								}
								onKeyDown={(event) => {
									// Enter picks the first selectable character in the list.
									if (event.key !== "Enter") return;
									event.preventDefault();
									const first = sorted.find(
										(character) => !assignmentLabels[String(character.id)],
									);
									if (first) onPick(String(first.id));
								}}
								className="h-7 text-xs focus:border-ring focus:ring-1 focus:ring-ring/50"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<span className="text-[10px] leading-none text-muted-foreground">
								Element
							</span>
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
						</div>

						<div className="flex flex-col gap-1">
							<span className="text-[10px] leading-none text-muted-foreground">
								Weapon
							</span>
							<div className="flex gap-1">
								{weaponTypeOptions.map((option) => (
									<FilterIconButton
										key={option.value}
										icon={option.icon ?? ""}
										title={option.value}
										pressed={filters.weaponTypes.includes(option.value)}
										onClick={() =>
											toggleFilterValue("weaponTypes", option.value)
										}
									/>
								))}
							</div>
						</div>

						<div className="flex flex-col gap-1">
							<span className="text-[10px] leading-none text-muted-foreground">
								Rarity
							</span>
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
						</div>

						<div className="flex flex-col gap-1">
							<span className="text-[10px] leading-none text-muted-foreground">
								Ownership
							</span>
							<span className="flex h-7 items-center gap-1.5 text-xs">
								<Switch
									checked={filters.ownedOnly}
									onCheckedChange={(checked) =>
										setFilters((prev) => ({ ...prev, ownedOnly: checked }))
									}
								/>
								Owned
							</span>
						</div>
					</div>

					<div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-t pt-2">
						<div className="w-40">
							<RangeFilter
								label="Lvl"
								min={LEVEL_RANGE[0]}
								max={LEVEL_RANGE[1]}
								value={filters.levelRange}
								onChange={(levelRange) =>
									setFilters((prev) => ({ ...prev, levelRange }))
								}
							/>
						</div>

						<div className="w-32">
							<RangeFilter
								label="Chain"
								min={CHAIN_RANGE[0]}
								max={CHAIN_RANGE[1]}
								value={filters.chainRange}
								onChange={(chainRange) =>
									setFilters((prev) => ({ ...prev, chainRange }))
								}
							/>
						</div>

						<div className="flex flex-wrap items-center gap-1.5">
							<span className="text-[10px] text-muted-foreground">Sort</span>
							{CHARACTER_SORT_OPTIONS.map((option) => {
								const active = sortKey === option.value;
								return (
									<Button
										key={option.value}
										type="button"
										variant={active ? "default" : "outline"}
										size="sm"
										title={
											active
												? `${option.label} (${sortDesc ? "descending" : "ascending"})`
												: `Sort by ${option.label}`
										}
										onClick={() => {
											if (active) {
												setSortDesc((d) => !d);
											} else {
												setSortKey(option.value);
												setSortDesc(option.desc);
											}
										}}
									>
										{option.label}
										{active &&
											(sortDesc ? (
												<ArrowDown className="size-3" />
											) : (
												<ArrowUp className="size-3" />
											))}
									</Button>
								);
							})}
						</div>

						<div className="ml-auto flex items-center gap-2">
							<span className="text-xs text-muted-foreground">
								{sorted.length} of {characters.length}
							</span>
							{hasActiveFilters && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setFilters(DEFAULT_FILTERS);
										setSortKey("name");
										setSortDesc(CHARACTER_SORT_OPTIONS[0].desc ?? false);
									}}
								>
									Reset
								</Button>
							)}
						</div>
					</div>
				</div>

				{sorted.length === 0 ? (
					<p className="py-6 text-center text-sm text-muted-foreground">
						No characters match the current filters.
					</p>
				) : (
					<div className="grid min-h-0 grid-cols-3 gap-2 overflow-y-auto p-1 sm:grid-cols-4 md:grid-cols-5">
						{sorted.map((character) => {
							const roleId = String(character.id);
							const account = accountByCharacterId.get(character.id);
							const inSlot = assignmentLabels[roleId];
							const isCurrent = roleId === currentRoleId;
							const image =
								character.image ||
								charactersById.get(character.id)?.icon_head_256 ||
								"";
							return (
								<button
									key={roleId}
									type="button"
									disabled={Boolean(inSlot)}
									title={inSlot ? `Already in ${inSlot}` : character.name}
									onClick={() => onPick(roleId)}
									className={cn(
										"flex flex-col items-center gap-1 bg-muted/50 p-2 ring-1 transition-colors",
										isCurrent
											? "ring-2 ring-primary"
											: "ring-foreground/10 hover:bg-muted hover:ring-foreground/25",
										inSlot && "opacity-40",
									)}
								>
									{image ? (
										<img
											src={image}
											alt=""
											className="size-12 object-contain"
										/>
									) : (
										<span className="size-12 bg-black/30" />
									)}
									<span className="w-full truncate text-center text-xs">
										{character.name}
									</span>
									<span className="text-[10px] leading-none text-muted-foreground">
										{account
											? `Lvl ${account.level} · C${account.chain}`
											: "not owned"}
									</span>
									{inSlot && (
										<span className="text-[10px] leading-none text-amber-400">
											in {inSlot}
										</span>
									)}
								</button>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
