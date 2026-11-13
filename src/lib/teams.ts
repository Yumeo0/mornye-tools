import { invoke } from "@tauri-apps/api/core";
import type { AccountSnapshot, SavedTeam } from "@/lib/account";
import type { DangerousStatus } from "@/lib/dangerous";

export function canEditTeams(
	snapshot: AccountSnapshot,
	status: DangerousStatus | null,
): boolean {
	return !!(
		status?.enabled &&
		status.phase === "connected" &&
		snapshot.profile &&
		!snapshot.profile.provisional &&
		snapshot.profile.playerId === status.player_id &&
		snapshot.profile.serverId === status.server_id
	);
}

export const teamName = (team: SavedTeam) => team.name || `Team ${team.id}`;

export function teamEditError(
	snapshot: AccountSnapshot,
	expected: SavedTeam,
	roleIds: number[],
): string | null {
	const current = snapshot.teams?.find((team) => team.id === expected.id);
	if (
		!current ||
		current.name !== expected.name ||
		current.isCurrent !== expected.isCurrent ||
		(current.currentRole ?? 0) !== (expected.currentRole ?? 0) ||
		current.roleIds.length !== expected.roleIds.length ||
		current.roleIds.some((id, index) => id !== expected.roleIds[index])
	)
		return "This team changed. Reopen the editor to use its latest composition.";
	if (roleIds.length < 1 || roleIds.length > 3)
		return "Choose one to three Resonators.";
	if (
		new Set(roleIds).size !== roleIds.length ||
		roleIds.some((id) => !snapshot.resonators.some((role) => role.id === id))
	)
		return "Choose distinct owned Resonators.";
	return null;
}

export function requestTeamUpdate(
	profileId: string,
	expected: SavedTeam,
	name: string,
	roleIds: number[],
) {
	return invoke<void>("dangerous_team_update", {
		profileId,
		expected,
		name,
		roleIds,
	});
}

export function requestTeamSwitch(profileId: string, teamId: number) {
	return invoke<void>("dangerous_team_switch", { profileId, teamId });
}
