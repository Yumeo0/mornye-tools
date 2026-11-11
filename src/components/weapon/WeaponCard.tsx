import { useState } from "react";
import { PreviewBadge } from "@/components/PreviewBadge";
import { CardBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Weapon } from "@/lib/account";
import { charactersById } from "@/lib/catalog";
import { qualityGradient, rarityTextClass } from "@/lib/rarity";
import { type WeaponCatalogEntry, weaponsById } from "@/lib/weapons";

export { type WeaponCatalogEntry, weaponsById } from "@/lib/weapons";

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
	1: "/icons/weapon-types/broadblade.webp",
	2: "/icons/weapon-types/sword.webp",
	3: "/icons/weapon-types/pistols.webp",
	4: "/icons/weapon-types/gauntlets.webp",
	5: "/icons/weapon-types/rectifier.webp",
};

/** Weapon images share the native game catalogue and the asset publisher. */
export function weaponIconUrl(itemId: number): string {
	return weaponsById.get(itemId)?.icon ?? `/images/weapons/${itemId}.webp`;
}

export function WeaponCard({
	weapon,
	previewOnly = false,
}: {
	weapon: Weapon;
	previewOnly?: boolean;
}) {
	const entry = weaponEntry(weapon);
	const name = weaponName(weapon);
	const character =
		weapon.equippedBy != null
			? charactersById.get(weapon.equippedBy)
			: undefined;
	const [failed, setFailed] = useState(false);

	return (
		<Card className="group/weapon relative aspect-696/960 overflow-hidden">
			{/* rarity-tinted gradient, like the in-game item cards */}
			<img
				src={qualityGradient(entry?.rarity)}
				alt=""
				aria-hidden
				className="pointer-events-none absolute inset-0 h-full w-full object-cover"
			/>
			<div className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/85 via-black/40 to-transparent" />

			{/* weapon type glyph (top-left), equipped character (top-right) */}
			<div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-1.5">
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
				{entry?.preview && <PreviewBadge />}
			</div>

			{/* weapon render */}
			<div className="pointer-events-none absolute inset-x-0 top-5 bottom-12 grid place-items-center px-1">
				{!failed && weapon.itemId ? (
					<img
						src={weaponIconUrl(weapon.itemId)}
						alt={name}
						onError={() => setFailed(true)}
						className="size-full object-contain drop-shadow-xl transition-transform duration-300 motion-safe:group-hover/weapon:scale-105"
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
				{!previewOnly && (
					<div className="flex flex-wrap items-center justify-center gap-1">
						<CardBadge title={`Weapon level ${weapon.level}`}>
							Lvl {weapon.level}
						</CardBadge>
						<CardBadge title="Resonance rank">Rank {weapon.rank}</CardBadge>
					</div>
				)}
			</div>
		</Card>
	);
}
