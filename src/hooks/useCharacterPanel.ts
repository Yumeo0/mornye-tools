import { useEffect, useState } from "react";
import SimulationWorker from "@/lib/calc/simulation.worker?worker";
import type {
	CharacterPanelRequest,
	CharacterPanelResult,
} from "@/lib/characterPanel";

export function useCharacterPanel(input: CharacterPanelRequest | null) {
	const [state, setState] = useState<{
		input: CharacterPanelRequest | null;
		value: CharacterPanelResult | null;
		error: string | null;
	}>({ input: null, value: null, error: null });
	useEffect(() => {
		if (!input) return;
		const worker = new SimulationWorker();
		worker.onmessage = (event) => {
			setState({
				input,
				value: event.data.kind === "character-panel" ? event.data.value : null,
				error: event.data.kind === "error" ? event.data.message : null,
			});
			worker.terminate();
		};
		worker.onerror = (event) => {
			setState({ input, value: null, error: event.message });
			worker.terminate();
		};
		worker.postMessage({ kind: "character-panel", input });
		return () => worker.terminate();
	}, [input]);
	return state.input === input ? state : { value: null, error: null };
}
