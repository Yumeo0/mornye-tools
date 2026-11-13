import { invoke } from "@tauri-apps/api/core";
import type { AccountSnapshot, Echo } from "./account";
import type { DangerousStatus } from "./dangerous";
import { canUpgradeEcho } from "./echoUpgrade";

export type EchoMark = "none" | "locked" | "discarded";
export const ECHO_MARK_ICONS = {
	locked: "/icons/echo-marks/locked.webp",
	unlocked: "/icons/echo-marks/unlocked.webp",
	discarded: "/icons/echo-marks/discarded.webp",
};

export function echoMark(echo: Echo): EchoMark {
	return echo.funcValue === 1
		? "locked"
		: echo.funcValue === 2
			? "discarded"
			: "none";
}

export function canMarkEcho(
	snapshot: AccountSnapshot,
	status: DangerousStatus | null,
	echo: Echo,
): boolean {
	return (
		canUpgradeEcho(snapshot, status) &&
		echo.source !== "manual" &&
		echo.incrId > 0 &&
		[0, 1, 2].includes(echo.funcValue)
	);
}

export function requestEchoMark(profileId: string, echo: Echo, mark: EchoMark) {
	return invoke<number>("dangerous_echo_mark", {
		profileId,
		expected: {
			incr_id: echo.incrId,
			item_id: echo.itemId,
			func_value: echo.funcValue,
			stack_count: Math.max(1, echo.stackCount ?? 1),
		},
		mark,
	});
}
