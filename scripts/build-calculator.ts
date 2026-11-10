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
