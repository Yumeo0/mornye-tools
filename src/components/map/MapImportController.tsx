import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";
import { useAccount } from "@/lib/account";
import { useMapCatalog } from "@/lib/map/catalog";
import { useManualMapMarks } from "@/lib/map/manual";
import { EMPTY_EXPLORATION } from "@/lib/map/types";
import { MapProgressImport } from "./MapProgressImport";

const PROMPT_SEEN_KEY = "map-import-prompt-seen";

/** One app-wide guide, shared by the first map visit and Settings → Import. */
export function MapImportController({
	mapActive,
	open,
	onOpenChange,
}: {
	mapActive: boolean;
	open: boolean;
	onOpenChange: Dispatch<SetStateAction<boolean>>;
}) {
	const offered = useRef(false);
	useEffect(() => {
		if ((!mapActive && !open) || offered.current) return;
		offered.current = true;
		let seen = false;
		try {
			seen = localStorage.getItem(PROMPT_SEEN_KEY) === "true";
			// Opening or dismissing the offer counts as seen, including from Settings.
			localStorage.setItem(PROMPT_SEEN_KEY, "true");
		} catch {
			// Still offer only once this session when browser storage is unavailable.
		}
		if (!seen && !open) onOpenChange(true);
	}, [mapActive, open, onOpenChange]);
	const { snapshot: account } = useAccount();
	const playerId =
		account.player?.playerId ?? account.exploration?.playerId ?? 0;
	const manual = useManualMapMarks(playerId);
	const { catalog, error, retry } = useMapCatalog(open);
	const snapshot = account.exploration ?? EMPTY_EXPLORATION;
	if (!open) return null;
	return (
		<MapProgressImport
			key={playerId}
			catalog={catalog}
			catalogError={error}
			onRetry={retry}
			snapshot={snapshot}
			marks={manual.marks}
			playerId={playerId}
			playerName={account.player?.name}
			ready={manual.ready}
			saving={manual.saving}
			saveError={manual.error}
			onImport={(rewards) => manual.mergeCollected(rewards, snapshot)}
			onClose={() => onOpenChange(false)}
		/>
	);
}
