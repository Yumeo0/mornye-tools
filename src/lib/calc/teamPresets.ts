import teamGuides from "@/configs/character_teams.json";
import type { SavedTeam } from "@/lib/account";
import { aliasRoleId } from "@/lib/calc/translate";

export interface TeamPreset {
	id: string;
	name: string;
	roleIds: string[];
	notes: string[];
	url?: string;
}

/** Preserve the optimization target even when it is a support in slot three. */
export function teammatesForPreset(
	target: string,
	roleIds: readonly string[],
): [string, string] | null {
	const ids = roleIds.filter((id) => id !== "" && id !== "0");
	if (
		!ids.includes(target) ||
		ids.length > 3 ||
		new Set(ids).size !== ids.length
	)
		return null;
	const mates = ids.filter((id) => id !== target);
	return [mates[0] ?? "", mates[1] ?? ""];
}

export function recommendedTeamPresets(target: string): TeamPreset[] {
	const guides =
		(
			teamGuides as Record<
				string,
				{ name: string; role: string; roleIds: string[]; notes: string[] }[]
			>
		)[target] ?? [];
	return guides.map((team, index) => ({
		id: `tethys:${target}:${index}`,
		name: team.name,
		roleIds: team.roleIds,
		notes: team.notes,
		url: `https://tethys.gg/resonators/${target}?role=${encodeURIComponent(team.role)}`,
	}));
}

export function savedTeamPresets(
	target: string,
	teams: readonly SavedTeam[],
): TeamPreset[] {
	return teams.flatMap((team) => {
		const roleIds = team.roleIds.filter((id) => id > 0).map(aliasRoleId);
		if (!teammatesForPreset(target, roleIds)) return [];
		return [
			{
				id: `saved:${team.id}`,
				name: `${team.name || `Team ${team.id}`}${team.isCurrent ? " · Current" : ""}`,
				roleIds,
				notes: [],
			},
		];
	});
}
