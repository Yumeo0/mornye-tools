import type { Scenario, SimulationResult, TeamProfile } from "./types";

export interface RotationDamage {
	damage: number | null;
	error?: string;
	/** An upstream model gap: damage is an estimate, not a validated rotation. */
	warning?: string;
	/** Panel stats of the resolved optimal rotation builds used for this score. */
	stats?: SimulationResult["stats"];
}

export interface BundledRotationDamage {
	revision: string;
	scores: Record<string, RotationDamage>;
}

/** Account-independent comparison: authored weapons, minimum supported chains,
 * rotation stats, opener + three repeat cycles, and the normal enemy settings. */
export function referenceScenario(profile: TeamProfile): Scenario {
	return {
		profileId: profile.id,
		cycles: 4,
		...(profile.customRotation ? { rotation: profile.customRotation } : {}),
		members: profile.members.map((m) => ({
			characterId: m.characterId,
			chain: m.minSequence,
			weaponId: m.defaultWeapon.id,
			weaponRank: m.defaultWeapon.rank,
			echoSource: "rotation",
			echoes: [],
		})),
	};
}

export function measureRotationDamage(
	profile: TeamProfile,
	resolve: (scenario: Scenario) => Scenario,
	evaluate: (scenario: Scenario) => SimulationResult,
): RotationDamage {
	try {
		if (profile.errors.length) throw new Error(profile.errors.join(" · "));
		const result = evaluate(resolve(referenceScenario(profile)));
		// The pinned Lily model explicitly has no Dream Perfume gains. Its own
		// authored Woven casts therefore cannot pass the 300-point gate at any
		// stats. Preserve Riley's reference damage as a marked estimate only for
		// those presets; other failures and all custom programs remain strict.
		if (
			!profile.customRotation &&
			profile.members.some((m) => m.characterId === 1512) &&
			Number.isFinite(result.teamDamage) &&
			result.teamDamage > 0 &&
			result.diagnostics.length > 0 &&
			result.diagnostics.every((message) =>
				/^Lily: Forte Heavy - Woven (Phantasm|Fairytale) — Requires: Forte 1 >= 300\.$/.test(
					message,
				),
			)
		)
			return {
				damage: result.teamDamage,
				stats: result.stats,
				warning:
					"Riley does not model Lily's Dream Perfume generation. Estimated damage assumes the authored Woven casts are available.",
			};
		return rotationDamageFromResult(result);
	} catch (error) {
		return {
			damage: null,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export function rotationDamageFromResult(
	result: SimulationResult,
): RotationDamage {
	return {
		damage:
			result.feasible && Number.isFinite(result.teamDamage)
				? result.teamDamage
				: null,
		...(!result.feasible || !Number.isFinite(result.teamDamage)
			? {
					error:
						result.diagnostics.join(" · ") ||
						"Rotation requirements are not met by the reference build.",
				}
			: {}),
		stats: result.stats,
	};
}
