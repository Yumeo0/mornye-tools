import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { assetUrl } from "../src/lib/assets";
import { unrealPathToRelative } from "./lib/compile-data-util";
import { dataLog } from "./lib/data-log";

interface Item {
	Id: number;
	Name: string;
	Icon: string;
	IconMiddle: string;
	IconSmall: string;
	QualityId: number;
	MainTypeId: number;
}

/** Static item labels only; owned quantities always come from the selected profile. */
export async function compileInventoryData() {
	const root = join(import.meta.dirname, "..");
	const read = <T>(path: string): Promise<T> =>
		Bun.file(join(root, "data/wuwa-data", path)).json();
	const [items, textRows, types] = await Promise.all([
		read<Item[]>("BinData/item/iteminfo.json"),
		read<{ Id: string; Content: string }[]>(
			"Textmaps/en/multi_text/MultiText.json",
		),
		read<{ Id: number; Name: string; Icon: string }[]>(
			"BinData/bag/itemmaintype.json",
		),
	]);
	const texts = new Map(textRows.map((row) => [row.Id, row.Content]));
	const label = (key: string) =>
		(texts.get(key) ?? "").replace(/<[^>]*>/g, "").trim();
	const categories = new Map(types.map((type) => [type.Id, label(type.Name)]));
	let published = 0;
	async function publishIcon(paths: string[]): Promise<string | null> {
		for (const path of paths) {
			const relative = unrealPathToRelative(path);
			if (!relative) continue;
			const url = assetUrl(relative);
			const output = join(root, "public", url);
			const source = join(
				root,
				"data",
				relative
					.replace("/wuwa-assets/", "wuwa-assets/")
					.replace(/\.webp$/, ".png"),
			);
			if (!existsSync(output) && !existsSync(source)) continue;
			if (!existsSync(output)) {
				mkdirSync(dirname(output), { recursive: true });
				await new Bun.Image(source).webp({ quality: 85 }).write(output);
				published++;
			}
			return url;
		}
		return null;
	}
	const catalog = [];
	for (const item of items) {
		const icon = await publishIcon([
			item.Icon,
			item.IconMiddle,
			item.IconSmall,
		]);
		catalog.push({
			id: item.Id,
			name: label(item.Name) || `Item ${item.Id}`,
			rarity: item.QualityId,
			category:
				categories.get(item.MainTypeId) ||
				(item.MainTypeId === 0 ? "Currencies" : "Other"),
			icon,
		});
	}
	const categoryCatalog = new Map<
		string,
		{ name: string; icon: string | null }
	>();
	for (const type of types) {
		const name = label(type.Name);
		if (name)
			categoryCatalog.set(name, { name, icon: await publishIcon([type.Icon]) });
	}
	categoryCatalog.set("Currencies", {
		name: "Currencies",
		icon: catalog.find((item) => item.id === 2)?.icon ?? null,
	});
	categoryCatalog.set("Other", {
		name: "Other",
		icon: "/icons/navigation/inventory.webp",
	});
	await Bun.write(
		join(root, "src/configs/inventory_categories.json"),
		`${JSON.stringify([...categoryCatalog.values()])}\n`,
	);
	const navigationIcon = join(root, "public/icons/navigation/inventory.webp");
	if (!existsSync(navigationIcon)) {
		await new Bun.Image(
			join(
				root,
				"data/wuwa-assets/UI/UIResources/UiFunc/Atlas/SP_FuncIconBag.png",
			),
		)
			.webp({ lossless: true })
			.write(navigationIcon);
	}
	await Bun.write(
		join(root, "src/configs/inventory_data.json"),
		`${JSON.stringify(catalog)}\n`,
	);
	dataLog.info(
		`Compiled ${catalog.length} inventory items; published ${published} icons.`,
	);
}

if (import.meta.main) await compileInventoryData();
