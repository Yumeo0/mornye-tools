import { realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

/** Steam's VDF paths escape Windows backslashes and quotes. */
export function steamLibraries(text: string): string[] {
	return Array.from(text.matchAll(/"path"\s*"((?:\\.|[^"\\])*)"/g), (m) =>
		m[1].replace(/\\([\\"])/g, "$1"),
	);
}

async function directory(path: string): Promise<boolean> {
	return stat(path).then(
		(s) => s.isDirectory(),
		() => false,
	);
}

async function normalizeClient(path: string): Promise<string | undefined> {
	for (const candidate of [
		resolve(path),
		join(resolve(path), "Client"),
		join(resolve(path), "Wuthering Waves Game", "Client"),
	]) {
		if (await directory(join(candidate, "Content", "Paks")))
			return realpath(candidate);
	}
}

export async function selectGameClient(candidates: string[]): Promise<string> {
	const clients = new Map<string, string>();
	for (const candidate of candidates) {
		const client = await normalizeClient(candidate);
		if (client)
			clients.set(
				process.platform === "win32" ? client.toLowerCase() : client,
				client,
			);
	}
	if (clients.size > 1)
		throw new Error(
			`Multiple game installations found. Select one with --game <Client directory>:\n${[...clients.values()].join("\n")}`,
		);
	const client = clients.values().next().value;
	if (!client)
		throw new Error(
			"Game installation not found. Install/update the game, then use --game <Client directory> or set WUWA_GAME.",
		);
	return client;
}

async function registry(key: string): Promise<string> {
	const child = Bun.spawn(["reg.exe", "query", key, "/s"], {
		stdout: "pipe",
		stderr: "ignore",
		windowsHide: true,
	});
	const text = await new Response(child.stdout).text();
	return (await child.exited) === 0 ? text : "";
}

async function systemCandidates(): Promise<string[]> {
	const candidates: string[] = [];
	const steamRoots: string[] = [];
	if (process.platform === "win32") {
		const programFiles = [
			process.env["ProgramFiles(x86)"],
			process.env.ProgramFiles,
		].filter((path): path is string => !!path);
		steamRoots.push(...programFiles.map((path) => join(path, "Steam")));
		candidates.push(
			...programFiles.map((path) => join(path, "Wuthering Waves")),
		);
		for (const key of [
			"HKCU\\SOFTWARE\\Valve\\Steam",
			"HKLM\\SOFTWARE\\Valve\\Steam",
			"HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam",
		]) {
			const values = await registry(key);
			for (const match of values.matchAll(
				/^\s*(?:SteamPath|InstallPath)\s+REG_SZ\s+(.+)$/gm,
			))
				steamRoots.push(match[1].trim());
		}
		for (const key of [
			"HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
			"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
			"HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
		]) {
			for (const entry of (await registry(key)).split(/(?=^HKEY_)/m)) {
				if (
					!/^\s*DisplayName\s+REG_SZ\s+.*(?:Wuthering Waves|鸣潮)/im.test(entry)
				)
					continue;
				const path = entry
					.match(/^\s*InstallLocation\s+REG_SZ\s+(.+)$/m)?.[1]
					.trim();
				if (path) candidates.push(path);
			}
		}
	} else {
		steamRoots.push(
			join(homedir(), ".steam", "steam"),
			join(homedir(), ".local", "share", "Steam"),
			join(
				homedir(),
				".var",
				"app",
				"com.valvesoftware.Steam",
				"data",
				"Steam",
			),
		);
	}
	for (const root of new Set(steamRoots)) {
		const vdf = await Bun.file(join(root, "steamapps", "libraryfolders.vdf"))
			.text()
			.catch(() => "");
		for (const library of [root, ...steamLibraries(vdf)])
			candidates.push(join(library, "steamapps", "common", "Wuthering Waves"));
	}
	return candidates;
}

/** Explicit selection is authoritative: an invalid override must never fall back. */
export async function findGameClient(
	game = process.env.WUWA_GAME,
): Promise<string> {
	if (game) {
		const client = await normalizeClient(game);
		if (!client)
			throw new Error(
				`Invalid game directory: ${game}. Expected Client/Content/Paks; use --game <Client directory> or WUWA_GAME.`,
			);
		return client;
	}
	return selectGameClient(await systemCandidates());
}
