import previewData from "@/configs/preview_data.json";
import weaponData from "@/configs/weapon_data.json";
import { mergePreviewCatalog } from "./catalogMerge";

export interface WeaponCatalogEntry {
	item_id: number;
	name: string;
	type: number;
	type_name: string;
	rarity: number;
	icon: string | null;
	base_atk?: number | null;
	preview?: boolean;
}

export const catalogWeapons = mergePreviewCatalog<WeaponCatalogEntry>(
	weaponData,
	previewData.weapons,
	(weapon) => weapon.item_id,
);

export const weaponsById = new Map(
	catalogWeapons.map((weapon) => [weapon.item_id, weapon]),
);
