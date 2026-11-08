// Copy the calculator core's live game data into the app's (gitignored)
// `public/data` so the core's default game-data source (`/data`) can load it
// without depending on the submodule at runtime. Workers use the same default
// source, so evaluation and optimizer workers resolve the same files.
//
// Wired into `postinstall`. Missing data is a hard error: the Account
// evaluation must not silently run against an empty catalog.

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(here);
const source = join(repoRoot, "thewuwacalculator", "public", "data", "live");
const target = join(repoRoot, "public", "data", "live");

if (!existsSync(source)) {
	console.error(
		`[sync-calc-data] missing ${source}; run the calculator submodule setup first.`,
	);
	process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

// Image publication is owned by copy_assets.ts; calculator sync only owns JSON data.

console.log(`[sync-calc-data] copied ${source} -> ${target}`);
