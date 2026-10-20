import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

export interface PlayerPosition {
	playerId: number;
	mapId: number;
	x: number;
	y: number;
	z: number;
	yaw: number | null;
	observedAt: number;
}

/** Ephemeral movement stream, independent of the persisted account snapshot. */
export function usePlayerPosition(enabled: boolean) {
	const [position, setPosition] = useState<PlayerPosition | null>(null);
	useEffect(() => {
		if (!enabled || !isTauri()) return;
		let disposed = false;
		let receivedEvent = false;
		let unlisten: (() => void) | undefined;
		setPosition(null);
		const connect = async () => {
			const stop = await listen<PlayerPosition | null>(
				"player-position",
				({ payload }) => {
					if (disposed) return;
					receivedEvent = true;
					setPosition(payload);
				},
			);
			if (disposed) {
				stop();
				return;
			}
			unlisten = stop;
			const initial = await invoke<PlayerPosition | null>(
				"sniffer_get_player_position",
			);
			if (!disposed && !receivedEvent) setPosition(initial);
		};
		void connect().catch((error) =>
			console.error("Player position unavailable", error),
		);
		return () => {
			disposed = true;
			unlisten?.();
		};
	}, [enabled]);
	return enabled ? position : null;
}
