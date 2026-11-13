import { expect, test } from "bun:test";
import {
	characterPortraits,
	type ExtractedSpineModel,
	type PortraitSkin,
	portraitPlacement,
	webpAtlas,
} from "./spine-assets";

const model = (
	overrides: Partial<ExtractedSpineModel> = {},
): ExtractedSpineModel => ({
	category: "portrait",
	characterIds: [1209],
	skeleton: "Portraits_Moning/Portraits_Moning.skel",
	atlas: "Portraits_Moning/Portraits_Moning.atlas",
	version: "4.1.23",
	textures: [],
	...overrides,
});

const skin = (overrides: Partial<PortraitSkin> = {}): PortraitSkin => ({
	Id: 81001209,
	RoleId: 1209,
	FormationSpineSkeletonData:
		"/Game/Aki/Portraits_Moning/Portraits_Moning.Portraits_Moning-data",
	FormationSpineAtlas:
		"/Game/Aki/Portraits_Moning/Portraits_Moning.Portraits_Moning-atlas",
	SpineParam: [-20, -190, 0.24],
	...overrides,
});

test("placement comes from the matching base skin, not the first costume record", () => {
	const skins = [skin({ Id: 81011209, SpineParam: [100, -1000, 0.5] }), skin()];
	expect(portraitPlacement(skins, 1209, model())).toEqual({
		x: -20,
		y: -190,
		scale: 0.24,
	});
	expect(() => portraitPlacement([skins[0]], 1209, model())).toThrow(
		"Base skin",
	);
});

test("shared portraits retain the placement for each individual character ID", () => {
	const shared = model({ characterIds: [1209, 1210] });
	const skins = [
		skin(),
		skin({ Id: 81001210, RoleId: 1210, SpineParam: [15, -230, 0.3] }),
	];
	expect(portraitPlacement(skins, 1209, shared).x).toBe(-20);
	expect(portraitPlacement(skins, 1210, shared)).toEqual({
		x: 15,
		y: -230,
		scale: 0.3,
	});
});

test("refuses stale model references and malformed formation parameters", () => {
	for (const override of [
		{
			FormationSpineSkeletonData:
				"/Game/Aki/Portraits_Moning/Portraits_Moning.Other-data",
		},
		{
			FormationSpineAtlas:
				"/Game/Aki/Portraits_Moning/Portraits_Moning.Other-atlas",
		},
		{ RoleId: 1210 },
	])
		expect(() => portraitPlacement([skin(override)], 1209, model())).toThrow(
			"Base skin",
		);
	for (const SpineParam of [
		[0, 0],
		[0, 0, 0],
		[0, 0, -1],
		[0, NaN, 1],
		[0, 0, Infinity],
	])
		expect(() =>
			portraitPlacement([skin({ SpineParam })], 1209, model()),
		).toThrow("Invalid SpineParam");
});

test("selects base portraits and retains every ID for shared Rover models", () => {
	const base = model();
	const rover = model({
		characterIds: [1501, 1406],
		skeleton: "Rover/Rover.skel",
	});
	const selected = characterPortraits([
		model({ skeleton: "Moning1/Moning_Skin1.skel" }),
		model({ category: "gacha" }),
		model({ category: "chibi" }),
		model({ characterIds: [] }),
		rover,
		base,
	]);
	expect(selected).toHaveLength(2);
	expect(selected).toContain(base);
	expect(selected.find((entry) => entry === rover)?.characterIds).toEqual([
		1501, 1406,
	]);
});

test("refuses ambiguous character mappings and incompatible skeleton versions", () => {
	expect(() =>
		characterPortraits([model(), model({ skeleton: "Other.skel" })]),
	).toThrow("Multiple base portraits");
	expect(() => characterPortraits([model({ version: "4.2.0" })])).toThrow(
		"Unsupported portrait format",
	);
});

test("rewrites multipage atlas declarations without changing regions or dimensions", () => {
	const atlas =
		"first.png\r\nsize:2048,2048\r\nsecond.png\r\nbounds:0,0,20,20\r\n\r\nsecond.png\r\nsize:1024,1024\r\nface\r\nbounds:20,20,30,30\r\n";
	expect(webpAtlas(atlas, ["first.png", "second.png"])).toBe(
		"first.webp\nsize:2048,2048\nsecond.png\nbounds:0,0,20,20\n\nsecond.webp\nsize:1024,1024\nface\nbounds:20,20,30,30\n",
	);
});
