import { expect, test } from "bun:test";
import { type Echo, type StatKey, statPropLines } from "./account";
import { buildRating } from "./buildRating";
import { echoesByMonsterId } from "./catalog";
import { type CharacterInfo, calculateRating, mainStatForEcho } from "./rating";

const species = [...echoesByMonsterId.values()].find((e) => e.echo_cost === 1)!;
const character: CharacterInfo = {
	character_id: 1,
	character_name: "Test",
	icon_pile: "",
	stats: {
		"1cost": [["ATK%"]],
		"3cost": [],
		"4cost": [],
		subs: [
			["Crit. Rate", "Crit. DMG", "ATK%", "ATK", "Heavy Attack DMG Bonus"],
		],
	},
};
const prop = (key: StatKey, value: number) => ({
	key,
	value,
	raw: value * 100,
	propId: 0,
});
const echoes: Echo[] = Array.from({ length: 5 }, (_, i) => ({
	incrId: i + 1,
	itemId: species.echo_id,
	monsterId: species.monster_id!,
	setId: species.echo_sets[0]!.id,
	level: 25,
	funcValue: 0,
	stackCount: 1,
	source: "sniffer",
	mainProps: [prop("atkPercent", 18)],
	subProps: [
		prop("critRate", 6.3),
		prop("critDmg", 12.6),
		prop("energyRegen", 6.8),
	],
}));

test("total RV sums every piece immediately against the fixed 500% maximum", () => {
	const total = echoes.reduce(
		(sum, e) =>
			sum +
			calculateRating(character, statPropLines(e.subProps), mainStatForEcho(e)),
		0,
	);
	expect(buildRating(character, echoes)).toEqual({ total, maximum: 500 });
});

test("incomplete builds and unsuitable mains keep the same 500% maximum", () => {
	const pieces = [
		{ ...echoes[0]!, mainProps: [prop("hpPercent", 18)] },
		...echoes.slice(1),
	];
	const pieceRating = calculateRating(
		character,
		statPropLines(echoes[0]!.subProps),
		mainStatForEcho(echoes[0]!),
	);
	expect(buildRating(character, pieces)).toEqual({
		total: pieceRating * 4,
		maximum: 500,
	});
	expect(buildRating(character, echoes.slice(0, 2))).toEqual({
		total: pieceRating * 2,
		maximum: 500,
	});
});

test("ER recommendations do not change the maximum", () => {
	const wantedEr = {
		...character,
		stats: {
			...character.stats,
			erBreakpoint: 200,
			subs: [["Crit. Rate", "Crit. DMG", "ATK%", "ATK", "Energy Regen"]],
		},
	};
	expect(buildRating(wantedEr, echoes)?.maximum).toBe(500);
});

test("missing echoes or substat recommendations have no rating", () => {
	expect(buildRating(null, echoes)).toBeNull();
	expect(buildRating(character, [])).toBeNull();
	expect(
		buildRating(
			{ ...character, stats: { ...character.stats, subs: [] } },
			echoes,
		),
	).toBeNull();
});
