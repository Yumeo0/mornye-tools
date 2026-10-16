// Shared `settings.json` access: one cached Store handle plus small typed
// read/write helpers, so every settings surface does not hand-roll the
// `Store.load` -> get/set -> save ritual.

import { Store } from "@tauri-apps/plugin-store";

let storePromise: Promise<Store> | null = null;

function loadStore(): Promise<Store> {
	storePromise ??= Store.load("settings.json");
	return storePromise;
}

/** Read one setting; `undefined` when unset or unreadable (logged). */
export async function readSetting<T>(key: string): Promise<T | undefined> {
	try {
		const store = await loadStore();
		return (await store.get<T>(key)) ?? undefined;
	} catch (error) {
		console.error(`[settings] Failed to read "${key}":`, error);
		return undefined;
	}
}

/** Write one setting and persist it immediately; throws on failure. */
export async function writeSetting(key: string, value: unknown): Promise<void> {
	const store = await loadStore();
	await store.set(key, value);
	await store.save();
}
