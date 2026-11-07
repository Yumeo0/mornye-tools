import type { ResourceUsage } from "../src/lib/map/types";

// Native item ShowTypes: Resonator development/ascension, skill/Forte upgrades,
// Resonator/weapon EXP, weapon-and-skill materials, Echo development, ascension.
const UPGRADE_SHOW_TYPES = new Set([6, 7, 8, 11, 12, 13, 14, 22, 42, 45]);

/** Classify the items a gathering reward drops, independent of its display name. */
export function resourceUsageLookup(
	items: { Id: number; ShowTypes: number[] }[],
	packages: { Id: number; DropPreview: { Key: number }[] }[],
): (rewardId: number) => ResourceUsage {
	const upgradeItems = new Set(
		items
			.filter((item) =>
				item.ShowTypes.some((type) => UPGRADE_SHOW_TYPES.has(type)),
			)
			.map((item) => item.Id),
	);
	const upgradeRewards = new Set(
		packages
			.filter((pack) =>
				pack.DropPreview.some((item) => upgradeItems.has(item.Key)),
			)
			.map((pack) => pack.Id),
	);
	return (rewardId) => (upgradeRewards.has(rewardId) ? "upgrade" : "other");
}
