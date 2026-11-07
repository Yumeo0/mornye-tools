import { explorationCategoryLookup } from "../../../../scripts/map-categories";

// Small native-shaped tables keep classification tests independent of checkouts.
const categories: [number, string, string][] = [
	[7, "Blobfly", "SP_IconMap_Play_27_UI"],
	[9, "Viewpoint", "SP_IconMap_Play_28_UI"],
	[16, "Windchimer", "SP_IconMap_Play_12_UI"],
	[17, "Frostbug", "SP_IconMap_Play_26_UI"],
	[20, "Overflowing Palette", "SP_IconMap_Play_18_UI"],
	[22, "Dream Patrol", "SP_IconMap_Play_19_UI"],
	[23, "The Three Fratellis' Challenge", "SP_IconMap_Play_20_UI"],
	[25, "Musicfly", "SP_IconMap_Play_22_UI"],
	[36, "Ace Wings", "SP_IconMap_Play_37_UI"],
	[37, "Boat Racing", "SP_IconMap_Play_36_UI"],
	[39, "Flash Dodge", "SP_IconMap_Play_33_UI"],
	[40, "Dream Contagion", "SP_IconMap_Play_19_UI"],
	[47, "Dreams of Cindertide", "SP_IconMap_Play_48_UI"],
	[48, "Dreams of Cindertide: Finale", "SP_IconMap_Play_48_UI"],
];

export const nativeCategories = explorationCategoryLookup(
	categories.map(([degree]) => ({
		Area: 1,
		ExploreType: degree,
		SubTypeScore: [{ Key: degree }],
	})),
	categories.map(([degree, , icon]) => ({
		ExploreTypeKey: degree,
		Name: `type:${degree}`,
		Icon: `/Game/Aki/UI/${icon}.${icon}`,
	})),
	new Map(categories.map(([degree, name]) => [`type:${degree}`, name])),
);
