import { isTauri } from "@tauri-apps/api/core";
import { z } from "zod";
import { readSetting, writeSetting } from "@/lib/settings";
import { bundledRotationScore } from "./bundledRotationDamage";
import {
	type RotationChains,
	usesReferenceChains,
} from "./ownedRotationDamage";
import reference from "./riley/reference.generated.json";
import type { RotationDamage } from "./rotationDamage";
import { rotationDamageSchema } from "./rotationDamageSchema";
import type { TeamProfile } from "./types";

const storageKey = "optimizer.customRotationDamage.v2";
const schema = z.record(z.string(), rotationDamageSchema);
export const rotationReferenceRevision = reference.revision;
const cache = new Map<string, RotationDamage>();
let loading: Promise<void> | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let saving = Promise.resolve();

export function rotationDamageKey(
	revision: string,
	p: TeamProfile,
	chains?: RotationChains,
) {
	const key = [revision, p.id, p.customRotation];
	// Keep reference scores compatible with existing cache entries. Only the
	// team's own chains affect its score, regardless of account or roster order.
	return JSON.stringify(
		usesReferenceChains(p, chains)
			? key
			: [
					...key,
					"owned-chains-v1",
					p.members.map((m) => [
						m.characterId,
						chains?.[m.characterId] ?? m.minSequence,
					]),
				],
	);
}

export function savedRotationDamage(
	revision: string,
	profile: TeamProfile,
	chains?: RotationChains,
) {
	return !profile.customRotation && usesReferenceChains(profile, chains)
		? bundledRotationScore(profile, revision)
		: cachedRotationDamage(rotationDamageKey(revision, profile, chains));
}

export function loadRotationDamageCache() {
	loading ??= (async () => {
		try {
			const saved = isTauri()
				? await readSetting(storageKey)
				: JSON.parse(localStorage.getItem(storageKey) ?? "null");
			const result = schema.safeParse(saved);
			if (result.success)
				for (const [key, value] of Object.entries(result.data))
					if (!cache.has(key)) cache.set(key, value);
		} catch (error) {
			console.error("[rotations] Could not load reference damage cache", error);
		}
	})();
	return loading;
}

export const cachedRotationDamage = (key: string) => cache.get(key);

export function rememberRotationDamage(key: string, score: RotationDamage) {
	cache.set(key, score);
	// Builder playback can publish a score before the picker has ever opened.
	void loadRotationDamageCache();
	// Batch progressive results instead of writing the settings file per team.
	if (timer) return;
	timer = setTimeout(() => {
		timer = undefined;
		saving = saving
			.then(async () => {
				await loadRotationDamageCache();
				const value = Object.fromEntries(cache);
				if (isTauri()) await writeSetting(storageKey, value);
				else localStorage.setItem(storageKey, JSON.stringify(value));
			})
			.catch((error) =>
				console.error(
					"[rotations] Could not save reference damage cache",
					error,
				),
			);
	}, 2000);
}
