import { expect, spyOn, test } from "bun:test";
import {
	mkdir,
	mkdtemp,
	readFile,
	rmdir,
	unlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncDataVersion } from "./compile_all_data";

const originalManifest = {
	game: "3.7.0",
	data: "3.7.8",
	assets: "3.8.0",
	protos: "3.7.0",
};
const readme = (game: string, resources: string) =>
	`# WW_Data\r\n> Game Version: ${game}</br>\r\n> Resource Version: ${resources}</br>\r\n`;

async function withVersions(
	dataReadme: string,
	assets: string,
	run: (root: string) => Promise<void>,
) {
	const root = await mkdtemp(join(tmpdir(), "mornye-data-versions-"));
	const data = join(root, "data");
	const tables = join(data, "wuwa-data");
	const artwork = join(data, "wuwa-assets");
	await mkdir(tables, { recursive: true });
	await mkdir(artwork);
	const files = [
		join(tables, "README.md"),
		join(artwork, "VERSION.json"),
		join(data, "VERSION.json"),
	];
	try {
		await writeFile(files[0], dataReadme);
		await writeFile(files[1], JSON.stringify({ game: assets }));
		await writeFile(files[2], JSON.stringify(originalManifest));
		await run(root);
	} finally {
		for (const file of files) await unlink(file);
		for (const directory of [tables, artwork, data, root])
			await rmdir(directory);
	}
}

test("game releases and resource revisions are synced separately without relabeling protocols", async () => {
	const warning = spyOn(console, "warn").mockImplementation(() => {});
	try {
		await withVersions(readme("3.8.0", "3.8.4"), "3.8.0", async (root) => {
			await syncDataVersion(root);
			expect(
				JSON.parse(await readFile(join(root, "data/VERSION.json"), "utf8")),
			).toEqual({
				...originalManifest,
				game: "3.8.0",
				data: "3.8.4",
			});
			expect(warning).not.toHaveBeenCalled();
		});
	} finally {
		warning.mockRestore();
	}
});

test("a stale data release warns about upstream sources before compiling", async () => {
	const warning = spyOn(console, "warn").mockImplementation(() => {});
	try {
		await withVersions(readme("3.7.0", "3.7.8"), "3.8.0", async (root) => {
			await syncDataVersion(root);
			const output = warning.mock.calls.flat().join("\n");
			expect(output).toContain(
				"Game data targets 3.7.0, but assets target 3.8.0",
			);
			expect(output).toContain("Upstream sources");
			expect(output).toContain("bun run update:data");
		});
	} finally {
		warning.mockRestore();
	}
});

test("missing upstream version metadata does not overwrite the manifest", async () => {
	const warning = spyOn(console, "warn").mockImplementation(() => {});
	try {
		await withVersions("# no release metadata", "3.8.0", async (root) => {
			await syncDataVersion(root);
			expect(
				JSON.parse(await readFile(join(root, "data/VERSION.json"), "utf8")),
			).toEqual(originalManifest);
			expect(warning.mock.calls.flat().join("\n")).toContain(
				"VERSION.json left unchanged",
			);
		});
	} finally {
		warning.mockRestore();
	}
});
