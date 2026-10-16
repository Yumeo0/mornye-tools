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

import { join } from "node:path";

import { assetPath, indexBy, loadJson } from "./lib/compile-data-util";

const SCRIPTS_DIR = import.meta.dirname;
const REPO_ROOT = join(SCRIPTS_DIR, "..");
const DATA_DIR = join(REPO_ROOT, "data");
const WUWA_DATA = join(DATA_DIR, "wuwa-data");
const ASSETS_PATH = join(DATA_DIR, "wuwa-assets");

const MULTITEXT_PATH = join(WUWA_DATA, "Textmaps/en/multi_text/MultiText.json");
const WEAPON_CONF_PATH = join(WUWA_DATA, "BinData/weapon/weaponconf.json");
const PROPERTY_INDEX_PATH = join(
	WUWA_DATA,
	"BinData/property/propertyindex.json",
);

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

/** Unreal path -> published asset path for this script's asset root. */
function convertUnrealPathToRelative(
	unrealPath: string | null | undefined,
): string | null {
	return assetPath(unrealPath, ASSETS_PATH);
}

function statFor(
	propKey: string | undefined,
	isRatio: boolean,
): string | undefined {
	if (propKey === undefined) return undefined;
	if (Object.hasOwn(KEY_TO_STAT_FLAT, propKey)) {
		return isRatio ? KEY_TO_STAT_PERCENT[propKey] : KEY_TO_STAT_FLAT[propKey];
	}
	if (Object.hasOwn(KEY_TO_STAT_PERCENT, propKey))
		return KEY_TO_STAT_PERCENT[propKey];
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
	return json.replace(
		/"value": (\d+)(,\n(\t+)"is_ratio": true)/g,
		'"value": $1.0$2',
	);
}

async function compileWeaponData(): Promise<void> {
	console.log("Loading weapon tables...");
	const multitextData = await loadJson<MultiTextEntry[]>(MULTITEXT_PATH);
	const weaponData = await loadJson<WeaponConf[]>(WEAPON_CONF_PATH);
	const propertyData =
		await loadJson<PropertyIndexEntry[]>(PROPERTY_INDEX_PATH);

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
		const name =
			weapon.WeaponName === undefined
				? undefined
				: textById.get(weapon.WeaponName)?.Content;
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
		console.log(
			`WARNING unmapped weapon secondary props: ${JSON.stringify(unmappedSecondary.slice(0, 20))}`,
		);
	}

	console.log(`Writing ${weapons.length} weapons to ${OUTPUT_PATH}...`);
	await Bun.write(
		OUTPUT_PATH,
		`${withPythonFloatRatios(JSON.stringify(weapons, null, "\t"))}\n`,
	);
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
