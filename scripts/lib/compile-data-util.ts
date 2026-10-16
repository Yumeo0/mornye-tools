/**
 * Shared helpers of the data compilers (`compile_*_data.ts`): JSON loading
 * with their reporting, id indexing, cached directory listings and Unreal
 * asset-path conversion.
 */

import { readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

/** Load a JSON file, reporting the same failures the compilers always did. */
export async function loadJson<T>(filePath: string): Promise<T | null> {
	try {
		return (await Bun.file(filePath).json()) as T;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			console.log(`Error: File not found at ${filePath}`);
		} else {
			console.log(`Error: Failed to parse ${filePath}`);
		}
		return null;
	}
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
