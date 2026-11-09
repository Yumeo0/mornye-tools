import { z } from "zod";

const strings = z.array(z.string());
const range = (min: number, max: number) =>
	z
		.tuple([z.number().min(min).max(max), z.number().min(min).max(max)])
		.refine(([low, high]) => low <= high);

export const characterFiltersSchema = z.object({
	search: z.string(),
	elements: strings,
	weaponTypes: strings,
	rarity: z.array(z.number()),
	ownedOnly: z.boolean(),
	levelRange: range(1, 90),
	chainRange: range(0, 6),
});
export const characterSortSchema = z.enum([
	"name",
	"level",
	"chain",
	"rarity",
	"echoes",
]);

export const echoFiltersSchema = z.object({
	search: z.string(),
	minLevel: z.number().min(0).max(25),
	maxLevel: z.number().min(0).max(25),
	cost: z.array(z.number()),
	set: strings,
	mainStat: z.string(),
	substat: strings,
	character: strings,
	marks: z.array(z.enum(["locked", "discarded", "none"])),
});
export const echoSortSchema = z.enum([
	"none",
	"rollValue",
	"level",
	"cost",
	"set",
	"name",
	"character",
]);

export const weaponFiltersSchema = z.object({
	search: z.string(),
	minLevel: z.number().min(1).max(90),
	type: strings,
	rarity: strings,
	character: strings,
});
export const weaponSortSchema = z.enum([
	"none",
	"level",
	"rarity",
	"name",
	"type",
	"character",
]);

export const optimizerFiltersSchema = z.object({
	useRecommended: z.boolean().default(false),
	minEnergyRegen: z.number().min(0).max(1000).default(0),
	equipped: z.enum(["include", "exclude-others", "exclude-all"]),
	minLevel: z.number().min(0).max(25),
	sets: strings,
	mainStats: strings,
	substats: strings,
});

export const visibilityOverridesSchema = z.record(z.string(), z.boolean());
export const mapVisibilitySchema = z.enum(["all", "remaining", "collected"]);
