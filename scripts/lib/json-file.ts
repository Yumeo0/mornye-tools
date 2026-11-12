import { randomUUID } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";

/** Windows scanners/watchers can briefly prevent replacing an otherwise writable file. */
async function retryFileOperation<T>(operation: () => Promise<T>): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await operation();
		} catch (error) {
			if (
				process.platform !== "win32" ||
				attempt >= 4 ||
				!error ||
				typeof error !== "object" ||
				!("code" in error) ||
				!["EACCES", "EBUSY", "EPERM", "EUNKNOWN", "UNKNOWN"].includes(
					String(error.code),
				)
			)
				throw error;
			await setTimeout(50 * 2 ** attempt);
		}
	}
}

/**
 * Read with a closed Node handle and replace instead of truncating the input.
 * Bun's read/write path can fail with EUNKNOWN on Windows when a catalog is
 * rewritten during publication. An unchanged catalog needs no write at all.
 */
export async function rewriteJsonFile<T>(
	path: string,
	transform: (value: T) => T,
	indent?: string,
): Promise<void> {
	const previous = await retryFileOperation(() => readFile(path, "utf8"));
	const next = `${JSON.stringify(transform(JSON.parse(previous)), null, indent)}\n`;
	if (next === previous) return;
	const temporary = `${path}.${randomUUID()}.tmp`;
	try {
		await writeFile(temporary, next, { flag: "wx" });
		await retryFileOperation(() => rename(temporary, path));
	} finally {
		await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
			if (error.code !== "ENOENT") throw error;
		});
	}
}
