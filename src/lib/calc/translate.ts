// Typed account -> `@wuwacalc/core` translation.
//
// The translation validates every id against the core catalog before building
// entities; unknown ids become visible errors instead of silently triggering
// the core's repair path.

import { getResSeedBy } from "@wuwacalc/core/data/catalog/resonatorSeedService";
import { getEchoCatBy } from "@wuwacalc/core/data/gameData/catalog/echoes";
import { getWpnsById } from "@wuwacalc/core/data/gameData/weapons/weaponDataStore";
import type {
	EchoInstance,
	ResRuntime,
	WeaponState,
} from "@wuwacalc/core/domain/entities/runtime";
import {
	makeResRuntime,
	mkMaxResRt,
} from "@wuwacalc/core/engine/runtime/defaults";

import roleAliases from "@/configs/role_aliases.json";
import weaponData from "@/configs/weapon_data.json";
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

const WEAPON_BASE_ATK: Record<number, number> = Object.fromEntries(
	(weaponData as { item_id: number; base_atk?: number | null }[])
		.filter((weapon) => weapon.base_atk != null)
		.map((weapon) => [weapon.item_id, weapon.base_atk as number]),
);

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
			baseAtk: WEAPON_BASE_ATK[weapon.itemId] ?? 0,
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

/** A fresh, unequipped runtime for a resonator (used by tests/debug). */
export function makeDefaultRuntime(roleId: string): ResRuntime | null {
	const seed = getResSeedBy(aliasRoleId(Number(roleId)));
	return seed ? makeResRuntime(seed) : null;
}
