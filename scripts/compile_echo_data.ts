/**
 * Compile echo (phantom) data for the Account UI.
 *
 * Produces `src/configs/echo_data.json`: one entry per quality-5 phantom item,
 * with its sonata sets, possible mainstats, the shared substat list and the
 * icon paths the UI renders.
 *
 * Run: bun scripts/compile_echo_data.ts
 */

import { join } from "node:path";

import {
	indexBy,
	loadJson,
	unrealPathToRelative,
} from "./lib/compile-data-util";

const SCRIPTS_DIR = import.meta.dirname;
const REPO_ROOT = join(SCRIPTS_DIR, "..");
const DATA_DIR = join(REPO_ROOT, "data");
const WUWA_DATA = join(DATA_DIR, "wuwa-data");

const MULTITEXT_PATH = join(WUWA_DATA, "Textmaps/en/multi_text/MultiText.json");
const PHANTOM_ITEM_PATH = join(WUWA_DATA, "BinData/phantom/phantomitem.json");
const PHANTOM_FETTER_GROUP_PATH = join(
	WUWA_DATA,
	"BinData/phantom/phantomfettergroup.json",
);
const PHANTOM_MAIN_PROPERTY_PATH = join(
	WUWA_DATA,
	"BinData/phantom/phantommainproperty.json",
);
const PHANTOM_MAIN_PROP_ITEM_PATH = join(
	WUWA_DATA,
	"BinData/phantom/phantommainpropitem.json",
);
const PHANTOM_SUB_PROPERTY_PATH = join(
	WUWA_DATA,
	"BinData/phantom/phantomsubproperty.json",
);
const PROPERTY_INDEX_PATH = join(
	WUWA_DATA,
	"BinData/property/propertyindex.json",
);

const OUTPUT_PATH = join(REPO_ROOT, "src/configs/echo_data.json");

interface MultiTextEntry {
	Id?: number;
	Content?: string;
}

interface PropertyIndexEntry {
	Id?: number;
	Name?: number;
}

interface FetterEntry {
	Id?: number;
	FetterGroupName?: number;
	FetterElementPath?: string;
}

interface MainPropItem {
	Id?: number;
	PropId?: number;
}

interface MainProp {
	RandGroupId?: number;
	PropGroup?: number[];
}

interface SubPropEntry {
	PropId?: number;
}

interface PhantomItem {
	QualityId?: number;
	ItemId?: number;
	MonsterId?: number;
	MonsterName?: number;
	Icon?: string;
	IconMiddle?: string;
	IconSmall?: string;
	FetterGroup?: number[];
	MainProp?: MainProp;
}

interface EchoSetEntry {
	id: number | null;
	name: string;
	icon: string | null;
}

interface EchoEntry {
	echo_name: string;
	echo_id: number;
	monster_id: number | null;
	echo_cost: number;
	icon_head: string | null;
	icon_middle: string | null;
	icon_small: string | null;
	echo_sets: EchoSetEntry[];
	possible_mainstats: string[];
	possible_substats: string[];
}

/** Cost from the possible mainstats: "Crit. DMG" -> 4, element DMG -> 3, else 1. */
function determineEchoCost(mainstats: string[]): number {
	if (mainstats.includes("Crit. DMG")) return 4;

	const elementBonuses = [
		"Havoc DMG Bonus",
		"Glacio DMG Bonus",
		"Fusion DMG Bonus",
		"Electro DMG Bonus",
		"Aero DMG Bonus",
		"Spectro DMG Bonus",
	];
	for (const bonus of elementBonuses) {
		if (mainstats.includes(bonus)) return 3;
	}

	return 1;
}

function getPropertyName(
	propId: number | undefined,
	propertyById: Map<number, PropertyIndexEntry>,
	textById: Map<number, MultiTextEntry>,
): string {
	const name =
		propId === undefined
			? undefined
			: textById.get(propertyById.get(propId)?.Name ?? -1)?.Content;
	return name ? name : `Unknown (PropId: ${propId})`;
}

function getEchoSetInfo(
	fetterGroupIds: number[],
	fetterById: Map<number, FetterEntry>,
	textById: Map<number, MultiTextEntry>,
): EchoSetEntry[] {
	const setInfo: EchoSetEntry[] = [];
	for (const fetterId of fetterGroupIds) {
		const fetterEntry = fetterById.get(fetterId);
		if (!fetterEntry) continue;
		const setName = textById.get(fetterEntry.FetterGroupName ?? -1)?.Content;
		if (setName) {
			setInfo.push({
				id: fetterId ?? null,
				name: setName,
				icon: unrealPathToRelative(fetterEntry.FetterElementPath),
			});
		}
	}
	return setInfo;
}

function getPossibleMainstats(
	mainProp: MainProp,
	propGroupsByRandGroupId: Map<number, number[]>,
	mainPropItemById: Map<number, MainPropItem>,
	propertyById: Map<number, PropertyIndexEntry>,
	textById: Map<number, MultiTextEntry>,
): string[] {
	const randGroupId = mainProp.RandGroupId;
	if (!randGroupId) return [];

	const propGroups = propGroupsByRandGroupId.get(randGroupId) ?? [];

	const mainstats: string[] = [];
	for (const propGroupId of new Set(propGroups)) {
		const item = mainPropItemById.get(propGroupId);
		if (!item) continue;
		const propName = getPropertyName(item.PropId, propertyById, textById);
		if (!mainstats.includes(propName)) mainstats.push(propName);
	}

	return mainstats.sort();
}

function getPossibleSubstats(
	subPropData: SubPropEntry[],
	propertyById: Map<number, PropertyIndexEntry>,
	textById: Map<number, MultiTextEntry>,
): string[] {
	const propIds = new Set<number>();
	for (const entry of subPropData) {
		if (entry.PropId) propIds.add(entry.PropId);
	}

	const substats: string[] = [];
	for (const propId of propIds) {
		const propName = getPropertyName(propId, propertyById, textById);
		if (propName && !substats.includes(propName)) substats.push(propName);
	}

	substats.push("HP%");
	substats.push("ATK%");
	substats.push("DEF%");

	return substats.sort();
}

async function compileEchoData(): Promise<void> {
	console.log("Loading JSON files...");

	const multitextData = await loadJson<MultiTextEntry[]>(MULTITEXT_PATH);
	const phantomData = await loadJson<PhantomItem[]>(PHANTOM_ITEM_PATH);
	const fetterData = await loadJson<FetterEntry[]>(PHANTOM_FETTER_GROUP_PATH);
	const mainPropData = await loadJson<MainProp[]>(PHANTOM_MAIN_PROPERTY_PATH);
	const mainPropItemData = await loadJson<MainPropItem[]>(
		PHANTOM_MAIN_PROP_ITEM_PATH,
	);
	const subPropData = await loadJson<SubPropEntry[]>(PHANTOM_SUB_PROPERTY_PATH);
	const propertyData =
		await loadJson<PropertyIndexEntry[]>(PROPERTY_INDEX_PATH);

	if (
		!multitextData ||
		!phantomData ||
		!fetterData ||
		!mainPropData ||
		!mainPropItemData ||
		!subPropData ||
		!propertyData
	) {
		console.log("Error: Failed to load one or more required files");
		return;
	}

	console.log(`Found ${phantomData.length} phantom items`);

	const textById = indexBy(multitextData, (entry) => entry.Id);
	const propertyById = indexBy(propertyData, (entry) => entry.Id);
	const fetterById = indexBy(fetterData, (entry) => entry.Id);
	const mainPropItemById = indexBy(mainPropItemData, (entry) => entry.Id);

	const propGroupsByRandGroupId = new Map<number, number[]>();
	for (const entry of mainPropData) {
		const randGroupId = entry.RandGroupId;
		if (randGroupId === undefined || randGroupId === null) continue;
		const groups = propGroupsByRandGroupId.get(randGroupId);
		if (groups) groups.push(...(entry.PropGroup ?? []));
		else propGroupsByRandGroupId.set(randGroupId, [...(entry.PropGroup ?? [])]);
	}

	const possibleSubstats = getPossibleSubstats(
		subPropData,
		propertyById,
		textById,
	);

	const echoList: EchoEntry[] = [];
	let processed = 0;

	for (const phantomItem of phantomData) {
		if (phantomItem.QualityId !== 5) continue;

		const monsterNameId = phantomItem.MonsterName;
		const echoId = phantomItem.ItemId;
		const monsterId = phantomItem.MonsterId;

		if (!monsterNameId || !echoId) continue;

		const echoName = textById.get(monsterNameId)?.Content;
		if (!echoName) continue;

		const setInfo = getEchoSetInfo(
			phantomItem.FetterGroup ?? [],
			fetterById,
			textById,
		);

		const mainstats = getPossibleMainstats(
			phantomItem.MainProp ?? {},
			propGroupsByRandGroupId,
			mainPropItemById,
			propertyById,
			textById,
		);

		echoList.push({
			echo_name: echoName,
			echo_id: echoId,
			monster_id: monsterId ?? null,
			echo_cost: determineEchoCost(mainstats),
			icon_head: unrealPathToRelative(phantomItem.Icon),
			icon_middle: unrealPathToRelative(phantomItem.IconMiddle),
			icon_small: unrealPathToRelative(phantomItem.IconSmall),
			echo_sets: setInfo,
			possible_mainstats: mainstats,
			possible_substats: possibleSubstats,
		});
		processed += 1;

		console.log(`Processed: ${echoName} (ID: ${echoId})`);
	}

	console.log(`\nWriting ${processed} echoes to ${OUTPUT_PATH}...`);
	await Bun.write(OUTPUT_PATH, `${JSON.stringify(echoList, null, "\t")}\n`);

	console.log(`✓ Successfully compiled echo data to ${OUTPUT_PATH}`);
	console.log(`  Total echoes: ${processed}`);
	console.log(`  Total substats: ${possibleSubstats.length}`);
}

if (import.meta.main) {
	console.log("=".repeat(60));
	console.log("Echo Data Compiler");
	console.log("=".repeat(60));

	await compileEchoData();

	console.log("\nDone!");
}

export { compileEchoData };
