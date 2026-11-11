import data from "@/configs/rotation_damage.json";
import type { BundledRotationDamage } from "./rotationDamage";
import type { TeamProfile } from "./types";

const bundle = data as BundledRotationDamage;

export function bundledRotationScore(profile: TeamProfile, revision: string) {
	return profile.customRotation || bundle.revision !== revision
		? undefined
		: bundle.scores[profile.id];
}

export function validateBundledRotationDamage(
	data: BundledRotationDamage,
	revision: string,
	profiles: TeamProfile[],
) {
	if (data.revision !== revision)
		return "Pre-made rotation scores are out of date. Run bun scripts/compile-rotation-damage.ts.";
	const ids = new Set(
		profiles.filter((p) => !p.customRotation).map((p) => p.id),
	);
	if (
		Object.keys(data.scores).length !== ids.size ||
		[...ids].some((id) => !data.scores[id]) ||
		profiles.some(
			(p) =>
				!p.customRotation &&
				data.scores[p.id]?.damage != null &&
				p.members.some((m) => !data.scores[p.id]?.stats?.[m.characterId]),
		)
	)
		return "Pre-made rotation scores are incomplete. Run bun scripts/compile-rotation-damage.ts.";
	return null;
}

export function bundledRotationError(
	profiles: TeamProfile[],
	revision: string,
) {
	if (!profiles.some((p) => !p.customRotation)) return null;
	if (bundle.revision !== revision)
		return "Pre-made rotation scores are out of date. Run bun scripts/compile-rotation-damage.ts.";
	if (profiles.some((p) => !p.customRotation && !bundle.scores[p.id]))
		return "Pre-made rotation scores are incomplete. Run bun scripts/compile-rotation-damage.ts.";
	return null;
}
