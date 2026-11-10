// Deterministic real-stat fixture shared by manual measurements and regressions.
import echoes from "../src/configs/echo_data.json";
import type { EchoProp, StatKey } from "../src/lib/account";
import type {
	CalcEcho,
	CalculatorCatalog,
	Scenario,
} from "../src/lib/calc/types";

export function makeFixture(
	catalog: CalculatorCatalog,
	count = 240,
	seed = 31415,
	targetIndex = 2,
) {
	const profile = catalog.teams.find(
		(t) =>
			t.members.map((m) => m.name).join("/") === "Verina/Mortefi/Jiyan" &&
			t.members[1]!.mainEcho.name === "Impermanence Heron",
	);
	if (!profile) throw new Error("Pinned Jiyan fixture profile is unavailable");
	const prop = (key: StatKey, value: number): EchoProp => ({
		key,
		value,
		raw: Math.round(value * 100),
		propId: 0,
	});
	let random = seed >>> 0;
	const pick = (values: number[]) => {
		random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
		return values[Math.floor((random / 4294967296) * values.length)]!;
	};
	const speciesFor = (set: number, cost: number) => [
		...new Map(
			echoes
				.filter(
					(e) =>
						e.echo_cost === cost &&
						e.monster_id != null &&
						e.echo_sets.some((s) => s.id === set),
				)
				.map((e) => [e.echo_name, e]),
		).values(),
	];
	const buildEchoes = (
		member: (typeof profile.members)[number],
		n: number,
	): CalcEcho[] => {
		const set = member.name === "Jiyan" ? 4 : member.name === "Mortefi" ? 8 : 7;
		const three = speciesFor(set, 3),
			one = speciesFor(set, 1);
		return [0, 1, 2, 3, 4].map((slot) => {
			const species =
				slot === 0
					? echoes.find((e) => e.monster_id === member.mainEcho.typeId)!
					: slot < 3
						? three[slot - 1]!
						: one[slot - 3]!;
			const same = echoes.filter(
				(e) => e.echo_name === species.echo_name && e.monster_id != null,
			);
			const typeId = Math.min(...same.map((e) => e.monster_id!));
			const main =
				slot === 0
					? prop("critRate", 22)
					: slot === 1 && member.name === "Jiyan" && (n < 0 || n % 3 !== 0)
						? prop("aero", 30)
						: slot < 3
							? prop("energyRegen", 32)
							: prop("atkPercent", 18);
			return {
				uid: `fixture:${member.characterId}:${slot}:${n}`,
				typeId,
				name: species.echo_name,
				cost: slot === 0 ? 4 : slot < 3 ? 3 : 1,
				setId: set,
				level: 25,
				mainStats: [
					main,
					slot < 3
						? prop("atkFlat", slot === 0 ? 150 : 100)
						: prop("hpFlat", 2280),
				],
				substats: [
					prop("critRate", pick([6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5])),
					prop("critDmg", pick([12.6, 13.8, 15, 16.2, 17.4, 18.6, 19.8, 21])),
					prop("energyRegen", pick([6.8, 7.6, 8.4, 9.2, 10, 10.8, 11.6, 12.4])),
					prop("atkPercent", pick([6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6])),
					prop("hpFlat", 430),
				],
			};
		});
	};
	const fixed = profile.members.map((m) => buildEchoes(m, -1));
	const inventory: CalcEcho[] = [];
	for (let i = 0; i < Math.ceil(count / 5); i++)
		inventory.push(...buildEchoes(profile.members[targetIndex]!, i));
	const scenario: Scenario = {
		profileId: profile.id,
		cycles: 4,
		members: profile.members.map((m, i) => ({
			characterId: m.characterId,
			chain: m.name === "Mortefi" ? 6 : 0,
			weaponId:
				m.name === "Jiyan"
					? 21010016
					: m.name === "Mortefi"
						? 21030015
						: 21050024,
			weaponRank: 1,
			echoes: fixed[i]!,
		})),
	};
	return { scenario, inventory: inventory.slice(0, count), profile };
}
