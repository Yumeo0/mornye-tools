import type { AccountProfile } from "@/lib/account";
import type { DangerousStatus } from "@/lib/dangerous";

export interface GameAccountGroup {
	account: DangerousStatus["accounts"][number] | null;
	profiles: AccountProfile[];
}

/** Include passive captures without inventing an account for stale links. */
export function gameAccountGroups(
	accounts: DangerousStatus["accounts"],
	profiles: AccountProfile[],
	links: Record<string, string>,
	populatedProfileId?: string,
): GameAccountGroup[] {
	const groups: GameAccountGroup[] = [...accounts]
		.sort((a, b) => a.email.localeCompare(b.email))
		.map((account) => ({ account, profiles: [] }));
	const byAccount = new Map(groups.map((group) => [group.account?.id, group]));
	const unlinked: GameAccountGroup = { account: null, profiles: [] };
	for (const profile of [...profiles].sort(
		(a, b) => a.name.localeCompare(b.name) || a.region.localeCompare(b.region),
	)) {
		if (profile.playerId <= 0 && profile.id !== populatedProfileId) continue;
		(byAccount.get(links[profile.id]) ?? unlinked).profiles.push(profile);
	}
	if (unlinked.profiles.length) groups.push(unlinked);
	return groups;
}
