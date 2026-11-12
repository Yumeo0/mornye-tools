/** Supplement released catalogs with calculator-supported previews from Nanoka. */
import { join } from "node:path";
import { assetUrl } from "../src/lib/assets";
import type { CatalogCharacter } from "../src/lib/catalog";
import type { WeaponCatalogEntry } from "../src/lib/weapons";
import { dataLog } from "./lib/data-log";
import { publicRoot, root } from "./lib/public-assets";

const site = "https://ww.nanoka.cc/";
const dataRoot = "https://static.nanoka.cc/ww/";
const artRoot = "https://static.nanoka.cc/assets/ww/";
const elements = [
	"",
	"Glacio",
	"Fusion",
	"Electro",
	"Aero",
	"Spectro",
	"Havoc",
];
const weaponTypes = [
	"",
	"Broadblade",
	"Sword",
	"Pistols",
	"Gauntlets",
	"Rectifier",
];

interface NanokaSummary {
	en: string;
	icon: string;
	background?: string;
	rank: number;
	element?: number;
	weapon?: number;
	type?: number;
}

async function request(url: string): Promise<Response> {
	const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
	if (!response.ok) throw new Error(`Nanoka ${response.status}: ${url}`);
	return response;
}

/** Use the version Nanoka actually serves, rather than guessing its latest API. */
export function nanokaVersion(html: string): string {
	const version = html.match(
		/data-url="https:\/\/static\.nanoka\.cc\/ww\/(\d+\.\d+)\/character\.json"/,
	)?.[1];
	if (!version) throw new Error("Nanoka character catalog version not found.");
	return version;
}

export function nanokaImage(path: string): { source: string; url: string } {
	const relative = path.replace(/^\/Game\/Aki\/UI\//, "").split(".")[0];
	if (!/^UIResources\/[\w/-]+$/.test(relative))
		throw new Error(`Unsupported Nanoka texture path: ${path}`);
	return {
		source: `${artRoot}${relative}.webp`,
		url: assetUrl(`/wuwa-assets/UI/${relative}.webp`, false),
	};
}

export async function compilePreviewData(): Promise<void> {
	const { getCatalog } = await import(
		"../src/lib/calc/riley/engine.generated.js"
	);
	const members = getCatalog().teams.flatMap((team) => team.members);
	const releasedCharacters: CatalogCharacter[] = await Bun.file(
		join(root, "src/configs/character_data.json"),
	).json();
	const releasedWeapons: WeaponCatalogEntry[] = await Bun.file(
		join(root, "src/configs/weapon_data.json"),
	).json();
	const characterIds = [...new Set(members.map((m) => m.characterId))]
		.filter((id) => !releasedCharacters.some((c) => c.character_id === id))
		.sort((a, b) => a - b);
	const weaponIds = [
		...new Set(members.flatMap((m) => m.weapons.map((w) => w.id))),
	]
		.filter((id) => !releasedWeapons.some((w) => w.item_id === id))
		.sort((a, b) => a - b);
	const version = nanokaVersion(await (await request(site)).text());
	const [characterMap, weaponMap]: Record<string, NanokaSummary>[] =
		await Promise.all(
			["character", "weapon"].map(async (kind) =>
				(await request(`${dataRoot}${version}/${kind}.json`)).json(),
			),
		);
	const characters: CatalogCharacter[] = [];
	const weapons: WeaponCatalogEntry[] = [];
	const assets: Record<string, string> = {};
	const image = (path: string, override?: string): string => {
		const { url, source } = nanokaImage(path);
		assets[override ?? url] = source;
		return override ?? url;
	};
	for (const id of characterIds) {
		const summary = characterMap[id];
		if (!summary?.en || !summary.background)
			throw new Error(`Missing Nanoka preview character ${id}`);
		const detail = (await (
			await request(`${dataRoot}${version}/en/character/${id}.json`)
		).json()) as {
			chains: Record<string, { icon: string }>;
		};
		const element = elements[summary.element ?? 0];
		const weapon = weaponTypes[summary.weapon ?? 0];
		if (!element || !weapon)
			throw new Error(`Unknown preview character type: ${id}`);
		characters.push({
			character_id: id,
			character_name: summary.en,
			preview: true,
			rarity: summary.rank,
			element,
			element_icon_round: `/icons/elements/${element.toLowerCase()}.webp`,
			weapon_type: weapon,
			weapon_type_icon: `/icons/weapon-types/${weapon.toLowerCase()}.webp`,
			icon_head_256: image(summary.icon),
			icon_pile: image(summary.background),
			chain_icons: Array.from({ length: 6 }, (_, i) => {
				const icon = detail.chains[String(i + 1)]?.icon;
				return icon ? image(icon) : null;
			}),
		});
	}
	for (const id of weaponIds) {
		const summary = weaponMap[id];
		const type = summary?.type ?? 0;
		if (!summary?.en || !weaponTypes[type])
			throw new Error(`Missing Nanoka preview weapon ${id}`);
		weapons.push({
			item_id: id,
			name: summary.en,
			preview: true,
			type,
			type_name: weaponTypes[type],
			rarity: summary.rank,
			icon: image(summary.icon, `/images/weapons/${id}.webp`),
		});
	}
	// Validate every download before publishing the new catalog. Keep images local
	// so desktop use never depends on a third-party image request.
	const downloads = await Promise.all(
		Object.entries(assets).map(async ([url, source]) => {
			const bytes = new Uint8Array(await (await request(source)).arrayBuffer());
			const { width, height } = await new Bun.Image(bytes).metadata();
			if (!width || !height) throw new Error(`Invalid Nanoka image: ${source}`);
			return { url, bytes };
		}),
	);
	for (const { url, bytes } of downloads)
		await Bun.write(join(publicRoot, url.slice(1)), bytes);
	await Bun.write(
		join(root, "src/configs/preview_data.json"),
		`${JSON.stringify(
			{
				source: site,
				version,
				characters,
				weapons,
				assets,
			},
			null,
			"\t",
		)}\n`,
	);
	dataLog.info(
		`Nanoka ${version}: ${characters.length} preview characters, ${weapons.length} preview weapons, ${downloads.length} images.`,
	);
}

if (import.meta.main) await compilePreviewData();
