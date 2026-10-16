/**
 * Build Guide Compiler
 *
 * Scrapes https://tethys.gg for resonator build guides: best echo sets,
 * main stat priorities and substat priorities for every role of every resonator.
 *
 * The tethys.gg build data is not server-rendered - it is bundled into one of
 * the Next.js build chunks as a JSON.parse('...') dataset. So instead of
 * driving a browser we:
 *   1. fetch the resonators overview page and collect its JS chunk URLs
 *   2. download each chunk and look for the guides dataset
 *   3. extract the dataset and compile it into ../src/configs/character_builds.json
 *
 * Network-bound: the result changes whenever tethys.gg ships new guides.
 *
 * Run: bun scripts/compile_build_guides.ts
 */

import { join } from "node:path";

const SCRIPTS_DIR = import.meta.dirname;
const REPO_ROOT = join(SCRIPTS_DIR, "..");

const BASE_URL = "https://tethys.gg";
const RESONATORS_URL = `${BASE_URL}/resonators`;

const OUTPUT_PATH = join(REPO_ROOT, "src/configs/character_builds.json");
// Character data for id lookup (produced by compile_character_data.ts)
const CHARACTER_DATA_PATH = join(REPO_ROOT, "src/configs/character_data.json");

const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const CHUNK_RE = /\/_next\/static\/chunks\/[a-z0-9]+\.js/g;
const JSON_PARSE_RE = /JSON\.parse\(/g;

interface EchoSet {
	variant?: string | null;
	sets?: string[];
	mainStat?: string;
}

interface Guide {
	role?: string;
	echoSets?: EchoSet[];
	substatsPriority?: string | null;
}

interface Resonator {
	name?: string;
	guides?: Guide[];
}

interface CharacterDataEntry {
	character_name?: string;
	character_id?: number;
}

interface RoleData {
	echo_sets: {
		variant: string | null;
		sets: string[];
		main_stats: string[];
	};
	substats_priority: string | null;
	url?: string;
}

interface BuildEntry {
	character_id: number | null;
	roles: Record<string, RoleData>;
}

/** Fetch a URL and return its body as text. */
async function fetchUrl(url: string): Promise<string> {
	const response = await fetch(url, {
		headers: { "User-Agent": USER_AGENT },
		signal: AbortSignal.timeout(30_000),
	});
	if (!response.ok)
		throw new Error(`${response.status} ${response.statusText}`);
	return response.text();
}

/**
 * Yield the string literals passed to every JSON.parse('...') call.
 *
 * Handles JS single-quote escaping so the result matches what the browser
 * would hand to JSON.parse.
 */
function* extractJsonParseStrings(js: string): Generator<string> {
	for (const match of js.matchAll(JSON_PARSE_RE)) {
		let pos = (match.index ?? 0) + match[0].length;
		// Skip whitespace and find the opening quote
		while (pos < js.length && " \t\r\n".includes(js.charAt(pos))) pos += 1;
		if (pos >= js.length) continue;
		const quote = js.charAt(pos);
		if (quote !== "'" && quote !== '"') continue;

		pos += 1;
		const chunks: string[] = [];
		while (pos < js.length) {
			const char = js.charAt(pos);
			if (char === "\\" && pos + 1 < js.length) {
				const nextChar = js.charAt(pos + 1);
				if (nextChar === "u" && pos + 5 < js.length) {
					chunks.push(
						String.fromCharCode(
							Number.parseInt(js.slice(pos + 2, pos + 6), 16),
						),
					);
					pos += 6;
					continue;
				}
				const mapping: Record<string, string> = {
					"'": "'",
					'"': '"',
					"\\": "\\",
					"/": "/",
					n: "\n",
					t: "\t",
					r: "\r",
					b: "\b",
					f: "\f",
				};
				chunks.push(mapping[nextChar] ?? nextChar);
				pos += 2;
				continue;
			}
			if (char === quote) break;
			chunks.push(char);
			pos += 1;
		}
		yield chunks.join("");
	}
}

/** Download chunks until the resonator guides dataset is found. */
async function findGuidesDataset(
	chunkUrls: string[],
): Promise<Resonator[] | null> {
	for (const url of chunkUrls) {
		let js: string;
		try {
			js = await fetchUrl(url);
		} catch (error) {
			console.log(`  ! Failed to download ${url}: ${error}`);
			continue;
		}

		for (const literal of extractJsonParseStrings(js)) {
			let data: unknown;
			try {
				data = JSON.parse(literal);
			} catch {
				continue;
			}
			if (
				Array.isArray(data) &&
				data.length > 0 &&
				typeof data[0] === "object" &&
				data[0] !== null &&
				"guides" in data[0]
			) {
				console.log(`  Found guides dataset in ${url}`);
				return data as Resonator[];
			}
		}
	}
	return null;
}

/** Map character names to game ids from character_data.json. */
async function loadCharacterIds(): Promise<Record<string, number>> {
	if (!(await Bun.file(CHARACTER_DATA_PATH).exists())) {
		console.log(`  ! ${CHARACTER_DATA_PATH} not found, skipping id mapping`);
		return {};
	}
	const characters = (await Bun.file(
		CHARACTER_DATA_PATH,
	).json()) as CharacterDataEntry[];
	const ids: Record<string, number> = {};
	for (const character of characters) {
		const name = character.character_name;
		const characterId = character.character_id;
		if (name && characterId && !(name in ids)) ids[name] = characterId;
	}
	return ids;
}

/** urlencode with quote_plus semantics (space becomes "+"). */
function quotePlus(value: string): string {
	return encodeURIComponent(value)
		.replace(/%20/g, "+")
		.replace(
			/[!*'()]/g,
			(char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
		);
}

/** Compile the raw tethys dataset into per-resonator, per-role builds. */
function compileGuides(
	dataset: Resonator[],
	characterIds: Record<string, number>,
): Record<string, BuildEntry> {
	const builds: Record<string, BuildEntry> = {};

	for (const resonator of dataset) {
		const name = resonator.name;
		if (!name) continue;

		const entry: BuildEntry = {
			character_id: characterIds[name] ?? null,
			roles: {},
		};

		for (const guide of resonator.guides ?? []) {
			const role = guide.role;
			const echoSets = guide.echoSets ?? [];
			if (!role || echoSets.length === 0) continue;

			const roleData: RoleData = {
				echo_sets: {
					variant: echoSets[0].variant ?? null,
					sets: echoSets[0].sets ?? [],
					main_stats: (echoSets[0].mainStat ?? "").split("\n"),
				},
				substats_priority: guide.substatsPriority ?? null,
			};

			if (entry.character_id) {
				roleData.url = `${BASE_URL}/resonators/${entry.character_id}?role=${quotePlus(role)}`;
			}

			entry.roles[role] = roleData;
		}

		if (Object.keys(entry.roles).length > 0) builds[name] = entry;
	}

	return builds;
}

async function main(): Promise<void> {
	console.log("=".repeat(60));
	console.log("Build Guide Compiler (tethys.gg)");
	console.log("=".repeat(60));

	console.log("\nFetching resonators page...");
	const page = await fetchUrl(RESONATORS_URL);

	const chunkUrls = [
		...new Set(
			[...page.matchAll(CHUNK_RE)].map((match) => `${BASE_URL}${match[0]}`),
		),
	];
	console.log(`Found ${chunkUrls.length} JS chunks to scan`);

	console.log("\nScanning chunks for guides dataset...");
	const dataset = await findGuidesDataset(chunkUrls);
	if (!dataset) {
		console.log("Error: could not find the guides dataset in any chunk");
		return;
	}

	console.log(`\nFound ${dataset.length} resonators in dataset`);

	const characterIds = await loadCharacterIds();
	const builds = compileGuides(dataset, characterIds);

	const rolesTotal = Object.values(builds).reduce(
		(sum, entry) => sum + Object.keys(entry.roles).length,
		0,
	);
	const multiRole = Object.values(builds).filter(
		(entry) => Object.keys(entry.roles).length > 1,
	).length;
	console.log(
		`Compiled ${rolesTotal} roles across ${Object.keys(builds).length} resonators (${multiRole} with multiple roles)`,
	);

	// Bun.write creates parent directories on its own.
	await Bun.write(OUTPUT_PATH, `${JSON.stringify(builds, null, "\t")}\n`);

	console.log(`\nDone! Successfully compiled build guides to ${OUTPUT_PATH}`);
}

if (import.meta.main) {
	await main();
}

export { main as compileBuildGuides };
