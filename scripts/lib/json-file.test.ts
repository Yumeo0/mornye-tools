import { expect, test } from "bun:test";
import {
	mkdtemp,
	readdir,
	readFile,
	rmdir,
	stat,
	unlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rewriteJsonFile } from "./json-file";

async function withCatalog(run: (path: string) => Promise<void>) {
	const directory = await mkdtemp(join(tmpdir(), "mornye-catalog-"));
	const path = join(directory, "character_data.json");
	try {
		await run(path);
		expect(await readdir(directory)).toEqual(["character_data.json"]);
	} finally {
		for (const name of await readdir(directory))
			await unlink(join(directory, name));
		await rmdir(directory);
	}
}

async function withWindowsReadLock(
	path: string,
	run: (release: () => void) => Promise<void>,
) {
	const locker = Bun.spawn(
		[
			"powershell.exe",
			"-NoProfile",
			"-NonInteractive",
			"-Command",
			"$catalogLock = [System.IO.File]::Open($env:MORNYE_TEST_CATALOG, 'Open', 'Read', 'Read'); [Console]::Out.WriteLine('locked'); [Console]::Out.Flush(); [Console]::In.ReadLine() | Out-Null; $catalogLock.Dispose()",
		],
		{
			env: { ...process.env, MORNYE_TEST_CATALOG: path },
			stdin: "pipe",
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const reader = locker.stdout.getReader();
	try {
		const ready = await reader.read();
		expect(new TextDecoder().decode(ready.value)).toContain("locked");
		await run(() => {
			locker.stdin.write("\n");
			locker.stdin.end();
		});
	} finally {
		reader.releaseLock();
		locker.kill();
		await locker.exited;
	}
}

test("catalogs read by Bun can be normalized and rewritten repeatedly without truncation", async () => {
	await withCatalog(async (path) => {
		const entries = Array.from({ length: 300 }, (_, id) => ({
			id,
			name: `Echo ${id} · Jué`,
			icon: `/wuwa-assets/${id}.webp`,
		}));
		await Bun.write(path, JSON.stringify(entries));
		const original = await Bun.file(path).json();
		await rewriteJsonFile<typeof entries>(
			path,
			(catalog) =>
				catalog.map((entry) => ({
					...entry,
					icon: `/images/${entry.id}.webp`,
				})),
			"\t",
		);
		const normalized = await Bun.file(path).json();
		expect(normalized).toHaveLength(entries.length);
		expect(normalized[299]).toEqual({
			...original[299],
			icon: "/images/299.webp",
		});
		await rewriteJsonFile<typeof entries>(
			path,
			(catalog) =>
				catalog.map((entry) => ({ ...entry, icon: "/images/canonical.webp" })),
			"\t",
		);
		const rewritten = JSON.parse(await readFile(path, "utf8"));
		expect(
			rewritten.every(
				(entry: { icon: string }) => entry.icon === "/images/canonical.webp",
			),
		).toBe(true);
		expect(await readFile(path, "utf8")).toEndWith("\n");
	});
});

test("an unchanged catalog is not replaced", async () => {
	await withCatalog(async (path) => {
		await writeFile(path, '{"id":1}\n');
		const before = await stat(path);
		await rewriteJsonFile(path, (value) => value);
		const after = await stat(path);
		expect(after.ino).toBe(before.ino);
		expect(after.mtimeMs).toBe(before.mtimeMs);
	});
});

test("invalid JSON and failed transforms leave the previous catalog untouched", async () => {
	await withCatalog(async (path) => {
		await writeFile(path, "incomplete {");
		await expect(rewriteJsonFile(path, (value) => value)).rejects.toThrow();
		expect(await readFile(path, "utf8")).toBe("incomplete {");
		await writeFile(path, '{"id":1}\n');
		await expect(
			rewriteJsonFile(path, () => {
				throw new Error("invalid asset");
			}),
		).rejects.toThrow("invalid asset");
		expect(await readFile(path, "utf8")).toBe('{"id":1}\n');
	});
});

test.skipIf(process.platform !== "win32")(
	"catalog replacement retries a temporary Windows sharing lock",
	async () => {
		await withCatalog(async (path) => {
			await writeFile(path, '{"id":1}\n');
			await withWindowsReadLock(path, async (release) => {
				const timer = setTimeout(release, 150);
				try {
					await rewriteJsonFile<{ id: number }>(path, () => ({ id: 2 }));
					expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ id: 2 });
				} finally {
					clearTimeout(timer);
				}
			});
		});
	},
);

test.skipIf(process.platform !== "win32")(
	"a persistent sharing lock fails without changing the catalog or leaving temporary files",
	async () => {
		await withCatalog(async (path) => {
			await writeFile(path, '{"id":1}\n');
			await withWindowsReadLock(path, async () => {
				await expect(
					rewriteJsonFile<{ id: number }>(path, () => ({ id: 2 })),
				).rejects.toThrow();
				expect(await readFile(path, "utf8")).toBe('{"id":1}\n');
			});
		});
	},
);
