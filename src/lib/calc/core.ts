import SimulationWorker from "./simulation.worker?worker";
import type {
	CalculatorCatalog,
	RotationDiagnostic,
	Scenario,
	SearchRequest,
	SearchUpdate,
	SimulationResult,
} from "./types";

let catalog: CalculatorCatalog | null = null;
let pending: Promise<CalculatorCatalog> | null = null;
export function getCalculatorCatalog() {
	return catalog;
}
export function ensureCoreReady(): Promise<CalculatorCatalog> {
	if (catalog) return Promise.resolve(catalog);
	if (pending) return pending;
	pending = new Promise<CalculatorCatalog>((resolve, reject) => {
		const worker = new SimulationWorker();
		worker.onmessage = (event) => {
			worker.terminate();
			if (event.data.kind === "catalog") {
				catalog = event.data.value;
				resolve(catalog!);
			} else {
				pending = null;
				reject(new Error(event.data.message));
			}
		};
		worker.onerror = (event) => {
			worker.terminate();
			pending = null;
			reject(new Error(event.message));
		};
		worker.postMessage({ kind: "catalog" });
	});
	return pending;
}
export function startSearch(
	input: SearchRequest,
	onUpdate: (value: SearchUpdate) => void,
	onDone: (value: SearchUpdate) => void,
	onError: (message: string) => void,
): () => void {
	const worker = new SimulationWorker();
	worker.onmessage = (event) => {
		if (event.data.kind === "progress") onUpdate(event.data.value);
		else {
			worker.terminate();
			if (event.data.kind === "done") onDone(event.data.value);
			else onError(event.data.message);
		}
	};
	worker.onerror = (event) => {
		worker.terminate();
		onError(event.message);
	};
	worker.postMessage({ kind: "search", input });
	return () => worker.terminate();
}
export function evaluateScenario(
	input: Scenario,
	onResult: (
		result: SimulationResult | null,
		error: string | null,
		diagnostic?: RotationDiagnostic,
	) => void,
	targetId?: number,
): () => void {
	const worker = new SimulationWorker();
	worker.onmessage = (event) => {
		worker.terminate();
		onResult(
			event.data.kind === "evaluation" ? event.data.value : null,
			event.data.kind === "error" ? event.data.message : null,
			event.data.kind === "error" ? event.data.diagnostic : undefined,
		);
	};
	worker.onerror = (event) => {
		worker.terminate();
		onResult(null, event.message);
	};
	worker.postMessage({ kind: "evaluate", input, targetId });
	return () => worker.terminate();
}
