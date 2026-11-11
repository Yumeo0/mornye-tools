import type { OptimizerFilters } from "@/components/optimizer/optimizerOptions";
import { optimizerPoolFilters } from "@/components/optimizer/optimizerOptions";
import { type AccountSnapshot, echoCount } from "@/lib/account";
import { supportEchoScore, supportGuideFor } from "./supportGuide";
import { aliasRoleId, toEchoInstance } from "./translate";
import type { CalcEcho, MemberBuild, TeamProfile } from "./types";

export function selectCandidates(
	snapshot: AccountSnapshot,
	profile: TeamProfile,
	members: MemberBuild[],
	targetId: number,
	filters: OptimizerFilters,
) {
	const descriptor = profile.members.find((m) => m.characterId === targetId)!;
	const errors: string[] = [];
	const reserved = new Set(
		members
			.filter((m) => m.characterId !== targetId && m.echoSource !== "rotation")
			.flatMap((m) => m.echoes.map((e) => e.uid)),
	);
	const selections = optimizerPoolFilters(filters, descriptor.recommendedMains);
	const all: CalcEcho[] = [];
	let eligible = 0;
	for (const e of snapshot.echoes) {
		if (reserved.has(`incr:${e.incrId}`) || e.level < filters.minLevel)
			continue;
		if (filters.equipped === "exclude-all" && e.equippedBy) continue;
		if (
			filters.equipped === "exclude-others" &&
			e.equippedBy &&
			Number(aliasRoleId(e.equippedBy)) !== targetId
		)
			continue;
		if (selections.sets.length && !selections.sets.includes(String(e.setId)))
			continue;
		if (
			selections.mainStats.length &&
			!selections.mainStats.includes(e.mainProps[0]?.key)
		)
			continue;
		if (
			selections.substats.length &&
			!e.subProps.some((p) => selections.substats.includes(p.key))
		)
			continue;
		const translated = toEchoInstance(e);
		if (translated.instance) {
			all.push(translated.instance);
			eligible += echoCount([e]);
		} else if (translated.error) errors.push(translated.error);
	}
	const guide = supportGuideFor(targetId);
	const rank = (e: CalcEcho) =>
		supportEchoScore(
			{
				mainStats: { primary: e.mainStats[0] },
				substats: Object.fromEntries(e.substats.map((p) => [p.key, p.value])),
			},
			guide,
		) +
		e.substats.reduce(
			(n, p) =>
				n +
				p.value *
					(p.key === "energyRegen"
						? 2
						: p.key === "critRate"
							? 2
							: p.key === "critDmg"
								? 1
								: p.key.endsWith("Flat")
									? 0.002
									: 0.5),
			0,
		);
	const sorted = [...all].sort(
		(a, b) => rank(b) - rank(a) || a.uid.localeCompare(b.uid),
	);
	const kept = new Map<string, CalcEcho>();
	const add = (e: CalcEcho) => kept.set(e.uid, e);
	for (const e of sorted.filter((e) => e.typeId === descriptor.mainEcho.typeId))
		add(e);
	// Retain choices across sets, costs, and main stats, including cheap fillers.
	const groups = new Map<string, number>();
	for (const e of sorted) {
		const key = `${e.setId}:${e.cost}:${e.mainStats[0]?.key}`;
		const n = groups.get(key) ?? 0;
		if (n < 4) {
			add(e);
			groups.set(key, n + 1);
		}
	}
	for (const e of sorted) if (kept.size < 220) add(e);
	const target = members.find((m) => m.characterId === targetId);
	for (const e of target?.echoes ?? [])
		if (all.some((v) => v.uid === e.uid)) add(e);
	const pool = [...kept.values()];
	return {
		pool,
		eligible,
		total: echoCount(snapshot.echoes),
		errors,
		truncated: pool.length < all.length,
		mainCount: pool.filter((e) => e.typeId === descriptor.mainEcho.typeId)
			.length,
	};
}
