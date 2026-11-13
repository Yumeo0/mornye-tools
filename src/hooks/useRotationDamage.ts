import { useEffect, useMemo, useState } from "react";
import { bundledRotationError } from "@/lib/calc/bundledRotationDamage";
import { scoreRotationProfiles } from "@/lib/calc/core";
import {
	type RotationChains,
	usesReferenceChains,
} from "@/lib/calc/ownedRotationDamage";
import {
	loadRotationDamageCache,
	rememberRotationDamage,
	rotationDamageKey,
	rotationReferenceRevision,
	savedRotationDamage,
} from "@/lib/calc/rotationDamageCache";
import type { TeamProfile } from "@/lib/calc/types";

export function useRotationDamage(
	profiles: TeamProfile[],
	enabled: boolean,
	chains?: RotationChains,
) {
	const revision = rotationReferenceRevision;
	const [version, setVersion] = useState(0);
	const [error, setError] = useState<string | null>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: version publishes external cache writes without restarting the worker.
	const damage = useMemo(
		() =>
			new Map(
				profiles.flatMap((p) => {
					const score = savedRotationDamage(revision, p, chains);
					return score ? [[p.id, score] as const] : [];
				}),
			),
		[profiles, version, revision, chains],
	);
	useEffect(() => {
		if (!enabled) return;
		setError(null);
		if (
			!profiles.some((p) => p.customRotation || !usesReferenceChains(p, chains))
		)
			return;
		let cancelled = false;
		let cancel: (() => void) | undefined;
		void loadRotationDamageCache().then(() => {
			if (cancelled) return;
			setVersion((v) => v + 1);
			const pending = profiles.filter(
				(p) =>
					(p.customRotation || !usesReferenceChains(p, chains)) &&
					!savedRotationDamage(revision, p, chains),
			);
			if (!pending.length) return;
			const keys = new Map(
				pending.map((p) => [p.id, rotationDamageKey(revision, p, chains)]),
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
				chains,
			);
		});
		return () => {
			cancelled = true;
			cancel?.();
		};
	}, [profiles, enabled, chains]);
	return {
		damage,
		error: enabled
			? (bundledRotationError(
					profiles.filter((p) => usesReferenceChains(p, chains)),
					revision,
				) ?? error)
			: null,
	};
}
