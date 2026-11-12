import { expect, test } from "bun:test";
import { join } from "node:path";
import previewData from "../src/configs/preview_data.json";
import { charactersById } from "../src/lib/catalog";
import { weaponsById } from "../src/lib/weapons";
import { nanokaImage, nanokaVersion } from "./compile-preview-data";
import { publicRoot } from "./lib/public-assets";

test("preview imports use the catalog version published by Nanoka", () => {
	expect(
		nanokaVersion(
			'<script data-url="https://static.nanoka.cc/ww/3.8/character.json">',
		),
	).toBe("3.8");
	expect(() => nanokaVersion("unavailable")).toThrow("version not found");
});

test("Nanoka native texture references map to bundled game artwork paths", () => {
	expect(
		nanokaImage(
			"/Game/Aki/UI/UIResources/Common/Image/IconRolePile/T_IconRole_Pile_Lili_UI.T_IconRole_Pile_Lili_UI",
		),
	).toEqual({
		source:
			"https://static.nanoka.cc/assets/ww/UIResources/Common/Image/IconRolePile/T_IconRole_Pile_Lili_UI.webp",
		url: "/images/resonators/artwork/lili.webp",
	});
	expect(() => nanokaImage("../../outside.webp")).toThrow();
	expect(() => nanokaImage("https://another-site.test/icon.webp")).toThrow();
});

test("all imported preview images are valid bundled textures with source attribution", async () => {
	const assets: Record<string, string> = previewData.assets;
	for (const [url, source] of Object.entries(assets)) {
		expect(source.startsWith("https://static.nanoka.cc/assets/ww/")).toBe(true);
		const { width, height } = await new Bun.Image(
			join(publicRoot, url.slice(1)),
		).metadata();
		expect(width, url).toBeGreaterThan(0);
		expect(height, url).toBeGreaterThan(0);
	}
});

test("every calculator-supported character and weapon has a shared catalog entry and bundled artwork", async () => {
	const { getCatalog } = await import(
		"../src/lib/calc/riley/engine.generated.js"
	);
	const members = [
		...new Map(
			getCatalog()
				.teams.flatMap((t) => t.members)
				.map((m) => [m.characterId, m]),
		).values(),
	];
	for (const member of members) {
		const character = charactersById.get(member.characterId);
		expect(character, member.name).toBeDefined();
		expect(
			await Bun.file(
				join(publicRoot, character?.icon_head_256 ?? "missing"),
			).exists(),
			member.name,
		).toBe(true);
		for (const weapon of member.weapons) {
			const entry = weaponsById.get(weapon.id);
			expect(entry, weapon.name).toBeDefined();
			expect(
				await Bun.file(join(publicRoot, entry?.icon ?? "missing")).exists(),
				weapon.name,
			).toBe(true);
		}
	}
});
