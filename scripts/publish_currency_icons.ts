/** Publish currency artwork from a local wuwa-extract output, without changing the asset checkout.
 * bun scripts/publish_currency_icons.ts .cache/inventory-game-assets
 * Then run compile_inventory_data.ts and copy_assets.ts.
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { assetUrl } from "../src/lib/assets";
import { FIXED_CURRENCY_IDS } from "../src/lib/inventory";
import { unrealPathToRelative } from "./lib/compile-data-util";

const root = join(import.meta.dirname, "..");
const extractedRoot = resolve(
	Bun.argv[2] ?? join(root, ".cache/inventory-game-assets"),
);
const items: {
	Id: number;
	Icon: string;
	IconMiddle: string;
	IconSmall: string;
}[] = await Bun.file(
	join(root, "data/wuwa-data/BinData/item/iteminfo.json"),
).json();
for (const id of FIXED_CURRENCY_IDS) {
	const item = items.find((item) => item.Id === id);
	if (!item) throw new Error(`Currency ${id} is absent from game data`);
	let published = false;
	for (const path of [item.Icon, item.IconMiddle, item.IconSmall]) {
		const relative = unrealPathToRelative(path);
		if (!relative) continue;
		const source = join(
			extractedRoot,
			relative.replace("/wuwa-assets/", "").replace(/\.webp$/, ".png"),
		);
		if (!existsSync(source)) continue;
		const output = join(root, "public", assetUrl(relative));
		mkdirSync(dirname(output), { recursive: true });
		await new Bun.Image(source).webp({ lossless: true }).write(output);
		console.log(`Published currency ${id} from ${source}`);
		published = true;
		break;
	}
	if (!published)
		throw new Error(`Currency ${id} artwork is absent from ${extractedRoot}`);
}
