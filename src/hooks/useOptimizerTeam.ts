import { useMemo } from "react";
import type { AccountSnapshot } from "@/lib/account";
import { type OptimizerOverrides, teamBuilds } from "@/lib/calc/translate";
import type { CalculatorCatalog } from "@/lib/calc/types";
import { customRotationProfile } from "@/lib/customRotations";
import {
	EMPTY_OPTIMIZER_SETUP,
	type OptimizerSetup,
	optimizerSetupKey,
	optimizerSetupSchema,
	resolveOptimizerSelection,
} from "@/lib/optimizerSetup";
import { useFilterState } from "@/lib/persistentState";
import { useCustomRotations } from "./useCustomRotations";

export function useOptimizerTeam(
	snapshot: AccountSnapshot,
	catalog: CalculatorCatalog | null,
) {
	const [customRotations] = useCustomRotations();
	const combinedCatalog = useMemo(
		() =>
			catalog
				? {
						...catalog,
						teams: [
							...catalog.teams,
							...customRotations.map((r) => customRotationProfile(r, catalog)),
						],
					}
				: null,
		[catalog, customRotations],
	);
	const [setup, setSetup] = useFilterState(
		optimizerSetupKey(snapshot.profile?.id),
		EMPTY_OPTIMIZER_SETUP,
		optimizerSetupSchema,
	);
	const { profileId, overrides, mode } = setup;
	const profiles = combinedCatalog?.teams ?? [];
	// Load a rotation first; changing its target keeps the ordered team intact.
	const { profile, targetId } = resolveOptimizerSelection(
		setup,
		combinedCatalog,
	);
	const translated = useMemo(
		() =>
			profile && targetId
				? teamBuilds(snapshot, profile, overrides, targetId)
				: { members: [], errors: [] },
		[snapshot, profile, overrides, targetId],
	);
	const patchRole = (id: number, patch: OptimizerOverrides) =>
		setSetup((previous) => ({
			...previous,
			overrides: {
				...previous.overrides,
				[id]: { ...previous.overrides[id], ...patch },
			},
		}));
	const chooseTarget = (id: number) => {
		if (
			profile &&
			(id === 0 || profile.members.some((m) => m.characterId === id))
		)
			setSetup((previous) => ({ ...previous, targetId: id }));
	};
	const chooseProfile = (id: string) => {
		if (profiles.some((p) => p.id === id))
			setSetup((previous) => ({ ...previous, profileId: id, targetId: 0 }));
	};
	const setMode = (mode: OptimizerSetup["mode"]) =>
		setSetup((previous) => ({ ...previous, mode }));
	return {
		catalogRevision: catalog?.revision ?? null,
		mode,
		setMode,
		targetId,
		setTargetId: chooseTarget,
		profileId,
		setProfileId: chooseProfile,
		profiles,
		profile,
		overrides,
		patchRole,
		...translated,
	};
}
