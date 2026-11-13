/** Publish level curves and unconditional panel properties from the game tables. */
import { join } from "node:path";
import type { StatKey } from "../src/lib/account";
import type { CharacterPanelData, PanelProp } from "../src/lib/characterPanel";

const root = join(import.meta.dirname, "..");
const keys: Record<string, StatKey> = {
	LifeMax: "hpFlat",
	Atk: "atkFlat",
	Def: "defFlat",
	GreenLifeMax: "hpPercent",
	GreenAtk: "atkPercent",
	GreenDef: "defPercent",
	Crit: "critRate",
	CritDamage: "critDmg",
	EnergyEfficiency: "energyRegen",
	DamageChangeAuto: "basicAtk",
	DamageChangeCast: "heavyAtk",
	DamageChangeNormalSkill: "resonanceSkill",
	DamageChangeUltra: "resonanceLiberation",
	HealChange: "healingBonus",
	DamageChangeElement1: "glacio",
	DamageChangeElement2: "fusion",
	DamageChangeElement3: "electro",
	DamageChangeElement4: "aero",
	DamageChangeElement5: "spectro",
	DamageChangeElement6: "havoc",
};
interface Property {
	Id: number;
	Value: number;
	IsRatio: boolean;
}
export async function compileCharacterPanel() {
	const load = <T>(path: string): Promise<T[]> =>
		Bun.file(join(root, "data/wuwa-data/BinData", `${path}.json`)).json();
	const [
		roles,
		bases,
		growth,
		weapons,
		weaponGrowth,
		nodes,
		properties,
		groups,
		fetters,
	] = await Promise.all([
		load<{
			Id: number;
			PropertyId: number;
			ElementId: number;
			WeaponType: number;
			SkillTreeGroupId: number;
			IsTrial: boolean;
		}>("role/roleinfo"),
		load<{ Id: number; Atk: number; LifeMax: number; Def: number }>(
			"property/baseproperty",
		),
		load<{
			Level: number;
			BreachLevel: number;
			AtkRatio: number;
			LifeMaxRatio: number;
			DefRatio: number;
		}>("property/rolepropertygrowth"),
		load<{
			ItemId: number;
			FirstPropId: Property;
			SecondPropId: Property;
			FirstCurve: number;
			SecondCurve: number;
		}>("weapon/weaponconf"),
		load<{
			CurveId: number;
			Level: number;
			BreachLevel: number;
			CurveValue: number;
		}>("property/weaponpropertygrowth"),
		load<{ NodeGroup: number; NodeIndex: number; Property: Property[] }>(
			"skillTree/skilltree",
		),
		load<{ Id: number; Key: string; IsPercent: boolean }>(
			"property/propertyindex",
		),
		load<{ Id: number; FetterMap: { Key: number; Value: number }[] }>(
			"phantom/phantomfettergroup",
		),
		load<{ Id: number; AddProp: Property[] }>("phantom/phantomfetter"),
	]);
	const propById = new Map(properties.map((p) => [p.Id, p]));
	const props = (values: Property[]): PanelProp[] =>
		values.flatMap((p) => {
			const def = propById.get(p.Id);
			const key = def && keys[def.Key];
			return key
				? [
						[
							key,
							Number(
								(
									p.Value * (p.IsRatio ? 100 : def.IsPercent ? 0.01 : 1)
								).toFixed(6),
							),
						] as PanelProp,
					]
				: [];
		});
	const baseById = new Map(bases.map((b) => [b.Id, b]));
	const fetterById = new Map(fetters.map((f) => [f.Id, f]));
	const output: CharacterPanelData = {
		roles: Object.fromEntries(
			roles.flatMap((r) => {
				const base = baseById.get(r.PropertyId);
				if (r.IsTrial || !base) return [];
				return [
					[
						r.Id,
						{
							base: [base.Atk, base.LifeMax, base.Def],
							element: r.ElementId,
							weapon: r.WeaponType,
							nodes: Object.fromEntries(
								nodes
									.filter(
										(n) =>
											n.NodeGroup === r.SkillTreeGroupId && n.Property.length,
									)
									.map((n) => [n.NodeIndex, props(n.Property)]),
							),
						},
					],
				];
			}),
		),
		roleGrowth: Object.fromEntries(
			growth.map((g) => [
				`${g.Level}:${g.BreachLevel}`,
				[g.AtkRatio, g.LifeMaxRatio, g.DefRatio].map((n) => n / 10000),
			]),
		),
		weapons: Object.fromEntries(
			weapons.map((w) => [
				w.ItemId,
				{
					first: props([w.FirstPropId])[0],
					second: props([w.SecondPropId])[0],
					curves: [w.FirstCurve, w.SecondCurve],
				},
			]),
		),
		weaponGrowth: Object.fromEntries(
			weaponGrowth.map((g) => [
				`${g.CurveId}:${g.Level}:${g.BreachLevel}`,
				g.CurveValue / 10000,
			]),
		),
		sets: Object.fromEntries(
			groups.map((g) => [
				g.Id,
				g.FetterMap.map((f) => ({
					count: f.Key,
					props: props(fetterById.get(f.Value)?.AddProp ?? []),
				})).filter((f) => f.props.length),
			]),
		),
	};
	await Bun.write(
		join(root, "src/configs/character_panel.json"),
		`${JSON.stringify(output, null, "\t")}\n`,
	);
}
if (import.meta.main) await compileCharacterPanel();
