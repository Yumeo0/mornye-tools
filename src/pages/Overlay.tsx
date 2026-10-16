import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo, useRef, useState } from "react";
import { MenuDebugPanel } from "@/components/overlay/MenuDebugPanel";
import { RelevantCharactersCard } from "@/components/overlay/RelevantCharactersCard";
import { ScanRegionOutline } from "@/components/overlay/ScanRegionOutline";
import { StatAugmentation } from "@/components/overlay/StatAugmentation";
import { useClickThrough } from "@/hooks/useClickThrough";
import { useEchoTracking } from "@/hooks/useEchoTracking";
import { useOverlayLayout } from "@/hooks/useOverlayLayout";
import { type OverlayEchoView, viewFromEcho } from "@/lib/overlayEcho";
import {
	type CharacterInfo,
	calculateRating,
	getRelevantCharacters,
} from "@/lib/rating";
import { normalizeStatName } from "@/lib/stats";

// Start click-through. A failure must not take this module down: a rejected
// top-level await would leave the whole overlay blank until the app restarts.
// The cursor-over-card poll re-applies the setting anyway.
try {
	await getCurrentWindow().setIgnoreCursorEvents(true);
} catch (error) {
	console.error("Failed to set ignore cursor events:", error);
}

/** Normalized wanted main/sub stat names for the augmentation highlight. */
function preferredStats(character: CharacterInfo | null): {
	main: Set<string>;
	sub: Set<string>;
} {
	if (!character) return { main: new Set(), sub: new Set() };
	return {
		main: new Set(
			[
				...character.stats["4cost"],
				...character.stats["3cost"],
				...character.stats["1cost"],
			]
				.flat()
				.map(normalizeStatName),
		),
		sub: new Set(character.stats.subs.flat().map(normalizeStatName)),
	};
}

function Overlay() {
	// Character whose preferred stats are highlighted; null = top ranked.
	const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(
		null,
	);
	const {
		scanRegion,
		showScanRegion,
		captureOrigin,
		panelRegions,
		displayScale,
	} = useOverlayLayout();
	const { exactEcho, panelOpen, showMenuDebug, menuDebug } = useEchoTracking();

	// The card's view model; null hides the card.
	const view: OverlayEchoView | null = useMemo(() => {
		if (!panelOpen || !exactEcho) return null;
		return viewFromEcho(exactEcho);
	}, [panelOpen, exactEcho]);

	const charsRef = useRef<HTMLDivElement | null>(null);
	useClickThrough(charsRef, view !== null);

	// Reset the highlighted character when a different echo appears.
	const lastEchoKeyRef = useRef<string | null>(null);
	useEffect(() => {
		const key = exactEcho ? `id:${exactEcho.incrId}` : null;
		if (key !== lastEchoKeyRef.current) {
			lastEchoKeyRef.current = key;
			setSelectedCharacterId(null);
		}
	}, [exactEcho]);

	// Rank the relevant characters by how well the echo fits them.
	const rankedCharacters = useMemo(() => {
		const relevant =
			view && view.setNames.length > 0
				? getRelevantCharacters(view.setNames)
				: [];
		return relevant
			.map((character) => ({
				character,
				rating: calculateRating(character, view?.subStats ?? []),
			}))
			.sort((a, b) => b.rating - a.rating);
	}, [view]);

	const activeCharacter =
		rankedCharacters.find(
			({ character }) => character.character_id === selectedCharacterId,
		)?.character ??
		rankedCharacters[0]?.character ??
		null;
	const { main: preferredMainStats, sub: preferredSubStats } =
		preferredStats(activeCharacter);

	return (
		<div style={{ width: "100vw", height: "100vh", position: "relative" }}>
			{showScanRegion && scanRegion && (
				<ScanRegionOutline
					region={scanRegion}
					origin={captureOrigin}
					displayScale={displayScale}
				/>
			)}

			{showMenuDebug && menuDebug && <MenuDebugPanel info={menuDebug} />}

			{view && (
				<>
					<StatAugmentation
						mainStats={view.mainStats}
						subStats={view.subStats}
						regions={panelRegions}
						origin={captureOrigin}
						displayScale={displayScale}
						preferredMainStats={preferredMainStats}
						preferredSubStats={preferredSubStats}
					/>

					{rankedCharacters.length > 0 && (
						<RelevantCharactersCard
							ref={charsRef}
							rankedCharacters={rankedCharacters}
							activeCharacterId={activeCharacter?.character_id ?? null}
							selectedCharacterId={selectedCharacterId}
							onSelect={setSelectedCharacterId}
							regions={panelRegions}
							origin={captureOrigin}
							displayScale={displayScale}
						/>
					)}
				</>
			)}
		</div>
	);
}

export default Overlay;
