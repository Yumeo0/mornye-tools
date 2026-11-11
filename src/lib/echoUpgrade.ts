import { invoke } from "@tauri-apps/api/core";
import tables from "@/configs/echo_upgrade.json";
import type { AccountSnapshot, Echo } from "@/lib/account";
import type { DangerousStatus } from "@/lib/dangerous";

export interface EchoUpgradePlan {
	incr_id: number;
	item_id: number;
	from_level: number;
	from_exp: number;
	from_sub_props: [number, number][];
	target_level: number;
	/** Expected level after feeding EXP; discarded fodder may pass the checkpoint. */
	result_level: number;
	materials: { id: number; count: number }[];
	exp: number;
	max_credits: number;
	identify_count: number;
	tuners: { id: number; count: number }[];
	echo_materials: {
		incr_id: number;
		item_id: number;
		count: number;
		exp: number;
	}[];
}

export interface EchoMaterialPolicy {
	discard_echoes: boolean;
	exp_material_ids: number[];
}
export interface EchoUpgradeOptions {
	materials: EchoMaterialPolicy;
	autoDiscard: boolean;
	/** Percentage chance of reaching target RV; zero disables the cutoff. */
	minSuccessChance: number;
}
export const DEFAULT_UPGRADE_OPTIONS: EchoUpgradeOptions = {
	materials: {
		discard_echoes: true,
		exp_material_ids: [36000001, 36000002, 36000003, 36000004],
	},
	autoDiscard: false,
	minSuccessChance: 1,
};

export function requestEchoDiscard(profileId: string, echo: Echo) {
	return invoke<{ marked: boolean; reason: string | null }>(
		"dangerous_echo_discard",
		{
			profileId,
			expected: {
				incr_id: echo.incrId,
				item_id: echo.itemId,
				level: echo.level,
				sub_props: echo.subProps.map((prop) => [prop.propId, prop.raw]),
			},
		},
	);
}

export function echoLevelLimit(itemId: number): number {
	const item = (tables.items as Record<string, number[]>)[itemId];
	return item ? ((tables.limits as Record<string, number>)[item[1]] ?? 0) : 0;
}

export function canUpgradeEcho(
	snapshot: AccountSnapshot,
	status: DangerousStatus | null,
): boolean {
	return !!(
		status?.enabled &&
		status.phase === "connected" &&
		snapshot.profile &&
		snapshot.profile.playerId === status.player_id &&
		snapshot.profile.serverId === status.server_id
	);
}

export function isUpgradeableEcho(echo: Echo): boolean {
	return (
		echo.source !== "manual" &&
		echo.incrId > 0 &&
		(echo.level < echoLevelLimit(echo.itemId) ||
			echo.subProps.length < echoTuningSlots(echo.itemId, echo.level))
	);
}

/** Preserve selected copy order while respecting the current inventory counts. */
export function availableEchoCopies(
	selected: Echo[],
	inventory: Echo[],
): Echo[] {
	const current = new Map(inventory.map((echo) => [echo.incrId, echo]));
	const used = new Map<number, number>();
	return selected.flatMap((selection) => {
		const echo = current.get(selection.incrId);
		if (!echo || !isUpgradeableEcho(echo)) return [];
		const count = used.get(echo.incrId) ?? 0;
		if (count >= Math.max(1, echo.stackCount)) return [];
		used.set(echo.incrId, count + 1);
		return [echo];
	});
}

export function echoTuningSlots(itemId: number, level = 25): number {
	const item = (tables.items as Record<string, number[]>)[itemId];
	const tuning =
		item && (tables.tuning as Record<string, { slots: number[] }>)[item[1]];
	return tuning ? tuning.slots.filter((unlock) => unlock <= level).length : 0;
}

export const EXP_MATERIAL_NAMES: Record<number, string> = {
	36000001: "Basic Sealed Tube",
	36000002: "Medium Sealed Tube",
	36000003: "Advanced Sealed Tube",
	36000004: "Premium Sealed Tube",
};

export function requestEchoUpgrade(
	profileId: string,
	incrId: number,
	targetLevel: number,
	approved: EchoUpgradePlan | null = null,
	protectedIds: number[] = [incrId],
	materialPolicy: EchoMaterialPolicy = DEFAULT_UPGRADE_OPTIONS.materials,
) {
	return invoke<EchoUpgradePlan>("dangerous_echo_upgrade", {
		profileId,
		incrId,
		targetLevel,
		approved,
		protectedIds,
		materialPolicy,
	});
}
