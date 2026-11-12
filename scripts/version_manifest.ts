/**
 * Shared writer for `data/VERSION.json`.
 *
 * Records the game release, asset release, data resource revision and protocol
 * release. The data compiler reads `game` and `data` from the upstream README;
 * other steps update only the input they consume.
 *
 * The file is edited in place rather than rebuilt, which keeps its key order
 * and 2-space formatting stable across runs.
 */

import { join } from "node:path";
import { dataLog } from "./lib/data-log";

const SCRIPTS_DIR = import.meta.dirname;
const REPO_ROOT = join(SCRIPTS_DIR, "..");
const VERSION_PATH = join(REPO_ROOT, "data", "VERSION.json");
const VERSION_LABELS: Record<string, string> = {
	game: "Game release",
	assets: "Asset game release",
	data: "Data resource revision",
	protos: "Protocol game release",
};

/**
 * Set one field of data/VERSION.json, reporting whether anything changed.
 *
 * `field` is the input's key and `source` is where the value came from, so the
 * log line says which checkout a version was read from.
 */
async function updateVersionField(
	field: string,
	version: string,
	source: string,
	manifestPath = VERSION_PATH,
): Promise<void> {
	const manifest = (await Bun.file(manifestPath).json()) as Record<
		string,
		string
	>;
	const label = VERSION_LABELS[field] ?? `${field} version`;

	if (manifest[field] === version) {
		dataLog.info(`${label}: ${version} (unchanged)`);
		return;
	}

	manifest[field] = version;
	await Bun.write(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	dataLog.info(`${label}: ${version} → VERSION.json`);
	dataLog.detail(`Version source: ${source}`);
}

export { updateVersionField };
