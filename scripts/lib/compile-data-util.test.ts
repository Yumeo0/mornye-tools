import { expect, test } from "bun:test";
import { mkdtemp, readdir, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadJsonTable } from "./compile-data-util";

async function withTable(
	run: (directory: string, path: string) => Promise<void>,
) {
	const directory = await mkdtemp(join(tmpdir(), "mornye-table-"));
	try {
		await run(directory, join(directory, "levelentityconfig.json"));
	} finally {
		for (const name of await readdir(directory))
			await unlink(join(directory, name));
		await rmdir(directory);
	}
}

test("single-file tables remain supported and take precedence over stray shards", async () => {
	await withTable(async (directory, path) => {
		await writeFile(path, '[{"EntityId":42}]');
		await writeFile(
			join(directory, "levelentityconfig_1.json"),
			'[{"EntityId":99}]',
		);
		expect(await loadJsonTable(path)).toEqual([{ EntityId: 42 }]);
	});
});

test("numbered shards are combined in numeric order without including unrelated files", async () => {
	await withTable(async (directory, path) => {
		for (const id of [10, 2, 1])
			await writeFile(
				join(directory, `levelentityconfig_${id}.json`),
				JSON.stringify([{ EntityId: id }]),
			);
		await writeFile(
			join(directory, "levelentityconfig_notes.json"),
			"unrelated notes",
		);
		await writeFile(join(directory, "other_1.json"), "unrelated table");
		expect(await loadJsonTable(path)).toEqual([
			{ EntityId: 1 },
			{ EntityId: 2 },
			{ EntityId: 10 },
		]);
	});
});

test("missing tables and malformed shards fail instead of returning partial data", async () => {
	await withTable(async (directory, path) => {
		await expect(loadJsonTable(path)).rejects.toThrow(
			"No JSON table or numbered shards",
		);
		await writeFile(
			join(directory, "levelentityconfig_1.json"),
			'[{"EntityId":1}]',
		);
		await writeFile(join(directory, "levelentityconfig_2.json"), "{");
		await expect(loadJsonTable(path)).rejects.toThrow("Failed to load JSON");
		await writeFile(join(directory, "levelentityconfig_2.json"), "{}");
		await expect(loadJsonTable(path)).rejects.toThrow("Expected a JSON array");
	});
});
