import { expect, test } from "bun:test";
import { mkdtempSync, rmdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assetUrl } from "../src/lib/assets";
import { itemType } from "../src/lib/map/collection";
import type { MapCatalog, MapReward } from "../src/lib/map/types";
import {
	type AssetManifest,
	collectAssetRefs,
	filesIn,
	manifestPath,
	prepareCatalog,
	prepareMapCatalog,
	publicRoot,
	publishedAssetFile,
	sourceFile,
} from "./lib/public-assets";

test("authored aliases reuse canonical files after deduplication and prefer newly published artwork", async () => {
	const directory = mkdtempSync(join(tmpdir(), "mornye-authored-assets-"));
	try {
		const aliases = { "/duplicate.webp": "/canonical.webp" };
		await Bun.write(join(directory, "canonical.webp"), "original artwork");
		expect(
			await Bun.file(
				publishedAssetFile("/duplicate.webp", directory, aliases),
			).text(),
		).toBe("original artwork");
		await Bun.write(join(directory, "duplicate.webp"), "updated artwork");
		expect(
			await Bun.file(
				publishedAssetFile("/duplicate.webp", directory, aliases),
			).text(),
		).toBe("updated artwork");
		expect(
			await Bun.file(
				publishedAssetFile("/missing.webp", directory, aliases),
			).exists(),
		).toBe(false);
	} finally {
		for (const filename of ["canonical.webp", "duplicate.webp"])
			rmSync(join(directory, filename), { force: true });
		rmdirSync(directory);
	}
});

test("asset paths separate UI icons from game artwork and retain signed tile coordinates", () => {
	const old = "/wuwa-assets/UI/UIResources/Common";
	expect(
		assetUrl(`${old}/Image/IconElementRound/T_IconElementWind1_UI.webp`),
	).toBe("/icons/elements/aero.webp");
	expect(assetUrl(`${old}/Image/IconDevice/T_IconDevice_YangyangM1.webp`)).toBe(
		"/images/resonators/sequences/yangyang-m1.webp",
	);
	expect(assetUrl("/map/icons/SP_IconMap_Play_23_UI.webp")).toBe(
		"/icons/map/echo-flight.webp",
	);
	expect(assetUrl("/map/tiles/T_MapTiles_-2_1_UI.webp", false)).toBe(
		"/images/maps/tiles/maptiles_-2_1.webp",
	);
	expect(assetUrl("/map/tiles-low/T_MapTiles_2_-1_UI.webp", false)).toBe(
		"/images/maps/thumbnails/maptiles_2_-1.webp",
	);
});

test("weapon artwork uses the item ID instead of mismatched native texture IDs", () => {
	expect(
		prepareCatalog<Record<string, unknown>>({
			item_id: 21010084,
			type_name: "Broadblade",
			icon: "/wuwa-assets/UI/UIResources/Common/Image/IconWeapon80/T_IconWeapon80_21010014.webp",
			icon_small: "unused",
		}),
	).toEqual({
		item_id: 21010084,
		type_name: "Broadblade",
		icon: "/images/weapons/21010084.webp",
	});
});

const reward: MapReward = {
	key: "8:1",
	mapId: 8,
	entityId: 1,
	x: 0,
	y: 0,
	z: 0,
	kind: "collection",
	name: "Flower",
	blueprint: "Flower",
	area: "Test",
	icon: "/wuwa-assets/UI/UIResources/Common/Image/IconMaterial/T_IconMaterial_Flower.webp",
	itemId: 1,
	owner: null,
	refresh: "Daily",
	hidden: false,
	underground: null,
};
const catalog = (rewards: MapReward[]): MapCatalog => ({
	version: "test",
	tileSize: 1024,
	maps: [],
	regions: [],
	rewards,
	icons: ["/map/icons/unused.webp"],
	missingTiles: [],
});

test("map image migration and recompilation retain saved filter identities", () => {
	const previous = catalog([
		reward,
		{
			...reward,
			key: "8:2",
			itemId: undefined,
			icon: "/map/icons/SP_IconMap_Play_12_UI.webp",
		},
	]);
	const before = previous.rewards.map(itemType);
	const migrated = prepareMapCatalog(structuredClone(previous));
	expect(migrated.rewards.map(itemType)).toEqual(before);
	expect(migrated.icons).not.toContain("/map/icons/unused.webp");
	const recompiled = prepareMapCatalog(
		catalog(
			previous.rewards.map((r) => ({
				...r,
				icon: "/icons/map/replacement.webp",
			})),
		),
		migrated,
	);
	expect(recompiled.rewards.map(itemType)).toEqual(before);
	expect(prepareMapCatalog(structuredClone(migrated))).toEqual(migrated);
});

test("every rendered asset and alias resolves to a published file; no unused managed images remain", async () => {
	const manifest: AssetManifest = await Bun.file(manifestPath).json();
	const expected = new Set(manifest.urls);
	for (const ref of await collectAssetRefs()) {
		const url = assetUrl(ref);
		expect(expected.has(url), ref).toBe(true);
		expect(await Bun.file(join(publicRoot, url.slice(1))).exists(), url).toBe(
			true,
		);
	}
	const actual = ["icons", "images"]
		.flatMap((folder) => filesIn(join(publicRoot, folder)))
		.map(
			(path) => `/${path.slice(publicRoot.length + 1).replaceAll("\\", "/")}`,
		);
	expect(actual.sort()).toEqual([...expected].sort());
});

test("published images contain no byte-identical duplicates", async () => {
	const manifest: AssetManifest = await Bun.file(manifestPath).json();
	const hashes = new Map<string, string>();
	for (const url of manifest.urls) {
		const hash = new Bun.CryptoHasher("sha256")
			.update(await Bun.file(join(publicRoot, url.slice(1))).arrayBuffer())
			.digest("hex");
		expect(hashes.get(hash), `Duplicate image: ${url}`).toBeUndefined();
		hashes.set(hash, url);
	}
});

test("identical source artwork shares a file at each published resolution", async () => {
	const manifest: AssetManifest = await Bun.file(manifestPath).json();
	const sources = new Map<string, string>();
	for (const { source, url } of manifest.assets) {
		const resolution = url.startsWith("/images/maps/tiles/")
			? "tile"
			: url.startsWith("/images/maps/thumbnails/")
				? "thumbnail"
				: "image";
		const hash = new Bun.CryptoHasher("sha256")
			.update(await Bun.file(sourceFile(source)).arrayBuffer())
			.digest("hex");
		const key = `${resolution}:${hash}`;
		expect(
			sources.get(key),
			`Duplicate source artwork: ${url}`,
		).toBeUndefined();
		sources.set(key, url);
	}
});
