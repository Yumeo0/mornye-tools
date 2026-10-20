import { useEffect, useState } from "react";
import type { MapCatalog } from "./types";

/** Load once on the first visit, cancelling requests when the tab is hidden. */
export function useMapCatalog(active: boolean) {
	const [catalog, setCatalog] = useState<MapCatalog | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [attempt, setAttempt] = useState(0);
	useEffect(() => {
		if (!active || catalog) return;
		const abort = new AbortController();
		fetch(`/map/catalog.json?attempt=${attempt}`, { signal: abort.signal })
			.then((response) => {
				if (!response.ok)
					throw new Error(
						"Map data could not be loaded. Run bun run map:compile after extracting the game assets.",
					);
				return response.json() as Promise<MapCatalog>;
			})
			.then((data) => {
				if (!abort.signal.aborted) setCatalog(data);
			})
			.catch((cause) => {
				if (!abort.signal.aborted)
					setError(cause instanceof Error ? cause.message : String(cause));
			});
		return () => abort.abort();
	}, [active, catalog, attempt]);
	return {
		catalog,
		error,
		retry: () => {
			setError(null);
			setAttempt((value) => value + 1);
		},
	};
}
