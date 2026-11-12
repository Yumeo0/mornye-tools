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

test("total RV sums every piece and perfect-roll ER displaces a wanted stat per piece", () => {
	const actual = 134; // 100 base + five 6.8% ER substats.
	const total = echoes.reduce(
		(sum, e) =>
			sum +
			calculateRating(character, statPropLines(e.subProps), mainStatForEcho(e)),
		0,
	);
	expect(buildRating(character, echoes, actual, 100)?.total).toBe(total);
	expect(buildRating(character, echoes, actual, 100)?.maximum).toBe(500);
	expect(buildRating(character, echoes, actual, 112.4)?.maximum).toBe(480);
	expect(buildRating(character, echoes, actual, 112.4001)?.maximum).toBe(460);
	expect(buildRating(character, echoes, actual, 162)?.maximum).toBe(400);
	expect(buildRating(character, echoes, actual, 162.01)).toMatchObject({
		maximum: null,
		maximumEr: 162,
	});
});

test("main-stat and weapon ER reduce required substats, and unsuitable mains retain their zero RV", () => {
	expect(buildRating(character, echoes, 166, 130)?.maximum).toBe(500); // 32% from an ER main or weapon.
	const pieces = [
		{ ...echoes[0]!, mainProps: [prop("hpPercent", 18)] },
		...echoes.slice(1),
	];
	expect(buildRating(character, pieces, 134, 112.4)?.maximum).toBe(400); // ER fits on the zero-RV piece.
	expect(buildRating(character, echoes.slice(0, 2), 113.6, 100)?.maximum).toBe(
		200,
	);
});

test("wanted ER can keep a 500 ceiling, while missing stats or guides never claim a ceiling", () => {
	const wantedEr = {
		...character,
		stats: {
			...character.stats,
			subs: [["Crit. Rate", "Crit. DMG", "ATK%", "ATK", "Energy Regen"]],
		},
	};
	expect(buildRating(wantedEr, echoes, 134, 162)?.maximum).toBe(500);
	expect(buildRating(character, echoes)?.maximumEr).toBeNull();
	expect(buildRating(character, echoes, Number.NaN)?.maximum).toBeNull();
	expect(buildRating(null, echoes, 134)).toBeNull();
	expect(buildRating(character, [], 100)).toBeNull();
});
