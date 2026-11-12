// Bundle the pinned upstream source without editing it or importing its website.
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
if (!existsSync(join(root, "wuwa_calc/src/resonators/teams.ts"))) {
	throw new Error(
		"wuwa_calc is missing. Run git submodule update --init wuwa_calc, then bun install.",
	);
}
mkdirSync(join(root, "src/lib/calc/riley"), { recursive: true });
const result = await Bun.build({
	entrypoints: [join(root, "calculator/engine.ts")],
	target: "browser",
	format: "esm",
	minify: true,
	naming: "engine.generated.js",
	outdir: join(root, "src/lib/calc/riley"),
});
if (!result.success)
	throw new AggregateError(result.logs, "Calculator bundle failed");
console.log("Built pinned wuwa_calc simulation adapter");
// Public contracts for the generated JavaScript module.
await Bun.write(
	join(root, "src/lib/calc/riley/engine.generated.d.ts"),
	`import type {
	CharacterPanelRequest,
	CharacterPanelResult,
} from "../../characterPanel";
import type { CalculatorCatalog, Scenario, SimulationResult } from "../types";
export function getCatalog(): CalculatorCatalog;
export function evaluate(scenario: Scenario): SimulationResult;
export function evaluateFast(scenario: Scenario): SimulationResult;
export function resolveRotationStats(
	scenario: Scenario,
	targetId?: number,
): Scenario;
export function characterPanel(
	input: CharacterPanelRequest,
): CharacterPanelResult;
`,
);

// Stable across checkout line endings. Reference-score caches also depend on
// the app's scoring assumptions, not just the pinned upstream revision.
const hasher = new Bun.CryptoHasher("sha256");
hasher.update((await result.outputs[0]!.text()).replaceAll("\r\n", "\n"));
hasher.update(
	(
		await Bun.file(join(root, "src/lib/calc/rotationDamage.ts")).text()
	).replaceAll("\r\n", "\n"),
);
await Bun.write(
	join(root, "src/lib/calc/riley/reference.generated.json"),
	JSON.stringify({ revision: hasher.digest("hex") }),
);
