/** Compile the selected profile-head item IDs, including skins and special
 * portraits, into the local image catalog. Run: bun scripts/compile_profile_data.ts
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { assetPath, indexBy } from "./lib/compile-data-util";
import { prepareCatalog } from "./lib/public-assets";

interface PlayerHead {
	Id: number;
	RoleSkinId: number;
	Icon: string;
	RoleHeadIconLarge?: string;
}

interface RoleSkin {
	Id: number;
	RoleHeadIconLarge: string;
	Icon?: string;
}

/** A head item is not a role ID. Default heads inherit their role-skin art;
 * event/skin heads can provide their own distinct portrait.
 */
export function buildProfilePortraits(
	heads: PlayerHead[],
	skins: RoleSkin[],
	resolve: (path: string) => string | null,
) {
	const bySkin = indexBy(skins, (skin) => skin.Id);
	return heads
		.flatMap((head) => {
			const skin = bySkin.get(head.RoleSkinId);
			const source =
				head.Icon ||
				head.RoleHeadIconLarge ||
				skin?.RoleHeadIconLarge ||
				skin?.Icon;
			const image = source ? resolve(source) : null;
			return image ? [{ id: head.Id, icon_head_256: image }] : [];
		})
		.sort((a, b) => a.id - b.id);
}

export async function compileProfileData() {
	const root = join(import.meta.dirname, "..");
	const assets = join(root, "data/wuwa-assets");
	const heads: PlayerHead[] = await Bun.file(
		join(root, "data/wuwa-data/BinData/PlayerHead/playerheadre.json"),
	).json();
	const skins: RoleSkin[] = await Bun.file(
		join(root, "data/wuwa-data/BinData/role/roleskin.json"),
	).json();
	const portraits = buildProfilePortraits(heads, skins, (source) => {
		const path = assetPath(source, assets);
		if (!path) return null;
		return existsSync(
			join(
				assets,
				path.replace("/wuwa-assets/", "").replace(/\.webp$/, ".png"),
			),
		)
			? path
			: null;
	});
	await Bun.write(
		join(root, "src/configs/profile_portraits.json"),
		`${JSON.stringify(prepareCatalog(portraits), null, "\t")}\n`,
	);
	console.log(
		`Compiled ${portraits.length} profile portraits (${heads.length - portraits.length} unavailable in the asset checkout).`,
	);
}

if (import.meta.main) await compileProfileData();
