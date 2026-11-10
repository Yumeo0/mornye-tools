import { z } from "zod";
import type { OptimizerFilters } from "@/components/optimizer/optimizerOptions";
import type { Scenario, SearchUpdate } from "./calc/types";

export type ExpandedOptimizerResult = number | "baseline" | null;
export interface OptimizerResultContext {
	profileId: string | null;
	roleId: number;
	revision: string;
	key: string;
}
export interface SavedOptimizerRun {
	key: string;
	profileId: string | null;
	roleId: number;
	update: SearchUpdate;
	error: string | null;
	expandedIndex: ExpandedOptimizerResult;
}

export function optimizerRunSelectionKey(input: {
	catalogRevision: string | null;
	revision: string;
	scenario: Scenario | null;
	targetId: number;
	mode: "damage" | "team";
	filters: OptimizerFilters;
	resultsLimit: number;
}) {
	return JSON.stringify([
		input.catalogRevision,
		input.revision,
		input.scenario,
		input.targetId,
		input.mode,
		input.filters,
		input.resultsLimit,
	]);
}

const statsSchema = z.object({
	atk: z.number(),
	hp: z.number(),
	def: z.number(),
	er: z.number(),
	cr: z.number(),
	cd: z.number(),
});
const energySchema = z.array(
	z.object({
		characterId: z.number().int().positive(),
		name: z.string(),
		actual: z.number(),
		// An impossible baseline can require infinite ER; JSON encodes it as null.
		required: z
			.number()
			.nonnegative()
			.nullable()
			.transform((n) => n ?? Infinity),
		kitMinimum: z.number(),
		feasible: z.boolean(),
	}),
);
const resultSchema = z.object({
	uids: z
		.array(z.string())
		.length(5)
		.refine((uids) => new Set(uids).size === 5),
	damage: z.number().nonnegative(),
	stats: statsSchema.nullable(),
	energy: energySchema.optional(),
});

export const savedOptimizerRunSchema: z.ZodType<SavedOptimizerRun | null> = z
	.object({
		key: z.string(),
		profileId: z.string().nullable(),
		roleId: z.number().int().positive(),
		update: z.object({
			results: z.array(resultSchema),
			baseline: resultSchema.nullable(),
			baselineEvaluation: z
				.object({
					feasible: z.boolean(),
					damageByMember: z.record(z.string(), z.number()),
					teamDamage: z.number().nonnegative(),
					duration: z.number().nonnegative(),
					energy: energySchema,
					diagnostics: z.array(z.string()),
					stats: z.record(z.string(), statsSchema),
				})
				.nullable(),
			baselineError: z.string().nullable(),
			progress: z.object({
				processed: z.number().nonnegative(),
				total: z.number().nonnegative(),
				elapsedMs: z.number().nonnegative(),
				remainingMs: z.number().nonnegative(),
				progress: z.number().min(0).max(1),
				speed: z.number().nonnegative(),
			}),
			status: z.enum(["complete", "budget", "cancelled"]),
		}),
		error: z.string().nullable(),
		expandedIndex: z
			.union([z.number().int().nonnegative(), z.literal("baseline")])
			.nullable(),
	})
	.nullable();

// Bump when application-owned simulation/search semantics change.
export function optimizerRunStateKey(accountId?: string | null) {
	return `optimizer.results.v1.${accountId == null ? "none" : `profile.${encodeURIComponent(accountId)}`}`;
}

/** Pending startup data must never overwrite or expose a saved run for another context. */
export function matchingOptimizerRun(
	saved: SavedOptimizerRun | null,
	context: Pick<OptimizerResultContext, "key" | "profileId" | "roleId">,
) {
	return saved?.key === context.key &&
		saved.profileId === context.profileId &&
		saved.roleId === context.roleId
		? saved
		: null;
}
