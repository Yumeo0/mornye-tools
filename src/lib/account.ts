// The single source of truth for account data in the frontend.
//
// One module-level mirror of the selected Rust account profile: a single
// snapshot cache fed by `account_get_view` (snapshot plus profile list) and
// kept fresh by the backend's `account-updated` event. Every read goes through
// `useAccount` (React) or
// `readAccount` (plain code); every write goes through the mutation functions
// at the bottom - no other module should invoke account commands. The Rust
// store (`src-tauri/crates/account/src`) stays authoritative; this only mirrors it.
//
// TypeScript mirrors of the Rust account model (`src-tauri/crates/account/src/model.rs`).

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useSyncExternalStore } from "react";
import type { ExportPart } from "@/lib/accountExport";
import type { ExplorationSnapshot } from "@/lib/map/types";
import type { ProgressionSnapshot } from "@/lib/progression/types";

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
	headId?: number | null;
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

/** Number of individual echoes, including copies represented by stacks. */
export function echoCount(echoes: readonly Pick<Echo, "stackCount">[]): number {
	return echoes.reduce(
		(count, echo) => count + Math.max(1, echo.stackCount ?? 1),
		0,
	);
}

export interface SavedTeam {
	id: number;
	name: string;
	roleIds: number[];
	currentRole?: number;
	isCurrent: boolean;
}

export interface AccountSnapshot {
	profile?: ProfileIdentity | null;
	version: number;
	updatedAt: string;
	player?: PlayerInfo | null;
	resonators: Resonator[];
	weapons: Weapon[];
	echoes: Echo[];
	inventory?: { id: number; count: number }[];
	/** Saved in-game formations from passive capture or an active session. */
	teams?: SavedTeam[];
	exploration?: ExplorationSnapshot;
	progression?: ProgressionSnapshot;
}

export interface ProfileIdentity {
	id: string;
	playerId: number;
	serverId: string;
	region: string;
	/** A user-supplied region or passive capture, not an official server ID. */
	provisional?: boolean;
}
export interface AccountProfile extends ProfileIdentity {
	name: string;
	level?: number;
	updatedAt: string;
}
interface AccountView {
	snapshot: AccountSnapshot;
	profiles: { selected: string; profiles: AccountProfile[] };
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
	profiles: AccountProfile[];
}

let state: AccountState = {
	snapshot: EMPTY_ACCOUNT,
	error: null,
	profiles: [],
};
const listeners = new Set<() => void>();
let started = false;
let refreshInFlight: Promise<void> | null = null;
let refreshRequested = false;

function emitChange(): void {
	for (const listener of [...listeners]) listener();
}

async function fetchSnapshot(): Promise<void> {
	try {
		const view = await invoke<AccountView>("account_get_view");
		state = {
			snapshot: view.snapshot,
			profiles: view.profiles.profiles,
			error: null,
		};
	} catch (error) {
		// Keep serving the last good snapshot; surface why it is stale.
		state = { ...state, error: String(error) };
	}
	emitChange();
}

/** Refresh the mirror; concurrent calls share one fetch. */
export function refreshAccount(): Promise<void> {
	refreshRequested = true;
	refreshInFlight ??= (async () => {
		do {
			refreshRequested = false;
			await fetchSnapshot();
		} while (refreshRequested);
	})().finally(() => {
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

export interface AccountImportPreview {
	profile: ProfileIdentity;
	name: string;
	newProfile: boolean;
	parts: { part: ExportPart; count: number }[];
}

export function previewAccountImport(json: string, profileId: string) {
	return invoke<AccountImportPreview>("account_preview_import", {
		json,
		profileId,
	});
}

export async function importAccountBackup(input: {
	json: string;
	profileId: string;
	targetId: string;
	parts: ExportPart[];
}): Promise<void> {
	await invoke("account_import_backup", input);
	await refreshAccount();
}

/** Add an echo entered by hand; the backend assigns the synthetic instance id. */
export async function addManualEcho(echo: Echo): Promise<Echo> {
	const added = await invoke<Echo>("account_add_manual_echo", {
		echo,
		profileId: state.snapshot.profile?.id,
	});
	await refreshAccount();
	return added;
}

/** Remove a manually added echo. */
export async function removeManualEcho(incrId: number): Promise<void> {
	await invoke("account_remove_manual_echo", {
		incr_id: incrId,
		profile_id: state.snapshot.profile?.id,
	});
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
		profile_id: state.snapshot.profile?.id,
		incr_id: incrId,
		equipped_by: equippedBy,
		slot,
	});
	await refreshAccount();
}

export async function selectAccountProfile(profileId: string): Promise<void> {
	await invoke("account_select_profile", { profileId });
	await refreshAccount();
}

/** Give a migrated or passively captured profile its account and server. */
export async function identifyAccountProfile(input: {
	profileId: string;
	playerId: number;
	region: string;
	name: string;
}): Promise<void> {
	await invoke("account_identify_profile", input);
	await refreshAccount();
}
