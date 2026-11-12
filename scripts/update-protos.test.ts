import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publishProtocol } from "./update-protos";

const temporary: string[] = [];
afterEach(async () => {
	await Promise.all(
		temporary
			.splice(0)
			.map((path) => rm(path, { recursive: true, force: true })),
	);
});

async function fixture(
	proto = 'syntax = "proto3"; message Probe { int32 Value = 9; }\n',
) {
	const directory = await mkdtemp(join(tmpdir(), "mornye-protos-"));
	temporary.push(directory);
	const source = join(directory, "source");
	const destination = join(directory, "snapshot");
	const version = join(directory, "VERSION.json");
	const ids = '{"25017":"Probe"}\n';
	const hash = (text: string) =>
		createHash("sha256").update(text).digest("hex");
	await Bun.write(join(source, "protos.proto"), proto);
	await Bun.write(join(source, "packetIds.json"), ids);
	await Bun.write(
		join(source, "manifest.json"),
		JSON.stringify({
			format_version: 1,
			game_version: "3.8.0",
			proto_sha256: hash(proto),
			packet_ids_sha256: hash(ids),
			messages: 1,
			packet_ids: 1,
		}),
	);
	await Bun.write(
		version,
		'{"game":"3.9.0","data":"3.9.2","protos":"3.7.0"}\n',
	);
	await Bun.write(join(destination, "protos.proto"), "previous snapshot");
	return { source, destination, version };
}

test("publishes a validated snapshot and changes only the protocol version", async () => {
	const { source, destination, version } = await fixture();
	await publishProtocol(source, destination, version);
	for (const name of ["protos.proto", "packetIds.json", "manifest.json"]) {
		expect(await Bun.file(join(destination, name)).text()).toBe(
			await Bun.file(join(source, name)).text(),
		);
	}
	expect(await Bun.file(version).json()).toEqual({
		game: "3.9.0",
		data: "3.9.2",
		protos: "3.8.0",
	});
});

test("a hash mismatch preserves the current snapshot and version", async () => {
	const { source, destination, version } = await fixture();
	await Bun.write(join(source, "packetIds.json"), "{}");
	await expect(publishProtocol(source, destination, version)).rejects.toThrow(
		"integrity check failed",
	);
	expect(await Bun.file(join(destination, "protos.proto")).text()).toBe(
		"previous snapshot",
	);
	expect((await Bun.file(version).json()).protos).toBe("3.7.0");
});

test("an invalid schema preserves the current snapshot and version", async () => {
	const { source, destination, version } = await fixture(
		'syntax = "proto3"; message Broken { Missing Type = 1; }',
	);
	await expect(publishProtocol(source, destination, version)).rejects.toThrow(
		"protoc rejected",
	);
	expect(await Bun.file(join(destination, "protos.proto")).text()).toBe(
		"previous snapshot",
	);
	expect((await Bun.file(version).json()).protos).toBe("3.7.0");
});

test("a client older than the newest data cannot replace the app protocol snapshot", async () => {
	const { source, destination, version } = await fixture();
	await expect(
		publishProtocol(source, destination, version, {
			expectedGameVersion: "3.9.0",
		}),
	).rejects.toThrow("Update the game");
	expect(await Bun.file(join(destination, "protos.proto")).text()).toBe(
		"previous snapshot",
	);
	expect((await Bun.file(version).json()).protos).toBe("3.7.0");
});
