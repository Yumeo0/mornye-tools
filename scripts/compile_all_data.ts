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
 */

import { join } from "node:path";

import { compileBuildGuides } from "./compile_build_guides.ts";
import { compileCharacterData } from "./compile_character_data.ts";
import { compileEchoData } from "./compile_echo_data.ts";
import { compileEchoProps } from "./compile_echo_props.ts";
import { compileWeaponData } from "./compile_weapon_data.ts";
import { compileMapData } from "./compile-map-data.ts";
import { compileProgressionData } from "./compile-progression-data.ts";
import { copyAssets } from "./copy_assets.ts";
import { updateVersionField } from "./version_manifest.ts";

const SCRIPTS_DIR = import.meta.dirname;
const REPO_ROOT = join(SCRIPTS_DIR, "..");
// The wuwa-data checkout states the versions it was cut from in its README.
const WUWA_DATA_README = join(REPO_ROOT, "data", "wuwa-data", "README.md");

/** Point this repository's manifest at the wuwa-data release being compiled. */
async function syncDataVersion(): Promise<void> {
	const readme = await Bun.file(WUWA_DATA_README)
		.text()
		.catch(() => null);
	// The README line is "> Resource Version: 3.7.8</br>", so match the version
	// shape rather than \S+, which would swallow the tag.
	const version = readme?.match(/^> Resource Version: (\d+(?:\.\d+)+)/m)?.[1];

	if (!version) {
		console.warn(
			`warning: no "Resource Version" in ${WUWA_DATA_README}; VERSION.json left unchanged.`,
		);
		return;
	}

	await updateVersionField("data", version, WUWA_DATA_README);
}

async function main(): Promise<void> {
	console.log("=".repeat(60));
	console.log("Compile All Game Data");
	console.log("=".repeat(60));
	console.log();

	await syncDataVersion();
	console.log();

	try {
		console.log("Starting Echo Data Compilation...");
		console.log("-".repeat(60));
		await compileEchoData();
		console.log();
	} catch (error) {
		console.log(`Error compiling echo data: ${error}`);
		process.exit(1);
	}

	try {
		console.log("Starting Character Data Compilation...");
		console.log("-".repeat(60));
		await compileCharacterData();
		console.log();
	} catch (error) {
		console.log(`Error compiling character data: ${error}`);
		process.exit(1);
	}

	try {
		console.log("Starting Echo Props Compilation...");
		console.log("-".repeat(60));
		await compileEchoProps();
		console.log();
	} catch (error) {
		console.log(`Error compiling echo props: ${error}`);
		process.exit(1);
	}

	try {
		console.log("Starting Weapon Data Compilation...");
		console.log("-".repeat(60));
		await compileWeaponData();
		console.log();
	} catch (error) {
		console.log(`Error compiling weapon data: ${error}`);
		process.exit(1);
	}

	try {
		console.log("Starting Build Guide Compilation...");
		console.log("-".repeat(60));
		await compileBuildGuides();
		console.log();
	} catch (error) {
		// tethys.gg is a third party on its own schedule, so an outage or a
		// changed page there must not discard the configs and assets that have
		// already been rebuilt from the checkouts.
		console.warn(`warning: build guides not updated: ${error}`);
	}

	await compileMapData();
	await compileProgressionData();

	try {
		console.log("Copying Assets to Public Folder...");
		console.log("-".repeat(60));
		await copyAssets();
		console.log();
	} catch (error) {
		console.log(`Error copying assets: ${error}`);
		process.exit(1);
	}

	console.log("=".repeat(60));
	console.log("✓ All data compilation and asset copying complete!");
	console.log("=".repeat(60));
}

if (import.meta.main) await main();

export { main as compileAllData, syncDataVersion };
