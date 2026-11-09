import { isTauri } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";
import { getStatus, type SnifferStatus } from "./sniffer";

interface Snapshot {
	status: SnifferStatus | null;
	error: string | null;
}

/** One non-overlapping poll shared by sidebar, diagnostics and error toasts. */
export function createSnifferMonitor(read: () => Promise<SnifferStatus>) {
	let snapshot: Snapshot = { status: null, error: null };
	const listeners = new Set<() => void>();
	let generation = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	async function poll(current: number) {
		let next: Snapshot;
		try {
			next = { status: await read(), error: null };
		} catch (error) {
			next = { status: snapshot.status, error: String(error) };
		}
		if (current !== generation || listeners.size === 0) return;
		snapshot = next;
		for (const listener of listeners) listener();
		timer = setTimeout(() => void poll(current), 2000);
	}
	return {
		getSnapshot: () => snapshot,
		subscribe(listener: () => void) {
			listeners.add(listener);
			if (listeners.size === 1) void poll(++generation);
			return () => {
				listeners.delete(listener);
				if (listeners.size === 0) {
					++generation;
					clearTimeout(timer);
				}
			};
		},
	};
}

const monitor = createSnifferMonitor(() => {
	if (!isTauri())
		return Promise.reject(
			"Packet capture is available in the desktop app. Start it with bun run tauri dev.",
		);
	return getStatus();
});

export function useSnifferStatus() {
	return useSyncExternalStore(
		monitor.subscribe,
		monitor.getSnapshot,
		monitor.getSnapshot,
	);
}
