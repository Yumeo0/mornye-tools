// Account export: assemble one JSON document from the parts of the account
// snapshot the user picked in Settings, so the result can be copied to the
// clipboard or written to disk. Pure, so the selection and the document shape
// stay testable without the Tauri account store.
//
// The exported schema renames the internal store's fields into self-explanatory
// ones (e.g. `incrId` -> `instanceId`, `funcValue` -> `markState`) and decodes
// opaque enum values into strings, so consumers do not need this codebase to
// read a document.

import type {
	AccountSnapshot,
	EchoProp,
	EchoSource,
	PlayerInfo,
	StatKey,
} from "@/lib/account";

/** Format version of the exported document; consumers branch on this. */
export const EXPORT_FORMAT_VERSION = 1;

/** The selectable data groups of an export, in canonical (document) order. */
export const EXPORT_PARTS = ["resonators", "weapons", "echoes"] as const;

export type ExportPart = (typeof EXPORT_PARTS)[number];

/** Caption of one part in the settings UI. */
export const EXPORT_PART_LABELS: Record<ExportPart, string> = {
	resonators: "Resonators",
	weapons: "Weapons",
	echoes: "Echoes",
};

/** What one part contributes, shown under its caption. */
export const EXPORT_PART_DESCRIPTIONS: Record<ExportPart, string> = {
	resonators: "Level, breakthrough, chain and skill nodes",
	weapons: "Level, breach, rank and the resonator carrying them",
	echoes: "Equipped and unequipped echoes with their stats",
};

// ---------------------------------------------------------------------------
// The exported document
// ---------------------------------------------------------------------------

/** Player card; its keys already read as written, so it is copied verbatim. */
export type ExportPlayer = PlayerInfo;

/** One resonator skill tree node. */
export interface ExportSkillNode {
	/** Skill tree node id. */
	nodeId: number;
	level: number;
}

/**
 * One resonator. No name: the captured store leaves resonator names empty
 * (names are catalog presentation), so the id is the identity.
 */
export interface ExportResonator {
	/** Game id of the resonator (role id). */
	resonatorId: number;
	level: number;
	/** Ascension phase (0..=6). */
	breakthrough: number;
	/** Resonance chain level (0..=6), i.e. the "sequence" node count. */
	chain: number;
	skills: ExportSkillNode[];
}

export interface ExportWeapon {
	/** Game instance id of this weapon copy. */
	instanceId: number;
	/** Inventory item id of the weapon. */
	itemId: number;
	level: number;
	/** Ascension phase (0..=6). */
	breach: number;
	/** Resonance rank: how many copies were superimposed (1..=5). */
	rank: number;
	/** Resonator wielding it, by resonator id; omitted when unequipped. */
	equippedByResonatorId?: number | null;
}

/**
 * Item mark state of an echo, decoded from the store's numeric `funcValue`.
 * The game can both lock and discard-mark an item, so this is not a boolean.
 */
export type EchoMarkState = "none" | "locked" | "markedForDiscard";

/** One echo main/sub stat. */
export interface ExportEchoStat {
	/** Game property id (`PhantomPropId`). */
	statId: number;
	/** Calculator stat key, e.g. `"critDmg"`. */
	statKey: StatKey;
	/** Display value (percent stats are already /100, e.g. 44 for 44%). */
	value: number;
	/** Lossless raw game value (percent stats are fixed-point x100). */
	rawValue: number;
}

export interface ExportEcho {
	/** Game instance id of this echo copy (stable identity). */
	instanceId: number;
	/** Inventory item id of the echo. */
	itemId: number;
	/** Echo species id. */
	monsterId: number;
	/** Echo set ("sonata") id. */
	echoSetId: number;
	level: number;
	markState: EchoMarkState;
	/** How many identical echoes this entry represents (always >= 1). */
	stackCount: number;
	mainStats: ExportEchoStat[];
	subStats: ExportEchoStat[];
	/** Resonator it is equipped by, by resonator id; omitted when unequipped. */
	equippedByResonatorId?: number | null;
	/** Slot within the equipped set: 0 is the main echo, 1..4 the others. */
	slotIndex?: number | null;
	/** Where the echo came from; manual entries are user-owned. */
	source: EchoSource;
}

/**
 * The exported document: snapshot metadata plus exactly the selected arrays.
 * Deselected parts are omitted, not empty, so consumers can tell "not
 * exported" from "captured nothing".
 */
export interface AccountExport {
	version: number;
	/** When the sniffer last updated the snapshot this export came from. */
	updatedAt: string;
	/** When this document was written. */
	exportedAt: string;
	player: ExportPlayer | null;
	resonators?: ExportResonator[];
	weapons?: ExportWeapon[];
	echoes?: ExportEcho[];
}

// ---------------------------------------------------------------------------
// Mapping from the internal store model
// ---------------------------------------------------------------------------

/** Decode the game's numeric item mark state into a readable string. */
export function echoMarkState(funcValue: number): EchoMarkState {
	switch (funcValue) {
		case 1:
			return "locked";
		case 2:
			return "markedForDiscard";
		default:
			return "none";
	}
}

function exportStat(prop: EchoProp): ExportEchoStat {
	return {
		statId: prop.propId,
		statKey: prop.key,
		value: prop.value,
		rawValue: prop.raw,
	};
}

/** How many entries a part contributes for this snapshot. */
export function exportPartCount(
	snapshot: AccountSnapshot,
	part: ExportPart,
): number {
	return snapshot[part].length;
}

/**
 * Build the export document. `exportedAt` is injectable for tests; the JSON
 * key order follows [`EXPORT_PARTS`] so document diffs stay stable.
 */
export function buildAccountExport(
	snapshot: AccountSnapshot,
	parts: readonly ExportPart[],
	exportedAt: Date = new Date(),
): AccountExport {
	const selected = new Set(parts);
	const doc: AccountExport = {
		version: EXPORT_FORMAT_VERSION,
		updatedAt: snapshot.updatedAt,
		exportedAt: exportedAt.toISOString(),
		player: snapshot.player ?? null,
	};
	if (selected.has("resonators")) {
		doc.resonators = snapshot.resonators.map((resonator) => ({
			resonatorId: resonator.id,
			level: resonator.level,
			breakthrough: resonator.breakthrough,
			chain: resonator.chain,
			skills: resonator.skills.map((skill) => ({
				nodeId: skill.id,
				level: skill.level,
			})),
		}));
	}
	if (selected.has("weapons")) {
		doc.weapons = snapshot.weapons.map((weapon) => ({
			instanceId: weapon.incrId,
			itemId: weapon.itemId,
			level: weapon.level,
			breach: weapon.breach,
			rank: weapon.rank,
			equippedByResonatorId: weapon.equippedBy,
		}));
	}
	if (selected.has("echoes")) {
		doc.echoes = snapshot.echoes.map((echo) => ({
			instanceId: echo.incrId,
			itemId: echo.itemId,
			monsterId: echo.monsterId,
			echoSetId: echo.setId,
			level: echo.level,
			markState: echoMarkState(echo.funcValue),
			stackCount: echo.stackCount,
			mainStats: echo.mainProps.map(exportStat),
			subStats: echo.subProps.map(exportStat),
			equippedByResonatorId: echo.equippedBy,
			slotIndex: echo.slot,
			source: echo.source,
		}));
	}
	return doc;
}

/** Pretty-printed export document, ready for the clipboard or a file. */
export function accountExportJson(
	snapshot: AccountSnapshot,
	parts: readonly ExportPart[],
	exportedAt: Date = new Date(),
): string {
	return JSON.stringify(
		buildAccountExport(snapshot, parts, exportedAt),
		null,
		2,
	);
}

/** `mornye-export-<timestamp>.json`, e.g. `mornye-export-2026-10-17T12-34-56.json`. */
export function exportFileName(exportedAt: Date = new Date()): string {
	const stamp = exportedAt.toISOString().replace(/[:.]/g, "-").slice(0, 19);
	return `mornye-export-${stamp}.json`;
}

/** Start a download of `text` as `fileName` inside the webview/browser. */
export function downloadTextFile(fileName: string, text: string): void {
	const url = URL.createObjectURL(
		new Blob([text], { type: "application/json" }),
	);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	anchor.click();
	// The webview reads the blob asynchronously; revoke on the next task.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
