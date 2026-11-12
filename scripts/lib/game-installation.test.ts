import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	findGameClient,
	selectGameClient,
	steamLibraries,
} from "./game-installation";

const temporary: string[] = [];
afterEach(async () => {
	for (const path of temporary.splice(0))
		await rm(path, { recursive: true, force: true });
});

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), "mornye-installation-"));
	temporary.push(root);
	const client = join(root, "Wuthering Waves Game", "Client");
	await mkdir(join(client, "Content", "Paks"), { recursive: true });
	return { root, client };
}

test("Steam library paths preserve spaces and unescape Windows paths", () => {
	expect(
		steamLibraries(
			String.raw`"libraryfolders" { "0" { "path" "D:\\Steam Library" } "1" { "path" "/mnt/games" } }`,
		),
	).toEqual(["D:\\Steam Library", "/mnt/games"]);
});

test("game, launcher and Client roots resolve to the same client", async () => {
	const { root, client } = await fixture();
	for (const path of [root, join(root, "Wuthering Waves Game"), client])
		expect(await findGameClient(path)).toBe(client);
	expect(await selectGameClient([root, client, join(root, "missing")])).toBe(
		client,
	);
});

test("ambiguous installs require an explicit selection", async () => {
	const first = await fixture();
	const second = await fixture();
	await expect(selectGameClient([first.root, second.root])).rejects.toThrow(
		"Multiple game installations",
	);
	expect(await findGameClient(second.root)).toBe(second.client);
});

test("missing installations and invalid explicit overrides fail clearly", async () => {
	const { root } = await fixture();
	await expect(selectGameClient([join(root, "missing")])).rejects.toThrow(
		"WUWA_GAME",
	);
	await expect(findGameClient(join(root, "missing"))).rejects.toThrow(
		"Invalid game directory",
	);
});
