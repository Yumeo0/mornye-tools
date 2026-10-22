import { isTauri } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";
import { type Hotkey, parseHotkey } from "@/lib/hotkeys";
import { readSetting, writeSetting } from "@/lib/settings";

export const DEFAULT_MAP_COLLECTED_HOTKEY: Hotkey = {
	key: "c",
	ctrl: false,
	alt: false,
	shift: false,
	meta: false,
};
const SETTING = "mapCollectedHotkey";
let state = {
	hotkey: DEFAULT_MAP_COLLECTED_HOTKEY,
	loaded: false,
	error: null as string | null,
};
const listeners = new Set<() => void>();
let started = false;
let writes = Promise.resolve();
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
					? await readSetting<unknown>(SETTING)
					: JSON.parse(localStorage.getItem(SETTING) ?? "null");
				state = {
					hotkey: parseHotkey(saved) ?? DEFAULT_MAP_COLLECTED_HOTKEY,
					loaded: true,
					error: null,
				};
			} catch {
				state = {
					...state,
					loaded: true,
					error: "Could not load the map shortcut.",
				};
			}
			emit();
		})();
	}
	return () => {
		listeners.delete(listener);
	};
}

export function setMapCollectedHotkey(value: Hotkey) {
	const hotkey = parseHotkey(value);
	if (!state.loaded || !hotkey) return;
	state = { hotkey, loaded: true, error: null };
	emit();
	writes = writes.then(async () => {
		try {
			if (isTauri()) await writeSetting(SETTING, hotkey);
			else localStorage.setItem(SETTING, JSON.stringify(hotkey));
		} catch {
			state = {
				...state,
				error:
					"Could not save the map shortcut. It will apply until the app closes.",
			};
			emit();
		}
	});
}

export function useMapCollectedHotkey() {
	return useSyncExternalStore(
		subscribe,
		() => state,
		() => state,
	);
}
