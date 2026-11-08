import portraits from "@/configs/profile_portraits.json";
import type { AccountProfile, AccountSnapshot } from "@/lib/account";

const portraitById = new Map(
	portraits.map((entry) => [entry.id, entry.icon_head_256]),
);

/** Resolve the selected head item, not the first owned/equipped character. */
export function profilePortrait(
	headId: number | null | undefined,
): string | undefined {
	return headId == null ? undefined : portraitById.get(headId);
}

/** Keep UIDs out of visible selector labels and hover text. */
export function profileLabel(profile: AccountProfile, index: number): string {
	const name = profile.name.trim() || `Profile ${index + 1}`;
	const region =
		profile.serverId === "unknown" ? "Needs identification" : profile.region;
	return `${name} · ${region}`;
}

export function overviewCounts(snapshot: AccountSnapshot) {
	return {
		characters: snapshot.resonators.length,
		weapons: snapshot.weapons.length,
		echoes: snapshot.echoes.reduce(
			(count, echo) => count + Math.max(1, echo.stackCount ?? 1),
			0,
		),
		inventory: snapshot.inventory?.length ?? 0,
		teams: snapshot.teams?.length ?? 0,
	};
}

export function hasAccountData(snapshot: AccountSnapshot): boolean {
	const { player, profile, exploration, progression } = snapshot;
	return Boolean(
		player || (profile?.playerId ?? 0) > 0 ||
		[snapshot.resonators, snapshot.weapons, snapshot.echoes, snapshot.inventory, snapshot.teams].some((items) => items?.length) ||
		(exploration && (exploration.playerId > 0 || Object.keys(exploration.rewards).length > 0)) ||
		(progression && (progression.playerId > 0 ||
			Object.keys(progression.quests?.states ?? {}).length > 0 ||
			Object.keys(progression.achievements?.entries ?? {}).length > 0)),
	);
}
