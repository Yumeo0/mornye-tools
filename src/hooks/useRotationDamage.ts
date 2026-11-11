import { useEffect, useMemo, useState } from "react";
import {
	bundledRotationError,
	bundledRotationScore,
} from "@/lib/calc/bundledRotationDamage";
import { scoreRotationProfiles } from "@/lib/calc/core";
import {
	cachedRotationDamage,
	loadRotationDamageCache,
	rememberRotationDamage,
	rotationDamageKey,
	rotationReferenceRevision,
} from "@/lib/calc/rotationDamageCache";
import type { TeamProfile } from "@/lib/calc/types";

export function useRotationDamage(profiles: TeamProfile[], enabled: boolean) {
	const revision = rotationReferenceRevision;
	const [version, setVersion] = useState(0);
	const [error, setError] = useState<string | null>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: version publishes external cache writes without restarting the worker.
	const damage = useMemo(
		() =>
			new Map(
				profiles.flatMap((p) => {
					const score = p.customRotation
						? cachedRotationDamage(rotationDamageKey(revision, p))
						: bundledRotationScore(p, revision);
					return score ? [[p.id, score] as const] : [];
				}),
			),
		[profiles, version, revision],
	);
	useEffect(() => {
		if (!enabled) return;
		setError(null);
		if (!profiles.some((p) => p.customRotation)) return;
		let cancelled = false;
		let cancel: (() => void) | undefined;
		void loadRotationDamageCache().then(() => {
			if (cancelled) return;
			setVersion((v) => v + 1);
			const pending = profiles.filter(
				(p) =>
					p.customRotation &&
					!cachedRotationDamage(rotationDamageKey(revision, p)),
			);
			if (!pending.length) return;
			const keys = new Map(
				pending.map((p) => [p.id, rotationDamageKey(revision, p)]),
			);
			cancel = scoreRotationProfiles(
				pending,
				(id, score) => {
					const key = keys.get(id);
					if (!key) return;
					rememberRotationDamage(key, score);
					setVersion((v) => v + 1);
				},
				setError,
			);
		});
		return () => {
			cancelled = true;
			cancel?.();
		};
	}, [profiles, enabled]);
	return {
		damage,
		error: enabled ? (bundledRotationError(profiles, revision) ?? error) : null,
	};
}
