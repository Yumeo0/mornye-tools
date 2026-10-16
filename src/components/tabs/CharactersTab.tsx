import { useCallback, useState } from "react";
import { CharacterCard } from "@/components/characters/CharacterCard";
import { CharacterDetail } from "@/components/characters/CharacterDetail";
import { CharacterFilterBar } from "@/components/characters/CharacterFilterBar";
import { Card, CardContent } from "@/components/ui/card";
import {
	type GridBreakpoint,
	useResponsiveColumns,
	VirtualGrid,
} from "@/components/VirtualGrid";
import { useCharacterList } from "@/hooks/useCharacterList";
import { echoesForResonator } from "@/lib/account";
import {
	CHARACTER_SORT_OPTIONS,
	type CharacterSortKey,
	DEFAULT_FILTERS,
	filterAndSortCharacters,
} from "@/lib/characterFilters";
import type { CharacterEntry } from "@/lib/characters";

// Mirrors the previous grid classes (grid-cols-2 sm:grid-cols-3 md:grid-cols-4
// lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7); the virtualized grid needs
// the column count in JS.
const CHARACTER_GRID_BREAKPOINTS: readonly GridBreakpoint[] = [
	{ minWidth: 1536, columns: 7 },
	{ minWidth: 1280, columns: 6 },
	{ minWidth: 1024, columns: 5 },
	{ minWidth: 768, columns: 4 },
	{ minWidth: 640, columns: 3 },
];
const CHARACTER_GRID_FALLBACK_COLUMNS = 2;
const CHARACTER_GRID_GAP = 12; // gap-3
// Cards are aspect-696/960; a mid-size card measures roughly this tall.
const CHARACTER_ROW_ESTIMATE_PX = 280;

export function CharactersTab() {
	const { snapshot, error, characters, accountByCharacterId } =
		useCharacterList();
	// Session-only UI state: kept while the app runs (the tab panels stay
	// mounted when switching), reset on restart.
	const [filters, setFilters] = useState(DEFAULT_FILTERS);
	const [sortKey, setSortKey] = useState<CharacterSortKey>("name");
	const [sortDesc, setSortDesc] = useState(
		CHARACTER_SORT_OPTIONS[0].desc ?? false,
	);
	const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(
		null,
	);

	const filteredCharacters = filterAndSortCharacters(
		characters,
		accountByCharacterId,
		filters,
		sortKey,
		sortDesc,
	);

	const selectedCharacter = selectedCharacterId
		? (characters.find((c) => c.id === selectedCharacterId) ?? null)
		: null;

	const getCharacterKey = useCallback(
		(character: CharacterEntry) => character.id,
		[],
	);

	const renderCharacter = useCallback(
		(character: CharacterEntry) => (
			<CharacterCard
				key={character.id}
				character={character}
				account={accountByCharacterId.get(character.id)}
				onOpen={() => setSelectedCharacterId(character.id)}
			/>
		),
		[accountByCharacterId],
	);

	const gridColumns = useResponsiveColumns(
		CHARACTER_GRID_BREAKPOINTS,
		CHARACTER_GRID_FALLBACK_COLUMNS,
	);

	if (selectedCharacter) {
		return (
			<div className="min-h-0 flex-1 overflow-y-auto">
				<CharacterDetail
					character={selectedCharacter}
					account={accountByCharacterId.get(selectedCharacter.id)}
					echoes={echoesForResonator(snapshot, selectedCharacter.id)}
					onBack={() => setSelectedCharacterId(null)}
				/>
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3">
			{snapshot.player && (
				<Card className="shrink-0">
					<CardContent className="flex items-center gap-4">
						<div className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-base font-semibold">
							{snapshot.player.level}
						</div>
						<div className="min-w-0">
							<p className="truncate font-medium">
								{snapshot.player.name || "Player"}
							</p>
							<p className="text-xs text-muted-foreground">
								UID {snapshot.player.playerId} · World level{" "}
								{snapshot.player.worldLevel}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			<CharacterFilterBar
				filters={filters}
				onFiltersChange={setFilters}
				sortKey={sortKey}
				sortDesc={sortDesc}
				onSortChange={(key, desc) => {
					setSortKey(key);
					setSortDesc(desc);
				}}
				resultCount={filteredCharacters.length}
				totalCount={characters.length}
			/>

			{error && <p className="text-sm text-destructive">{error}</p>}

			{filteredCharacters.length === 0 ? (
				<div className="min-h-0 flex-1 overflow-y-auto pr-1">
					<div className="py-8 text-center text-muted-foreground">
						No characters match the current filters.
					</div>
				</div>
			) : (
				<VirtualGrid
					items={filteredCharacters}
					columns={gridColumns}
					gap={CHARACTER_GRID_GAP}
					estimateRowHeight={CHARACTER_ROW_ESTIMATE_PX}
					getItemKey={getCharacterKey}
					renderItem={renderCharacter}
					className="min-h-0 flex-1 overflow-y-auto pr-1"
				/>
			)}
		</div>
	);
}
