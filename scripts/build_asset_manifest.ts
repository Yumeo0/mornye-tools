/**
 * Build Asset Manifest
 *
 * Scans the app for game image references and writes asset_manifest.json, the
 * exact list of source PNGs that copy_assets.ts publishes to ../public.
 *
 * Sources of truth:
 * - src/configs JSONs (compiled game data), restricted to the fields the UI
 *   actually renders. Dead fields (icon_head, icon_small, icon_portrait,
 *   icon_head_80/150/175, icon_head_circle, element_icon_128, the weapon item
 *   icon, ...) are ignored on purpose so their images stay out of the bundle.
 * - Literal /wuwa-assets/... paths in src (rarity gradients, weapon type
 *   glyphs, ...).
 * - The STAT_ASSETS map in src/lib/stats.ts (paths built with a template).
 *
 * Paths are stored relative to the wuwa-assets root with their source .png
 * extension; copy_assets.ts converts them to .webp when publishing.
 *
 * Run: bun scripts/build_asset_manifest.ts
 */

import { readdirSync } from "node:fs";
import { basename, join } from "node:path";

const SCRIPTS_DIR = import.meta.dirname;
const ROOT = join(SCRIPTS_DIR, "..");
const DATA_DIR = join(ROOT, "data");
const CONFIGS_DIR = join(ROOT, "src", "configs");
const SRC_DIR = join(ROOT, "src");
const ASSETS_ROOT = join(DATA_DIR, "wuwa-assets");
const MANIFEST_PATH = join(DATA_DIR, "asset_manifest.json");

// Config JSON fields whose icons are rendered by the app. Everything else in
// the compiled JSONs is dead weight and must not be copied to public.
const RENDERED_FIELDS = new Set([
	"chain_icons", // resonance chain node icons (IconDevice)
	"element_icon_round", // element glyphs on character cards (IconElementRound)
	"icon_head_256", // character portraits (IconRoleHead256)
	"icon_pile", // formation cards / team art (IconRolePile)
	"weapon_type_icon", // weapon type glyphs (Com/Icon)
	"echo_sets.icon", // sonata icons (IconElementAttri128 after transform)
	"icon_middle", // echo icons (IconMonsterGoods160)
	"categories.icon", // achievement category emblems
]);

// Literal reference scan: "..."-quoted /wuwa-assets paths in TS/TSX sources.
// Both .png and .webp are accepted so the scan works before and after the
// configs/TS sources are switched to the published .webp extension.
const LITERAL_REF_RE = /"(\/wuwa-assets\/[^"]+\.(?:png|webp))"/g;

// The stat icon paths in src/lib/stats.ts are built from a template, so parse
// the STAT_ASSETS map instead of looking for literal paths.
const STAT_ASSETS_RE = /const STAT_ASSETS[^=]*=\s*\{(.*?)\n\};/s;
const STAT_ASSET_VALUE_RE = /"[^"]+":\s*"([^"]+)"/g;

/** Mirror the runtime transform in EchoCard/CharactersTab/EchoesTab. */
function sonata128(path: string): string {
	return path.replaceAll(
		"IconElementAttri/T_IconElementAttri",
		"IconElementAttri128/T_IconElementAttri128_",
	);
}

function walkJson(value: unknown, path: string[], out: Set<string>): void {
	if (Array.isArray(value)) {
		for (const item of value) walkJson(item, [...path, "[]"], out);
		return;
	}
	if (value !== null && typeof value === "object") {
		for (const [key, child] of Object.entries(value)) {
			walkJson(child, [...path, key], out);
		}
		return;
	}
	if (typeof value === "string" && value.includes("/wuwa-assets/")) {
		const keyPath = path.filter((part) => part !== "[]").join(".");
		if (RENDERED_FIELDS.has(keyPath)) out.add(value);
	}
}

/** Every .ts/.tsx file under src, so the literal scan covers the whole UI. */
function sourceFiles(dir: string): string[] {
	const found: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			found.push(...sourceFiles(full));
		} else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
			found.push(full);
		}
	}
	return found.sort();
}

async function collectRefs(): Promise<string[]> {
	const refs = new Set<string>();

	for (const config of readdirSync(CONFIGS_DIR).sort()) {
		if (!config.endsWith(".json")) continue;
		walkJson(await Bun.file(join(CONFIGS_DIR, config)).json(), [], refs);
	}

	for (const source of sourceFiles(SRC_DIR)) {
		const text = await Bun.file(source).text();
		for (const match of text.matchAll(LITERAL_REF_RE)) refs.add(match[1]);
	}

	const statsSource = await Bun.file(join(SRC_DIR, "lib", "stats.ts")).text();
	const block = STAT_ASSETS_RE.exec(statsSource);
	if (!block) {
		console.log("✗ Could not find STAT_ASSETS in src/lib/stats.ts");
		process.exit(1);
	}
	for (const match of block[1].matchAll(STAT_ASSET_VALUE_RE)) {
		refs.add(
			`/wuwa-assets/UI/UIResources/Common/Image/IconAttribute/T_Iconproperty${match[1]}_UI.png`,
		);
	}

	// Runtime-rewritten paths (sonata icons resolve to the 128 folder) and
	// normalize back to the source .png extension used by the manifest.
	return [
		...new Set(
			[...refs].map((ref) =>
				sonata128(ref)
					.replace(/\.(?:png|webp)$/, ".png")
					.replace(/^\/wuwa-assets\//, ""),
			),
		),
	];
}

async function main(): Promise<string[]> {
	console.log("=".repeat(60));
	console.log("Build Asset Manifest");
	console.log("=".repeat(60));
	console.log();

	const files = (await collectRefs()).sort();

	// `Bun.file().exists()` is false for directories, which is exactly the test
	// this needs: every manifest entry has to be a real source file.
	const missing: string[] = [];
	for (const file of files) {
		if (!(await Bun.file(join(ASSETS_ROOT, file)).exists())) missing.push(file);
	}
	if (missing.length > 0) {
		console.log(
			`✗ ${missing.length} referenced assets are missing from ${ASSETS_ROOT}:`,
		);
		for (const file of missing.slice(0, 20)) console.log("  ", file);
		if (missing.length > 20)
			console.log(`   ... and ${missing.length - 20} more`);
		process.exit(1);
	}

	let totalBytes = 0;
	for (const file of files)
		totalBytes += Bun.file(join(ASSETS_ROOT, file)).size;
	await Bun.write(MANIFEST_PATH, `${JSON.stringify({ files }, null, "\t")}\n`);

	console.log(
		`✓ ${files.length} assets referenced (${(totalBytes / 1024 / 1024).toFixed(1)} MiB of PNGs)`,
	);
	console.log(`✓ Manifest written to ${basename(MANIFEST_PATH)}`);
	return files;
}

if (import.meta.main) await main();

export { main as buildAssetManifest };
