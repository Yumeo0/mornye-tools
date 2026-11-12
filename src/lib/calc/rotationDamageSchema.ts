import { z } from "zod";
import type { BundledRotationDamage, RotationDamage } from "./rotationDamage";

export const rotationDamageSchema: z.ZodType<RotationDamage> = z.object({
	damage: z.number().finite().nonnegative().nullable(),
	error: z.string().optional(),
	warning: z.string().optional(),
	stats: z
		.record(
			z.string(),
			z.object({
				atk: z.number().finite(),
				hp: z.number().finite(),
				def: z.number().finite(),
				er: z.number().finite(),
				cr: z.number().finite(),
				cd: z.number().finite(),
				bonuses: z.record(z.string(), z.number().finite()).optional(),
			}),
		)
		.optional(),
});

export const bundledRotationDamageSchema: z.ZodType<BundledRotationDamage> =
	z.object({
		revision: z.string(),
		scores: z.record(z.string(), rotationDamageSchema),
	});
