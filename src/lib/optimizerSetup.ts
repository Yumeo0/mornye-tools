import { z } from "zod";
import type { OptimizerOverrides } from "./calc/translate";
import type { CalculatorCatalog } from "./calc/types";

export interface OptimizerSetup {
	profileId: string;
	targetId: number;
	overrides: Record<number, OptimizerOverrides>;
	mode: "damage" | "team";
}

export const EMPTY_OPTIMIZER_SETUP: OptimizerSetup = {
	profileId: "",
	targetId: 0,
	overrides: {},
	mode: "damage",
};

export const optimizerSetupSchema: z.ZodType<OptimizerSetup> = z.object({
	profileId: z.string(),
	targetId: z.number().int().nonnegative(),
	overrides: z.record(
		z.string().regex(/^\d+$/),
		z.object({
			chain: z.number().int().min(0).max(6).optional(),
			weaponItemId: z.number().int().nonnegative().optional(),
			weaponRank: z.number().int().min(1).max(5).optional(),
			echoSource: z.enum(["equipped", "rotation"]).optional(),
		}),
	),
	mode: z.enum(["damage", "team"]),
});

export function optimizerSetupKey(accountId?: string | null) {
	return `optimizer.setup.v1.${accountId == null ? "none" : `profile.${encodeURIComponent(accountId)}`}`;
}

/** Resolve saved IDs without clearing preferences while the catalog loads. */
export function resolveOptimizerSelection(
	setup: Pick<OptimizerSetup, "profileId" | "targetId">,
	catalog: CalculatorCatalog | null,
) {
	const profile = catalog?.teams.find((p) => p.id === setup.profileId) ?? null;
	const targetId = profile?.members.some(
		(m) => m.characterId === setup.targetId,
	)
		? setup.targetId
		: 0;
	return { profile, targetId };
}
