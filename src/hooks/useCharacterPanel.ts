import { useEffect, useMemo, useState } from "react";
import SimulationWorker from "@/lib/calc/simulation.worker?worker";
import type {
	CharacterPanelRequest,
	CharacterPanelResult,
} from "@/lib/characterPanel";

// Include all captured equipment and progression in the key so changed builds
// and profiles can never reuse stale stats. Bound memory across long sessions.
const panels = new Map<string, CharacterPanelResult>();
const cacheLimit = 100;
const emptyPanel = { value: null, error: null };

export function useCharacterPanel(input: CharacterPanelRequest | null) {
	const key = useMemo(() => (input ? JSON.stringify(input) : null), [input]);
	const [state, setState] = useState<{
		key: string | null;
		value: CharacterPanelResult | null;
		error: string | null;
	}>({ key: null, ...emptyPanel });
	useEffect(() => {
		if (!key || panels.has(key)) return;
		let active = true;
		const worker = new SimulationWorker();
		worker.onmessage = (event) => {
			if (!active) return;
			const value =
				event.data.kind === "character-panel" ? event.data.value : null;
			if (value) {
				panels.set(key, value);
				if (panels.size > cacheLimit) {
					const oldest = panels.keys().next().value;
					if (oldest !== undefined) panels.delete(oldest);
				}
			}
			setState({
				key,
				value,
				error: event.data.kind === "error" ? event.data.message : null,
			});
			worker.terminate();
		};
		worker.onerror = (event) => {
			if (!active) return;
			setState({ key, value: null, error: event.message });
			worker.terminate();
		};
		worker.postMessage({ kind: "character-panel", input: JSON.parse(key) });
		return () => {
			active = false;
			worker.terminate();
		};
	}, [key]);
	const cached = key ? panels.get(key) : undefined;
	return cached
		? { value: cached, error: null }
		: state.key === key
			? state
			: emptyPanel;
}
