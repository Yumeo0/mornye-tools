// Character picker for the optimizer slots: the Characters tab's filtering
// (search, element, weapon, rarity, ownership, level/chain ranges, sort) in a
// modal. Picking a character assigns it to the slot that opened the dialog.

import { useEffect, useRef, useState } from "react";
import { CharacterFilterBar } from "@/components/characters/CharacterFilterBar";
import { Button } from "@/components/ui/button";
import { Modal, ModalHeader } from "@/components/ui/modal";
import { useCharacterList } from "@/hooks/useCharacterList";
import {
	CHARACTER_SORT_OPTIONS,
	type CharacterFilters,
	type CharacterSortKey,
	DEFAULT_FILTERS,
	filterAndSortCharacters,
} from "@/lib/characterFilters";
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
	const { characters, accountByCharacterId } = useCharacterList();
	const [filters, setFilters] = useState<CharacterFilters>(DEFAULT_FILTERS);
	const [sortKey, setSortKey] = useState<CharacterSortKey>("name");
	const [sortDesc, setSortDesc] = useState(
		CHARACTER_SORT_OPTIONS[0].desc ?? false,
	);

	// Focus the search bar as soon as the dialog opens. The frame retry beats
	// anything that steals focus after mount, and the ring is forced visible
	// via `focus:` (programmatic focus is not `focus-visible`).
	const searchRef = useRef<HTMLInputElement>(null);
	useEffect(() => {
		const frame = requestAnimationFrame(() => searchRef.current?.focus());
		return () => cancelAnimationFrame(frame);
	}, []);

	const sorted = filterAndSortCharacters(
		characters,
		accountByCharacterId,
		filters,
		sortKey,
		sortDesc,
	);

	const pickFirstMatch = (event: React.KeyboardEvent<HTMLInputElement>) => {
		// Enter picks the first selectable character in the list.
		if (event.key !== "Enter") return;
		event.preventDefault();
		const first = sorted.find(
			(character) => !assignmentLabels[String(character.id)],
		);
		if (first) onPick(String(first.id));
	};

	return (
		<Modal className="max-h-full max-w-2xl" onClose={onClose}>
			<ModalHeader
				title={title}
				onClose={onClose}
				actions={
					allowNone ? (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPick(null)}
							disabled={currentRoleId === ""}
						>
							None
						</Button>
					) : undefined
				}
			/>

			<CharacterFilterBar
				className="shrink-0 bg-muted/40 py-3 ring-border"
				contentClassName="px-3"
				filters={filters}
				onFiltersChange={setFilters}
				sortKey={sortKey}
				sortDesc={sortDesc}
				onSortChange={(key, desc) => {
					setSortKey(key);
					setSortDesc(desc);
				}}
				resultCount={sorted.length}
				totalCount={characters.length}
				searchInputProps={{
					ref: searchRef,
					onKeyDown: pickFirstMatch,
					className:
						"h-7 text-xs focus:border-ring focus:ring-1 focus:ring-ring/50",
				}}
			/>

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
						const image = character.image;
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
									<img src={image} alt="" className="size-12 object-contain" />
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
		</Modal>
	);
}
