/** Update every game-data input and publish the app's configs, assets and protocol. */
import { join } from "node:path";
import { gameDataStages } from "./compile_all_data";
import { dataLog, runDataStages } from "./lib/data-log";
import { findGameClient } from "./lib/game-installation";
import { refreshDataSources } from "./lib/update-sources";
import { updateProtos } from "./update-protos";

const ROOT = join(import.meta.dirname, "..");

export function parseUpdateOptions(args: string[]) {
	const options: {
		verbose: boolean;
		game?: string;
		keys?: string;
		protoc?: string;
	} = { verbose: false };
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--verbose") {
			options.verbose = true;
			continue;
		}
		if (arg !== "--game" && arg !== "--keys" && arg !== "--protoc")
			throw new Error(
				`Unknown option: ${arg}. See bun run update:data --help.`,
			);
		const value = args[++i];
		if (!value || value.startsWith("--"))
			throw new Error(`${arg} requires a value.`);
		const key = arg.slice(2) as "game" | "keys" | "protoc";
		if (options[key]) throw new Error(`Duplicate option: ${arg}`);
		options[key] = value;
	}
	return options;
}

export async function updateData(args: string[]): Promise<void> {
	if (args.includes("--help")) {
		console.log(`Update all game data to the newest upstream release:
  bun run update:data
  bun run update:data --game "C:/Games/Wuthering Waves/Client" --verbose

Updates assets, the newest numbered game-data branch, and the protocol extractor;
extracts current named protos/packet IDs from your installed client; then rebuilds
configs, guides, previews, rotation damage, maps and referenced assets.

Requires Git/SSH access to the submodules, .NET 10 SDK, protoc, and an updated game.
The client is discovered through Steam/Windows uninstall entries, or WUWA_GAME.
  --game <directory>     Explicit game root or Client directory
  --keys <file or URL>   Override the extractor's public PAK-key source
  --protoc <executable>  Override PROTOC or protoc on PATH
  --verbose             Show detailed Git and compiler diagnostics

Failures stop the update; unavailable optional Tethys/Nanoka sources retain their
bundled output. Local checkout edits are never reset or force-overwritten.`);
		return;
	}
	const options = parseUpdateOptions(args);
	let client: string;
	await runDataStages(
		[
			{
				name: "Check game installation and extraction tools",
				run: async () => {
					client = await findGameClient(options.game);
					if (!Bun.which("git"))
						throw new Error(
							"Git is required; install it and configure SSH access to the data submodules.",
						);
					if (!Bun.which(options.protoc ?? process.env.PROTOC ?? "protoc"))
						throw new Error(
							"protoc was not found. Install it, set PROTOC, or use --protoc <executable>.",
						);
					if (!Bun.which("dotnet"))
						throw new Error(
							"Protocol extraction requires the .NET 10 SDK. Install it from https://dotnet.microsoft.com/download/dotnet/10.0.",
						);
					const sdk = Bun.spawn(["dotnet", "--list-sdks"], {
						stdout: "pipe",
						stderr: "inherit",
					});
					const sdks = await new Response(sdk.stdout).text();
					if (
						(await sdk.exited) !== 0 ||
						!sdks
							.split(/\r?\n/)
							.some(
								(line) =>
									/^\d+\./.test(line) && Number(line.split(".")[0]) >= 10,
							)
					)
						throw new Error(
							"Protocol extraction requires the .NET 10 SDK; a runtime-only installation is insufficient.",
						);
					dataLog.info(`Installed client: ${client}`);
				},
			},
			{
				name: "Refresh upstream data, assets and protocol tooling",
				run: () => refreshDataSources(ROOT),
			},
			{
				name: "Extract and publish named protocols and packet IDs",
				run: async () => {
					const readme = await Bun.file(
						join(ROOT, "data/wuwa-data/README.md"),
					).text();
					const version = readme.match(
						/^> Game Version: (\d+\.\d+\.\d+)/m,
					)?.[1];
					if (!version)
						throw new Error(
							"Newest wuwa-data README is missing its game version; cannot validate client protocols.",
						);
					const assets = await Bun.file(
						join(ROOT, "data/wuwa-assets/VERSION.json"),
					).json();
					if (assets.game !== version)
						throw new Error(
							`Newest game data targets ${version}, but assets target ${assets.game}. Retry after both upstream sources have updated.`,
						);
					const extraction = ["--game", client];
					if (options.keys) extraction.push("--keys", options.keys);
					if (options.protoc) extraction.push("--protoc", options.protoc);
					await updateProtos(extraction, { expectedGameVersion: version });
				},
			},
			...gameDataStages(),
		],
		{ verbose: options.verbose },
	);
}

if (import.meta.main) await updateData(process.argv.slice(2));
