// Build the in-app calculator core (@wuwacalc/core) from the
// `thewuwacalculator` submodule so `file:` resolution and workers work.
//
// Wired into `predev`/`prebuild`. Installs the submodule's workspace
// dependencies if missing, then builds `packages/core` (tsc + tsc-alias +
// asset copy). Fails loudly: the calculator is an in-app requirement, not an
// optional extra.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(here);
const submodule = join(repoRoot, "thewuwacalculator");
const coreDir = join(submodule, "packages", "core");
const coreDist = join(coreDir, "dist");

if (!existsSync(submodule)) {
	console.error(
		"[build-calc-core] submodule thewuwacalculator is missing; run `git submodule update --init`.",
	);
	process.exit(1);
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(args) {
	console.log(`[build-calc-core] ${npm} ${args.join(" ")}`);
	const result = spawnSync(npm, args, {
		cwd: submodule,
		stdio: "inherit",
		shell: process.platform === "win32",
	});
	if (result.status !== 0) {
		console.error(`[build-calc-core] command failed: npm ${args.join(" ")}`);
		process.exit(result.status ?? 1);
	}
}

if (!existsSync(join(submodule, "node_modules"))) {
	// The submodule has no committed lockfile, so `npm install` (not `npm ci`).
	run(["install", "--no-audit", "--no-fund"]);
}

run(["run", "build", "-w", "packages/core"]);

if (!existsSync(coreDist)) {
	console.error(
		"[build-calc-core] build finished but packages/core/dist is missing",
	);
	process.exit(1);
}

// `file:` dependencies are installed as hardlinked copies (not symlinks), so
// files added to the built dist after `bun install` are missing from
// node_modules. Replace the installed dist with the freshly built one.
const installedDist = join(
	repoRoot,
	"node_modules",
	"@wuwacalc",
	"core",
	"dist",
);
if (existsSync(installedDist)) {
	console.log(
		"[build-calc-core] syncing dist into node_modules/@wuwacalc/core",
	);
	rmSync(installedDist, { recursive: true, force: true });
	cpSync(coreDist, installedDist, { recursive: true });
}

console.log("[build-calc-core] @wuwacalc/core built");
