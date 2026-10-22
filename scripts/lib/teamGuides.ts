export interface TeamGuideResonator {
	name?: string;
	guides?: {
		role?: string;
		teamCompositions?: { variant?: string; compositions?: string[][] }[];
	}[];
}

export interface RecommendedTeam {
	name: string;
	role: string;
	roleIds: string[];
	/** Guide annotations such as required echo sets; informational only. */
	notes: string[];
}

/** Expand each slot's alternatives, retaining only complete, distinct teams. */
export function compileTeamGuides(
	dataset: TeamGuideResonator[],
	characterIds: Record<string, number>,
) {
	const result: Record<string, RecommendedTeam[]> = {};
	for (const resonator of dataset) {
		const target = resonator.name && characterIds[resonator.name];
		if (!target) continue;
		const teams: RecommendedTeam[] = [];
		const seen = new Set<string>();
		for (const guide of resonator.guides ?? []) {
			for (const composition of guide.teamCompositions ?? []) {
				if (composition.compositions?.length !== 3) continue;
				const slots = composition.compositions.map((slot) =>
					slot.flatMap((entry) => {
						const [name, ...annotation] = entry
							.split("\n")
							.map((line) => line.trim());
						const id = characterIds[name];
						return id
							? [
									{
										id: String(id),
										note: annotation.length
											? `${name}: ${annotation.join(" · ")}`
											: "",
									},
								]
							: [];
					}),
				);
				for (const a of slots[0])
					for (const b of slots[1])
						for (const c of slots[2]) {
							const roleIds = [a.id, b.id, c.id];
							if (
								new Set(roleIds).size !== 3 ||
								!roleIds.includes(String(target))
							)
								continue;
							const notes = [a.note, b.note, c.note].filter(Boolean);
							const name = composition.variant ?? "Recommended team";
							const role = guide.role ?? "";
							const key = JSON.stringify([name, role, roleIds, notes]);
							if (seen.has(key)) continue;
							seen.add(key);
							teams.push({ name, role, roleIds, notes });
						}
			}
		}
		if (teams.length) result[String(target)] = teams;
	}
	return result;
}
