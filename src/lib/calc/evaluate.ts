// In-app evaluation via the core's evaluation worker.
//
// The Account tab translates its equipment into a runtime and asks the core for
// a build summary. All math stays in `@wuwacalc/core`; this module only frames
// the call.

import {
	combatScenarioId,
	teamMemberId,
} from "@wuwacalc/core/domain/entities/combatScenario";
import { DEF_ENEMY_PROF } from "@wuwacalc/core/domain/entities/enemy";
import type { ResRuntime } from "@wuwacalc/core/domain/entities/runtime";
import { runEvaluationSummary } from "@wuwacalc/core/engine/evaluation/buildEvaluationClient";
import type { EvaluationSummary } from "@wuwacalc/core/engine/evaluation/buildEvaluationWorkerTypes";

import { ensureCoreReady } from "@/lib/calc/core";

/**
 * Evaluate a translated runtime. Returns `null` when the core cannot produce a
 * score (the caller shows an actionable error instead). Pass the companion
 * runtimes so team effects are included in the baseline.
 */
export async function evaluateRuntime(
	runtime: ResRuntime,
	runtimesById: Record<string, ResRuntime> = {},
): Promise<EvaluationSummary | null> {
	await ensureCoreReady();
	return runEvaluationSummary({
		scenarioId: combatScenarioId("mny:account"),
		memberId: teamMemberId(runtime.id),
		runtime,
		enemy: DEF_ENEMY_PROF,
		runtimesById,
	});
}
