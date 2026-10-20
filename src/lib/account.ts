// The single source of truth for account data in the frontend.
//
// One module-level mirror of the Rust account store: a single snapshot cache
// fed by `account_get_snapshot` and kept fresh by the backend's
// `account-updated` event. Every read goes through `useAccount` (React) or
// `readAccount` (plain code); every write goes through the mutation functions
// at the bottom - no other module should invoke account commands. The Rust
// store (`src-tauri/src/account`) stays authoritative; this only mirrors it.
//
// TypeScript mirrors of the Rust account model (`src-tauri/src/account/model.rs`).

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useSyncExternalStore } from "react";
import type { ExplorationSnapshot } from "@/lib/map/types";

export type StatKey =
	| "hpFlat"
	| "hpPercent"
	| "atkFlat"
	| "atkPercent"
	| "defFlat"
	| "defPercent"
	| "critRate"
	| "critDmg"
	| "energyRegen"
	| "basicAtk"
	| "heavyAtk"
	| "resonanceSkill"
	| "resonanceLiberation"
	| "healingBonus"
	| "aero"
	| "glacio"
	| "electro"
	| "fusion"
	| "spectro"
	| "havoc";

export interface EchoProp {
	propId: number;
	key: StatKey;
	/** Lossless raw game value (percent props are fixed-point x100). */
	raw: number;
	/** Calculator display unit (percent -> raw/100, flat -> raw). */
	value: number;
}

export interface SkillNode {
	id: number;
	level: number;
}

export interface PlayerInfo {
	playerId: number;
	name: string;
	level: number;
	worldLevel: number;
	signature?: string | null;
}

export interface Resonator {
	id: number;
	name: string;
	level: number;
	breakthrough: number;
	chain: number;
	skills: SkillNode[];
}

export interface Weapon {
	incrId: number;
	itemId: number;
	level: number;
	breach: number;
	rank: number;
	equippedBy?: number | null;
}

export interface Echo {
	incrId: number;
	itemId: number;
	monsterId: number;
	setId: number;
	level: number;
	/** Item mark state: 0 = none, 1 = locked, 2 = discard-marked. */
	funcValue: number;
	/**
	 * How many identical echoes this entry represents (`StackCount`); the
	 * game stacks duplicates and splits the stack when one copy is operated
	 * on. Always >= 1.
	 */
	stackCount: number;
	mainProps: EchoProp[];
	subProps: EchoProp[];
	equippedBy?: number | null;
	/** 0 = main echo. */
	slot?: number | null;
	/** Origin of the echo; manual entries are user-owned and removable. */
	source: EchoSource;
}

/** Where an echo came from: the packet sniffer or a manual entry. */
export type EchoSource = "sniffer" | "manual";

export interface AccountSnapshot {
	version: number;
	updatedAt: string;
	player?: PlayerInfo | null;
	resonators: Resonator[];
	weapons: Weapon[];
	echoes: Echo[];
	exploration?: ExplorationSnapshot;
}

/** Human-readable label for a calculator stat key (used by the card UI). */
export const STAT_LABELS: Record<StatKey, string> = {
	hpFlat: "HP",
	hpPercent: "HP%",
	atkFlat: "ATK",
	atkPercent: "ATK%",
	defFlat: "DEF",
	defPercent: "DEF%",
	critRate: "Crit. Rate",
	critDmg: "Crit. DMG",
	energyRegen: "Energy Regen",
	basicAtk: "Basic Attack DMG Bonus",
	heavyAtk: "Heavy Attack DMG Bonus",
	resonanceSkill: "Resonance Skill DMG Bonus",
	resonanceLiberation: "Resonance Liberation DMG Bonus",
	healingBonus: "Healing Bonus",
	aero: "Aero DMG Bonus",
	glacio: "Glacio DMG Bonus",
	electro: "Electro DMG Bonus",
	fusion: "Fusion DMG Bonus",
	spectro: "Spectro DMG Bonus",
	havoc: "Havoc DMG Bonus",
};

export function statLabel(key: StatKey): string {
	return STAT_LABELS[key];
}

/** Format a display value for a stat key (percent -> "6.3%"). */
export function formatStatValue(key: StatKey, value: number): string {
	const percent = PERCENT_STATS.has(key);
	const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
	return percent ? `${text}%` : text;
}

/** `"Label value"` lines for stat props, as used by cards and roll ratings. */
export function statPropLines(props: EchoProp[]): string[] {
	return props.map(
		(prop) => `${statLabel(prop.key)} ${formatStatValue(prop.key, prop.value)}`,
	);
}

const PERCENT_STATS = new Set<StatKey>([
	"hpPercent",
	"atkPercent",
	"defPercent",
	"critRate",
	"critDmg",
	"energyRegen",
	"basicAtk",
	"heavyAtk",
	"resonanceSkill",
	"resonanceLiberation",
	"healingBonus",
	"aero",
	"glacio",
	"electro",
	"fusion",
	"spectro",
	"havoc",
]);

/** Whether a stat key is expressed as a percentage. */
export function isPercentStat(key: StatKey): boolean {
	return PERCENT_STATS.has(key);
}

/** Empty account used until the first packet batch lands. */
export const EMPTY_ACCOUNT: AccountSnapshot = {
	version: 1,
	updatedAt: "",
	player: null,
	resonators: [],
	weapons: [],
	echoes: [],
};

export function weaponForResonator(
	snapshot: AccountSnapshot,
	roleId: number,
): Weapon | undefined {
	return snapshot.weapons.find((weapon) => weapon.equippedBy === roleId);
}

export function echoesForResonator(
	snapshot: AccountSnapshot,
	roleId: number,
): Echo[] {
	return snapshot.echoes
		.filter((echo) => echo.equippedBy === roleId)
		.sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

/** The mirrored account state: one immutable object, replaced on change. */
export interface AccountState {
	snapshot: AccountSnapshot;
	error: string | null;
}

let state: AccountState = { snapshot: EMPTY_ACCOUNT, error: null };
const listeners = new Set<() => void>();
let started = false;
let refreshInFlight: Promise<void> | null = null;

function emitChange(): void {
	for (const listener of [...listeners]) listener();
}

async function fetchSnapshot(): Promise<void> {
	try {
		const snapshot = await invoke<AccountSnapshot>("account_get_snapshot");
		state = { snapshot, error: null };
	} catch (error) {
		// Keep serving the last good snapshot; surface why it is stale.
		state = { snapshot: state.snapshot, error: String(error) };
	}
	emitChange();
}

/** Refresh the mirror; concurrent calls share one fetch. */
export function refreshAccount(): Promise<void> {
	refreshInFlight ??= fetchSnapshot().finally(() => {
		refreshInFlight = null;
	});
	return refreshInFlight;
}

// The module lives for the lifetime of the window, so the listener is never
// removed and the initial fetch happens on first subscription.
function ensureStarted(): void {
	if (started) return;
	started = true;
	void refreshAccount();
	void listen("account-updated", () => {
		void refreshAccount();
	});
}

export function subscribeAccount(listener: () => void): () => void {
	ensureStarted();
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Current account state outside React. */
export function readAccount(): AccountState {
	return state;
}

/** Live account state for React components; the only account read path. */
export function useAccount(): AccountState {
	return useSyncExternalStore(subscribeAccount, readAccount, readAccount);
}

// ---------------------------------------------------------------------------
// Writes (the only path to the backend's account commands)
// ---------------------------------------------------------------------------

/** Add an echo entered by hand; the backend assigns the synthetic instance id. */
export async function addManualEcho(echo: Echo): Promise<Echo> {
	const added = await invoke<Echo>("account_add_manual_echo", { echo });
	await refreshAccount();
	return added;
}

/** Remove a manually added echo. */
export async function removeManualEcho(incrId: number): Promise<void> {
	await invoke("account_remove_manual_echo", { incr_id: incrId });
	await refreshAccount();
}

/**
 * Set (or, with both fields null, clear) the manual equipment override for
 * one echo.
 */
export async function setEquippedOverride(
	incrId: number,
	equippedBy: number | null,
	slot: number | null,
): Promise<void> {
	await invoke("account_set_equipped_override", {
		incr_id: incrId,
		equipped_by: equippedBy,
		slot,
	});
	await refreshAccount();
}
