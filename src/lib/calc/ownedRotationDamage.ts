import { measureRotationDamage, referenceScenario } from "./rotationDamage";
import type { Scenario, SimulationResult, TeamProfile } from "./types";

export type RotationChains = Readonly<Record<number, number>>;

export function usesReferenceChains(
	profile: TeamProfile,
	chains?: RotationChains,
) {
	return profile.members.every(
		(member) =>
			(chains?.[member.characterId] ?? member.minSequence) ===
			member.minSequence,
	);
}

function applyChains(
	profile: TeamProfile,
	scenario: Scenario,
	chains?: RotationChains,
): Scenario {
	return {
		...scenario,
		members: scenario.members.map((build, index) => {
			const member = profile.members[index];
			const chain = chains?.[build.characterId] ?? build.chain;
			if (
				!Number.isInteger(chain) ||
				chain < member.minSequence ||
				chain > member.maxSequence
			)
				throw new Error(
					`${member.name}: S${chain} is outside this rotation's supported chains (S${member.minSequence}–S${member.maxSequence}).`,
				);
			return { ...build, chain };
		}),
	};
}

export function referenceScenarioAtChains(
	profile: TeamProfile,
	chains?: RotationChains,
) {
	return applyChains(profile, referenceScenario(profile), chains);
}

/** Apply chains before resolving stats: chain-dependent buffs, energy needs,
 * and authored rotation branches all participate in the real simulation. */
export function measureRotationDamageAtChains(
	profile: TeamProfile,
	resolve: (scenario: Scenario) => Scenario,
	evaluate: (scenario: Scenario) => SimulationResult,
	chains?: RotationChains,
) {
	return measureRotationDamage(
		profile,
		(scenario) => resolve(applyChains(profile, scenario, chains)),
		evaluate,
	);
}
