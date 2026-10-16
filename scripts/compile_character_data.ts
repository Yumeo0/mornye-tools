/**
 * Compile character (resonator) data for the Account UI.
 *
 * Produces `src/configs/character_data.json`: one entry per playable role, with
 * element/weapon metadata, resonance chain icons and names, and the icon paths
 * the UI renders.
 *
 * Run: bun scripts/compile_character_data.ts
 */

import { join } from "node:path";

import {
	assetPath,
	fixFilePathCapitalization,
	indexBy,
	loadJson,
} from "./lib/compile-data-util";

const SCRIPTS_DIR = import.meta.dirname;
const REPO_ROOT = join(SCRIPTS_DIR, "..");
const DATA_DIR = join(REPO_ROOT, "data");
const WUWA_DATA = join(DATA_DIR, "wuwa-data");
// Assets path from the source wuwa-assets directory
const ASSETS_PATH = join(DATA_DIR, "wuwa-assets");

const MULTITEXT_PATH = join(WUWA_DATA, "Textmaps/en/multi_text/MultiText.json");
const ROLE_INFO_PATH = join(WUWA_DATA, "BinData/role/roleinfo.json");
const PROPERTY_INDEX_PATH = join(
	WUWA_DATA,
	"BinData/property/propertyindex.json",
);
const ELEMENT_INFO_PATH = join(
	WUWA_DATA,
	"BinData/element_info/elementinfo.json",
);
const RESONANT_CHAIN_PATH = join(
	WUWA_DATA,
	"BinData/resonate_chain/resonantchain.json",
);

const OUTPUT_PATH = join(REPO_ROOT, "src/configs/character_data.json");

interface MultiTextEntry {
	Id?: number;
	Content?: string;
}

interface ElementInfo {
	Id?: number;
	Icon?: string;
	Icon3?: string;
	Icon4Pure?: string;
}

interface ResonantChainNode {
	GroupId?: number;
	GroupIndex?: number;
	NodeIcon?: string;
	NodeName?: number;
}

interface RoleInfo {
	Id?: number;
	Name?: number;
	NickName?: number;
	Introduction?: number;
	ElementId?: number;
	WeaponType?: number;
	QualityId?: number;
	MaxLevel?: number;
	IsShow?: boolean;
	IsTrial?: boolean;
	ResonantChainGroupId?: number;
	RoleHeadIcon?: string;
	RoleHeadIconBig?: string;
	Card?: string;
	RoleHeadIconLarge?: string;
	RoleHeadIconCircle?: string;
	FormationRoleCard?: string;
	RolePortrait?: string;
}

interface ElementIcons {
	icon_round: string | null;
	icon_128: string | null;
	icon_128_pure: string | null;
}

interface ChainInfo {
	icons: (string | null)[];
	names: (string | null)[];
}

interface CharacterEntry {
	character_id: number;
	character_name: string;
	nickname: string | null;
	introduction: string | null;
	element: string;
	element_id: number | undefined;
	element_icon_round: string | null;
	element_icon_128: string | null;
	element_icon_128_pure: string | null;
	weapon_type: string;
	weapon_type_id: number | undefined;
	weapon_type_icon: string | null;
	chain_icons: (string | null)[];
	chain_names: (string | null)[];
	rarity: number | undefined;
	icon_head_80: string | null;
	icon_head_150: string | null;
	icon_head_175: string | null;
	icon_head_256: string | null;
	icon_head_circle: string | null;
	icon_pile: string | null;
	icon_portrait: string | null;
	max_level: number | null;
	is_show: boolean;
}

function getText(
	textId: number | undefined,
	textById: Map<number, MultiTextEntry>,
): string | undefined {
	return textId === undefined ? undefined : textById.get(textId)?.Content;
}

/** Unreal path -> published asset path for this script's asset root. */
function convertUnrealPathToRelative(
	unrealPath: string | null | undefined,
): string | null {
	return assetPath(unrealPath, ASSETS_PATH);
}

function getElementName(elementId: number | undefined): string {
	const elementMap: Record<number, string> = {
		0: "None",
		1: "Glacio",
		2: "Fusion",
		3: "Electro",
		4: "Aero",
		5: "Spectro",
		6: "Havoc",
	};
	return elementMap[elementId ?? -1] ?? "Unknown";
}

/**
 * Game/calculator weapon type ids: 1 Broadblade, 2 Sword, 3 Pistols,
 * 4 Gauntlets, 5 Rectifier.
 */
function getWeaponTypeName(weaponType: number | undefined): string {
	const weaponMap: Record<number, string> = {
		1: "Broadblade",
		2: "Sword",
		3: "Pistols",
		4: "Gauntlets",
		5: "Rectifier",
	};
	return weaponMap[weaponType ?? -1] ?? "Unknown";
}

// Weapon type id -> in-game weapon glyph (Common/Image/Com/Icon)
const WEAPON_TYPE_ICON_FILES: Record<number, string> = {
	1: "T_ComIconBroadblade.webp",
	2: "T_ComIconSword.webp",
	3: "T_ComIconPistols.webp",
	4: "T_ComIconGauntlets.webp",
	5: "T_ComIconRectifier.webp",
};

function getWeaponTypeIcon(weaponTypeId: number | undefined): string | null {
	const file =
		weaponTypeId === undefined
			? undefined
			: WEAPON_TYPE_ICON_FILES[weaponTypeId];
	if (!file) return null;
	return fixFilePathCapitalization(
		`/wuwa-assets/UI/UIResources/Common/Image/Com/Icon/${file}`,
		ASSETS_PATH,
	);
}

/** Group chain nodes by GroupId, sorted by GroupIndex. */
function buildChainData(
	resonantChainData: ResonantChainNode[],
): Map<number, ResonantChainNode[]> {
	const chains = new Map<number, ResonantChainNode[]>();
	for (const node of resonantChainData) {
		const groupId = node.GroupId;
		if (groupId === undefined || groupId === null) continue;
		const group = chains.get(groupId);
		if (group) group.push(node);
		else chains.set(groupId, [node]);
	}
	for (const nodes of chains.values()) {
		nodes.sort((a, b) => (a.GroupIndex ?? 0) - (b.GroupIndex ?? 0));
	}
	return chains;
}

/** Resonance chain node icons and names for a role. */
function getChainInfo(
	role: RoleInfo,
	chains: Map<number, ResonantChainNode[]>,
	textById: Map<number, MultiTextEntry>,
): ChainInfo {
	const nodes = chains.get(role.ResonantChainGroupId as number) ?? [];
	return {
		icons: nodes.map((node) => convertUnrealPathToRelative(node.NodeIcon)),
		names: nodes.map((node) => getText(node.NodeName, textById) ?? null),
	};
}

function getElementIcons(
	elementId: number | undefined,
	elementInfoData: ElementInfo[],
): ElementIcons {
	for (const element of elementInfoData) {
		if (element.Id === elementId) {
			return {
				icon_round: convertUnrealPathToRelative(element.Icon),
				icon_128: convertUnrealPathToRelative(element.Icon3),
				icon_128_pure: convertUnrealPathToRelative(element.Icon4Pure),
			};
		}
	}
	return { icon_round: null, icon_128: null, icon_128_pure: null };
}

async function compileCharacterData(): Promise<void> {
	console.log("Loading JSON files...");

	const multitextData = await loadJson<MultiTextEntry[]>(MULTITEXT_PATH);
	const roleInfoData = await loadJson<RoleInfo[]>(ROLE_INFO_PATH);
	const propertyData = await loadJson<unknown[]>(PROPERTY_INDEX_PATH);
	const elementInfoData = await loadJson<ElementInfo[]>(ELEMENT_INFO_PATH);
	const resonantChainData =
		await loadJson<ResonantChainNode[]>(RESONANT_CHAIN_PATH);

	if (!multitextData || !roleInfoData || !propertyData || !elementInfoData) {
		console.log("Error: Failed to load one or more required files");
		return;
	}

	console.log(`Found ${roleInfoData.length} role entries`);

	const textById = indexBy(multitextData, (entry) => entry.Id);
	const chains = buildChainData(resonantChainData ?? []);

	const characterList: CharacterEntry[] = [];
	let processed = 0;

	for (const role of roleInfoData) {
		// Skip trial characters.
		if (role.IsTrial ?? false) continue;

		const roleId = role.Id;
		if (!roleId) continue;

		const characterName = getText(role.Name, textById);
		// Skip if no name found (likely not a real character).
		if (!characterName) continue;

		const nickname = getText(role.NickName, textById);
		const introduction = getText(role.Introduction, textById);

		const elementId = role.ElementId;
		const element = getElementName(elementId);
		const elementIcons = getElementIcons(elementId, elementInfoData);

		const weaponType = getWeaponTypeName(role.WeaponType);
		const weaponTypeIcon = getWeaponTypeIcon(role.WeaponType);

		const chainInfo = getChainInfo(role, chains, textById);

		characterList.push({
			character_id: roleId,
			character_name: characterName,
			nickname: nickname ?? null,
			introduction: introduction ?? null,
			element,
			element_id: elementId,
			element_icon_round: elementIcons.icon_round,
			element_icon_128: elementIcons.icon_128,
			element_icon_128_pure: elementIcons.icon_128_pure,
			weapon_type: weaponType,
			weapon_type_id: role.WeaponType,
			weapon_type_icon: weaponTypeIcon,
			chain_icons: chainInfo.icons,
			chain_names: chainInfo.names,
			rarity: role.QualityId,
			icon_head_80: convertUnrealPathToRelative(role.RoleHeadIcon),
			icon_head_150: convertUnrealPathToRelative(role.RoleHeadIconBig),
			icon_head_175: convertUnrealPathToRelative(role.Card),
			icon_head_256: convertUnrealPathToRelative(role.RoleHeadIconLarge),
			icon_head_circle: convertUnrealPathToRelative(role.RoleHeadIconCircle),
			icon_pile: convertUnrealPathToRelative(role.FormationRoleCard),
			icon_portrait: convertUnrealPathToRelative(role.RolePortrait),
			max_level: role.MaxLevel ?? null,
			is_show: role.IsShow ?? false,
		});
		processed += 1;

		console.log(
			`Processed: ${characterName} (ID: ${roleId}) - ${element} - ${weaponType}`,
		);
	}

	console.log(`\nWriting ${processed} characters to ${OUTPUT_PATH}...`);
	await Bun.write(
		OUTPUT_PATH,
		`${JSON.stringify(characterList, null, "\t")}\n`,
	);

	console.log(`✓ Successfully compiled character data to ${OUTPUT_PATH}`);
	console.log(`  Total characters: ${processed}`);
}

if (import.meta.main) {
	console.log("=".repeat(60));
	console.log("Character Data Compiler");
	console.log("=".repeat(60));

	await compileCharacterData();

	console.log("\nDone!");
}

export { compileCharacterData };
