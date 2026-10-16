/**
 * Shared writer for `data/VERSION.json`.
 *
 * That file records the game version each pinned input was taken from
 * (`game`, `assets`, `data`, `protos`). Each input is refreshed by whichever
 * step consumes it, so every caller updates only its own field and leaves the
 * others alone.
 *
 * The file is edited in place rather than rebuilt, which keeps its key order
 * and 2-space formatting stable across runs.
 */

import { join } from "node:path";

const SCRIPTS_DIR = import.meta.dirname;
const REPO_ROOT = join(SCRIPTS_DIR, "..");
const VERSION_PATH = join(REPO_ROOT, "data", "VERSION.json");

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
): Promise<void> {
	const manifest = (await Bun.file(VERSION_PATH).json()) as Record<
		string,
		string
	>;

	if (manifest[field] === version) {
		console.log(`${field} version: ${version} (already current)`);
		return;
	}

	manifest[field] = version;
	await Bun.write(VERSION_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
	console.log(`${field} version: ${version} -> VERSION.json (from ${source})`);
}

export { updateVersionField };
