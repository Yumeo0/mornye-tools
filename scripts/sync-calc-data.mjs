// Copy the calculator core's live game data into the app's (gitignored)
// `public/calc-data` so `createFetchGameDataSource({ baseUrl: '/calc-data' })`
// can load it without depending on the submodule at runtime.
//
// Wired into `predev`/`prebuild`. Missing data is a hard error: the Account
// evaluation must not silently run against an empty catalog.

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(here);
const source = join(repoRoot, "thewuwacalculator", "public", "data", "live");
const target = join(repoRoot, "public", "calc-data", "live");

if (!existsSync(source)) {
	console.error(
		`[sync-calc-data] missing ${source}; run the calculator submodule setup first.`,
	);
	process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

// Weapon icons (`{item_id}.webp`) power the Inventory weapons view. Missing
// icons only degrade presentation, so this is a warning rather than an error.
const iconsSource = join(
	repoRoot,
	"thewuwacalculator",
	"public",
	"assets",
	"game",
	"weapons",
	"icons",
);
const iconsTarget = join(repoRoot, "public", "calc-data", "weapon-icons");

if (existsSync(iconsSource)) {
	rmSync(iconsTarget, { recursive: true, force: true });
	mkdirSync(iconsTarget, { recursive: true });
	cpSync(iconsSource, iconsTarget, { recursive: true });
} else {
	console.warn(
		`[sync-calc-data] missing ${iconsSource}; weapon icons skipped.`,
	);
}

console.log(`[sync-calc-data] copied ${source} -> ${target}`);
