/** Publish only referenced assets, preserving unchanged encodings and pruning stale files. */
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	rmdirSync,
	statSync,
	unlinkSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { buildAssetManifest } from "./build_asset_manifest";
import {
	filesIn,
	gameRoot,
	manifestPath,
	prepareCatalog,
	prepareMapCatalog,
	publicRoot,
	publishedAssetFile,
	root,
	sourceFile,
} from "./lib/public-assets";
import { updateVersionField } from "./version_manifest";

export async function syncAssetsVersion(): Promise<void> {
	const path = join(gameRoot, "VERSION.json");
	const version = await Bun.file(path)
		.json()
		.catch(() => null);
	if (version?.game) await updateVersionField("assets", version.game, path);
}

const catalogs = [
	"character_data",
	"echo_data",
	"weapon_data",
	"preview_data",
	"profile_portraits",
	"progression",
	"inventory_data",
	"inventory_categories",
	"map_icons",
];
async function normalizeCatalogs() {
	for (const name of catalogs) {
		const path = join(root, `src/configs/${name}.json`);
		await Bun.write(
			path,
			JSON.stringify(
				prepareCatalog(await Bun.file(path).json()),
				null,
				["progression", "inventory_data"].includes(name) ? undefined : "\t",
			) + "\n",
		);
	}
	const path = join(publicRoot, "map/catalog.json");
	await Bun.write(
		path,
		JSON.stringify(prepareMapCatalog(await Bun.file(path).json())) + "\n",
	);
}

/** All deletions are individual files below the resolved public root. */
function publicPath(url: string): string {
	const path = resolve(publicRoot, url.replace(/^\//, ""));
	if (!path.startsWith(resolve(publicRoot) + sep))
		throw new Error(`Asset outside public: ${url}`);
	return path;
}
function emptyDirectories(directory: string) {
	if (!existsSync(directory)) return;
	for (const entry of readdirSync(directory, { withFileTypes: true }))
		if (entry.isDirectory()) emptyDirectories(join(directory, entry.name));
	if (!readdirSync(directory).length) rmdirSync(directory);
}

export async function copyAssets(): Promise<void> {
	await normalizeCatalogs();
	const manifest = await buildAssetManifest();
	const previousAliases: Record<string, string> = await Bun.file(
		join(root, "src/configs/asset_aliases.json"),
	).json();
	const sources = new Map(
		manifest.assets.map(({ source, url }) => [url, source]),
	);
	const reusedAliases = new Map<string, string>();
	const sourceHashes = new Map<string, string>();
	const sourceHash = async (source: string) => {
		let hash = sourceHashes.get(source);
		if (!hash) {
			hash = new Bun.CryptoHasher("sha256")
				.update(await Bun.file(sourceFile(source)).arrayBuffer())
				.digest("hex");
			sourceHashes.set(source, hash);
		}
		return hash;
	};
	const transform = (url: string) =>
		url.startsWith("/images/maps/tiles/")
			? "tile"
			: url.startsWith("/images/maps/thumbnails/")
				? "thumbnail"
				: "image";
	// Identical PNG sources can have different old WebP encodings. Group by
	// source bytes and resize rules as well as by the published bytes below.
	const bySource = new Map<string, string[]>();
	for (const { source, url } of manifest.assets) {
		const key = `${transform(url)}:${await sourceHash(source)}`;
		bySource.set(key, [...(bySource.get(key) ?? []), url]);
	}
	const sourceAliases = new Map<string, string>();
	const shortestFirst = (a: string, b: string) =>
		a.length - b.length || a.localeCompare(b);
	for (const group of bySource.values()) {
		group.sort(shortestFirst);
		for (const url of group.slice(1)) sourceAliases.set(url, group[0]);
	}
	let encoded = 0;
	const publicationOrder = [...manifest.assets].sort(
		(a, b) =>
			Number(sourceAliases.has(a.url)) - Number(sourceAliases.has(b.url)),
	);
	for (const { source, url } of publicationOrder) {
		const input = sourceFile(source);
		const output = publicPath(url);
		if (
			existsSync(output) &&
			statSync(output).mtimeMs >= statSync(input).mtimeMs
		)
			continue;
		// A removed duplicate can reuse its still-current canonical encoding when
		// both source bytes and resize rules match. No re-encoding on every run.
		const canonical = sourceAliases.get(url) ?? previousAliases[url];
		const canonicalSource = sources.get(canonical);
		if (canonicalSource && transform(url) === transform(canonical)) {
			const canonicalPath = publicPath(canonical);
			if (
				existsSync(canonicalPath) &&
				statSync(canonicalPath).mtimeMs >=
					Math.max(
						statSync(input).mtimeMs,
						statSync(sourceFile(canonicalSource)).mtimeMs,
					) &&
				(await sourceHash(source)) === (await sourceHash(canonicalSource))
			) {
				reusedAliases.set(url, canonical);
				continue;
			}
		}
		mkdirSync(dirname(output), { recursive: true });
		// One-time migration can reuse the exact encoding already shipped by the app.
		const filename = source
			.split("/")
			.at(-1)!
			.replace(/\.png$/, ".webp");
		const legacy =
			url.startsWith("/images/maps/") && !url.includes("/regions/")
				? join(
						publicRoot,
						"map",
						url.includes("/thumbnails/") ? "tiles-low" : "tiles",
						filename,
					)
				: join(publicRoot, "wuwa-assets", source.replace(/\.png$/, ".webp"));
		if (
			!existsSync(output) &&
			existsSync(legacy) &&
			statSync(legacy).mtimeMs >= statSync(input).mtimeMs
		) {
			copyFileSync(legacy, output);
			continue;
		}
		const image = new Bun.Image(input);
		if (
			url.startsWith("/images/maps/tiles/") ||
			url.startsWith("/images/maps/thumbnails/")
		) {
			const size = url.includes("/thumbnails/") ? 256 : 1024;
			await image
				.resize(size, size, { fit: "fill" })
				.webp({ quality: 82 })
				.write(output);
		} else {
			const { width, height } = await image.metadata();
			await image
				.webp(
					Math.max(width, height) > 256 ? { quality: 90 } : { lossless: true },
				)
				.write(output);
		}
		encoded++;
	}
	// Identical bytes get one canonical URL; catalogue aliases retain correct semantics.
	const byHash = new Map<string, string[]>();
	for (const url of manifest.urls) {
		const file = Bun.file(
			publishedAssetFile(
				sourceAliases.get(url) ?? reusedAliases.get(url) ?? url,
				publicRoot,
				previousAliases,
			),
		);
		if (!(await file.exists()))
			throw new Error(`Missing published asset: ${url}`);
		const hash = new Bun.CryptoHasher("sha256")
			.update(await file.arrayBuffer())
			.digest("hex");
		byHash.set(hash, [...(byHash.get(hash) ?? []), url]);
	}
	const aliases: Record<string, string> = {};
	for (const group of byHash.values()) {
		group.sort(shortestFirst);
		for (const url of group.slice(1)) aliases[url] = group[0];
	}
	const rewrite = (value: unknown): unknown =>
		typeof value === "string"
			? (aliases[value] ?? value)
			: Array.isArray(value)
				? value.map(rewrite)
				: value && typeof value === "object"
					? Object.fromEntries(
							Object.entries(value).map(([k, v]) => [
								k,
								k === "filterIcon" ? v : rewrite(v),
							]),
						)
					: value;
	for (const name of catalogs) {
		const path = join(root, `src/configs/${name}.json`);
		await Bun.write(
			path,
			JSON.stringify(
				rewrite(await Bun.file(path).json()),
				null,
				["progression", "inventory_data"].includes(name) ? undefined : "\t",
			) + "\n",
		);
	}
	const mapPath = join(publicRoot, "map/catalog.json");
	const map = rewrite(await Bun.file(mapPath).json()) as { icons: string[] };
	map.icons = [...new Set(map.icons)].sort();
	await Bun.write(mapPath, JSON.stringify(map) + "\n");
	await Bun.write(
		join(root, "src/configs/asset_aliases.json"),
		JSON.stringify(aliases, null, "\t") + "\n",
	);
	const urls = [
		...new Set(manifest.urls.map((url) => aliases[url] ?? url)),
	].sort();
	const assets = [
		...new Map(
			manifest.assets.map((entry) => [
				aliases[entry.url] ?? entry.url,
				{ ...entry, url: aliases[entry.url] ?? entry.url },
			]),
		).values(),
	].sort((a, b) => a.url.localeCompare(b.url));
	await Bun.write(
		manifestPath,
		JSON.stringify({ assets, urls }, null, "\t") + "\n",
	);
	const expected = new Set(urls.map(publicPath));
	// Validate every destination before removing any legacy or stale image.
	for (const path of expected)
		if (!existsSync(path))
			throw new Error(`Missing asset before cleanup: ${path}`);
	let removed = 0;
	for (const dir of ["icons", "images"]) {
		for (const path of filesIn(join(publicRoot, dir)))
			if (!expected.has(path)) {
				unlinkSync(publicPath(path.slice(publicRoot.length + 1)));
				removed++;
			}
		emptyDirectories(join(publicRoot, dir));
	}
	for (const dir of [
		"wuwa-assets",
		"characters",
		"weapons",
		"map/icons",
		"map/tiles",
		"map/tiles-low",
		"data/weapon-icons",
	]) {
		for (const path of filesIn(join(publicRoot, dir))) {
			unlinkSync(publicPath(path.slice(publicRoot.length + 1)));
			removed++;
		}
		emptyDirectories(join(publicRoot, dir));
	}
	for (const entry of readdirSync(publicRoot, { withFileTypes: true }))
		if (entry.isFile() && /\.(png|webp)$/.test(entry.name)) {
			unlinkSync(publicPath(entry.name));
			removed++;
		}
	await syncAssetsVersion();
	console.log(
		`Published ${urls.length} images (${encoded} encoded); consolidated ${Object.keys(aliases).length} duplicates; removed ${removed} stale/legacy files.`,
	);
}
if (import.meta.main) await copyAssets();
