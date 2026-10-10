import { useState } from "react";
import { charactersById } from "@/components/echo/EchoCard";
import { CardBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Weapon } from "@/lib/account";
import { qualityGradient, rarityTextClass } from "@/lib/rarity";
import weaponData from "../../configs/weapon_data.json";

export interface WeaponCatalogEntry {
	item_id: number;
	name: string;
	type: number;
	type_name: string;
	rarity: number;
	icon: string | null;
	base_atk?: number | null;
}

export const weaponsById = new Map<number, WeaponCatalogEntry>(
	(weaponData as WeaponCatalogEntry[]).map((weapon) => [
		weapon.item_id,
		weapon,
	]),
);

export function weaponEntry(weapon: Weapon): WeaponCatalogEntry | undefined {
	return weaponsById.get(weapon.itemId);
}

export function weaponName(weapon: Weapon): string {
	const entry = weaponEntry(weapon);
	if (entry) return entry.name;
	return weapon.itemId ? `Weapon ${weapon.itemId}` : "Unknown weapon";
}

export function weaponRarityClass(
	rarity: number | undefined,
): string | undefined {
	return rarity != null ? rarityTextClass(rarity) : undefined;
}

// Weapon type id -> in-game glyph (Common/Image/Com/Icon)
export const WEAPON_TYPE_ICONS: Record<number, string> = {
	1: "/wuwa-assets/UI/UIResources/Common/Image/Com/Icon/T_ComIconBroadblade.png",
	2: "/wuwa-assets/UI/UIResources/Common/Image/Com/Icon/T_ComIconSword.png",
	3: "/wuwa-assets/UI/UIResources/Common/Image/Com/Icon/T_ComIconPistols.png",
	4: "/wuwa-assets/UI/UIResources/Common/Image/Com/Icon/T_ComIconGauntlets.png",
	5: "/wuwa-assets/UI/UIResources/Common/Image/Com/Icon/T_ComIconRectifier.png",
};

/** Icons are synced by `scripts/sync-calc-data.mjs` into `public/data`. */
export function weaponIconUrl(itemId: number): string {
	return `/data/weapon-icons/${itemId}.webp`;
}

export function WeaponCard({ weapon }: { weapon: Weapon }) {
	const entry = weaponEntry(weapon);
	const name = weaponName(weapon);
	const character =
		weapon.equippedBy != null
			? charactersById.get(weapon.equippedBy)
			: undefined;
	const [failed, setFailed] = useState(false);

	return (
		<Card className="relative aspect-696/960 overflow-hidden">
			{/* rarity-tinted gradient, like the in-game item cards */}
			<img
				src={qualityGradient(entry?.rarity)}
				alt=""
				aria-hidden
				className="pointer-events-none absolute inset-0 h-full w-full object-cover"
			/>
			<div className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/85 via-black/40 to-transparent" />

			{/* weapon type glyph (top-left), equipped character (top-right) */}
			<div className="absolute inset-x-0 top-0 flex items-start justify-between p-1.5">
				{entry ? (
					<img
						src={WEAPON_TYPE_ICONS[entry.type]}
						alt={entry.type_name}
						title={entry.type_name}
						className="size-5 object-contain brightness-0 opacity-70 drop-shadow dark:brightness-100 dark:opacity-90"
					/>
				) : (
					<span className="size-5" />
				)}
				{character ? (
					<img
						src={character.icon_head_256}
						alt={character.character_name}
						title={`Equipped by ${character.character_name}`}
						className="size-7 rounded-full object-cover ring-1 ring-white/25 drop-shadow-md"
					/>
				) : (
					<span className="size-7" />
				)}
			</div>

			{/* weapon render */}
			<div className="absolute inset-0 grid place-items-center px-3">
				{!failed && weapon.itemId ? (
					<img
						src={weaponIconUrl(weapon.itemId)}
						alt={name}
						onError={() => setFailed(true)}
						className={`size-24 object-contain drop-shadow-xl ${
							character ? "" : "opacity-60 grayscale"
						}`}
					/>
				) : null}
			</div>

			<div className="absolute inset-x-0 bottom-0 space-y-1.5 px-2 pb-2.5 pt-8 text-center">
				<p
					className="truncate text-sm font-medium text-white drop-shadow"
					title={name}
				>
					{name}
				</p>
				<div className="flex flex-wrap items-center justify-center gap-1">
					<CardBadge title={`Weapon level ${weapon.level}`}>
						Lv {weapon.level}
					</CardBadge>
					<CardBadge title="Resonance rank">Rank {weapon.rank}</CardBadge>
				</div>
			</div>
		</Card>
	);
}
