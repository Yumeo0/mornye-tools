import { useEffect, useState } from "react";
import type { ProgressionCatalog } from "./types";

export function useProgressionCatalog(active: boolean) {
	const [catalog, setCatalog] = useState<ProgressionCatalog | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [attempt, setAttempt] = useState(0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: attempt explicitly retries a failed catalog import.
	useEffect(() => {
		if (!active || catalog) return;
		let cancelled = false;
		import("@/configs/progression.json")
			.then((module) => {
				if (!cancelled) setCatalog(module.default);
			})
			.catch(() => {
				if (!cancelled)
					setError("Quest and achievement data could not be loaded.");
			});
		return () => {
			cancelled = true;
		};
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
