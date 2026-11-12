import roleAliases from "@/configs/role_aliases.json";
import {
	type AccountSnapshot,
	type Echo,
	echoesForResonator,
	weaponForResonator,
} from "@/lib/account";
import { echoesByMonsterId } from "@/lib/catalog";
import type { CalcEcho, MemberBuild, TeamProfile } from "./types";

const aliases =
	(roleAliases as { aliases?: Record<string, string> }).aliases ?? {};
export function aliasRoleId(id: number): string {
	return aliases[String(id)] ?? String(id);
}
const normalize = (s: string) =>
	s
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
const types = new Map<string, number>();
for (const e of echoesByMonsterId.values()) {
	const key = normalize(e.echo_name);
	const id = e.monster_id!;
	types.set(key, Math.min(types.get(key) ?? id, id));
}
export function toEchoInstance(echo: Echo): {
	instance: CalcEcho | null;
	error?: string;
} {
	const def = echoesByMonsterId.get(echo.monsterId);
	if (
		!def?.echo_cost ||
		!echo.mainProps.length ||
		!def.echo_sets.some((s) => s.id === echo.setId)
	)
		return {
			instance: null,
			error: `Echo ${echo.incrId}: unknown species, set, cost, or missing main stat.`,
		};
	if (
		[...echo.mainProps, ...echo.subProps].some(
			(p) => !Number.isFinite(p.value) || p.value < 0,
		)
	)
		return {
			instance: null,
			error: `Echo ${echo.incrId}: invalid stat value.`,
		};
	return {
		instance: {
			uid: `incr:${echo.incrId}`,
			typeId: types.get(normalize(def.echo_name))!,
			name: def.echo_name,
			cost: def.echo_cost,
			setId: echo.setId,
			level: echo.level,
			mainStats: echo.mainProps,
			substats: echo.subProps,
		},
	};
}
export interface OptimizerOverrides {
	chain?: number;
	weaponItemId?: number;
	weaponRank?: number;
	echoSource?: MemberBuild["echoSource"];
}
export function teamBuilds(
	snapshot: AccountSnapshot,
	profile: TeamProfile,
	overrides: Record<number, OptimizerOverrides> = {},
	targetId?: number,
): { members: MemberBuild[]; errors: string[] } {
	const errors = [...profile.errors];
	const members = profile.members.map((m) => {
		const role = snapshot.resonators.find(
			(r) => Number(aliasRoleId(r.id)) === m.characterId,
		);
		const saved = role ? weaponForResonator(snapshot, role.id) : undefined;
		const edit = overrides[m.characterId];
		// The target always searches actual inventory, regardless of ownership.
		// Teammates default to theoretical rotation stats; owned teammates may
		// explicitly opt into their equipped echoes.
		const echoSource =
			m.characterId === targetId
				? "equipped"
				: !role
					? "rotation"
					: (edit?.echoSource ?? "rotation");
		const weaponId =
			edit?.weaponItemId ?? saved?.itemId ?? (!role ? m.defaultWeapon.id : 0);
		const weaponRank =
			edit?.weaponRank ??
			saved?.rank ??
			(!role && !edit?.weaponItemId ? m.defaultWeapon.rank : 1);
		if (
			!m.weapons.some((w) => w.id === weaponId && w.ranks.includes(weaponRank))
		)
			errors.push(`${m.name}: select a supported weapon and refinement.`);
		const chain = edit?.chain ?? role?.chain ?? 0;
		if (chain > m.maxSequence)
			errors.push(
				`${m.name}: this loadout models up to S${m.maxSequence}; select a supported chain override.`,
			);
		if (chain < m.minSequence)
			errors.push(
				`${m.name}: this rotation requires at least S${m.minSequence}.`,
			);
		const echoes: CalcEcho[] = [];
		if (role && echoSource === "equipped")
			for (const e of echoesForResonator(snapshot, role.id).sort(
				(a, b) => (a.slot ?? 99) - (b.slot ?? 99),
			)) {
				const result = toEchoInstance(e);
				if (result.instance) echoes.push(result.instance);
				else if (result.error) errors.push(result.error);
			}
		return {
			characterId: m.characterId,
			chain,
			weaponId,
			weaponRank,
			echoSource,
			echoes,
		};
	});
	return { members, errors };
}
export function inventoryRevision(snapshot: AccountSnapshot): string {
	return JSON.stringify([
		snapshot.profile?.id,
		snapshot.resonators,
		snapshot.weapons,
		snapshot.echoes,
	]);
}

/** Echo assignments affect the equipped reference, not a candidate's damage. */
export function optimizerInventoryRevision(snapshot: AccountSnapshot): string {
	return inventoryRevision({
		...snapshot,
		echoes: snapshot.echoes
			.map(({ equippedBy: _equippedBy, slot: _slot, ...echo }) => echo)
			.sort((left, right) => left.incrId - right.incrId),
	});
}
