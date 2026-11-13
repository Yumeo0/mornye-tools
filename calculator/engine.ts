// The sole upstream integration. Bundled by scripts/build-calculator.ts.

import panelData from "../src/configs/character_panel.json";
import echoData from "../src/configs/echo_data.json";
import type {
	CalcEcho,
	CalculatorCatalog,
	CustomRotation,
	MemberBuild,
	PlaybackScenario,
	PlaybackSimulationResult,
	ResolvedMemberBuild,
	ResolvedScenario,
	RotationAction,
	RotationDiagnostic,
	RotationKit,
	RotationStats,
	Scenario,
	SimulationResult,
	TeamProfile,
} from "../src/lib/calc/types";
import type {
	CharacterPanelData,
	CharacterPanelRequest,
	CharacterPanelResult,
	PanelProp,
} from "../src/lib/characterPanel";
import {
	customRotationProfile,
	flattenRotation,
} from "../src/lib/customRotations";
import * as jinzhou from "../wuwa_calc/src/echoes/jinzhou";
import * as lahairoi from "../wuwa_calc/src/echoes/lahairoi";
import * as mengzhou from "../wuwa_calc/src/echoes/mengzhou";
import * as rinascita from "../wuwa_calc/src/echoes/rinascita";
import * as septimont from "../wuwa_calc/src/echoes/septimont";
import {
	addStat,
	equip,
	equipEnemy,
	panelEntry,
	panelStats,
	setTracing,
	withTeam,
} from "../wuwa_calc/src/engine/context";
import {
	type ResolvedSnapshot,
	run as runActions,
	settleGauges,
} from "../wuwa_calc/src/engine/evaluate";
import {
	Gear,
	Inherent,
	type Loadout,
	Mainslot,
	Resonator,
	Sonata,
	Sonata1pc,
	Sonata2pc,
	Sonata3pc,
	type StatLine,
	Talent,
	Weapon,
} from "../wuwa_calc/src/engine/gear";
import {
	type Action,
	ActionGroup,
	CancelledStep,
	EveryOther,
	type Rotation,
	runRotations,
	SWAP,
	waitFor,
} from "../wuwa_calc/src/engine/rotation";
import { ctx } from "../wuwa_calc/src/engine/runtime";
import { State } from "../wuwa_calc/src/engine/state";
import {
	Attribute,
	CAST_NAME,
	Cast,
	Stat,
	Subtype,
	splitStat,
	type Tag,
	Type,
	tagBand,
	WeaponType,
} from "../wuwa_calc/src/engine/stats";
import { ALL_TEAMS } from "../wuwa_calc/src/resonators/teams";
import {
	costOf,
	Mainstat,
	type MainstatBuild,
	mainstats,
} from "../wuwa_calc/src/shared/mainstats";
import { TUNE_BREAK_ENEMY } from "../wuwa_calc/src/shared/tunebreak";
import * as battlepass from "../wuwa_calc/src/weapons/battlepass";
import * as broadblade from "../wuwa_calc/src/weapons/broadblade";
import * as gauntlet from "../wuwa_calc/src/weapons/gauntlet";
import * as pistol from "../wuwa_calc/src/weapons/pistol";
import * as rectifier from "../wuwa_calc/src/weapons/rectifier";
import * as standard from "../wuwa_calc/src/weapons/standard";
import * as sword from "../wuwa_calc/src/weapons/sword";
import { addActionEndings, groupIntroPaletteActions } from "./actionCatalog";
import { addActionStages } from "./actionStages";
import {
	castConcerto,
	conditionProblems,
	exceptionNode,
	RotationNodeError,
} from "./rotationDiagnostics";

const ENGINE_REVISION = "7bcbb24ea8c3ef873a8479fcd99d25dd305d8a1f";
const normalize = (s: string) =>
	s
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
const species = new Map<string, { typeId: number; name: string }>();
const speciesById = new Map<number, { typeId: number; name: string }>();
for (const echo of echoData) {
	if (echo.monster_id == null) continue;
	const key = normalize(echo.echo_name);
	let canonical = species.get(key);
	if (!canonical) {
		canonical = { typeId: echo.monster_id, name: echo.echo_name };
		species.set(key, canonical);
	} else if (echo.monster_id < canonical.typeId) {
		canonical.typeId = echo.monster_id;
		canonical.name = echo.echo_name;
	}
	speciesById.set(echo.monster_id, canonical);
}
// Upstream display names can be abbreviated. Game IDs still identify the exact
// echo; resolve them to the same canonical species used for owned inventory.
const speciesForMain = (main: Mainslot) =>
	speciesById.get(main.id) ?? species.get(normalize(main.name));
type SetGear = Sonata | Sonata2pc | Sonata3pc | Sonata1pc;
const sets = new Map<string, SetGear>();
const mains = new Map<number, Mainslot>();
for (const value of [jinzhou, rinascita, septimont, lahairoi, mengzhou].flatMap(
	Object.values,
)) {
	if (
		value instanceof Sonata ||
		value instanceof Sonata2pc ||
		value instanceof Sonata3pc ||
		value instanceof Sonata1pc
	)
		sets.set(`${value.id}:${value.size}`, value);
	if (value instanceof Mainslot) mains.set(value.id, value);
}
const weapons = new Map<string, Weapon>();
for (const value of [
	sword,
	broadblade,
	pistol,
	gauntlet,
	rectifier,
	standard,
	battlepass,
]
	.flatMap(Object.values)
	.flat()) {
	if (value instanceof Weapon)
		weapons.set(`${value.id}:${value.refinement}`, value);
}
const loadouts = new Map<number, Loadout>();
for (const team of ALL_TEAMS)
	for (const l of team.loadouts) loadouts.set(l.id, l);

const STAT: Record<string, [Stat, Tag?]> = {
	atkFlat: [Stat.FlatAtk],
	hpFlat: [Stat.FlatHp],
	defFlat: [Stat.FlatDef],
	atkPercent: [Stat.BonusAtk],
	hpPercent: [Stat.BonusHp],
	defPercent: [Stat.BonusDef],
	critRate: [Stat.CritRate],
	critDmg: [Stat.CritDmg],
	energyRegen: [Stat.ER],
	healingBonus: [Stat.HealingBonus],
	basicAtk: [Stat.DmgBonus, Type.Basic],
	heavyAtk: [Stat.DmgBonus, Type.Heavy],
	resonanceSkill: [Stat.DmgBonus, Type.Skill],
	resonanceLiberation: [Stat.DmgBonus, Type.Liberation],
	aero: [Stat.DmgBonus, Attribute.Aero],
	glacio: [Stat.DmgBonus, Attribute.Glacio],
	fusion: [Stat.DmgBonus, Attribute.Fusion],
	electro: [Stat.DmgBonus, Attribute.Electro],
	spectro: [Stat.DmgBonus, Attribute.Spectro],
	havoc: [Stat.DmgBonus, Attribute.Havoc],
};

/** Read every constant panel bonus without mixing element and attack scopes. */
function readPanelStats(items: Gear[]): SimulationResult["stats"][number] {
	// Upstream menuStats traces scoped additions on every pass. Keep each
	// addition only on the pass matching its scope, including repeated lines
	// from one piece. The adapter owns this correction; upstream stays untouched.
	const state = new State(["Panel"]);
	const slot = state.slots[0];
	const saved = { ...ctx };
	const constant: { stat: number; value: number }[] = [];
	const attributes = [
		Attribute.Aero,
		Attribute.Electro,
		Attribute.Fusion,
		Attribute.Glacio,
		Attribute.Spectro,
		Attribute.Havoc,
		Attribute.Physical,
	];
	const types = [
		Type.Basic,
		Type.Heavy,
		Type.Skill,
		Type.Liberation,
		Type.Intro,
		Type.Outro,
		Type.Echo,
		Type.Status,
		Type.Break,
		Type.Rupture,
		Type.Hack,
		Type.Utility,
	];
	const subtypes = [
		Subtype.Coordinated,
		Subtype.SpectroFrazzle,
		Subtype.AeroErosion,
		Subtype.FusionBurst,
		Subtype.GlacioChafe,
		Subtype.ElectroFlare,
	];
	try {
		Object.assign(ctx, {
			slot,
			state,
			stacks: 1,
			tracing: true,
			inConst: true,
			recording: false,
			panelGroup: null,
		});
		slot.resonator =
			items.find((g): g is Resonator => g instanceof Resonator) ?? null;
		for (const gear of items) {
			if (gear instanceof Resonator || gear instanceof Weapon) {
				const base = gear instanceof Weapon ? slot.weaponBase : slot.charBase;
				for (const [stat, value] of gear.decl.stats)
					if (stat <= Stat.BaseDef) base[stat] = base[stat] + value;
			}
		}
		for (const gear of items) {
			ctx.buff = gear;
			for (let i = 0; i < types.length; i++) {
				ctx.tagWord = (attributes[i] ?? 0) | types[i] | (subtypes[i] ?? 0);
				const from = slot.entries.length;
				gear.constantStatsFn?.();
				for (const entry of slot.entries.slice(from)) {
					const [, tag] = splitStat(entry.stat);
					if (tag === null ? i === 0 : (ctx.tagWord & tagBand(tag)) === tag)
						constant.push(entry);
				}
			}
		}
	} finally {
		Object.assign(ctx, saved);
	}
	const sum = (stat: Stat, tag?: Tag) =>
		constant
			.filter((e) => e.stat === (stat | (tag ?? 0)))
			.reduce((total, e) => total + e.value, 0);
	return {
		...panelStats(items),
		er: sum(Stat.ER),
		cr: sum(Stat.CritRate),
		cd: sum(Stat.CritDmg),
		bonuses: {
			...Object.fromEntries(
				Object.entries(STAT)
					.filter(
						([, [stat]]) =>
							stat === Stat.DmgBonus || stat === Stat.HealingBonus,
					)
					.map(([key, [stat, tag]]) => [key, sum(stat, tag)]),
			),
			physical: sum(Stat.DmgBonus, Attribute.Physical),
			damage: sum(Stat.DmgBonus),
			intro: sum(Stat.DmgBonus, Type.Intro),
			outro: sum(Stat.DmgBonus, Type.Outro),
			echo: sum(Stat.DmgBonus, Type.Echo),
			tuneBreak: sum(Stat.TBB),
		},
	};
}

/** Captured levels and unlocked stat nodes; no rotation or five-piece requirement. */
export function characterPanel(
	input: CharacterPanelRequest,
): CharacterPanelResult {
	const data = panelData as CharacterPanelData;
	const { resonator, weapon, echoes } = input;
	const role = data.roles[resonator.id];
	const growth =
		data.roleGrowth[`${resonator.level}:${resonator.breakthrough}`];
	if (!role || !growth)
		throw new Error("Panel data is unavailable for this resonator or level.");
	const notes: string[] = [];
	const lines = (props: PanelProp[]): StatLine[] =>
		props.map(([key, value]) => {
			const [stat, tag] = STAT[key];
			return tag === undefined ? [stat, value] : [stat, value, tag];
		});
	const elements = [
		Attribute.Physical,
		Attribute.Glacio,
		Attribute.Fusion,
		Attribute.Electro,
		Attribute.Aero,
		Attribute.Spectro,
		Attribute.Havoc,
	];
	const weaponTypes = [
		WeaponType.Sword,
		WeaponType.Broadblade,
		WeaponType.Sword,
		WeaponType.Pistols,
		WeaponType.Gauntlets,
		WeaponType.Rectifier,
	];
	const character = new Resonator({
		id: resonator.id,
		name: resonator.name,
		color: "",
		element: elements[role.element],
		weapon: weaponTypes[role.weapon],
		talent: new Talent({ name: "Stat nodes" }),
		inherent1: new Inherent({ name: "Inherent 1" }),
		inherent2: new Inherent({ name: "Inherent 2" }),
		stats: role.base.map(
			(base, i) =>
				[
					([Stat.BaseAtk, Stat.BaseHp, Stat.BaseDef] as const)[i],
					base * growth[i],
				] as StatLine,
		),
	});
	const items: Gear[] = [character];
	for (const node of resonator.skills) {
		if (node.level > 0 && role.nodes[node.id])
			items.push(
				new Gear({
					name: `Node ${node.id}`,
					stats: lines(role.nodes[node.id]),
				}),
			);
	}
	const loadout = [...loadouts.values()].find(
		(l) => l.resonator.id === resonator.id,
	);
	if (loadout) {
		for (const [node, inherent] of [
			[7, loadout.resonator.inherent1],
			[8, loadout.resonator.inherent2],
		] as const)
			if (
				inherent &&
				resonator.skills.some((n) => n.id === node && n.level > 0)
			)
				items.push(inherent);
		items.push(...loadout.sequences.slice(0, resonator.chain));
	}
	if (weapon) {
		const def = data.weapons[weapon.itemId];
		if (!def)
			throw new Error("Panel data is unavailable for the equipped weapon.");
		const scaled = [def.first, def.second].map((prop, i): PanelProp => {
			const curve =
				data.weaponGrowth[`${def.curves[i]}:${weapon.level}:${weapon.breach}`];
			if (curve === undefined || !prop)
				throw new Error("Panel data is unavailable for the weapon level.");
			return [prop[0], prop[1] * curve];
		});
		const known = weapons.get(`${weapon.itemId}:${weapon.rank}`);
		const base = scaled[0];
		items.push(
			new Weapon({
				name: "Equipped weapon",
				weaponType: character.weapon,
				stats: [
					[Stat.BaseAtk, base[1]],
					...lines([scaled[1]]),
					...(known?.decl.stats.slice(2) ?? []),
				],
				constantStats: known?.decl.constantStats,
			}),
		);
		if (!known)
			notes.push(
				"This weapon's passive is not modeled; its level stats are included.",
			);
	}
	const distinct = new Map<number, Set<number>>();
	for (const echo of echoes) {
		const types = distinct.get(echo.setId) ?? new Set<number>();
		types.add(speciesById.get(echo.monsterId)?.typeId ?? echo.monsterId);
		distinct.set(echo.setId, types);
	}
	for (const [setId, types] of distinct)
		for (const bonus of data.sets[setId] ?? [])
			if (types.size >= bonus.count)
				items.push(
					new Gear({ name: `Sonata ${setId}`, stats: lines(bonus.props) }),
				);
	for (const echo of echoes) {
		const main =
			echo.slot === 0
				? (mains.get(echo.monsterId) ??
					[...mains.values()].find(
						(m) =>
							speciesForMain(m)?.typeId ===
							speciesById.get(echo.monsterId)?.typeId,
					))
				: undefined;
		items.push(
			new Gear({
				name: `Echo ${echo.incrId}`,
				constantStats: () =>
					panelEntry(() => {
						for (const prop of [...echo.mainProps, ...echo.subProps]) {
							const [stat, tag] = STAT[prop.key];
							addStat(stat, prop.value, tag);
						}
						main?.echoStatsFn?.();
					}),
			}),
		);
		if (
			echo.slot === 0 &&
			!main &&
			speciesById.get(echo.monsterId) &&
			echoData.find((e) => e.monster_id === echo.monsterId)?.echo_cost === 4
		)
			notes.push(
				"This main echo's passive is not modeled; its rolled stats are included.",
			);
	}
	return { stats: readPanelStats(items), notes };
}

let catalog: CalculatorCatalog | undefined;
const profiles = new Map<string, { loadouts: Loadout[]; mains: Mainslot[] }>();
const authoredActions = new Map<string, Action>();
function coreAction(action: Action): Action {
	if (action instanceof CancelledStep) return coreAction(action.of);
	if (action instanceof EveryOther) return coreAction(action.gated);
	if (action instanceof ActionGroup) return coreAction(action.actions[0]);
	return action;
}
function actionVariant(action: Action): string {
	if (action instanceof CancelledStep) return action.kind;
	if (action instanceof EveryOther)
		return `Every other${actionVariant(action.gated) ? ` · ${actionVariant(action.gated)}` : ""}`;
	if (action instanceof ActionGroup)
		return action.actions.map(actionVariant).filter(Boolean).at(-1) ?? "";
	return action.tag || "";
}
function makeRotationKits(teams: TeamProfile[]): RotationKit[] {
	const members = new Map(
		teams
			.flatMap((t) => t.members)
			.map((m) => [`${m.loadoutId}:${m.mainEcho.engineId}`, m]),
	);
	return [...members.values()].map((member) => {
		const l = loadouts.get(member.loadoutId);
		if (!l) throw new Error(`Unknown rotation loadout ${member.loadoutId}.`);
		const refs = new Map<Action, RotationAction>();
		const actions: RotationKit["actions"] = [];
		const register = (action: Action): RotationAction => {
			const held = refs.get(action);
			if (held) return held;
			const id = `${ENGINE_REVISION}:${l.id}:${refs.size}`;
			authoredActions.set(id, action);
			const bare =
				action instanceof CancelledStep
					? action.of
					: action instanceof EveryOther
						? action.gated
						: action;
			const first = bare instanceof ActionGroup ? bare.actions[0] : bare;
			const descriptor: RotationAction = {
				id,
				name: action.name || first.name,
				kind: first.mainslot
					? "Echo"
					: first.cast === null
						? "Action"
						: (CAST_NAME[first.cast] ?? "Action"),
				seconds: Math.max(0, first.animFrames / 60),
				variant: actionVariant(action),
				...(first.mainslot ? { mainEchoId: first.mainslot.id } : {}),
			};
			refs.set(action, descriptor);
			actions.push(descriptor);
			if (bare instanceof ActionGroup) bare.actions.forEach(register);
			if (bare !== action) register(bare);
			if (bare.cancelOf) register(bare.cancelOf);
			if (bare.formOf) register(bare.formOf);
			return descriptor;
		};
		const registerChain = (chain: Rotation["mains"][number]) => {
			if (chain.cast) register(chain.cast);
			chain.body.forEach(register);
			register(chain.exit);
		};
		const registerRotations = (source: Loadout) => {
			for (const rotation of source.rotations) {
				rotation.startCombat.flatMap((v) => v ?? []).forEach(register);
				[
					...rotation.openers,
					...rotation.mains,
					...rotation.doubles,
					...rotation.firstDoubles,
					...rotation.firstIntros,
					...rotation.firstOpeners,
					...rotation.slotIntros.flat(),
				].forEach(registerChain);
			}
		};
		registerRotations(l);
		register(SWAP);
		const extendEndings = addActionEndings(
			actions,
			refs,
			authoredActions,
			register,
		);
		// Keep old authored and ending IDs stable; append stages from compatible
		// presets only after those IDs have been assigned.
		for (const source of loadouts.values())
			if (
				source !== l &&
				source.resonator === l.resonator &&
				source.mode === l.mode
			)
				registerRotations(source);
		extendEndings();
		addActionStages(actions, refs, register, extendEndings);
		groupIntroPaletteActions(actions, authoredActions);
		const r = l.rotationAt(l.minSequence);
		const fits = (action: RotationAction) =>
			!action.mainEchoId || action.mainEchoId === member.mainEcho.engineId;
		const chainIds = (
			chain: Rotation["mains"][number] | undefined,
			intro: boolean,
		) =>
			chain
				? [
						...(intro && chain.cast ? [register(chain.cast)] : []),
						...chain.body.map(register),
						register(chain.exit),
					]
						.filter(fits)
						.map((action) => action.id)
				: [];
		return {
			member,
			actions,
			start: (r.startCombat[2] ?? [])
				.map(register)
				.filter(fits)
				.map((action) => action.id),
			opener: chainIds(r.openers[0] ?? r.firstOpeners[0] ?? r.mains[0], false),
			repeat: chainIds(r.mains[0], true),
		};
	});
}
export function getCatalog(): CalculatorCatalog {
	if (catalog) return catalog;
	const teams: TeamProfile[] = [];
	for (const team of ALL_TEAMS) {
		const choices = team.loadouts.map((l) => [
			...new Set(
				l.echoLoadouts
					.filter((e) => e.fits(team.loadouts.map((v) => v.resonator)))
					.map((e) => e.mainslot),
			),
		]);
		const variants: Mainslot[][] = choices.reduce<Mainslot[][]>(
			(acc, list) => acc.flatMap((a) => list.map((v) => [...a, v])),
			[[]],
		);
		for (const picked of variants) {
			const id = `riley-v1:${team.loadouts.map((l, i) => `${l.id}.${Number(team.mdps[i])}.${picked[i].id}`).join("/")}`;
			if (profiles.has(id)) continue;
			profiles.set(id, { loadouts: team.loadouts, mains: picked });
			const errors: string[] = [];
			const members = team.loadouts.map((l, i) => {
				const main = picked[i];
				// Loadout choices may use an echo passively (Kelpie's Outro proc).
				// Riley skips casts for other equipped mains automatically; requiring
				// a written cast here incorrectly excludes those supported loadouts.
				const found = speciesForMain(main);
				if (!found)
					errors.push(`Main echo ${main.name} has no game catalog mapping.`);
				const available = [...weapons.values()].filter(
					(w) => w.weaponType === l.resonator.weapon,
				);
				const byId = new Map<
					number,
					{ id: number; name: string; ranks: number[] }
				>();
				for (const w of available) {
					const entry = byId.get(w.id) ?? {
						id: w.id,
						name: w.name.replace(/ R[1-5]$/, ""),
						ranks: [],
					};
					entry.ranks.push(w.refinement);
					byId.set(w.id, entry);
				}
				return {
					characterId: l.resonator.id,
					name: l.resonator.name,
					loadoutId: l.id,
					variant: `${
						(
							{
								16081: "5 Forte Basics",
								16083: "4 Forte Basics",
								16082: "3 Forte Basics",
							} as Record<number, string>
						)[l.id] ??
						`Rotation ${
							[...loadouts.values()]
								.filter((v) => v.resonator.id === l.resonator.id)
								.sort((a, b) => a.id - b.id)
								.findIndex((v) => v.id === l.id) + 1
						}`
					}${l.mode ? ` · ${l.mode.name}` : ""}`,
					mainDps: team.mdps[i],
					mainEcho: {
						typeId: found?.typeId ?? -1,
						name: found?.name ?? main.name,
						engineId: main.id,
					},
					minSequence: l.minSequence,
					maxSequence: l.sequences.length,
					weapons: [...byId.values()],
					defaultWeapon: {
						id: l.weapons[0].id,
						rank: l.weapons[0].refinement,
					},
					kitMinEr: l.minEr,
					kitMinCr: l.minCritRate,
					recommendedMains: [
						...new Set(
							l.mainstats.flatMap((m) =>
								m.slots.map((s) => {
									const keys = [
										"critRate",
										"critDmg",
										"atkPercent",
										"hpPercent",
										"defPercent",
										"energyRegen",
										"atkPercent",
										"hpPercent",
										"defPercent",
										"glacio",
										"fusion",
										"electro",
										"aero",
										"spectro",
										"havoc",
										"atkPercent",
										"hpPercent",
										"defPercent",
									];
									return keys[s];
								}),
							),
						),
					],
				};
			});
			teams.push({
				id,
				label: members.map((m) => m.name).join(" → "),
				members,
				errors,
			});
		}
	}
	catalog = {
		revision: ENGINE_REVISION,
		teams,
		sets: [...new Set([...sets.values()].map((s) => s.id))],
		rotationKits: makeRotationKits(teams),
	};
	return catalog;
}

const echoPieces = new Map<string, Gear>();
function echoGear(echo: CalcEcho, main?: Mainslot): Gear {
	const key = JSON.stringify([echo, main?.id]);
	const cached = echoPieces.get(key);
	if (cached) return cached;
	const piece = new Gear({
		name: echo.uid,
		constantStats: () =>
			panelEntry(() => {
				for (const prop of [...echo.mainStats, ...echo.substats]) {
					const mapped = STAT[prop.key];
					if (!mapped || !Number.isFinite(prop.value))
						throw new Error(`Unsupported stat ${prop.key} on ${echo.uid}`);
					addStat(mapped[0], prop.value, mapped[1]);
				}
				main?.echoStatsFn?.();
			}),
	});
	if (echoPieces.size > 10000) echoPieces.clear();
	echoPieces.set(key, piece);
	return piece;
}
const referenceMains = new WeakMap<Loadout, MainstatBuild[]>();
function rotationMainstats(l: Loadout): MainstatBuild[] {
	let builds = referenceMains.get(l);
	if (builds) return builds;
	builds = [...l.mainstats];
	const key = (slots: readonly Mainstat[]) =>
		[...slots].sort((a, b) => a - b).join(",");
	const seen = new Set(builds.map((m) => key(m.slots)));
	// Riley's ER spread stops at three rolls. Offer real ER main-stat swaps
	// when an authored damage build cannot sustain the requested rotation.
	for (const original of l.mainstats) {
		const threes = original.slots.flatMap((stat, i) =>
			costOf(stat) === 3 ? [i] : [],
		);
		for (let mask = 1; mask < 1 << threes.length; mask++) {
			const slots = [...original.slots];
			threes.forEach((slot, bit) => {
				if (mask & (1 << bit)) slots[slot] = Mainstat.ER3;
			});
			const id = key(slots);
			if (seen.has(id)) continue;
			seen.add(id);
			builds.push(mainstats(...slots));
		}
	}
	referenceMains.set(l, builds);
	return builds;
}

function resolvedMember(build: MemberBuild): ResolvedMemberBuild {
	if (build.echoSource !== "rotation")
		return { ...build, echoSource: build.echoSource };
	const { rotationStats } = build;
	if (!rotationStats)
		throw new Error("Resolve teammate rotation stats before simulation.");
	return { ...build, echoSource: "rotation", rotationStats };
}

function pieces(
	l: Loadout,
	main: Mainslot,
	build: ResolvedMemberBuild,
	resonators: Resonator[],
): Gear[] {
	if (build.chain < l.minSequence || build.chain > 6 || build.chain < 0)
		throw new Error(
			`${l.resonator.name}: this loadout requires S${l.minSequence}–S6.`,
		);
	if (build.chain > l.sequences.length)
		throw new Error(
			`${l.resonator.name}: S${build.chain} is not modeled by this loadout; use a supported chain override.`,
		);
	const weapon = weapons.get(`${build.weaponId}:${build.weaponRank}`);
	if (!weapon || weapon.weaponType !== l.resonator.weapon)
		throw new Error(
			`${l.resonator.name}: weapon ${build.weaponId} R${build.weaponRank} is unsupported.`,
		);
	if (build.echoSource === "rotation") {
		const pick = build.rotationStats;
		const echo = l.echoLoadouts[pick.echoIndex];
		const mainstat = rotationMainstats(l)[pick.mainstatIndex];
		if (
			!echo ||
			!mainstat ||
			echo.mainslot.id !== main.id ||
			!l.echoes.fits(echo, mainstat) ||
			!l.substat.tiers.some((t) => t.rolls === pick.erRolls)
		)
			throw new Error(`${l.resonator.name}: invalid rotation stat template.`);
		if (!echo.fits(resonators))
			throw new Error("The rotation stat template does not fit this team.");
		return l.pieces(
			weapon,
			echo,
			mainstat,
			build.chain,
			false,
			false,
			pick.erRolls,
		);
	}
	if (
		build.echoes.length !== 5 ||
		new Set(build.echoes.map((e) => e.uid)).size !== 5 ||
		build.echoes.reduce((n, e) => n + e.cost, 0) > 12
	)
		throw new Error(
			`${l.resonator.name}: equip five distinct echoes within the 12-cost limit.`,
		);
	if (build.echoes[0].typeId !== speciesForMain(main)?.typeId)
		throw new Error(`${l.resonator.name}: slot one must be ${main.name}.`);
	const setTypes = new Map<number, Set<number>>();
	for (const e of build.echoes) {
		if (![...sets.values()].some((s) => s.id === e.setId))
			throw new Error(`${e.name}: sonata set ${e.setId} is unsupported.`);
		const distinct = setTypes.get(e.setId) ?? new Set<number>();
		distinct.add(e.typeId);
		setTypes.set(e.setId, distinct);
	}
	const bonuses = [...setTypes].flatMap(([id, types]) =>
		[...sets.values()].filter((s) => s.id === id && types.size >= s.size),
	);
	return [
		l.resonator,
		l.resonator.talent,
		l.resonator.inherent1,
		l.resonator.inherent2,
		l.mode,
		...l.sequences.slice(0, build.chain),
		weapon,
		main,
		...bonuses,
		...build.echoes.map((e, i) => echoGear(e, i === 0 ? main : undefined)),
	].filter((g): g is Gear => g != null);
}

const prepared = new Map<
	string,
	{ gear: Gear[]; stats: SimulationResult["stats"][number] }
>();
function runtimeProfile(scenario: Scenario) {
	const catalog = getCatalog();
	if (scenario.rotation) {
		const descriptor = customRotationProfile(scenario.rotation, catalog);
		if (descriptor.id !== scenario.profileId || descriptor.errors.length)
			throw new RotationNodeError(
				descriptor.errors.join(" ") || "Custom rotation ID does not match.",
				descriptor.diagnosticDetails?.find((issue) => issue.nodeId)?.nodeId,
			);
		const members = descriptor.members.map((member) => {
			const loadout = loadouts.get(member.loadoutId);
			const main = mains.get(member.mainEcho.engineId);
			if (!loadout || !main)
				throw new RotationNodeError(
					"The selected rotation loadout or main echo is unavailable.",
				);
			return { loadout, main };
		});
		return {
			descriptor,
			profile: {
				loadouts: members.map((member) => member.loadout),
				mains: members.map((member) => member.main),
			},
		};
	}
	const descriptor = catalog.teams.find((p) => p.id === scenario.profileId);
	const profile = profiles.get(scenario.profileId);
	if (!descriptor || !profile || descriptor.errors.length)
		throw new Error(
			descriptor?.errors.join(" ") ||
				"This team profile is unavailable. Select a team again.",
		);
	return { descriptor, profile };
}
/** Execute the authored order. Character changes make physical swaps; Intros/Outros stay explicit. */
function runCustom(
	state: State,
	rotation: CustomRotation,
	profile: { loadouts: Loadout[]; mains: Mainslot[] },
	linkSources: boolean,
) {
	const steps = flattenRotation(rotation.nodes);
	const sections: ReturnType<typeof runActions>[] = [[]];
	const sources = new Map<ActionGroup, string>();
	let offset = 0;
	let incomingIntro = false;
	while (offset < steps.length) {
		const characterId = steps[offset].characterId;
		const slot = profile.loadouts.findIndex(
			(l) => l.resonator.id === characterId,
		);
		if (slot < 0)
			throw new RotationNodeError(
				"An action belongs to a Resonator outside the team.",
				steps[offset].id,
			);
		let end = offset + 1;
		while (end < steps.length && steps[end].characterId === characterId) end++;
		const next =
			end < steps.length
				? profile.loadouts.findIndex(
						(l) => l.resonator.id === steps[end].characterId,
					)
				: (slot + 1) % 3;
		if (offset > 0 && state.active !== slot) {
			sections[0].push(...runActions(state, [SWAP]));
		}
		state.active = slot;
		state.outroDir = next === (slot + 1) % 3 ? 1 : -1;
		const actions = steps.slice(offset, end).map((step) => {
			if (step.kind === "wait")
				return waitFor(Math.round(step.seconds * 60), "rotation");
			const action = authoredActions.get(step.actionId);
			if (
				!action ||
				!step.actionId.startsWith(
					`${ENGINE_REVISION}:${profile.loadouts[slot].id}:`,
				)
			)
				throw new RotationNodeError(
					"This action is unavailable for the selected variant.",
					step.id,
				);
			if (coreAction(action).cast === Cast.Outro && step !== steps[end - 1])
				throw new RotationNodeError(
					"Place an Outro at the end of a Resonator's turn.",
					step.id,
				);
			if (
				coreAction(action).cast === Cast.Intro &&
				(!incomingIntro || step !== steps[offset])
			)
				throw new RotationNodeError(
					`${profile.loadouts[slot].resonator.name}: an Intro must follow another Resonator's Outro.`,
					step.id,
				);
			return action;
		});
		if (incomingIntro && coreAction(actions[0]).cast !== Cast.Intro)
			throw new RotationNodeError(
				`${profile.loadouts[slot].resonator.name}: add an Intro after the previous Outro, or replace that Outro with a plain swap.`,
				steps[offset].id,
			);
		// Groups carry source metadata without replacing the kit's Action objects.
		// A one-press group has the same scheduling boundary as a standalone press.
		const written = linkSources
			? actions.map((action, index) => {
					const group =
						action instanceof ActionGroup
							? new ActionGroup(action.name, action.actions, action.trailing)
							: new ActionGroup(action.name, [action]);
					sources.set(group, steps[offset + index].id);
					return group;
				})
			: actions;
		try {
			sections[0].push(...runActions(state, written));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new RotationNodeError(
				message,
				exceptionNode(
					message,
					actions.map((action, index) => ({
						action,
						nodeId: steps[offset + index].id,
					})),
				),
			);
		}
		incomingIntro = coreAction(actions[actions.length - 1]).cast === Cast.Outro;
		if (end < steps.length && state.active === slot) {
			// A plain swap does not grant Concerto or an Intro.
			if (actions[actions.length - 1] !== SWAP)
				sections[0].push(...runActions(state, [SWAP]));
			state.active = next;
		}
		offset = end;
	}
	const cutoff = Math.max(state.real, state.playsTo);
	sections[0].push(...runActions(state, [], true, cutoff));
	const nodeSources = new Map(
		sections[0].flatMap((s) => {
			const group = s.group ?? s.groupSpill;
			const nodeId = group ? sources.get(group) : undefined;
			return nodeId ? [[s, nodeId] as const] : [];
		}),
	);
	return { sections, end: state.gameOf(cutoff), blind: false, nodeSources };
}
export function evaluate(
	scenario: PlaybackScenario,
	trace?: true,
): PlaybackSimulationResult;
export function evaluate(scenario: Scenario, trace?: boolean): SimulationResult;
export function evaluate(scenario: Scenario, trace = true): SimulationResult {
	const { profile } = runtimeProfile(scenario);
	if (
		scenario.members.length !== 3 ||
		!Number.isInteger(scenario.cycles) ||
		scenario.cycles < 1 ||
		scenario.cycles > 20
	)
		throw new Error("Invalid team scenario.");
	const builds = profile.loadouts.map((l) => {
		const build = scenario.members.find(
			(m) => m.characterId === l.resonator.id,
		);
		if (!build)
			throw new Error(`${l.resonator.name} is missing from the team.`);
		return resolvedMember(build);
	});
	const owned = builds
		.filter((b) => b.echoSource !== "rotation")
		.flatMap((b) => b.echoes);
	if (new Set(owned.map((e) => e.uid)).size !== owned.length)
		throw new Error("Each team echo must be a different owned instance.");
	const gear: Gear[][] = [];
	const stats: SimulationResult["stats"] = {};
	for (const [i, build] of builds.entries()) {
		const key = JSON.stringify([
			scenario.profileId,
			profile.loadouts[i].id,
			profile.mains[i].id,
			build,
		]);
		const cached = prepared.get(key);
		if (cached) {
			gear.push(cached.gear);
			stats[build.characterId] = cached.stats;
			continue;
		}
		const items = pieces(
			profile.loadouts[i],
			profile.mains[i],
			build,
			profile.loadouts.map((loadout) => loadout.resonator),
		);
		gear.push(items);
		stats[builds[i].characterId] = readPanelStats(items);
		if (prepared.size > 2048) prepared.clear();
		prepared.set(key, { gear: items, stats: stats[build.characterId] });
	}
	const rotations = profile.loadouts.map((l, i) =>
		l.rotationAt(builds[i].chain),
	);
	const run = () => {
		const state = new State(profile.loadouts.map((l) => l.resonator.name));
		setTracing(trace);
		for (const [i, items] of gear.entries()) {
			state.active = i;
			withTeam(state, () => {
				for (const g of items) equip(g);
			});
			state.slots[i].constEr = stats[builds[i].characterId].er;
		}
		state.active = 0;
		withTeam(state, () => equipEnemy(TUNE_BREAK_ENEMY));
		const result = scenario.rotation
			? runCustom(
					state,
					scenario.rotation,
					profile,
					trace && !!scenario.capturePlayback,
				)
			: runRotations(state, rotations, scenario.cycles);
		return { state, result };
	};
	let { state, result } = run();
	if (result.blind) ({ state, result } = run());
	const diagnostics: string[] = [];
	const diagnosticDetails: RotationDiagnostic[] = [];
	const report = (message: string, nodeId?: string, summary?: string) => {
		diagnostics.push(message);
		diagnosticDetails.push({
			message,
			...(nodeId ? { nodeId } : {}),
			...(summary ? { summary } : {}),
		});
	};
	if (
		result.blind ||
		(!scenario.rotation && result.sections.length !== scenario.cycles)
	)
		report("The authored rotation did not complete the requested cycles.");
	const snaps = result.sections.flat() as ResolvedSnapshot[];
	if (trace) settleGauges(snaps);
	for (const s of snaps) {
		const concertoAtCast =
			trace &&
			s.castUnmet?.[1] &&
			(!s.triggered || s.action.cast === Cast.Outro)
				? castConcerto(s)
				: undefined;
		const reasons = conditionProblems(s, concertoAtCast);
		if (reasons.length) {
			report(
				`${s.slot}: ${s.action.name} — ${reasons.join("; ")}.`,
				"nodeSources" in result ? result.nodeSources.get(s) : undefined,
				reasons[0],
			);
		}
	}
	const energy = state.slots.map((slot, i) => {
		const actual = stats[builds[i].characterId].er;
		const required = Math.max(100, slot.erWorst);
		const kitMinimum = profile.loadouts[i].minEr;
		const feasible =
			Number.isFinite(required) &&
			actual + 1e-6 >= Math.max(required, kitMinimum);
		if (!feasible)
			report(
				`${slot.name}: ${actual.toFixed(1)}% ER, needs ${required.toFixed(1)}% for the rotation${kitMinimum > required ? ` and ${kitMinimum}% for the kit` : ""}.`,
			);
		if (
			stats[builds[i].characterId].cr + 1e-6 <
			profile.loadouts[i].minCritRate
		)
			report(
				`${slot.name}: kit requires ${profile.loadouts[i].minCritRate}% Crit. Rate.`,
			);
		return {
			characterId: builds[i].characterId,
			name: slot.name,
			actual,
			required,
			kitMinimum,
			feasible,
		};
	});
	const damageByMember: Record<number, number> = {};
	for (const b of builds) damageByMember[b.characterId] = 0;
	for (const hit of state.hits) {
		if (hit.at > result.end) continue;
		const i = state.slots.findIndex((slot) => slot.name === hit.member);
		if (i >= 0) damageByMember[builds[i].characterId] += hit.avg;
	}
	const teamDamage = Object.values(damageByMember).reduce((n, v) => n + v, 0);
	if (!Number.isFinite(teamDamage) || teamDamage <= 0)
		report("Simulation produced no finite positive damage.");
	return {
		feasible: diagnostics.length === 0,
		damageByMember,
		teamDamage,
		duration: result.end / 60,
		energy,
		diagnostics: [...new Set(diagnostics)].slice(0, 20),
		...(scenario.capturePlayback
			? {
					diagnosticDetails: [
						...new Map(
							diagnosticDetails.map((issue) => [JSON.stringify(issue), issue]),
						).values(),
					],
				}
			: {}),
		stats,
		...(trace && scenario.capturePlayback
			? {
					playback: snaps
						.map((s, index) => ({
							id: `event:${index}`,
							characterId:
								builds[state.slots.findIndex((slot) => slot.name === s.member)]
									?.characterId ?? 0,
							name: s.action.name,
							kind: s.action.mainslot
								? "Echo"
								: s.action.cast === null
									? "Action"
									: (CAST_NAME[s.action.cast] ?? "Action"),
							time: s.starts / 60,
							duration: Math.max(0, state.gameOf(s.ends) - s.starts) / 60,
							damage: s.avg,
							automatic: s.queued,
							...(s.source ? { source: s.source.name } : {}),
						}))
						.sort((a, b) => a.time - b.time),
				}
			: {}),
	};
}

/** Provisional scoring path. Search validates ranked candidates with evaluate(). */
export function evaluateFast(scenario: Scenario): SimulationResult {
	return evaluate(scenario, false);
}

/**
 * Pick fixed, theoretical teammate builds before the inventory search. Coordinate
 * ascent compares Riley's authored sets/mains with the normal ChemX32 spread and
 * promotes ER only within that spread's real tiers. This is a bounded template
 * search, not a claim of globally optimal stats.
 *
 * A theoretical target anchors this preparation, so teammate assumptions are
 * independent of both the equipped baseline and each inventory candidate. Only
 * opted-in teammates keep these builds; the real target always uses owned echoes.
 */
export function resolveRotationStats<T extends Scenario>(
	scenario: T,
	targetId?: number,
): ResolvedScenario<T> {
	const requested = scenario.members.filter((m) => m.echoSource === "rotation");
	if (requested.some((m) => m.characterId === targetId))
		throw new Error("The optimization target must use owned echoes.");
	if (!requested.length)
		return { ...scenario, members: scenario.members.map(resolvedMember) };
	const { profile } = runtimeProfile(scenario);
	const resonators = profile.loadouts.map((l) => l.resonator);
	const options = new Map<
		number,
		{ slot: number; loadout: Loadout; main: Mainslot; choices: RotationStats[] }
	>();
	for (const [i, l] of profile.loadouts.entries()) {
		if (
			!requested.some((m) => m.characterId === l.resonator.id) &&
			l.resonator.id !== targetId
		)
			continue;
		const choices = l.echoLoadouts.flatMap((echo, echoIndex) =>
			echo.mainslot.id !== profile.mains[i].id || !echo.fits(resonators)
				? []
				: l.mainstats.flatMap((_, mainstatIndex) =>
						l.fits(echoIndex, mainstatIndex)
							? [
									{
										echoIndex,
										mainstatIndex,
										erRolls: l.substat.tiers[0].rolls,
									},
								]
							: [],
					),
		);
		if (!choices.length)
			throw new Error(
				`${l.resonator.name}: no compatible rotation stat template.`,
			);
		options.set(l.resonator.id, {
			slot: i,
			loadout: l,
			main: profile.mains[i],
			choices,
		});
	}
	let trial: Scenario = {
		...scenario,
		members: scenario.members.map((m) => {
			const option = options.get(m.characterId);
			return option
				? {
						...m,
						echoSource: "rotation",
						echoes: [],
						rotationStats: option.choices[0],
					}
				: m;
		}),
	};
	// All corrective runs start fresh. No invented ER, energy refill, or relaxed
	// requirement is ever applied to an actual inventory build.
	const measure = (input: Scenario) => {
		let current: ResolvedScenario = {
			...input,
			members: input.members.map(resolvedMember),
		};
		for (;;) {
			const result = evaluate(current, false);
			let changed = false;
			const members = current.members.map((m) => {
				const option = options.get(m.characterId);
				if (!option || m.echoSource !== "rotation") return m;
				const need = result.energy[option.slot];
				if (need.feasible) return m;
				const next = option.loadout.substat.tiers.find(
					(t) => t.rolls > m.rotationStats.erRolls,
				);
				if (!next) return m;
				changed = true;
				return {
					...m,
					rotationStats: { ...m.rotationStats, erRolls: next.rolls },
				};
			});
			if (changed) {
				current = { ...current, members };
				continue;
			}
			const deficit = [...options].reduce((n, [id, option]) => {
				const e = result.energy[option.slot];
				return (
					n +
					(Number.isFinite(e.required)
						? Math.max(0, Math.max(e.required, e.kitMinimum) - e.actual)
						: 1e6) +
					Math.max(0, option.loadout.minCritRate - result.stats[id].cr)
				);
			}, 0);
			return { scenario: current, result, deficit };
		}
	};
	let best = measure(trial);
	const improve = () => {
		for (let pass = 0; pass < 3; pass++) {
			const before = JSON.stringify(best.scenario);
			for (const [id, { choices }] of options) {
				const base = best.scenario;
				for (const choice of choices) {
					trial = {
						...base,
						members: base.members.map((m) =>
							m.characterId === id ? { ...m, rotationStats: choice } : m,
						),
					};
					const candidate = measure(trial);
					if (
						candidate.deficit < best.deficit - 1e-6 ||
						(Math.abs(candidate.deficit - best.deficit) < 1e-6 &&
							candidate.result.teamDamage > best.result.teamDamage)
					)
						best = candidate;
				}
			}
			if (JSON.stringify(best.scenario) === before) break;
		}
	};
	improve();
	let expanded = false;
	for (const need of best.result.energy) {
		const option = options.get(need.characterId);
		if (need.feasible || !option) continue;
		const l = option.loadout;
		for (const [echoIndex, echo] of l.echoLoadouts.entries()) {
			if (echo.mainslot.id !== option.main.id || !echo.fits(resonators))
				continue;
			for (const [mainstatIndex, mainstat] of rotationMainstats(l).entries()) {
				if (
					mainstatIndex < l.mainstats.length ||
					!l.echoes.fits(echo, mainstat)
				)
					continue;
				option.choices.push({
					echoIndex,
					mainstatIndex,
					erRolls: l.substat.tiers[0].rolls,
				});
				expanded = true;
			}
		}
	}
	if (expanded) improve();
	return {
		...scenario,
		members: scenario.members.map((m, index) =>
			m.echoSource === "rotation"
				? best.scenario.members[index]
				: resolvedMember(m),
		),
	};
}
