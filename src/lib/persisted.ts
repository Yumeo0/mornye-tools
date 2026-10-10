// Persisted UI state: remembers per-tab settings (filters, selections, sort
// orders, …) across app restarts and reloads.
//
// Backed by the Tauri plugin-store (`ui-state.json`, same app-data directory
// as `settings.json`); falls back to localStorage when the plugin is
// unavailable (plain `vite dev` in a browser). Writes are debounced and
// flushed on page hide/unload as a best effort.

import { Store } from "@tauri-apps/plugin-store";
import { useCallback, useEffect, useRef, useState } from "react";

const STORE_FILE = "ui-state.json";
const LOCAL_KEY = "mornye-tools:ui-state";
const SAVE_DEBOUNCE_MS = 250;

type PersistedState = Record<string, unknown>;

let statePromise: Promise<PersistedState> | null = null;
let storeRef: Store | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const pendingSaves = new Map<string, unknown>();

function hasTauri(): boolean {
	return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function readLocalState(): PersistedState {
	try {
		const raw = window.localStorage.getItem(LOCAL_KEY);
		return raw ? (JSON.parse(raw) as PersistedState) : {};
	} catch {
		return {};
	}
}

function writeLocalState(entries: Array<[string, unknown]>): void {
	const state = readLocalState();
	for (const [key, value] of entries) state[key] = value;
	window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
}

function readState(): Promise<PersistedState> {
	statePromise ??= (async () => {
		if (!hasTauri()) return readLocalState();
		try {
			const store = await Store.load(STORE_FILE);
			storeRef = store;
			return Object.fromEntries(await store.entries<unknown>());
		} catch (error) {
			console.error("[persisted] store unavailable, using localStorage", error);
			return readLocalState();
		}
	})();
	return statePromise;
}

async function flushSaves(): Promise<void> {
	if (pendingSaves.size === 0) return;
	const entries = [...pendingSaves.entries()];
	pendingSaves.clear();
	if (hasTauri()) {
		try {
			const store = storeRef ?? (await Store.load(STORE_FILE));
			storeRef = store;
			for (const [key, value] of entries) {
				await store.set(key, value);
			}
			await store.save();
			return;
		} catch (error) {
			console.error("[persisted] store save failed, using localStorage", error);
		}
	}
	try {
		writeLocalState(entries);
	} catch (error) {
		console.error("[persisted] save failed", error);
	}
}

function scheduleSave(key: string, value: unknown): void {
	pendingSaves.set(key, value);
	if (saveTimer != null) return;
	saveTimer = setTimeout(() => {
		saveTimer = null;
		void flushSaves();
	}, SAVE_DEBOUNCE_MS);
}

// Flush pending writes when the page is hidden or unloaded so the state
// survives closing or reloading right after a change.
if (typeof window !== "undefined") {
	const flushNow = () => {
		if (saveTimer != null) {
			clearTimeout(saveTimer);
			saveTimer = null;
		}
		void flushSaves();
	};
	window.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") flushNow();
	});
	window.addEventListener("beforeunload", flushNow);
}

/** Resolves once the persisted state has been read (used to gate rendering). */
export function persistedReady(): Promise<void> {
	return readState().then(() => undefined);
}

/** Shared revivers for the per-tab revive guards. */
export function reviveString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

export function reviveBoolean(value: unknown, fallback = false): boolean {
	return typeof value === "boolean" ? value : fallback;
}

export function reviveStringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((entry): entry is string => typeof entry === "string")
		: [];
}

export function reviveNumberArray(value: unknown): number[] {
	return Array.isArray(value)
		? value.filter((entry): entry is number => typeof entry === "number")
		: [];
}

/**
 * State persisted across restarts. `revive` validates/coerces a saved value
 * onto the fallback shape so stale or malformed data cannot break a tab.
 */
export function usePersistedState<T>(
	key: string,
	fallback: T,
	revive?: (value: unknown) => T,
): [T, (update: T | ((previous: T) => T)) => void] {
	const [value, setValue] = useState<T>(fallback);
	const touchedRef = useRef(false);
	const reviveRef = useRef(revive);
	reviveRef.current = revive;

	// Hydrate once the persisted state is available. A change made before the
	// read completes wins (the user touched it first).
	useEffect(() => {
		let cancelled = false;
		touchedRef.current = false;
		void readState().then((state) => {
			if (cancelled || touchedRef.current || !(key in state)) return;
			const reviveNow = reviveRef.current;
			setValue(reviveNow ? reviveNow(state[key]) : (state[key] as T));
		});
		return () => {
			cancelled = true;
		};
	}, [key]);

	const update = useCallback(
		(update: T | ((previous: T) => T)) => {
			setValue((previous) => {
				const next =
					typeof update === "function"
						? (update as (previous: T) => T)(previous)
						: update;
				touchedRef.current = true;
				scheduleSave(key, next);
				return next;
			});
		},
		[key],
	);

	return [value, update];
}
