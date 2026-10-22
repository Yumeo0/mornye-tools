import { isTauri } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";
import {
	DEFAULT_RESULTS_LIMIT,
	MAX_RESULTS_LIMIT,
	MIN_RESULTS_LIMIT,
} from "@/components/optimizer/optimizerOptions";
import { readSetting, writeSetting } from "@/lib/settings";

export interface OptimizerPreferences {
	engine: "gpu" | "cpu";
	resultsLimit: number;
}

export function hasWebGpu(): boolean {
	return (
		typeof navigator !== "undefined" &&
		(navigator as Navigator & { gpu?: unknown }).gpu != null
	);
}

export function normalizeOptimizerPreferences(
	value: unknown,
): OptimizerPreferences {
	const saved = value as Partial<OptimizerPreferences> | null;
	return {
		engine:
			saved?.engine === "cpu" || saved?.engine === "gpu"
				? saved.engine
				: hasWebGpu()
					? "gpu"
					: "cpu",
		resultsLimit:
			typeof saved?.resultsLimit === "number" &&
			Number.isFinite(saved.resultsLimit)
				? Math.min(
						MAX_RESULTS_LIMIT,
						Math.max(MIN_RESULTS_LIMIT, Math.trunc(saved.resultsLimit)),
					)
				: DEFAULT_RESULTS_LIMIT,
	};
}

const KEY = "optimizerPreferences";
let state = {
	preferences: normalizeOptimizerPreferences(null),
	loaded: false,
	error: null as string | null,
};
const listeners = new Set<() => void>();
let started = false;
let saveQueue = Promise.resolve();
const emit = () => {
	for (const listener of listeners) listener();
};

function subscribe(listener: () => void) {
	listeners.add(listener);
	if (!started) {
		started = true;
		void (async () => {
			try {
				const saved = isTauri()
					? await readSetting<unknown>(KEY)
					: JSON.parse(localStorage.getItem(KEY) ?? "null");
				state = {
					preferences: normalizeOptimizerPreferences(saved),
					loaded: true,
					error: null,
				};
			} catch {
				state = {
					...state,
					loaded: true,
					error: "Could not load optimizer preferences.",
				};
			}
			emit();
		})();
	}
	return () => {
		listeners.delete(listener);
	};
}

export function updateOptimizerPreferences(
	patch: Partial<OptimizerPreferences>,
) {
	if (!state.loaded) return;
	const preferences = normalizeOptimizerPreferences({
		...state.preferences,
		...patch,
	});
	state = { preferences, loaded: true, error: null };
	emit();
	saveQueue = saveQueue.then(async () => {
		try {
			if (isTauri()) await writeSetting(KEY, preferences);
			else localStorage.setItem(KEY, JSON.stringify(preferences));
		} catch {
			state = {
				...state,
				error:
					"Could not save optimizer preferences. Changes apply until the app closes.",
			};
			emit();
		}
	});
}

export function useOptimizerPreferences() {
	return useSyncExternalStore(
		subscribe,
		() => state,
		() => state,
	);
}
