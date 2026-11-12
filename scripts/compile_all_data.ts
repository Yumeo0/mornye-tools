/**
 * Compile All Data
 *
 * Runs every config compiler against the wuwa-data checkout, then publishes the
 * referenced assets from the wuwa-assets checkout to the public folder. This is
 * what copies those checkouts into the app.
 *
 * Build guides come from tethys.gg rather than a checkout, so that step needs
 * the network and follows the site's own update schedule.
 *
 * Run: bun scripts/compile_all_data.ts
 * Add --verbose to show per-item/compiler diagnostics.
 */

import { join } from "node:path";

import { compileBuildGuides } from "./compile_build_guides.ts";
import { compileCharacterData } from "./compile_character_data.ts";
import { compileEchoData } from "./compile_echo_data.ts";
import { compileEchoProps } from "./compile_echo_props.ts";
import { compileEchoUpgrade } from "./compile_echo_upgrade.ts";
import { compileInventoryData } from "./compile_inventory_data.ts";
import { compileProfileData } from "./compile_profile_data.ts";
import { compileWeaponData } from "./compile_weapon_data.ts";
import { compileCharacterPanel } from "./compile-character-panel.ts";
import { compileMapData } from "./compile-map-data.ts";
import { compilePreviewData } from "./compile-preview-data.ts";
import { compileProgressionData } from "./compile-progression-data.ts";
import { compileRotationDamage } from "./compile-rotation-damage.ts";
import { copyAssets } from "./copy_assets.ts";
import { type DataStage, dataLog, runDataStages } from "./lib/data-log.ts";
import { updateVersionField } from "./version_manifest.ts";

const SCRIPTS_DIR = import.meta.dirname;
const REPO_ROOT = join(SCRIPTS_DIR, "..");
/** Point this repository's manifest at the wuwa-data release being compiled. */
async function syncDataVersion(repoRoot = REPO_ROOT): Promise<void> {
	const readmePath = join(repoRoot, "data/wuwa-data/README.md");
	const manifestPath = join(repoRoot, "data/VERSION.json");
	const readme = await Bun.file(readmePath)
		.text()
		.catch(() => null);
	// Game releases and resource revisions are separate upstream values. Match
	// version numbers without swallowing the README's trailing </br> markup.
	const game = readme?.match(/^> Game Version: (\d+(?:\.\d+)+)/m)?.[1];
	const resources = readme?.match(/^> Resource Version: (\d+(?:\.\d+)+)/m)?.[1];

	if (!game || !resources) {
		dataLog.warn(
			`Missing game/resource versions in ${readmePath}; VERSION.json left unchanged.`,
		);
		return;
	}

	await updateVersionField("game", game, readmePath, manifestPath);
	await updateVersionField("data", resources, readmePath, manifestPath);
	const assetVersion: { game?: string } | null = await Bun.file(
		join(repoRoot, "data/wuwa-assets/VERSION.json"),
	)
		.json()
		.catch(() => null);
	if (!assetVersion?.game) {
		dataLog.warn(
			"Asset game release is unavailable; could not compare data and artwork versions.",
		);
		return;
	}
	dataLog.info(`Asset game release: ${assetVersion.game}`);
	const release = (version: string) => version.split(".").slice(0, 2).join(".");
	if (release(game) !== release(assetVersion.game))
		dataLog.warn(
			`Game data targets ${game}, but assets target ${assetVersion.game}. Upstream sources may still be updating; run bun run update:data again when both sources are current.`,
		);
}

export function gameDataStages(): DataStage[] {
	return [
		{ name: "Source versions", run: () => syncDataVersion() },
		{ name: "Echo upgrades", run: compileEchoUpgrade },
		{ name: "Inventory", run: compileInventoryData },
		{ name: "Echoes", run: compileEchoData },
		{ name: "Characters", run: compileCharacterData },
		{ name: "Character panel stats", run: compileCharacterPanel },
		{ name: "Echo properties", run: compileEchoProps },
		{ name: "Weapons", run: compileWeaponData },
		{
			name: "Build guides · tethys.gg",
			run: compileBuildGuides,
			onFailure: "Build guides not updated; keeping bundled guides.",
		},
		{ name: "Map", run: compileMapData },
		{ name: "Progression", run: compileProgressionData },
		{ name: "Profile portraits", run: compileProfileData },
		{ name: "Rotation damage", run: compileRotationDamage },
		{
			name: "Preview data · Nanoka",
			run: compilePreviewData,
			onFailure: "Preview data not updated; keeping bundled previews.",
		},
		{ name: "Publish assets", run: copyAssets },
	];
}

async function main({
	verbose = Bun.argv.includes("--verbose"),
} = {}): Promise<void> {
	await runDataStages(gameDataStages(), { verbose });
}

if (import.meta.main) await main();

export { main as compileAllData, syncDataVersion };
