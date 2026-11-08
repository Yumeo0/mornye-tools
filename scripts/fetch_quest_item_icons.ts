/** Fill artwork absent from the game asset checkout. Run before compile_inventory_data.ts.
 * The public files are shipped locally; the app never downloads artwork at runtime.
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { assetUrl } from "../src/lib/assets";
import { unrealPathToRelative } from "./lib/compile-data-util";

const root = join(import.meta.dirname, "..");
const items: {
	Id: number;
	MainTypeId: number;
	Icon: string;
	IconMiddle: string;
	IconSmall: string;
}[] = await Bun.file(
	join(root, "data/wuwa-data/BinData/item/iteminfo.json"),
).json();
const pending = items.filter((item) => item.MainTypeId === 6);
const downloads = new Map<string, Promise<boolean>>();
let downloaded = 0;
async function fetchIcon(path: string): Promise<boolean> {
	const relative = unrealPathToRelative(path);
	if (!relative) return false;
	const output = join(root, "public", assetUrl(relative));
	if (existsSync(output)) return true;
	const source = join(
		root,
		"data",
		relative
			.replace("/wuwa-assets/", "wuwa-assets/")
			.replace(/\.webp$/, ".png"),
	);
	if (existsSync(source)) return true;
	if (!downloads.has(output))
		downloads.set(
			output,
			(async () => {
				const name = relative
					.split("/")
					.at(-1)
					?.replace(/\.webp$/, ".png");
				const response = await fetch(
					`https://wuthering.gg/images/items/${name}`,
					{
						headers: {
							"User-Agent": "Mozilla/5.0",
							Referer: "https://wuthering.gg/items",
						},
						signal: AbortSignal.timeout(20000),
					},
				);
				if (response.status === 404) return false;
				if (!response.ok)
					throw new Error(`Icon ${name}: HTTP ${response.status}`);
				const image = new Bun.Image(await response.arrayBuffer());
				await image.metadata();
				mkdirSync(dirname(output), { recursive: true });
				await image.webp({ lossless: true }).write(output);
				downloaded++;
				return true;
			})(),
		);
	return downloads.get(output) ?? false;
}
const missing: number[] = [];
let checked = 0;
await Promise.all(
	Array.from({ length: 8 }, async () => {
		while (pending.length) {
			const item = pending.pop();
			if (!item) break;
			let found = false;
			for (const path of [
				...new Set([item.Icon, item.IconMiddle, item.IconSmall]),
			]) {
				if (await fetchIcon(path)) {
					found = true;
					break;
				}
			}
			if (!found) missing.push(item.Id);
			if (++checked % 50 === 0)
				console.log(
					`Checked ${checked} quest items; downloaded ${downloaded} icons.`,
				);
		}
	}),
);
console.log(
	`Checked ${checked} quest items; downloaded ${downloaded} icons; missing: ${JSON.stringify(missing)}.`,
);
