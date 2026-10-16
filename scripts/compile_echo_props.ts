/**
 * Compile the echo property-id -> calculator stat-key tables.
 *
 * Produces `src/configs/echo_props.json`:
 *
 *     {
 *       "main": { "<phantom main prop item id>": "<statKey>", ... },
 *       "sub":  { "<phantomsubproperty id>": "<statKey>",
 *                 "<propId>|<addType>": "<statKey>", ... }
 *     }
 *
 * `main` maps `PhantomMainPropItem.Id` (e.g. 5001) and `sub` maps
 * `PhantomSubProperty.Id` (1..19) - both are what the packet sends as
 * `PhantomPropInfo.PhantomPropId`. The `propId|addType` aliases are included so
 * the table stays robust if the game switches to raw property ids.
 *
 * Keys match the snake/camel keys of the calculator core echo scope:
 * hpFlat, hpPercent, atkFlat, atkPercent, defFlat, defPercent, critRate, critDmg,
 * energyRegen, basicAtk, heavyAtk, resonanceSkill, resonanceLiberation,
 * healingBonus, aero, glacio, electro, fusion, spectro, havoc.
 *
 * Run: bun scripts/compile_echo_props.ts
 */

import { join } from "node:path";

const SCRIPTS_DIR = import.meta.dirname;
const REPO_ROOT = join(SCRIPTS_DIR, "..");
const DATA_DIR = join(REPO_ROOT, "data");
const WUWA_DATA = join(DATA_DIR, "wuwa-data");

const MAIN_PROP_ITEM_PATH = join(
	WUWA_DATA,
	"BinData/phantom/phantommainpropitem.json",
);
const SUB_PROPERTY_PATH = join(
	WUWA_DATA,
	"BinData/phantom/phantomsubproperty.json",
);
const PROPERTY_INDEX_PATH = join(
	WUWA_DATA,
	"BinData/property/propertyindex.json",
);

const OUTPUT_PATH = join(REPO_ROOT, "src/configs/echo_props.json");

interface PropertyIndexEntry {
	Id?: number;
	Key?: string;
}

interface PropItem {
	Id?: number;
	PropId?: number;
	AddType?: number;
}

async function readJson<T>(path: string): Promise<T> {
	return (await Bun.file(path).json()) as T;
}

// (propertyindex.Key, AddType) -> calculator stat key. AddType 1 is flat,
// AddType 2 is percent for the hp/atk/def triples.
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
	GreenDamageChangeNormalSkill: "resonanceSkill",
	DamageChangeAuto: "basicAtk",
	GreenDamageChangeAuto: "basicAtk",
	DamageChangeCast: "heavyAtk",
	GreenDamageChangeCast: "heavyAtk",
	DamageChangeUltra: "resonanceLiberation",
	GreenDamageChangeUltra: "resonanceLiberation",
	// ElementDamageChangeN -> element id N (1 Glacio, 2 Fusion, 3 Electro,
	// 4 Aero, 5 Spectro, 6 Havoc).
	DamageChangeElement1: "glacio",
	DamageChangeElement2: "fusion",
	DamageChangeElement3: "electro",
	DamageChangeElement4: "aero",
	DamageChangeElement5: "spectro",
	DamageChangeElement6: "havoc",
	GreenDamageChangeElement1: "glacio",
	GreenDamageChangeElement2: "fusion",
	GreenDamageChangeElement3: "electro",
	GreenDamageChangeElement4: "aero",
	GreenDamageChangeElement5: "spectro",
	GreenDamageChangeElement6: "havoc",
};

function hasOwn(source: Record<string, string>, key: string): boolean {
	return Object.hasOwn(source, key);
}

/** Map a (propertyindex.Key, AddType) pair to a calculator stat key. */
function statFor(
	propKey: string | undefined,
	addType: number | undefined,
): string | undefined {
	if (propKey === undefined) return undefined;
	if (
		hasOwn(KEY_TO_STAT_FLAT, propKey) ||
		hasOwn(KEY_TO_STAT_PERCENT, propKey)
	) {
		if (addType === 1) return KEY_TO_STAT_FLAT[propKey];
		if (addType === 2) return KEY_TO_STAT_PERCENT[propKey];
		return undefined;
	}
	return hasOwn(KEY_TO_STAT, propKey) ? KEY_TO_STAT[propKey] : undefined;
}

/**
 * Serialize the two id-keyed maps in insertion order.
 *
 * JavaScript objects list integer-like keys first in numeric order, which would
 * scramble ids like "5001"; a Map keeps the source file's order, so the written
 * table stays stable across runs.
 */
function serializeIdMaps(sections: [string, Map<string, string>][]): string {
	const lines = ["{"];
	sections.forEach(([name, section], sectionIndex) => {
		const items = [...section];
		if (items.length === 0) {
			lines.push(`\t${JSON.stringify(name)}: {}`);
		} else {
			lines.push(`\t${JSON.stringify(name)}: {`);
			items.forEach(([key, value], index) => {
				const comma = index < items.length - 1 ? "," : "";
				lines.push(
					`\t\t${JSON.stringify(key)}: ${JSON.stringify(value)}${comma}`,
				);
			});
			lines.push("\t}");
		}
		if (sectionIndex < sections.length - 1) lines[lines.length - 1] += ",";
	});
	lines.push("}");
	return `${lines.join("\n")}\n`;
}

async function compileEchoProps(): Promise<void> {
	console.log("Loading property tables...");
	const mainPropItemData = await readJson<PropItem[]>(MAIN_PROP_ITEM_PATH);
	const subPropData = await readJson<PropItem[]>(SUB_PROPERTY_PATH);
	const propertyData =
		await readJson<PropertyIndexEntry[]>(PROPERTY_INDEX_PATH);

	const keyById = new Map<number | undefined, string | undefined>();
	for (const entry of propertyData) {
		keyById.set(entry.Id, entry.Key);
	}

	const main = new Map<string, string>();
	const unmappedMain: unknown[][] = [];
	for (const item of mainPropItemData) {
		const itemId = item.Id;
		const propId = item.PropId;
		const addType = item.AddType;
		const propKey = keyById.get(propId);
		const stat = propKey ? statFor(propKey, addType) : undefined;
		if (stat) {
			main.set(String(itemId), stat);
		} else {
			unmappedMain.push([itemId, propId, addType, propKey]);
		}
	}

	const sub = new Map<string, string>();
	const unmappedSub: unknown[][] = [];
	for (const entry of subPropData) {
		const subId = entry.Id;
		const propId = entry.PropId;
		const addType = entry.AddType;
		const propKey = keyById.get(propId);
		const stat = propKey ? statFor(propKey, addType) : undefined;
		if (stat) {
			// Packet identity is the sub property id (1..19).
			sub.set(String(subId), stat);
			// Robust alias by raw property id + add type.
			sub.set(`${propId}|${addType}`, stat);
		} else {
			unmappedSub.push([subId, propId, addType, propKey]);
		}
	}

	console.log(
		`Mapped ${main.size} main prop ids, ${sub.size} sub prop entries`,
	);
	if (unmappedMain.length > 0)
		console.log(`WARNING unmapped main props: ${JSON.stringify(unmappedMain)}`);
	if (unmappedSub.length > 0)
		console.log(`WARNING unmapped sub props: ${JSON.stringify(unmappedSub)}`);

	await Bun.write(
		OUTPUT_PATH,
		serializeIdMaps([
			["main", main],
			["sub", sub],
		]),
	);

	console.log(`Successfully wrote ${OUTPUT_PATH}`);
}

if (import.meta.main) {
	console.log("=".repeat(60));
	console.log("Echo Props Compiler");
	console.log("=".repeat(60));
	await compileEchoProps();
	console.log("\nDone!");
}

export { compileEchoProps };
