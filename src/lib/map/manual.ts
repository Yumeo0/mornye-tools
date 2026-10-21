import { isTauri } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { useCallback, useEffect, useRef, useState } from "react";
import { type ManualMapMarks, parseManualMarks } from "./collection";
import { mergeImportedMarks } from "./ghzs";
import type { ExplorationSnapshot, MapReward } from "./types";

let file: Promise<Store> | undefined;
const store = () =>
	(file ??= Store.load("map-markers.json", {
		autoSave: false,
		defaults: {},
	}).catch((cause) => {
		file = undefined;
		throw cause;
	}));
const EMPTY: ManualMapMarks = {};
// Imports and map details share progress while both surfaces stay mounted.
const subscribers = new Set<(playerId: number) => void>();

/** Manual progress is separate from sniffer-owned account.json and scoped to the game account. */
export function useManualMapMarks(playerId: number) {
	const [data, setData] = useState<{
		playerId: number;
		marks: ManualMapMarks;
		ready: boolean;
	}>({ playerId, marks: {}, ready: false });
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const current = useRef(playerId);
	current.current = playerId;
	const busy = useRef(false);
	const key = `account:${playerId}`;
	const load = useCallback(async () => {
		setError(null);
		try {
			const raw = isTauri()
				? await (await store()).get(key)
				: JSON.parse(localStorage.getItem(`map-markers:${key}`) ?? "null");
			if (current.current === playerId)
				setData({ playerId, marks: parseManualMarks(raw), ready: true });
		} catch (e) {
			if (current.current === playerId)
				setError(`Could not load manual markers: ${String(e)}`);
		}
	}, [key, playerId]);
	useEffect(() => {
		void load();
	}, [load]);
	useEffect(() => {
		const refresh = (changedPlayerId: number) => {
			if (changedPlayerId === playerId) void load();
		};
		subscribers.add(refresh);
		return () => {
			subscribers.delete(refresh);
		};
	}, [load, playerId]);
	const ready = data.playerId === playerId && data.ready;
	const marks = data.playerId === playerId ? data.marks : EMPTY;
	const write = async (next: ManualMapMarks) => {
		if (!ready || busy.current || current.current !== playerId) return false;
		busy.current = true;
		setSaving(true);
		setError(null);
		try {
			if (isTauri()) {
				const target = await store();
				if (current.current !== playerId) return false;
				await target.set(key, next);
				await target.save();
			} else localStorage.setItem(`map-markers:${key}`, JSON.stringify(next));
			if (current.current === playerId)
				setData({ playerId, marks: next, ready: true });
			for (const notify of subscribers) notify(playerId);
			return true;
		} catch (e) {
			if (current.current === playerId)
				setError(`Could not save manual marker: ${String(e)}`);
			return false;
		} finally {
			busy.current = false;
			setSaving(false);
		}
	};
	const setCollected = (marker: string, collected: boolean, after = 0) =>
		write({
			...marks,
			[marker]: { collected, updatedAt: Math.max(Date.now(), after + 1) },
		});
	return {
		marks,
		ready,
		saving,
		error,
		setCollected,
		mergeCollected: (rewards: MapReward[], snapshot: ExplorationSnapshot) => {
			if (
				playerId <= 0 ||
				(snapshot.playerId !== 0 && snapshot.playerId !== playerId)
			)
				return Promise.resolve(false);
			return write(mergeImportedMarks(marks, rewards, snapshot));
		},
	};
}
