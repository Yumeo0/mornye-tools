import { isTauri } from "@tauri-apps/api/core";
import { type SetStateAction, useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { ZodType } from "zod";
import { readSetting, writeSetting } from "./settings";

interface StateStorage {
	read: () => Promise<unknown>;
	write: (value: unknown) => Promise<void>;
	onError: (error: unknown) => void;
}

export function restoreFilterState<T>(
	saved: unknown,
	initial: T,
	schema?: ZodType<T>,
): T {
	if (schema) {
		const result = schema.safeParse(saved);
		return result.success ? result.data : initial;
	}
	return saved != null && typeof saved === typeof initial
		? (saved as T)
		: initial;
}

/** One entry survives component unmounts and serializes writes across mounts. */
export function createPersistentState<T>(
	initial: T,
	parse: (value: unknown) => T,
	storage: StateStorage,
) {
	let value = initial;
	let changed = false;
	let loaded = false;
	let loading: Promise<void> | undefined;
	let saving = Promise.resolve();
	const listeners = new Set<() => void>();
	const emit = () => {
		for (const listener of listeners) listener();
	};
	const save = () => {
		const next = structuredClone(value);
		saving = saving.then(() => storage.write(next)).catch(storage.onError);
	};
	const load = () => {
		loading ??= (async () => {
			try {
				const saved = await storage.read();
				// An interaction during loading takes precedence over old disk state.
				if (!changed) value = parse(saved);
			} catch (error) {
				storage.onError(error);
			} finally {
				loaded = true;
				if (changed) save();
				emit();
			}
		})();
		return loading;
	};
	return {
		getSnapshot: () => value,
		subscribe(listener: () => void) {
			listeners.add(listener);
			void load();
			return () => {
				listeners.delete(listener);
			};
		},
		set(next: SetStateAction<T>) {
			value =
				typeof next === "function" ? (next as (prev: T) => T)(value) : next;
			changed = true;
			if (loaded) save();
			else void load();
			emit();
		},
		async flush() {
			await load();
			await saving;
		},
	};
}

// Keep writes to the shared settings file in order, even across filter entries.
let writes = Promise.resolve();
const entries = new Map<
	string,
	ReturnType<typeof createPersistentState<unknown>>
>();

/** Persistent UI preferences, independent of account data and packet routing. */
export function useFilterState<T>(
	key: string,
	initial: T,
	schema?: ZodType<T>,
): [T, (next: SetStateAction<T>) => void] {
	const storageKey = `filters.${key}`;
	if (!entries.has(storageKey)) {
		entries.set(
			storageKey,
			createPersistentState<unknown>(
				initial,
				(saved) => restoreFilterState(saved, initial, schema),
				{
					read: async () =>
						isTauri()
							? readSetting(storageKey)
							: JSON.parse(localStorage.getItem(storageKey) ?? "null"),
					write: (value) => {
						const write = writes.then(async () => {
							if (isTauri()) await writeSetting(storageKey, value);
							else localStorage.setItem(storageKey, JSON.stringify(value));
						});
						writes = write.catch(() => {});
						return write;
					},
					onError: (error) => {
						console.error(`[filters] Could not persist ${key}:`, error);
						toast.error("Filter preferences could not be loaded or saved", {
							id: "filter-preferences",
						});
					},
				},
			),
		);
	}
	const entry = entries.get(storageKey) as ReturnType<
		typeof createPersistentState<T>
	>;
	const value = useSyncExternalStore(
		entry.subscribe,
		entry.getSnapshot,
		entry.getSnapshot,
	);
	return [value, entry.set];
}
