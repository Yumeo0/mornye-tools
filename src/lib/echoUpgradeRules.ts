import {
	DEFAULT_UPGRADE_OPTIONS,
	type EchoUpgradeOptions,
} from "./echoUpgrade";
import { readSetting, writeSetting } from "./settings";

export interface EchoUpgradeRules {
	threshold: number;
	options: EchoUpgradeOptions;
}

export function parseEchoUpgradeRules(
	value: unknown,
	fallback = 75,
): EchoUpgradeRules {
	const saved = value as Partial<EchoUpgradeRules> | null;
	const options = saved?.options;
	const ids = options?.materials?.exp_material_ids;
	return {
		threshold:
			typeof saved?.threshold === "number" && Number.isFinite(saved.threshold)
				? Math.min(100, Math.max(0, saved.threshold))
				: fallback,
		options: {
			minSuccessChance:
				typeof options?.minSuccessChance === "number" &&
				Number.isFinite(options.minSuccessChance)
					? Math.min(100, Math.max(0, options.minSuccessChance))
					: DEFAULT_UPGRADE_OPTIONS.minSuccessChance,
			autoDiscard:
				typeof options?.autoDiscard === "boolean" ? options.autoDiscard : false,
			materials: {
				discard_echoes:
					typeof options?.materials?.discard_echoes === "boolean"
						? options.materials.discard_echoes
						: true,
				exp_material_ids: Array.isArray(ids)
					? DEFAULT_UPGRADE_OPTIONS.materials.exp_material_ids.filter((id) =>
							ids.includes(id),
						)
					: [...DEFAULT_UPGRADE_OPTIONS.materials.exp_material_ids],
			},
		},
	};
}

export async function loadEchoUpgradeRules(): Promise<EchoUpgradeRules> {
	await saving;
	const [rules, previousThreshold] = await Promise.all([
		readSetting<unknown>("echoUpgradeRules"),
		readSetting<unknown>("upgradeAssistantThreshold"),
	]);
	const fallback =
		typeof previousThreshold === "number" && Number.isFinite(previousThreshold)
			? Math.min(100, Math.max(0, previousThreshold))
			: 75;
	return parseEchoUpgradeRules(rules, fallback);
}

// Serialize saves across panel mounts so an older write cannot win a race.
let saving = Promise.resolve();
export function saveEchoUpgradeRules(rules: EchoUpgradeRules): Promise<void> {
	const next = structuredClone(rules);
	const result = saving.then(() => writeSetting("echoUpgradeRules", next));
	saving = result.catch(() => {});
	return result;
}
