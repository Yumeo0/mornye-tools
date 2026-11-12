/** Refresh the protocol from the local client, then publish a build snapshot.
 * The private tooling submodule is needed only for extraction, never to build.
 */
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { dataLog } from "./lib/data-log";
import { findGameClient } from "./lib/game-installation";
import { updateVersionField } from "./version_manifest";

const ROOT = join(import.meta.dirname, "..");
const SOURCE = join(ROOT, "data/wuwa-protos");
const DESTINATION = join(ROOT, "src-tauri/protocol");
export async function updateProtos(
	args: string[] = [],
	{ expectedGameVersion }: { expectedGameVersion?: string } = {},
): Promise<void> {
	const pinned = args.includes("--pinned");

	if (args.includes("--help")) {
		console.log(`Refresh from an installed client (automatically discovered, or WUWA_GAME):
	  bun run update:protos
	  bun run update:protos --game "C:/Games/Wuthering Waves/Client"
	  bun run update:protos --assembly Aki.Protocol.dll --game-version 3.8.0

	Publish the artifacts already pinned in the tooling checkout:
	  bun run update:protos --pinned

	Other extractor options (such as --keys) are forwarded. See data/wuwa-protos/README.md.`);
		return;
	}
	if (args.includes("--output") || args.includes("--check")) {
		throw new Error("Use the extractor directly for --output or --check.");
	}
	if (pinned && args.length !== 1) {
		throw new Error("--pinned cannot be combined with extraction options.");
	}
	if (!pinned) {
		args = [...args];
		if (!args.includes("--assembly")) {
			const index = args.indexOf("--game");
			if (index >= 0 && (!args[index + 1] || args[index + 1].startsWith("--")))
				throw new Error("--game requires a Client directory.");
			const client = await findGameClient(
				index < 0 ? undefined : args[index + 1],
			);
			if (index < 0) args.push("--game", client);
			else args[index + 1] = client;
			dataLog.info(`Protocol client: ${client}`);
		}
		if (
			!(await Bun.file(
				join(SOURCE, "tools/Extractor/Extractor.csproj"),
			).exists())
		) {
			throw new Error(
				"Initialize the tooling first: git submodule update --init data/wuwa-protos",
			);
		}
		const child = Bun.spawn(
			[
				"dotnet",
				"run",
				"--project",
				join(SOURCE, "tools/Extractor"),
				"--",
				...args,
				"--output",
				SOURCE,
			],
			{ cwd: ROOT, stdout: "inherit", stderr: "inherit" },
		);
		if ((await child.exited) !== 0)
			throw new Error(
				"Protocol extraction failed. Check the installed client, .NET 10 SDK, protoc, and PAK keys. Existing app snapshot was not replaced.",
			);
	}
	const compilerIndex = args.indexOf("--protoc");
	await publishProtocol(SOURCE, DESTINATION, join(ROOT, "data/VERSION.json"), {
		expectedGameVersion,
		protoc: compilerIndex < 0 ? undefined : args[compilerIndex + 1],
	});
}

export async function publishProtocol(
	source: string,
	destination: string,
	versionPath: string,
	{
		expectedGameVersion,
		protoc,
	}: { expectedGameVersion?: string; protoc?: string } = {},
): Promise<void> {
	const manifest = await Bun.file(join(source, "manifest.json")).json();
	if (
		manifest.format_version !== 1 ||
		typeof manifest.game_version !== "string" ||
		!/^\d+\.\d+\.\d+$/.test(manifest.game_version)
	) {
		throw new Error("Unsupported protocol manifest.");
	}
	if (expectedGameVersion && manifest.game_version !== expectedGameVersion)
		throw new Error(
			`Installed protocol targets game ${manifest.game_version}, but newest game data targets ${expectedGameVersion}. Update the game or select its current installation with --game. App protocol snapshot was not replaced.`,
		);
	const files = await Promise.all(
		["protos.proto", "packetIds.json", "manifest.json"].map(async (name) => ({
			name,
			bytes: await Bun.file(join(source, name)).bytes(),
		})),
	);
	for (const [name, expected] of [
		["protos.proto", manifest.proto_sha256],
		["packetIds.json", manifest.packet_ids_sha256],
	] as const) {
		const bytes = files.find((file) => file.name === name)?.bytes;
		if (
			!bytes ||
			createHash("sha256").update(bytes).digest("hex") !== expected
		) {
			throw new Error(
				`Protocol integrity check failed for ${name}. Regenerate the artifacts.`,
			);
		}
	}
	// Validate before replacing the build snapshot, including --pinned updates.
	await mkdir(join(source, ".cache"), { recursive: true });
	const compiler = Bun.spawn(
		[
			protoc ?? process.env.PROTOC ?? "protoc",
			`--proto_path=${source}`,
			`--descriptor_set_out=${join(source, ".cache/protocol.bin")}`,
			"protos.proto",
		],
		{ cwd: ROOT, stdout: "inherit", stderr: "inherit" },
	);
	if ((await compiler.exited) !== 0)
		throw new Error("protoc rejected the protocol snapshot.");
	for (const file of files)
		await Bun.write(join(destination, file.name), file.bytes);
	await updateVersionField(
		"protos",
		manifest.game_version,
		"wuwa-protos/manifest.json",
		versionPath,
	);
	dataLog.info(
		`Published ${manifest.messages} messages and ${manifest.packet_ids} packet IDs to src-tauri/protocol.`,
	);
}

if (import.meta.main) {
	await updateProtos(process.argv.slice(2));
}
