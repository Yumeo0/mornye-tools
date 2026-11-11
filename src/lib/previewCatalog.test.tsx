import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CharacterCard } from "@/components/characters/CharacterCard";
import { WeaponCard, weaponIconUrl } from "@/components/weapon/WeaponCard";
import characterData from "@/configs/character_data.json";
import previewData from "@/configs/preview_data.json";
import weaponData from "@/configs/weapon_data.json";
import { charactersById } from "./catalog";
import { mergePreviewCatalog } from "./catalogMerge";
import { allCharacters } from "./characters";
import { catalogWeapons, weaponsById } from "./weapons";

test("released data replaces stale previews without duplicate entries or preview labels", () => {
	const released = [{ id: 1, name: "Released" }];
	const previews = [
		{ id: 1, name: "Old preview", preview: true },
		{ id: 2, name: "Future", preview: true },
	];
	expect(
		mergePreviewCatalog<{ id: number; name: string; preview?: boolean }>(
			released,
			previews,
			(e) => e.id,
		),
	).toEqual([released[0], previews[1]]);
	expect(released).toEqual([{ id: 1, name: "Released" }]);
});

test("preview characters and weapons reach the same shared lookups as released data", () => {
	for (const preview of previewData.characters) {
		if (characterData.some((c) => c.character_id === preview.character_id))
			continue;
		expect(charactersById.get(preview.character_id)?.preview).toBe(true);
		const entries = allCharacters.filter((c) => c.id === preview.character_id);
		expect(entries).toHaveLength(1);
		expect(entries[0].image).toBe(preview.icon_pile);
		expect(entries[0].preview).toBe(true);
	}
	for (const preview of previewData.weapons) {
		if (weaponData.some((w) => w.item_id === preview.item_id)) continue;
		expect(weaponsById.get(preview.item_id)?.preview).toBe(true);
		expect(
			catalogWeapons.filter((w) => w.item_id === preview.item_id),
		).toHaveLength(1);
		expect(weaponIconUrl(preview.item_id)).toBe(preview.icon);
	}
});

test("preview cards show the label and artwork without implying a captured weapon level", () => {
	const character = allCharacters.find((entry) => entry.preview);
	const weapon = catalogWeapons.find((entry) => entry.preview);
	if (!character || !weapon) return; // No previews after all supported entries release.
	const characterHtml = renderToStaticMarkup(
		<CharacterCard
			character={character}
			account={undefined}
			onOpen={() => {}}
		/>,
	);
	expect(characterHtml).toContain("Preview");
	expect(characterHtml).toContain(character.image);
	expect(characterHtml).not.toContain("grayscale");
	const weaponHtml = renderToStaticMarkup(
		<WeaponCard
			weapon={{
				itemId: weapon.item_id,
				incrId: -weapon.item_id,
				level: 1,
				rank: 1,
				breach: 0,
			}}
			previewOnly
		/>,
	);
	expect(weaponHtml).toContain("Preview");
	expect(weapon.icon).toBeTruthy();
	expect(weaponHtml).toContain(weapon.icon ?? "");
	expect(weaponHtml).not.toContain("Weapon level");
	expect(weaponHtml).not.toContain("Refinement");
});
