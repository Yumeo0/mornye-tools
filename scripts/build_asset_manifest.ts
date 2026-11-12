/** Build the exact publication list from rendered catalogue fields and UI code. */
import { dataLog } from "./lib/data-log";
import {
	type AssetManifest,
	assetSources,
	collectAssetRefs,
	manifestPath,
	publishedAssetFile,
	sourceFile,
} from "./lib/public-assets";

export async function buildAssetManifest(): Promise<AssetManifest> {
	const sources = assetSources();
	const urls = [...(await collectAssetRefs())].sort();
	const assets: AssetManifest["assets"] = [];
	for (const url of urls) {
		const candidates = sources.get(url);
		if (!candidates?.length) {
			if (await Bun.file(publishedAssetFile(url)).exists()) continue;
			throw new Error(`No source or authored asset for ${url}`);
		}
		const source = candidates.sort()[0];
		const hash = new Bun.CryptoHasher("sha256")
			.update(await Bun.file(sourceFile(source)).arrayBuffer())
			.digest("hex");
		for (const other of candidates.slice(1)) {
			const otherHash = new Bun.CryptoHasher("sha256")
				.update(await Bun.file(sourceFile(other)).arrayBuffer())
				.digest("hex");
			if (hash !== otherHash)
				throw new Error(
					`Conflicting texture names for ${url}: ${source}, ${other}`,
				);
		}
		assets.push({ source, url });
	}
	const manifest = { assets, urls };
	await Bun.write(manifestPath, `${JSON.stringify(manifest, null, "\t")}\n`);
	dataLog.info(
		`Asset manifest: ${assets.length} game textures, ${urls.length - assets.length} authored images.`,
	);
	return manifest;
}
if (import.meta.main) await buildAssetManifest();
