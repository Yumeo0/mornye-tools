import type { AccountSnapshot } from "@/lib/account";
import { aliasRoleId } from "@/lib/calc/translate";
import type { TeamProfile } from "@/lib/calc/types";

export interface RotationFilters {
	search: string;
	characterId: string;
	role: "any" | "dps" | "support";
	ownership: "any" | "owned";
	compatibility: "any" | "supported";
}
export const EMPTY_ROTATION_FILTERS: RotationFilters = {
	search: "",
	characterId: "any",
	role: "any",
	ownership: "any",
	compatibility: "any",
};

export function filterRotationProfiles(
	profiles: TeamProfile[],
	snapshot: AccountSnapshot,
	filters: RotationFilters,
) {
	const owned = new Set(
		snapshot.resonators.map((r) => Number(aliasRoleId(r.id))),
	);
	const terms = filters.search
		.trim()
		.toLocaleLowerCase()
		.split(/\s+/)
		.filter(Boolean);
	return profiles
		.filter((p) => {
			if (filters.compatibility === "supported" && p.errors.length)
				return false;
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
		})
		.toSorted(
			(a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id),
		);
}
