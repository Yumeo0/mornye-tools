import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

/** Index the map textures and atlas sprites from the wuwa-assets checkout. */
export function mapAssetSources(assetsRoot: string): Map<string, string> {
	const sources = new Map<string, string>();
	function walk(directory: string): void {
		if (!existsSync(directory)) return;
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) walk(path);
			else if (entry.name.endsWith(".png"))
				sources.set(basename(entry.name, ".png"), path);
		}
	}
	for (const directory of [
		"UI/UIResources/UiWorldMap/Image",
		"UI/UIResources/Common/Atlas/WorldMapIcon",
		"UI/UIResources/Common/Atlas/TabIcon",
	])
		walk(join(assetsRoot, directory));
	return sources;
}
