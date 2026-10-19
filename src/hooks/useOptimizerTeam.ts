// Team and loadout state for the optimizer: the build catalog (saved data
// plus unowned defaults), the three slot selections, per-character loadout
// overrides and the rotation list.
//
// In team mode the rotation belongs to the *measured* teammate (the one whose
// rotation is scored), not to the searched character, and the cross-character
// effects of the measured rotation drive the metric.

import { listResRttn } from "@wuwacalc/core/data/catalog/gameDataService";
import type {
	ResRuntime,
	TeamSlots,
} from "@wuwacalc/core/domain/entities/runtime";
import type { RotDef } from "@wuwacalc/core/domain/gameData/contracts";
import { listOptTrgt } from "@wuwacalc/core/engine/optimizer/target/skills";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { allCharacters } from "@/components/echo/EchoCard";
import type { SlotKey } from "@/components/optimizer/CharacterSlotBox";
import { roleLabel } from "@/components/optimizer/display";
import { weaponsById } from "@/components/weapon/WeaponCard";
import type { AccountSnapshot } from "@/lib/account";
import { withTeam } from "@/lib/calc/optimizer";
import {
	type AccountTranslation,
	buildOptimizerRuntime,
	EMPTY_OPTIMIZER_OVERRIDES,
	hasOptimizerOverrides,
	makeUnownedBuild,
	type OptimizerOverrides,
	type TranslatedBuild,
	translateAccount,
} from "@/lib/calc/translate";

const EMPTY_TRANSLATION: AccountTranslation = { builds: [], errors: [] };

/** Which teammate's rotation a team-damage search scores. */
export type MeasuredSlot = "mateOne" | "mateTwo";

export function useOptimizerTeam({
	coreReady,
	snapshot,
	mode,
	measuredSlot,
}: {
	coreReady: boolean;
	snapshot: AccountSnapshot;
	/** Search mode; team mode scores a teammate instead of the target. */
	mode: "damage" | "team";
	/** Slot measured in team mode. */
	measuredSlot: MeasuredSlot;
}) {
	const translation: AccountTranslation = useMemo(
		() => (coreReady ? translateAccount(snapshot) : EMPTY_TRANSLATION),
		[coreReady, snapshot],
	);
	const builds = translation.builds;
	// Per-character loadout edits (level / chain / weapon), keyed by role id.
	const [overrides, setOverrides] = useState<
		Record<string, OptimizerOverrides>
	>({});
	const ownedRoleIds = useMemo(
		() => new Set(builds.map((build) => build.roleId)),
		[builds],
	);

	// Every catalog character is selectable; owned resonators come from the
	// snapshot, everything else gets a default (unowned) build.
	const allBuilds: TranslatedBuild[] = useMemo(() => {
		if (!coreReady) return [];
		const list = [...builds];
		for (const character of allCharacters) {
			const roleId = String(character.character_id);
			if (ownedRoleIds.has(roleId)) continue;
			const unowned = makeUnownedBuild(roleId, character.character_name);
			if (unowned) list.push(unowned);
		}
		return list.sort((a, b) => roleLabel(a).localeCompare(roleLabel(b)));
	}, [coreReady, builds, ownedRoleIds]);

	// Builds with the saved-data/override runtime applied.
	const buildsByRoleId = useMemo(() => {
		const map = new Map<string, TranslatedBuild>();
		for (const build of allBuilds) {
			map.set(build.roleId, {
				...build,
				runtime: buildOptimizerRuntime(build, overrides[build.roleId]),
			});
		}
		return map;
	}, [allBuilds, overrides]);

	const [targetRoleId, setTargetRoleId] = useState("");
	const [mateOne, setMateOne] = useState("");
	const [mateTwo, setMateTwo] = useState("");

	// Pick the first build once when nothing is selected yet; afterwards an
	// empty target slot is a deliberate choice (e.g. dragged away) and only a
	// stale selection heals back to a default.
	const defaultedTargetRef = useRef(false);
	useEffect(() => {
		if (allBuilds.length === 0) return;
		if (!defaultedTargetRef.current) {
			defaultedTargetRef.current = true;
			if (!targetRoleId) setTargetRoleId(allBuilds[0].roleId);
			return;
		}
		if (targetRoleId && !buildsByRoleId.has(targetRoleId)) {
			setTargetRoleId(allBuilds[0].roleId);
		}
	}, [allBuilds, buildsByRoleId, targetRoleId]);

	// The target cannot also fill a teammate slot, and stale selections
	// (characters that left the catalog) clear themselves. The validity check
	// only runs once the character list is actually loaded, otherwise it would
	// wipe the current selections during startup.
	useEffect(() => {
		if (mateOne && mateOne === targetRoleId) setMateOne("");
		if (mateTwo && mateTwo === targetRoleId) setMateTwo("");
		if (allBuilds.length > 0) {
			if (mateOne && !buildsByRoleId.has(mateOne)) setMateOne("");
			if (mateTwo && !buildsByRoleId.has(mateTwo)) setMateTwo("");
		}
	}, [allBuilds, targetRoleId, mateOne, mateTwo, buildsByRoleId]);

	// The teammate whose rotation a team-damage search scores. The rotation
	// picker below always follows that character in team mode.
	const measuredRoleId =
		mode === "team" ? (measuredSlot === "mateOne" ? mateOne : mateTwo) : "";
	const rotationSubjectRoleId = mode === "team" ? measuredRoleId : targetRoleId;
	const measuredBuild = measuredRoleId
		? buildsByRoleId.get(measuredRoleId)
		: undefined;

	const rotations: RotDef[] = useMemo(() => {
		if (!coreReady || !rotationSubjectRoleId) return [];
		try {
			return listResRttn(rotationSubjectRoleId);
		} catch {
			return [];
		}
	}, [coreReady, rotationSubjectRoleId]);

	const [rotationId, setRotationId] = useState("");
	useEffect(() => {
		if (rotations.length === 0) {
			if (rotationId) setRotationId("");
			return;
		}
		if (!rotations.some((rotation) => rotation.id === rotationId)) {
			setRotationId(rotations[0].id);
		}
	}, [rotations, rotationId]);
	const rotation = rotations.find((entry) => entry.id === rotationId) ?? null;

	const targetBuild = targetRoleId
		? buildsByRoleId.get(targetRoleId)
		: undefined;
	const mateBuilds = useMemo(
		() =>
			[mateOne, mateTwo]
				.filter((id): id is string => id !== "")
				.map((id) => buildsByRoleId.get(id))
				.filter((build): build is TranslatedBuild => build != null),
		[mateOne, mateTwo, buildsByRoleId],
	);

	// Skill fallback for resonators without an authored rotation. In team mode
	// the picker follows the measured teammate, so the searched character has
	// no skill target here.
	const targetSkillId = useMemo(() => {
		if (
			mode === "team" ||
			!coreReady ||
			rotations.length > 0 ||
			!targetBuild?.runtime
		) {
			return null;
		}
		try {
			return listOptTrgt(targetBuild.runtime)[0]?.id ?? null;
		} catch {
			return null;
		}
	}, [mode, coreReady, rotations.length, targetBuild]);

	// Teammate runtimes with the full team slots filled in.
	const companionRuntimes = useMemo(() => {
		if (!targetBuild?.runtime) return {} as Record<string, ResRuntime>;
		const team: TeamSlots = [
			targetBuild.roleId,
			mateOne || null,
			mateTwo || null,
		];
		const runtimes: Record<string, ResRuntime> = {};
		for (const mate of mateBuilds) {
			if (mate.runtime) runtimes[mate.roleId] = withTeam(mate.runtime, team);
		}
		return runtimes;
	}, [targetBuild, mateBuilds, mateOne, mateTwo]);

	// --- Slot boxes: read/write accessors + drag-and-drop swaps ---------------

	const slotRoleIds: Record<SlotKey, string> = useMemo(
		() => ({ target: targetRoleId, mateOne, mateTwo }),
		[targetRoleId, mateOne, mateTwo],
	);
	const setSlotRoleId = useCallback((slot: SlotKey, roleId: string) => {
		if (slot === "target") setTargetRoleId(roleId);
		else if (slot === "mateOne") setMateOne(roleId);
		else setMateTwo(roleId);
	}, []);
	const swapSlots = useCallback(
		(a: SlotKey, b: SlotKey) => {
			const roleA = slotRoleIds[a];
			const roleB = slotRoleIds[b];
			setSlotRoleId(a, roleB);
			setSlotRoleId(b, roleA);
		},
		// slotRoleIds is memoized on the current ids: the swap always uses the
		// values visible when the drop happened.
		[slotRoleIds, setSlotRoleId],
	);

	// Compact per-slot summary: effective level/chain/weapon (override-aware).
	const slotSummary = useCallback(
		(roleId: string): string => {
			const build = buildsByRoleId.get(roleId);
			if (!build) return "";
			const slotOverride = overrides[roleId] ?? EMPTY_OPTIMIZER_OVERRIDES;
			const level = slotOverride.level ?? build.resonator.level;
			const chain = slotOverride.chain ?? build.resonator.chain;
			const weapon =
				slotOverride.weaponItemId != null
					? (weaponsById.get(slotOverride.weaponItemId)?.name ?? null)
					: build.weapon
						? (weaponsById.get(Number(build.weapon.id))?.name ?? null)
						: null;
			return weapon
				? `Lvl ${level} · C${chain} · ${weapon}`
				: `Lvl ${level} · C${chain}`;
		},
		[buildsByRoleId, overrides],
	);

	// Write one override patch for a role; fields set back to the saved value
	// become null again, and a fully-cleared override removes itself.
	const patchRole = useCallback(
		(roleId: string, patch: Partial<OptimizerOverrides>) => {
			setOverrides((prev) => {
				const current = prev[roleId] ?? EMPTY_OPTIMIZER_OVERRIDES;
				const next = { ...current, ...patch };
				if (!hasOptimizerOverrides(next)) {
					return Object.fromEntries(
						Object.entries(prev).filter(([key]) => key !== roleId),
					);
				}
				return { ...prev, [roleId]: next };
			});
		},
		[],
	);

	const ownedWeaponItemIds = useMemo(
		() => new Set(snapshot.weapons.map((weapon) => weapon.itemId)),
		[snapshot.weapons],
	);

	// --- Loadout editor dialog state -----------------------------------------

	// Which role slot's edit dialog is open.
	const [editingSlot, setEditingSlot] = useState<SlotKey | null>(null);
	// Which slot's character picker is open.
	const [pickingSlot, setPickingSlot] = useState<SlotKey | null>(null);
	const editingRoleId = editingSlot ? slotRoleIds[editingSlot] : null;
	const editingBuild = editingRoleId
		? buildsByRoleId.get(editingRoleId)
		: undefined;
	const editingOverride = editingRoleId
		? (overrides[editingRoleId] ?? EMPTY_OPTIMIZER_OVERRIDES)
		: EMPTY_OPTIMIZER_OVERRIDES;
	// Effect edits are stored as deviations from this runtime: the same loadout
	// choices (level/chain/weapon) with every effect control back at default.
	const editingBaselineRuntime = useMemo(() => {
		if (!editingBuild) return null;
		const original = allBuilds.find(
			(build) => build.roleId === editingBuild.roleId,
		);
		if (!original) return editingBuild.runtime;
		return buildOptimizerRuntime(original, {
			...(overrides[editingBuild.roleId] ?? EMPTY_OPTIMIZER_OVERRIDES),
			controls: null,
		});
	}, [allBuilds, editingBuild, overrides]);

	return {
		builds,
		allBuilds,
		buildsByRoleId,
		ownedRoleIds,
		overrides,
		patchRole,
		targetRoleId,
		mateOne,
		mateTwo,
		rotations,
		rotationId,
		setRotationId,
		rotation,
		targetBuild,
		mateBuilds,
		targetSkillId,
		measuredRoleId,
		measuredBuild,
		companionRuntimes,
		slotRoleIds,
		setSlotRoleId,
		swapSlots,
		slotSummary,
		ownedWeaponItemIds,
		editingSlot,
		setEditingSlot,
		editingBuild,
		editingOverride,
		editingBaselineRuntime,
		pickingSlot,
		setPickingSlot,
	};
}
