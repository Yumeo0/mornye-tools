/** Publish inventory artwork from a local wuwa-extract output without changing the asset checkout.
 * bun scripts/publish_inventory_icons.ts .cache/inventory-game-assets 7
 * Optional trailing MainTypeIds restrict publication (7 = Valuables). Omit to publish all items.
 * Then run compile_inventory_data.ts and copy_assets.ts.
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { assetUrl } from "../src/lib/assets";
import { unrealPathToRelative } from "./lib/compile-data-util";

const root = join(import.meta.dirname, "..");
const extractedRoot = resolve(
	Bun.argv[2] ?? join(root, ".cache/inventory-game-assets"),
);
const mainTypeIds = Bun.argv.slice(3).map(Number);
if (mainTypeIds.some((id) => !Number.isInteger(id) || id < 0))
	throw new Error("MainTypeIds must be nonnegative integers");
const items: {
	Id: number;
	MainTypeId: number;
	Icon: string;
	IconMiddle: string;
	IconSmall: string;
}[] = await Bun.file(
	join(root, "data/wuwa-data/BinData/item/iteminfo.json"),
).json();
const missing: number[] = [];
let published = 0;
let checked = 0;
for (const item of items) {
	if (mainTypeIds.length && !mainTypeIds.includes(item.MainTypeId)) continue;
	checked++;
	let found = false;
	for (const path of [item.Icon, item.IconMiddle, item.IconSmall]) {
		const relative = unrealPathToRelative(path);
		if (!relative) continue;
		const output = join(root, "public", assetUrl(relative));
		if (existsSync(output)) {
			found = true;
			break;
		}
		const source = join(
			extractedRoot,
			relative.replace("/wuwa-assets/", "").replace(/\.webp$/, ".png"),
		);
		if (!existsSync(source)) continue;
		mkdirSync(dirname(output), { recursive: true });
		await new Bun.Image(source).webp({ lossless: true }).write(output);
		published++;
		found = true;
		break;
	}
	if (!found) missing.push(item.Id);
}
console.log(
	`Checked ${checked} inventory items; published ${published} icons; missing: ${JSON.stringify(missing)}.`,
);
if (missing.length) process.exitCode = 1;
