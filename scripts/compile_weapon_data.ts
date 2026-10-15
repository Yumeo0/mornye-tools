/**
 * Compile weapon display data for the Account UI.
 *
 * Produces `src/configs/weapon_data.json`:
 *
 *     [
 *       {
 *         "item_id": 21010074,
 *         "name": "Emerald of Genesis",
 *         "type": 1,                 // 1 Broadblade .. 5 Rectifier
 *         "rarity": 4,
 *         "icon": "/wuwa-assets/...webp",
 *         "base_atk": 33,            // level-1 base ATK
 *         "secondary": { "key": "critRate", "value": 4.5, "is_ratio": true }
 *       }, ...
 *     ]
 *
 * The `secondary.key` uses the same calculator stat keys as `echo_props.json`.
 * `is_ratio` marks percent scaling; `value` is already in display units.
 *
 * Run: bun scripts/compile_weapon_data.ts
 */

import { readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

const SCRIPTS_DIR = import.meta.dirname;
const REPO_ROOT = join(SCRIPTS_DIR, "..");
const DATA_DIR = join(REPO_ROOT, "data");
const WUWA_DATA = join(DATA_DIR, "wuwa-data");
const ASSETS_PATH = join(DATA_DIR, "wuwa-assets");

const MULTITEXT_PATH = join(WUWA_DATA, "Textmaps/en/multi_text/MultiText.json");
const WEAPON_CONF_PATH = join(WUWA_DATA, "BinData/weapon/weaponconf.json");
const PROPERTY_INDEX_PATH = join(WUWA_DATA, "BinData/property/propertyindex.json");

const OUTPUT_PATH = join(REPO_ROOT, "src/configs/weapon_data.json");

interface MultiTextEntry {
	Id?: number;
	Content?: string;
}

interface PropertyIndexEntry {
	Id?: number;
	Key?: string;
}

interface WeaponProp {
	Id?: number;
	Value?: number;
	IsRatio?: boolean;
}

interface WeaponConf {
	ItemId?: number;
	WeaponName?: number;
	WeaponType?: number;
	QualityId?: number;
	IconMiddle?: string;
	FirstPropId?: WeaponProp | null;
	SecondPropId?: WeaponProp | null;
}

interface WeaponSecondary {
	key: string;
	value: number | null;
	is_ratio: boolean;
}

interface WeaponEntry {
	item_id: number;
	name: string;
	type: number | undefined;
	type_name: string;
	rarity: number | undefined;
	icon: string | null;
	base_atk: number | null;
	secondary: WeaponSecondary | null;
}

const WEAPON_TYPE_NAMES: Record<number, string> = {
	1: "Broadblade",
	2: "Sword",
	3: "Pistols",
	4: "Gauntlets",
	5: "Rectifier",
};

const KEY_TO_STAT_FLAT: Record<string, string> = {
	GreenLifeMax: "hpFlat",
	GreenAtk: "atkFlat",
	GreenDef: "defFlat",
};

const KEY_TO_STAT_PERCENT: Record<string, string> = {
	GreenLifeMax: "hpPercent",
	GreenAtk: "atkPercent",
	GreenDef: "defPercent",
};

const KEY_TO_STAT: Record<string, string> = {
	Crit: "critRate",
	GreenCrit: "critRate",
	CritDamage: "critDmg",
	GreenCritDamage: "critDmg",
	EnergyEfficiency: "energyRegen",
	GreenEnergyEfficiency: "energyRegen",
	HealChange: "healingBonus",
	GreenHealChange: "healingBonus",
	DamageChangeNormalSkill: "resonanceSkill",
	DamageChangeAuto: "basicAtk",
	DamageChangeCast: "heavyAtk",
	DamageChangeUltra: "resonanceLiberation",
};

/** Load a JSON file, reporting the same failures the original compiler did. */
async function loadJson<T>(filePath: string): Promise<T | null> {
	try {
		return (await Bun.file(filePath).json()) as T;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			console.log(`Error: File not found at ${filePath}`);
		} else {
			console.log(`Error: Failed to parse ${filePath}`);
		}
		return null;
	}
}

/**
 * Index 300k+ MultiText entries by id. The first entry wins, matching the
 * linear scan this replaces.
 */
function indexBy<T, K>(entries: T[], key: (entry: T) => K | undefined): Map<K, T> {
	const index = new Map<K, T>();
	for (const entry of entries) {
		const id = key(entry);
		if (id === undefined || id === null) continue;
		if (!index.has(id)) index.set(id, entry);
	}
	return index;
}

// Directory listings are stable for the duration of a run, so read each one once.
const directoryCache = new Map<string, string[]>();

function listDirectory(dir: string): string[] {
	const cached = directoryCache.get(dir);
	if (cached) return cached;
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		entries = [];
	}
	directoryCache.set(dir, entries);
	return entries;
}

/**
 * Some asset files have different capitalization than the data references, so
 * check the real directory listing and adopt the on-disk stem.
 */
function fixFilePathCapitalization(relativePath: string | null): string | null {
	if (!relativePath) return null;
	const filePath = join(ASSETS_PATH, relativePath.replace("/wuwa-assets/", ""));
	const parentDir = join(filePath, "..");
	const extension = extname(filePath);
	const stem = basename(filePath, extension);

	// Compare stems only: the published extension (.webp) differs from the
	// source files on disk (.png).
	for (const entry of listDirectory(parentDir)) {
		const entryExtension = extname(entry);
		if (basename(entry, entryExtension).toLowerCase() === stem.toLowerCase()) {
			const directory = relativePath.slice(0, relativePath.lastIndexOf("/"));
			return `${directory}/${basename(entry, entryExtension)}${extension}`;
		}
	}
	return relativePath;
}

function convertUnrealPathToRelative(unrealPath: string | null | undefined): string | null {
	if (!unrealPath) return null;
	let result = unrealPath.replace("/Game/Aki/", "");
	if (result.includes(".")) result = result.slice(0, result.lastIndexOf("."));
	result = `${result}.webp`;
	return fixFilePathCapitalization(`/wuwa-assets/${result}`);
}

function statFor(propKey: string | undefined, isRatio: boolean): string | undefined {
	if (propKey === undefined) return undefined;
	if (Object.hasOwn(KEY_TO_STAT_FLAT, propKey)) {
		return isRatio ? KEY_TO_STAT_PERCENT[propKey] : KEY_TO_STAT_FLAT[propKey];
	}
	if (Object.hasOwn(KEY_TO_STAT_PERCENT, propKey)) return KEY_TO_STAT_PERCENT[propKey];
	return Object.hasOwn(KEY_TO_STAT, propKey) ? KEY_TO_STAT[propKey] : undefined;
}

/** Python's round(x, 3), matching the original compiler's output. */
function round3(value: number): number {
	return Number(value.toFixed(3));
}

/**
 * Python renders the rounded ratio as a float, so whole numbers keep their
 * `.0` (`12.0`). JSON.stringify drops it, which would make every regenerated
 * file differ on those lines, so restore it for the ratio fields only.
 */
function withPythonFloatRatios(json: string): string {
	return json.replace(/"value": (\d+)(,\n(\t+)"is_ratio": true)/g, '"value": $1.0$2');
}

async function compileWeaponData(): Promise<void> {
	console.log("Loading weapon tables...");
	const multitextData = await loadJson<MultiTextEntry[]>(MULTITEXT_PATH);
	const weaponData = await loadJson<WeaponConf[]>(WEAPON_CONF_PATH);
	const propertyData = await loadJson<PropertyIndexEntry[]>(PROPERTY_INDEX_PATH);

	if (!multitextData || !weaponData || !propertyData) {
		console.log("Error: Failed to load one or more required files");
		return;
	}

	const textById = indexBy(multitextData, (entry) => entry.Id);
	const keyById = new Map<number | undefined, string | undefined>();
	for (const entry of propertyData) keyById.set(entry.Id, entry.Key);

	const weapons: WeaponEntry[] = [];
	const unmappedSecondary: unknown[][] = [];
	for (const weapon of weaponData) {
		const itemId = weapon.ItemId;
		const name = weapon.WeaponName === undefined ? undefined : textById.get(weapon.WeaponName)?.Content;
		if (!itemId || !name) continue;

		const first = weapon.FirstPropId ?? {};
		const second = weapon.SecondPropId ?? {};
		const baseAtk = first.Id === 7 ? (first.Value ?? null) : null;

		let secondary: WeaponSecondary | null = null;
		if (second && Object.keys(second).length > 0) {
			const propKey = keyById.get(second.Id);
			const stat = statFor(propKey, Boolean(second.IsRatio));
			if (stat) {
				let value: number | null = second.Value ?? null;
				if (second.IsRatio) value = round3(Number(value) * 100);
				secondary = { key: stat, value, is_ratio: Boolean(second.IsRatio) };
			} else {
				unmappedSecondary.push([itemId, second.Id, propKey]);
			}
		}

		weapons.push({
			item_id: itemId,
			name,
			type: weapon.WeaponType,
			type_name: WEAPON_TYPE_NAMES[weapon.WeaponType ?? -1] ?? "Unknown",
			rarity: weapon.QualityId,
			icon: convertUnrealPathToRelative(weapon.IconMiddle),
			base_atk: baseAtk,
			secondary,
		});
	}

	if (unmappedSecondary.length > 0) {
		console.log(`WARNING unmapped weapon secondary props: ${JSON.stringify(unmappedSecondary.slice(0, 20))}`);
	}

	console.log(`Writing ${weapons.length} weapons to ${OUTPUT_PATH}...`);
	await Bun.write(OUTPUT_PATH, `${withPythonFloatRatios(JSON.stringify(weapons, null, "\t"))}\n`);
	console.log(`Successfully wrote ${OUTPUT_PATH}`);
}

if (import.meta.main) {
	console.log("=".repeat(60));
	console.log("Weapon Data Compiler");
	console.log("=".repeat(60));
	await compileWeaponData();
	console.log("\nDone!");
}

export { compileWeaponData };
