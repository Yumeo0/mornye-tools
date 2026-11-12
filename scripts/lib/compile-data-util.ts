/**
 * Shared helpers of the data compilers (`compile_*_data.ts`): JSON loading,
 * id indexing, cached directory listings and Unreal
 * asset-path conversion.
 */

import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";

/** Required inputs must fail the stage instead of silently keeping stale data. */
export async function loadJson<T>(filePath: string): Promise<T> {
	try {
		return (await Bun.file(filePath).json()) as T;
	} catch (error) {
		throw new Error(`Failed to load JSON: ${filePath}`, { cause: error });
	}
}

/** Released tables can be a single JSON array or numbered shards (3.8+ entities). */
export async function loadJsonTable<T>(filePath: string): Promise<T[]> {
	const directory = dirname(filePath);
	const stem = basename(filePath, ".json");
	const paths = existsSync(filePath)
		? [filePath]
		: readdirSync(directory)
				.filter(
					(name) =>
						name.startsWith(`${stem}_`) &&
						/^\d+\.json$/.test(name.slice(stem.length + 1)),
				)
				.sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
				.map((name) => join(directory, name));
	if (!paths.length)
		throw new Error(`No JSON table or numbered shards found for ${filePath}`);
	const rows: T[] = [];
	// The entity shards are large; read sequentially and avoid spreading their
	// rows as function arguments, which exceeds the JS argument limit.
	for (const path of paths) {
		const part = await loadJson<unknown>(path);
		if (!Array.isArray(part))
			throw new Error(`Expected a JSON array in ${path}`);
		for (const row of part) rows.push(row);
	}
	return rows;
}

/**
 * Index entries by a key.
 *
 * The first entry wins, matching the linear scans this replaces.
 */
export function indexBy<T, K>(
	entries: T[],
	key: (entry: T) => K | undefined,
): Map<K, T> {
	const index = new Map<K, T>();
	for (const entry of entries) {
		const id = key(entry);
		if (id === undefined || id === null) continue;
		if (!index.has(id)) index.set(id, entry);
	}
	return index;
}

// Directory listings are stable for the duration of a run, so read each one once.
const directoryCache = new Map<string, string[]>();

export function listDirectory(dir: string): string[] {
	const cached = directoryCache.get(dir);
	if (cached) return cached;
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		entries = [];
	}
	directoryCache.set(dir, entries);
	return entries;
}

/**
 * Convert an Unreal Engine path to a published asset path.
 *
 * `/Game/Aki/UI/.../T_IconRoleHead256_1_UI.T_IconRoleHead256_1_UI`
 * becomes `/wuwa-assets/UI/.../T_IconRoleHead256_1_UI.webp`.
 */
export function unrealPathToRelative(
	unrealPath: string | null | undefined,
): string | null {
	if (!unrealPath) return null;
	let result = unrealPath.replace("/Game/Aki/", "");
	// Drop the duplicate asset name after the last dot.
	if (result.includes(".")) result = result.slice(0, result.lastIndexOf("."));
	return `/wuwa-assets/${result}.webp`;
}

/**
 * Some asset files have different capitalization than the data references, so
 * check the real directory listing and adopt the on-disk stem.
 */
export function fixFilePathCapitalization(
	relativePath: string | null,
	assetsPath: string,
): string | null {
	if (!relativePath) return null;

	const filePath = join(assetsPath, relativePath.replace("/wuwa-assets/", ""));
	const parentDir = join(filePath, "..");
	const extension = extname(filePath);
	const stem = basename(filePath, extension);

	// Compare file stems only: the published extension (.webp) differs from the
	// source files on disk (.png).
	for (const entry of listDirectory(parentDir)) {
		const entryExtension = extname(entry);
		if (basename(entry, entryExtension).toLowerCase() === stem.toLowerCase()) {
			const directory = relativePath.slice(0, relativePath.lastIndexOf("/"));
			return `${directory}/${basename(entry, entryExtension)}${extension}`;
		}
	}

	return relativePath;
}

/** [`unrealPathToRelative`] with the on-disk stem casing adopted. */
export function assetPath(
	unrealPath: string | null | undefined,
	assetsPath: string,
): string | null {
	return fixFilePathCapitalization(
		unrealPathToRelative(unrealPath),
		assetsPath,
	);
}
