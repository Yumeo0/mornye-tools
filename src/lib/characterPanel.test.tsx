import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BuildStats } from "@/components/characters/BuildStats";
import { makeFixture } from "../../calculator/fixture";
import {
	characterPanel,
	evaluate,
	getCatalog,
} from "./calc/riley/engine.generated.js";
import { echoesByMonsterId } from "./catalog";
import type { CharacterPanelRequest } from "./characterPanel";

const input: CharacterPanelRequest = {
	resonator: {
		id: 1503,
		name: "Verina",
		level: 1,
		breakthrough: 0,
		chain: 0,
		skills: [],
	},
	echoes: [],
};
test("character panel uses captured levels, ascension and only unlocked stat nodes", () => {
	expect(characterPanel(input).stats).toMatchObject({
		atk: 27,
		hp: 1139,
		def: 90,
		er: 100,
		cr: 5,
		cd: 150,
	});
	const levelled = {
		...input,
		resonator: { ...input.resonator, level: 90, breakthrough: 6 },
	};
	expect(characterPanel(levelled).stats).toMatchObject({
		atk: 337,
		hp: 14237,
		def: 1099,
	});
	const unlocked = characterPanel({
		...levelled,
		resonator: {
			...levelled.resonator,
			skills: [
				{ id: 10, level: 1 },
				{ id: 9, level: 1 },
				{ id: 14, level: 0 },
			],
		},
	});
	expect(unlocked.stats.atk).toBe(343);
	expect(unlocked.stats.bonuses?.healingBonus).toBeCloseTo(1.8);
	expect(
		characterPanel({
			...input,
			resonator: { ...input.resonator, level: 20, breakthrough: 1 },
		}).stats.atk,
	).toBeGreaterThan(
		characterPanel({ ...input, resonator: { ...input.resonator, level: 20 } })
			.stats.atk,
	);
});

test("character and optimizer panels agree at level 90, including passive bonuses and heavy damage", () => {
	const { scenario } = makeFixture(getCatalog(), 5);
	const result = evaluate(scenario);
	for (const member of scenario.members) {
		const request: CharacterPanelRequest = {
			resonator: {
				id: member.characterId,
				name: "",
				level: 90,
				breakthrough: 6,
				chain: member.chain,
				skills: Array.from({ length: 10 }, (_, i) => ({ id: i + 7, level: 1 })),
			},
			weapon: {
				incrId: 1,
				itemId: member.weaponId,
				level: 90,
				breach: 6,
				rank: member.weaponRank,
			},
			echoes: member.echoes.map((e, slot) => ({
				incrId: slot + 1,
				itemId: echoesByMonsterId.get(e.typeId)!.echo_id,
				monsterId: e.typeId,
				setId: e.setId,
				level: e.level,
				funcValue: 0,
				stackCount: 1,
				source: "sniffer",
				slot,
				mainProps: e.mainStats,
				subProps: e.substats,
			})),
		};
		const panel = characterPanel(request);
		const expected = result.stats[member.characterId]!;
		expect(panel.notes).toEqual([]);
		for (const key of ["atk", "hp", "def", "er", "cr", "cd"] as const)
			expect(panel.stats[key]).toBeCloseTo(expected[key], 5);
		for (const [key, value] of Object.entries(expected.bonuses ?? {}))
			expect(
				panel.stats.bonuses?.[key as keyof typeof expected.bonuses],
			).toBeCloseTo(value!, 5);
	}
	const target = structuredClone(scenario);
	expect(result.stats[target.members[2]!.characterId]!.bonuses?.heavyAtk).toBe(
		12,
	);
	target.members[2]!.echoes[1]!.substats.push({
		key: "heavyAtk",
		propId: 0,
		raw: 1160,
		value: 11.6,
	});
	const stats = evaluate(target).stats[target.members[2]!.characterId]!;
	expect(stats.bonuses?.heavyAtk).toBeCloseTo(
		(result.stats[target.members[2]!.characterId]!.bonuses?.heavyAtk ?? 0) +
			11.6,
	);
	const html = renderToStaticMarkup(<BuildStats stats={stats} />);
	expect(html).toContain("Heavy Attack DMG Bonus");
	expect(html).toContain("Elemental damage");
});

test("captured weapon levels scale their ATK and ER independently of the resonator", () => {
	const weapon = { incrId: 1, itemId: 21050024, level: 1, breach: 0, rank: 1 };
	expect(characterPanel({ ...input, weapon }).stats).toMatchObject({
		atk: 54,
		er: 111.52,
	});
	expect(
		characterPanel({ ...input, weapon: { ...weapon, level: 90, breach: 6 } })
			.stats,
	).toMatchObject({ atk: 364, er: 151.84 });
});

test("pending stats reserve the full labeled grid with zero values", () => {
	const loading = renderToStaticMarkup(<BuildStats stats={null} />);
	const ready = renderToStaticMarkup(
		<BuildStats stats={characterPanel(input).stats} />,
	);
	const labels = (html: string) =>
		[...html.matchAll(/<dt[^>]*>(.*?)<\/dt>/g)].map((match) => match[1]);
	expect(labels(loading)).toEqual(labels(ready));
	expect(labels(loading)).toHaveLength(23);
	expect(loading).toContain('aria-busy="true"');
	const values = (html: string) =>
		[...html.matchAll(/<dd[^>]*>(.*?)<\/dd>/g)].map((match) => match[1]);
	expect(values(loading).slice(0, 3)).toEqual(["0", "0", "0"]);
	expect(values(loading).slice(3)).toEqual(Array(20).fill("0%"));
	expect(values(ready).slice(6)).toEqual(Array(17).fill("0%"));
	expect(ready).toContain('aria-busy="false"');
});
