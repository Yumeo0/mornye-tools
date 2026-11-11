import { invoke } from "@tauri-apps/api/core";
import type { AccountSnapshot, Echo } from "@/lib/account";
import { optimizerBuildKey } from "@/lib/calc/optimizerResults";
import { echoesByMonsterId } from "@/lib/catalog";
import type { DangerousStatus } from "@/lib/dangerous";
import { canUpgradeEcho } from "@/lib/echoUpgrade";

export function optimizerEquipError(
	snapshot: AccountSnapshot,
	status: DangerousStatus | null,
	roleId: number,
	uids: string[],
): string | null {
	if (!snapshot.resonators.some((role) => role.id === roleId))
		return "This resonator is not owned by the selected profile.";
	if (!canUpgradeEcho(snapshot, status))
		return "Connect to this profile's game account in Settings to equip echoes.";
	if (uids.length !== 5 || new Set(uids).size !== 5)
		return "Choose a complete five-echo result.";
	const echoes = new Map(
		snapshot.echoes.map((echo) => [`incr:${echo.incrId}`, echo]),
	);
	let totalCost = 0;
	for (const uid of uids) {
		const echo = echoes.get(uid);
		if (echo?.source !== "sniffer" || echo.incrId <= 0)
			return "This result contains manual or unavailable echoes. Run the optimizer again.";
		const cost = echoesByMonsterId.get(echo.monsterId)?.echo_cost;
		if (!cost) return "An echo's cost is unknown. Run the optimizer again.";
		totalCost += cost;
	}
	return totalCost > 12 ? "This build exceeds the 12-cost limit." : null;
}

export function isOptimizerBuildEquipped(
	snapshot: AccountSnapshot,
	roleId: number,
	uids: string[],
): boolean {
	const equipped = snapshot.echoes
		.filter((echo) => echo.equippedBy === roleId)
		.sort((left, right) => (left.slot ?? 99) - (right.slot ?? 99));
	return (
		equipped.length === 5 &&
		equipped[0]?.slot === 0 &&
		optimizerBuildKey(equipped.map((echo) => `incr:${echo.incrId}`)) ===
			optimizerBuildKey(uids)
	);
}

export function requestOptimizerEquip(
	profileId: string,
	roleId: number,
	echoes: Echo[],
) {
	return invoke<number[]>("dangerous_echo_equip", {
		profileId,
		roleId,
		echoes: echoes.map((echo) => ({
			incr_id: echo.incrId,
			item_id: echo.itemId,
		})),
	});
}
