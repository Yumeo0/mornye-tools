import {
	evaluate,
	resolveRotationStats,
} from "../src/lib/calc/riley/engine.generated.js";
import { measureRotationDamage } from "../src/lib/calc/rotationDamage";
import type { TeamProfile } from "../src/lib/calc/types";

// Every trial's unmet conditions are returned as structured diagnostics in the
// final score. Avoid repeating upstream's warning for every stat combination.
console.warn = () => {};

// Each worker owns an isolated Riley engine; its ambient state is never shared.
self.onmessage = (event: MessageEvent<TeamProfile>) => {
	const profile = event.data;
	self.postMessage({
		id: profile.id,
		score: measureRotationDamage(profile, resolveRotationStats, evaluate),
	});
};
