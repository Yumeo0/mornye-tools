import type { AccountSnapshot } from "@/lib/account";
import type { RotationDamage } from "@/lib/calc/rotationDamage";
import { aliasRoleId } from "@/lib/calc/translate";
import type { TeamProfile } from "@/lib/calc/types";

export interface RotationFilters {
	search: string;
	characterId: string;
	role: "any" | "dps" | "support";
	ownership: "any" | "owned";
	sort: "name" | "damage-desc" | "damage-asc";
}
export const EMPTY_ROTATION_FILTERS: RotationFilters = {
	search: "",
	characterId: "any",
	role: "any",
	ownership: "any",
	sort: "name",
};

export function filterRotationProfiles(
	profiles: TeamProfile[],
	snapshot: AccountSnapshot,
	filters: RotationFilters,
	damage: ReadonlyMap<string, RotationDamage> = new Map(),
) {
	const owned = new Set(
		snapshot.resonators.map((r) => Number(aliasRoleId(r.id))),
	);
	const terms = filters.search
		.trim()
		.toLocaleLowerCase()
		.split(/\s+/)
		.filter(Boolean);
	const matching = profiles.filter((p) => {
		if (
			filters.ownership === "owned" &&
			!p.members.every((m) => owned.has(m.characterId))
		)
			return false;
		if (
			filters.characterId !== "any" &&
			!p.members.some(
				(m) =>
					String(m.characterId) === filters.characterId &&
					(filters.role === "any" || m.mainDps === (filters.role === "dps")),
			)
		)
			return false;
		const text =
			`${p.label} ${p.members.map((m) => `${m.name} ${m.variant} ${m.mainEcho.name}`).join(" ")}`.toLocaleLowerCase();
		return terms.every((term) => text.includes(term));
	});
	return sortRotationProfiles(matching, filters.sort, damage);
}

export function sortRotationProfiles(
	profiles: TeamProfile[],
	sort: RotationFilters["sort"],
	damage: ReadonlyMap<string, RotationDamage>,
) {
	return profiles.toSorted((a, b) => {
		if (sort !== "name") {
			const left = damage.get(a.id)?.damage;
			const right = damage.get(b.id)?.damage;
			// Pending and invalid scores stay last in either direction.
			if (left == null && right != null) return 1;
			if (left != null && right == null) return -1;
			if (left != null && right != null && left !== right)
				return sort === "damage-desc" ? right - left : left - right;
		}
		return a.label.localeCompare(b.label) || a.id.localeCompare(b.id);
	});
}

/** Preserve the chosen sort order while collecting variants of the same team. */
export function groupRotationProfiles(profiles: TeamProfile[]) {
	const groups = new Map<string, { id: string; profiles: TeamProfile[] }>();
	for (const profile of profiles) {
		const id = profile.customRotation
			? profile.id
			: profile.members
					.map((member) => `${member.characterId}:${member.mainDps}`)
					.join("|");
		const group = groups.get(id) ?? { id, profiles: [] };
		group.profiles.push(profile);
		groups.set(id, group);
	}
	return [...groups.values()];
}
