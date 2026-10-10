// In-app calculator core bootstrap: host seams + game-data initialization.
//
// The core (`@wuwacalc/core`) is framework-free; this module installs the two
// host seams it expects (worker factory, game-data source) and loads the
// catalogs from the locally synced `public/data` (the core's default `/data`
// path, so calculation workers resolve the same data without extra config).

import {
	type CoreWorkerRole,
	configureCore,
	createFetchGameDataSource,
} from "@wuwacalc/core/data/coreEnvironment";
import { initGameData } from "@wuwacalc/core/data/gameData/index";

import EvaluationWorker from "@wuwacalc/core/engine/evaluation/buildEvaluation.worker?worker";
import OptimizerCompileWorker from "@wuwacalc/core/engine/optimizer/workers/compile.worker?worker";
import OptimizerTaskWorker from "@wuwacalc/core/engine/optimizer/workers/task.worker?worker";
import OptimizerTheoryWorker from "@wuwacalc/core/engine/optimizer/workers/theoryProducer.worker?worker";
import SuggestionsWorker from "@wuwacalc/core/engine/suggestions/worker?worker";

/** Worker roles mapped exactly like the calculator's `src/app/coreWorkers.ts`. */
const CORE_WORKERS: Record<CoreWorkerRole, () => Worker> = {
	evaluation: () => new EvaluationWorker(),
	suggestions: () => new SuggestionsWorker(),
	"optimizer-task": () => new OptimizerTaskWorker(),
	"optimizer-theory": () => new OptimizerTheoryWorker(),
	"optimizer-compile": () => new OptimizerCompileWorker(),
};

let configurePromise: Promise<void> | null = null;
let ready = false;

/**
 * Configure the core once and initialize the `live` game data. Missing data is
 * a hard error: evaluation must never silently run against an empty catalog.
 */
export function ensureCoreReady(): Promise<void> {
	if (configurePromise) return configurePromise;
	configureCore({
		createWorker: (role) => {
			const factory = CORE_WORKERS[role];
			if (!factory) {
				throw new Error(`No worker mapped for core role "${role}"`);
			}
			return factory();
		},
		gameData: createFetchGameDataSource({ baseUrl: "/data" }),
		shouldRetainGameData: () => true,
	});
	const promise = initGameData({ mode: "live" })
		.then(() => {
			ready = true;
		})
		.catch((error: unknown) => {
			configurePromise = null;
			throw error;
		});
	configurePromise = promise;
	return promise;
}

export function isCoreReady(): boolean {
	return ready;
}
