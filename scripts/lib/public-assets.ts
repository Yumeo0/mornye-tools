import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import assetAliases from "../../src/configs/asset_aliases.json";
import { assetUrl, mapAssetUrls } from "../../src/lib/assets";
import type { MapCatalog } from "../../src/lib/map/types";

export const root = join(import.meta.dirname, "../..");
export const publicRoot = join(root, "public");
export const gameRoot = join(root, "data/wuwa-assets");
export const manifestPath = join(root, "data/asset_manifest.json");

/** Authored duplicates have no source to rebuild; reuse their published canonical file. */
export function publishedAssetFile(
	url: string,
	directory = publicRoot,
	aliases: Record<string, string> = assetAliases,
): string {
	const path = join(directory, url.slice(1));
	return existsSync(path)
		? path
		: join(directory, (aliases[url] ?? url).slice(1));
}

export function filesIn(directory: string): string[] {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		return entry.isDirectory() ? filesIn(path) : [path];
	});
}

export interface PublishedAsset {
	source: string;
	url: string;
}
export interface AssetManifest {
	assets: PublishedAsset[];
	urls: string[];
}

export function sourceFile(source: string): string {
	return join(gameRoot, source);
}

/** Preserve saved map filter identities independently from presentation URLs. */
export function prepareMapCatalog(
	catalog: MapCatalog,
	previous?: MapCatalog,
): MapCatalog {
	const previousIcons = new Map(
		previous?.rewards.map((r) => [r.key, r.filterIcon]),
	);
	for (const reward of catalog.rewards) {
		reward.filterIcon ??=
			previousIcons.get(reward.key) ??
			(reward.itemId && reward.icon.startsWith("/wuwa-assets/")
				? `/map/icons/gg/${basename(reward.icon).replace(/\.webp$/, ".png")}`
				: reward.icon);
	}
	const published = mapAssetUrls(catalog);
	published.icons = [
		...new Set([
			...published.rewards.flatMap((r) => [
				r.icon,
				...(r.questLinks ?? []).map((q) => q.icon),
			]),
			...published.regions.map((r) => r.icon),
		]),
	]
		.filter((icon): icon is string => Boolean(icon))
		.sort();
	return published;
}

/** Index source textures by their canonical URLs; never publish a whole atlas. */
export function assetSources(): Map<string, string[]> {
	const index = new Map<string, string[]>();
	for (const absolute of filesIn(join(gameRoot, "UI"))) {
		if (!absolute.endsWith(".png")) continue;
		const source = absolute.slice(gameRoot.length + 1).replaceAll("\\", "/");
		if (
			!/^(?:UI\/UIResources\/Common\/(?:Image|Atlas\/(?:TabIcon|WorldMapIcon))\/|UI\/UIResources\/Ui(?:WorldMap\/Image|Inventory\/Atlas)\/)/.test(
				source,
			) &&
			!/^UI\/UIResources\/UiFunc\/Atlas\/SP_FuncIcon(?:Bag|Team)\.png$/.test(
				source,
			)
		)
			continue;
		if (source.includes("/IconElementAttri/")) continue; // Publish the 128px set glyph once.
		if (
			source.includes("/IconWeapon80/") &&
			existsSync(
				join(gameRoot, source.replaceAll("IconWeapon80", "IconWeapon160")),
			)
		)
			continue;
		// Modern native textures use the item ID directly. Weapon publication
		// no longer depends on the calculator's icon checkout.
		const weapon = source.match(/\/IconWeapon\/T_IconWeapon(\d+)_UI\.png$/);
		if (weapon) index.set(`/images/weapons/${weapon[1]}.webp`, [source]);

		const url = assetUrl(
			`/wuwa-assets/${source.replace(/\.png$/, ".webp")}`,
			false,
		);
		index.set(url, [...(index.get(url) ?? []), source]);
		if (source.includes("/UiWorldMap/") && /Tiles_/.test(source)) {
			for (const kind of ["tiles", "tiles-low"]) {
				const tileUrl = assetUrl(
					`/map/${kind}/${basename(absolute).replace(/\.png$/, ".webp")}`,
					false,
				);
				index.set(tileUrl, [...(index.get(tileUrl) ?? []), source]);
			}
		}
	}
	return index;
}

/** Omit unused alternate resolutions instead of shipping dangling image fields. */
export function prepareCatalog<T>(value: T): T {
	const unused = new Set([
		"element_icon_128",
		"element_icon_128_pure",
		"icon_head_80",
		"icon_head_150",
		"icon_head_175",
		"icon_head_circle",
		"icon_portrait",
		"icon_head",
		"icon_small",
	]);
	const prune = (child: unknown): unknown => {
		if (Array.isArray(child)) return child.map(prune);
		if (!child || typeof child !== "object") return child;
		const record = Object.fromEntries(
			Object.entries(child)
				.filter(([key]) => !unused.has(key))
				.map(([key, v]) => [key, prune(v)]),
		);
		if ("item_id" in record && "type_name" in record)
			record.icon = `/images/weapons/${record.item_id}.webp`;
		return record;
	};
	return mapAssetUrls(prune(value)) as T;
}

/** Only fields the app renders are publication dependencies. */
export async function collectAssetRefs(): Promise<Set<string>> {
	const refs = new Set<string>();
	const add = (value: unknown) => {
		if (
			typeof value === "string" &&
			/^\/(?:icons|images)\/.+\.(?:png|webp|svg)$/.test(value)
		)
			refs.add(value);
	};
	const walk = (value: unknown): void => {
		if (Array.isArray(value)) for (const child of value) walk(child);
		else if (value && typeof value === "object")
			for (const [key, child] of Object.entries(value)) {
				if (key !== "filterIcon") walk(child);
			}
		else add(value);
	};
	const config = (name: string) =>
		Bun.file(join(root, `src/configs/${name}.json`)).json();
	for (const character of await config("character_data")) {
		for (const key of [
			"icon_head_256",
			"icon_pile",
			"element_icon_round",
			"weapon_type_icon",
			"chain_icons",
		])
			walk(character[key]);
	}
	for (const echo of await config("echo_data")) {
		walk(echo.icon_middle);
		walk(echo.echo_sets);
	}
	for (const weapon of await config("weapon_data")) walk(weapon.icon);
	const previews = await config("preview_data");
	walk(previews.characters);
	walk(previews.weapons);
	for (const profile of await config("profile_portraits"))
		walk(profile.icon_head_256);
	walk(await config("progression"));
	walk(await config("inventory_data"));
	walk(await config("inventory_categories"));
	const catalog: MapCatalog = await Bun.file(
		join(publicRoot, "map/catalog.json"),
	).json();
	walk(catalog.maps);
	walk(catalog.regions);
	walk(catalog.rewards);
	for (const path of filesIn(join(root, "src"))) {
		if (!/\.tsx?$/.test(path) || /\.test\.tsx?$/.test(path)) continue;
		const source = await Bun.file(path).text();
		for (const match of source.matchAll(
			/["'](\/(?:icons|images)\/[^"']+\.(?:png|webp|svg))["']/g,
		))
			add(match[1]);
	}
	const source = await Bun.file(join(root, "src/lib/stats.ts")).text();
	const block = /const STAT_ASSETS[^=]*=\s*\{(.*?)\n\};/s.exec(source)?.[1];
	if (!block) throw new Error("Missing stat asset map");
	for (const value of block.matchAll(/:\s*"([^"]+)"/g))
		add(`/icons/stats/${value[1]}.webp`);
	// Recheck deduplicated source textures on every publication. Catalogues hold
	// canonical URLs, so their original aliases would otherwise disappear on the
	// next run (and changed source artwork would never be compared again).
	for (const [alias, canonical] of Object.entries(assetAliases)) {
		if (refs.has(canonical)) refs.add(alias);
	}
	return refs;
}
