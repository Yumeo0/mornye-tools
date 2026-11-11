import {
	evaluate,
	evaluateFast,
	getCatalog,
	resolveRotationStats,
} from "./riley/engine.generated.js";
import { measureRotationDamage } from "./rotationDamage";
import { searchInventory } from "./search";
import type { Scenario, SearchRequest, TeamProfile } from "./types";

// One request at a time: upstream uses an ambient mutable context. Cancellation
// terminates this worker, so a newly started run always has an isolated engine.
self.onmessage = async (
	event: MessageEvent<{
		kind: "catalog" | "evaluate" | "search" | "rotation-damage";
		input?: Scenario | SearchRequest;
		targetId?: number;
		profiles?: TeamProfile[];
	}>,
) => {
	try {
		if (event.data.kind === "catalog")
			self.postMessage({ kind: "catalog", value: getCatalog() });
		else if (event.data.kind === "evaluate")
			self.postMessage({
				kind: "evaluation",
				value: evaluate(
					resolveRotationStats(
						event.data.input as Scenario,
						event.data.targetId,
					),
				),
			});
		else if (event.data.kind === "rotation-damage") {
			for (const profile of event.data.profiles ?? []) {
				self.postMessage({
					kind: "rotation-damage",
					id: profile.id,
					value: measureRotationDamage(profile, resolveRotationStats, evaluate),
				});
			}
			self.postMessage({ kind: "done" });
		} else {
			const request = event.data.input as SearchRequest;
			if (
				request.scenario.members.find((m) => m.characterId === request.targetId)
					?.echoSource === "rotation"
			)
				throw new Error("The optimization target must use owned echoes.");
			const scenario = resolveRotationStats(request.scenario, request.targetId);
			const final = await searchInventory(
				{ ...request, scenario },
				evaluateFast,
				(update) => self.postMessage({ kind: "progress", value: update }),
				undefined,
				evaluate,
			);
			self.postMessage({ kind: "done", value: final });
		}
	} catch (error) {
		self.postMessage({
			kind: "error",
			message: error instanceof Error ? error.message : String(error),
			...(error instanceof Error && "rotationDiagnostic" in error
				? { diagnostic: error.rotationDiagnostic }
				: {}),
		});
	}
};
