// Typed account -> `@wuwacalc/core` translation.
//
// The translation validates every id against the core catalog before building
// entities; unknown ids become visible errors instead of silently triggering
// the core's repair path.

import { getResSeedBy } from "@wuwacalc/core/data/catalog/resonatorSeedService";
import { getEchoCatBy } from "@wuwacalc/core/data/gameData/catalog/echoes";
import { getResDtlsBy } from "@wuwacalc/core/data/gameData/resonators/resonatorDataStore";
import { getWpnsById } from "@wuwacalc/core/data/gameData/weapons/weaponDataStore";
import type {
	EchoInstance,
	ResRuntime,
	WeaponState,
} from "@wuwacalc/core/domain/entities/runtime";
import { isNoWeaponId } from "@wuwacalc/core/domain/entities/runtime";
import { setResRtSequence } from "@wuwacalc/core/engine/gameData/resonatorMax";
import { mkMaxResRt } from "@wuwacalc/core/engine/runtime/defaults";
import { initWpnStts } from "@wuwacalc/core/engine/runtime/sourceStateInit";
import { wpnAtkAt } from "@wuwacalc/core/engine/runtime/weaponState";

import roleAliases from "@/configs/role_aliases.json";
import {
	type AccountSnapshot,
	type Echo,
	echoesForResonator,
	type Resonator,
	type Weapon,
	weaponForResonator,
} from "@/lib/account";

const ROLE_ALIASES: Record<string, string> =
	(roleAliases as { aliases?: Record<string, string> }).aliases ?? {};

export type TranslationErrorKind = "resonator" | "weapon" | "echo";

export interface TranslationError {
	kind: TranslationErrorKind;
	/** Game id that failed validation. */
	id: number;
	message: string;
}

export interface TranslatedBuild {
	resonator: Resonator;
	/** Alias-resolved role id used with the core. */
	roleId: string;
	weapon: WeaponState | null;
	/** Echo per slot index; `null` for empty slots. */
	echoes: Array<EchoInstance | null>;
	runtime: ResRuntime | null;
	errors: TranslationError[];
}

export interface AccountTranslation {
	builds: TranslatedBuild[];
	errors: TranslationError[];
}

/** Apply `role_aliases.json` (legacy Rover ids) before any catalog lookup. */
export function aliasRoleId(roleId: number): string {
	return ROLE_ALIASES[String(roleId)] ?? String(roleId);
}

/** Build one core [`EchoInstance`] from an account echo, or explain why not. */
export function toEchoInstance(echo: Echo): {
	instance: EchoInstance | null;
	error?: TranslationError;
} {
	const def = getEchoCatBy()[String(echo.monsterId)];
	if (!def) {
		return {
			instance: null,
			error: {
				kind: "echo",
				id: echo.monsterId,
				message: `Echo ${echo.incrId} has unknown catalog id ${echo.monsterId}; it was not evaluated.`,
			},
		};
	}
	const primary = echo.mainProps[0];
	if (!primary) {
		return {
			instance: null,
			error: {
				kind: "echo",
				id: echo.monsterId,
				message: `Echo ${echo.incrId} has no main stat; it was not evaluated.`,
			},
		};
	}
	const secondary = echo.mainProps[1];
	const substats: Record<string, number> = {};
	for (const prop of echo.subProps) {
		substats[prop.key] = (substats[prop.key] ?? 0) + prop.value;
	}
	const instance: EchoInstance = {
		uid: `incr:${echo.incrId}`,
		id: String(echo.monsterId),
		set: echo.setId,
		mainEcho: echo.slot === 0,
		mainStats: {
			primary: { key: primary.key, value: primary.value },
			// The fixed cost secondary ships with the echo; pass it through.
			secondary: secondary
				? { key: secondary.key, value: secondary.value }
				: { key: "atkFlat", value: 0 },
		},
		substats,
	};
	return { instance };
}

/** Build one core [`WeaponState`] from an account weapon, or explain why not. */
export function toWeaponState(weapon: Weapon | undefined): {
	state: WeaponState | null;
	error?: TranslationError;
} {
	if (!weapon) return { state: null };
	const def = getWpnsById()[String(weapon.itemId)];
	if (!def) {
		return {
			state: null,
			error: {
				kind: "weapon",
				id: weapon.itemId,
				message: `Weapon ${weapon.itemId} is unknown to the calculator catalog; it was not evaluated.`,
			},
		};
	}
	return {
		state: {
			id: String(weapon.itemId),
			level: weapon.level,
			rank: weapon.rank,
			// Level-correct attack from the calculator catalog; every runtime
			// caller translates only once the core is hydrated.
			baseAtk: wpnAtkAt(String(weapon.itemId), weapon.level),
		},
	};
}

/** Translate one resonator plus its equipped weapon and echoes. */
export function translateResonator(
	snapshot: AccountSnapshot,
	resonator: Resonator,
): TranslatedBuild {
	const errors: TranslationError[] = [];
	const roleId = aliasRoleId(resonator.id);
	const seed = getResSeedBy(roleId);
	if (!seed) {
		errors.push({
			kind: "resonator",
			id: resonator.id,
			message: `Resonator ${resonator.name || resonator.id} (role ${resonator.id}) is not in the calculator catalog; it was not evaluated.`,
		});
	}

	const { state: weapon, error: weaponError } = toWeaponState(
		weaponForResonator(snapshot, resonator.id),
	);
	if (weaponError) errors.push(weaponError);

	const echoes: Array<EchoInstance | null> = [null, null, null, null, null];
	for (const echo of echoesForResonator(snapshot, resonator.id)) {
		if (echo.slot == null || echo.slot < 0 || echo.slot > 4) continue;
		const { instance, error } = toEchoInstance(echo);
		if (error) {
			errors.push(error);
			continue;
		}
		echoes[echo.slot] = instance;
	}

	let runtime: ResRuntime | null = null;
	if (seed) {
		try {
			// Build evaluation uses standardized levels; equipment stays real.
			runtime = mkMaxResRt(seed);
			runtime.build.weapon = weapon ?? runtime.build.weapon;
			runtime.build.echoes = echoes;
		} catch (error) {
			runtime = null;
			errors.push({
				kind: "resonator",
				id: resonator.id,
				message: `Could not build a runtime for ${resonator.name || resonator.id}: ${String(error)}`,
			});
		}
	}

	return {
		resonator,
		roleId,
		weapon,
		echoes,
		runtime,
		errors,
	};
}

/** Translate the whole account; errors are collected, never thrown. */
export function translateAccount(
	snapshot: AccountSnapshot,
): AccountTranslation {
	const builds = snapshot.resonators
		.map((resonator) => translateResonator(snapshot, resonator))
		.sort((a, b) =>
			(a.resonator.name || a.roleId).localeCompare(
				b.resonator.name || b.roleId,
			),
		);
	return {
		builds,
		errors: builds.flatMap((build) => build.errors),
	};
}

/** One runtime control value (see `runtime.state.controls`). */
export type OptimizerControlValue = boolean | number | string;

/** Per-field optimizer edits; every `null` field means "use the saved data". */
export interface OptimizerOverrides {
	level: number | null;
	chain: number | null;
	weaponItemId: number | null;
	weaponLevel: number | null;
	weaponRank: number | null;
	/** Effect-control edits keyed by control key; `null` = all defaults. */
	controls: Record<string, OptimizerControlValue> | null;
}

export const EMPTY_OPTIMIZER_OVERRIDES: OptimizerOverrides = {
	level: null,
	chain: null,
	weaponItemId: null,
	weaponLevel: null,
	weaponRank: null,
	controls: null,
};

/** Whether any field of the override actually deviates from the saved data. */
export function hasOptimizerOverrides(
	overrides: OptimizerOverrides | undefined,
): boolean {
	if (!overrides) return false;
	return (
		overrides.level != null ||
		overrides.chain != null ||
		overrides.weaponItemId != null ||
		overrides.weaponLevel != null ||
		overrides.weaponRank != null ||
		(overrides.controls != null && Object.keys(overrides.controls).length > 0)
	);
}

/**
 * Merge effect-control edits on top of an already-built runtime.
 *
 * Keys are full control keys (`runtime.state.controls` shape), so entries for
 * other weapons or characters are inert until their source is equipped again.
 */
export function applyControlOverrides(
	runtime: ResRuntime,
	controls: Record<string, OptimizerControlValue> | null | undefined,
): ResRuntime {
	if (!controls) return runtime;
	const next = { ...runtime.state.controls };
	let changed = false;
	for (const [key, value] of Object.entries(controls)) {
		if (Object.is(next[key], value)) continue;
		next[key] = value;
		changed = true;
	}
	if (!changed) return runtime;
	return {
		...runtime,
		state: { ...runtime.state, controls: next },
	};
}

const MAX_RESONATOR_LEVEL = 90;

function clampResonatorLevel(level: number): number {
	return Math.min(MAX_RESONATOR_LEVEL, Math.max(1, Math.round(level)));
}

function clampChain(chain: number): number {
	return Math.min(6, Math.max(0, Math.round(chain)));
}

/**
 * Rebuild one optimizer runtime from the saved account data plus optional
 * overrides.
 *
 * Progression defaults to what was captured (level, chain) instead of the
 * calculator's maxed defaults; state controls are re-derived for the effective
 * chain and weapon so evaluation always matches the edited loadout. Unowned
 * characters default to level 90 / chain 0 / the seed's default weapon.
 */
export function buildOptimizerRuntime(
	build: TranslatedBuild,
	overrides: OptimizerOverrides | undefined,
): ResRuntime | null {
	const base = build.runtime;
	if (!base) return null;

	const details = getResDtlsBy()[build.roleId];
	const chain = overrides?.chain ?? build.resonator.chain ?? 0;
	// Chain first: `setResRtSequence` re-maxes progression to level 90 for the
	// target sequence, so the level must be applied after it.
	let runtime = setResRtSequence(base, details, clampChain(chain));
	runtime = {
		...runtime,
		base: {
			...runtime.base,
			level: clampResonatorLevel(
				overrides?.level ?? build.resonator.level ?? MAX_RESONATOR_LEVEL,
			),
		},
	};

	// `build.weapon` is null for default builds (unowned characters, owned
	// characters with no equipped weapon); the runtime still carries the seed's
	// default weapon, so fall back to it and honor level/rank edits there too.
	const weaponId =
		overrides?.weaponItemId != null
			? String(overrides.weaponItemId)
			: (build.weapon?.id ?? base.build.weapon.id);
	if (!isNoWeaponId(weaponId)) {
		const weaponLevel =
			overrides?.weaponLevel ?? build.weapon?.level ?? MAX_RESONATOR_LEVEL;
		const weaponRank = overrides?.weaponRank ?? build.weapon?.rank ?? 1;
		const weapon: WeaponState = {
			id: weaponId,
			level: clampResonatorLevel(weaponLevel),
			rank: Math.min(5, Math.max(1, Math.round(weaponRank))),
			baseAtk: wpnAtkAt(weaponId, weaponLevel),
		};
		// Re-derive the weapon's passive state controls for the effective weapon.
		runtime = initWpnStts(
			{ ...runtime, build: { ...runtime.build, weapon } },
			{ weaponId, prevWpnId: base.build.weapon.id, maxed: true },
		);
	}
	// Explicit effect edits win over the maxed defaults; the level/chain/weapon
	// rebuild above always resets to defaults first.
	return applyControlOverrides(runtime, overrides?.controls);
}

/**
 * A default build for a character that is not part of the captured account:
 * max level, chain 0, the seed's signature (default) weapon, no echoes.
 */
export function makeUnownedBuild(
	roleId: string,
	name = "",
): TranslatedBuild | null {
	const seed = getResSeedBy(roleId);
	if (!seed) return null;
	let runtime: ResRuntime;
	try {
		runtime = mkMaxResRt(seed);
	} catch {
		return null;
	}
	const numericId = Number.parseInt(roleId, 10);
	// The maxed runtime already equips the seed's default weapon; surface it on
	// the build so slot summaries name it and weapon level/rank edits apply.
	const weapon = isNoWeaponId(runtime.build.weapon.id)
		? null
		: { ...runtime.build.weapon };
	return {
		resonator: {
			id: numericId,
			name,
			level: MAX_RESONATOR_LEVEL,
			breakthrough: 6,
			chain: 0,
			skills: [],
		},
		roleId,
		weapon,
		echoes: [null, null, null, null, null],
		runtime,
		errors: [],
	};
}
