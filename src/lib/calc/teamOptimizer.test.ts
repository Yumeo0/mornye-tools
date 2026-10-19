// Team search tests: the pure mechanics run everywhere, the metric fixture
// only runs when the synced calculator data is present (the same requirement
// `bun run dev` has).

import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getDefaultRotation } from "@wuwacalc/core/data/catalog/gameDataService";
import { getResSeedBy } from "@wuwacalc/core/data/catalog/resonatorSeedService";
import { configureCore } from "@wuwacalc/core/data/coreEnvironment";
import { getEchoCatBy } from "@wuwacalc/core/data/gameData/catalog/echoes";
import {
	ECHO_MAIN_STATS,
	ECHO_SIDE_STATS,
} from "@wuwacalc/core/data/gameData/catalog/echoStats";
import { initGameData } from "@wuwacalc/core/data/gameData/index";
import { DEF_ENEMY_PROF } from "@wuwacalc/core/domain/entities/enemy";
import type {
	EchoInstance,
	ResRuntime,
} from "@wuwacalc/core/domain/entities/runtime";
import { mkMaxResRt } from "@wuwacalc/core/engine/runtime/defaults";
import {
	guideMainStatKeys,
	supportEchoScore,
	supportGuideFor,
} from "@/lib/calc/supportGuide";
import {
	buildTeamSeeds,
	comboKey,
	createTeamMetric,
	isLegalCombo,
	runTeamSearch,
	selectTeamPool,
	withComboEchoes,
} from "@/lib/calc/teamOptimizer";

function makeEcho(
	uid: string,
	subs: Record<string, number> = {},
): EchoInstance {
	return {
		uid,
		// Unknown to an empty catalog: treated as a 1-cost echo everywhere.
		id: "test",
		set: 1,
		mainEcho: false,
		mainStats: {
			primary: { key: "hpPercent", value: 10 },
			secondary: { key: "atkFlat", value: 0 },
		},
		substats: subs,
	};
}

describe("combo helpers", () => {
	test("requires five distinct echoes", () => {
		const combo = ["a", "b", "c", "d", "e"].map((uid) => makeEcho(uid));
		expect(isLegalCombo(combo)).toBe(true);
		expect(isLegalCombo([...combo.slice(0, 4), combo[0]])).toBe(false);
		expect(isLegalCombo(combo.slice(0, 4))).toBe(false);
	});

	test("keeps the main echo leading in its key", () => {
		const [a, b, c, d, e] = ["a", "b", "c", "d", "e"].map((uid) =>
			makeEcho(uid),
		);
		expect(comboKey([a, b, c, d, e])).toBe(comboKey([a, e, d, c, b]));
		expect(comboKey([a, b, c, d, e])).not.toBe(comboKey([b, a, c, d, e]));
	});

	test("marks only the first echo as the main one", () => {
		const runtime = {
			id: "1505",
			build: { echoes: [null, null, null, null, null] },
		} as unknown as ResRuntime;
		const combo = ["a", "b", "c", "d", "e"].map((uid) => makeEcho(uid));
		const next = withComboEchoes(runtime, combo);
		expect(next.build.echoes?.map((echo) => echo?.mainEcho)).toEqual([
			true,
			false,
			false,
			false,
			false,
		]);
		// The input runtime is not mutated.
		expect(runtime.build.echoes).toEqual([null, null, null, null, null]);
	});

	test("caps the ranked pool and always keeps the equipped echoes", () => {
		const pool = ["a", "b", "c", "d", "e", "f"].map((uid) => makeEcho(uid));
		expect(
			selectTeamPool({ inventory: pool, rank: () => 0 }).echoes,
		).toHaveLength(6);
		expect(
			selectTeamPool({
				inventory: pool.slice(0, 5),
				rank: () => 0,
				cap: 2,
			}).echoes,
		).toHaveLength(2);
	});
});

describe("seeded local search", () => {
	test("improves a weak seed toward the best legal combo", async () => {
		// Seven echoes scored by their substat value: the best build is the five
		// highest values, which single swaps must reach from the worst seed.
		const pool = Array.from({ length: 7 }, (_, index) =>
			makeEcho(`e${index}`, { hpPercent: index + 1 }),
		);
		const value = (combo: readonly EchoInstance[]) =>
			combo.reduce((total, echo) => total + (echo.substats.hpPercent ?? 0), 0);

		const seed = pool.slice(0, 5);
		const seeds = buildTeamSeeds({
			pool,
			rank: (echo) => echo.substats.hpPercent ?? 0,
			equipped: seed,
			randomSeeds: 0,
		});
		expect(seeds[0].map((echo) => echo.uid)).toEqual(
			seed.map((echo) => echo.uid),
		);

		const outcome = await runTeamSearch({
			score: value,
			pool,
			seeds,
			maxEvaluations: 200,
			resultsLimit: 3,
		});

		expect(outcome.seedBest).toBe(1 + 2 + 3 + 4 + 5);
		expect(outcome.ranked[0].score).toBe(3 + 4 + 5 + 6 + 7);
		expect(
			[...outcome.ranked[0].combo]
				.map((echo) => echo.uid)
				.sort()
				.join("|"),
		).toBe(["e2", "e3", "e4", "e5", "e6"].join("|"));
		expect(outcome.ranked).toHaveLength(3);
		expect(outcome.evaluations).toBeLessThanOrEqual(200);
		expect(outcome.ranked.every((entry) => isLegalCombo(entry.combo))).toBe(
			true,
		);
	});

	test("honors cancellation between slices", async () => {
		const pool = Array.from({ length: 6 }, (_, index) =>
			makeEcho(`e${index}`, { hpPercent: index + 1 }),
		);
		const outcome = await runTeamSearch({
			score: (combo) =>
				combo.reduce(
					(total, echo) => total + (echo.substats.hpPercent ?? 0),
					0,
				),
			pool,
			seeds: [pool.slice(0, 5)],
			maxEvaluations: 1000,
			isCancelled: () => true,
		});
		expect(outcome.cancelled).toBe(true);
		expect(outcome.evaluations).toBe(1);
	});
});

describe("support guide", () => {
	test("picks the support role and maps its main stats", () => {
		const guide = supportGuideFor(1505);
		expect(guide?.role).toBe("Support");
		expect(guide?.mains.has("HP%")).toBe(true);
		expect(guideMainStatKeys(1505)).toContain("hpPercent");
		expect(guideMainStatKeys(1505)).toContain("energyRegen");
	});

	test("ranks a guide main above an off-guide main", () => {
		const guide = supportGuideFor(1505);
		const hpMain = makeEcho("hp");
		const erMain = makeEcho("er");
		erMain.mainStats.primary = { key: "energyRegen", value: 10 };
		const critMain = makeEcho("crit");
		critMain.mainStats.primary = { key: "critRate", value: 22 };
		expect(supportEchoScore(hpMain, guide)).toBeGreaterThan(
			supportEchoScore(critMain, guide),
		);
		expect(supportEchoScore(erMain, guide)).toBeGreaterThan(
			supportEchoScore(critMain, guide),
		);
	});

	test("falls back to generic priorities without a guide", () => {
		const erMain = makeEcho("er", { energyRegen: 10 });
		erMain.mainStats.primary = { key: "energyRegen", value: 10 };
		const critMain = makeEcho("crit", { critRate: 6.3 });
		critMain.mainStats.primary = { key: "critRate", value: 22 };
		expect(supportEchoScore(erMain, null)).toBeGreaterThan(
			supportEchoScore(critMain, null),
		);
	});
});

// --- Metric fixture: needs the synced `public/data` checkout ----------------
//
// Initializing the calculator core hydrates process-wide game data, which the
// catalog-miss tests in `translate.test.ts` rely on staying empty. Run this
// fixture on its own so the rest of the suite stays hermetic:
//
//   TEAM_METRIC_INTEGRATION=1 bun test src/lib/calc/teamOptimizer.test.ts

const dataRoot = join(import.meta.dir, "../../../public/data");
const hasData = existsSync(
	join(dataRoot, "live", "resonators", "catalog.json"),
);

let dataReady: Promise<void> | null = null;
function ensureData(): Promise<void> {
	if (!dataReady) {
		configureCore({
			gameData: {
				async load(mode, path) {
					const file = Bun.file(join(dataRoot, mode, path));
					return JSON.parse(await file.text());
				},
			},
			shouldRetainGameData: () => true,
		});
		dataReady = initGameData({ mode: "live" });
	}
	return dataReady;
}

const integration =
	hasData && process.env.TEAM_METRIC_INTEGRATION === "1" ? test : test.skip;

describe("team metric", () => {
	integration("reacts to the searched support's echoes", async () => {
		await ensureData();
		const dpsSeed = getResSeedBy("1212");
		const supportSeed = getResSeedBy("1505");
		const rotation = getDefaultRotation("1212");
		if (!dpsSeed || !supportSeed || !rotation) return;

		const measured = mkMaxResRt(dpsSeed);
		const searched = mkMaxResRt(supportSeed);
		const metric = createTeamMetric({
			measured,
			searched,
			otherMates: {},
			team: ["1212", "1505", null],
			rotationItems: rotation.items,
			enemy: DEF_ENEMY_PROF,
		});

		// Two builds from the catalog: ER/healing geared and damage geared.
		const cats = Object.values(getEchoCatBy());
		const byCost = (cost: number) => cats.filter((echo) => echo.cost === cost);
		const build = (plan: Array<[number, string]>, sub: string) =>
			plan.map(([cost, main], index) => {
				const cat = byCost(cost)[index % byCost(cost).length];
				return {
					uid: `test:${cost}:${main}:${index}`,
					id: cat.id,
					set: cat.sets[0],
					mainEcho: index === 0,
					mainStats: {
						primary: {
							key: main,
							value: ECHO_MAIN_STATS[cost][main],
						},
						secondary: {
							key: ECHO_SIDE_STATS[cost].key,
							value: ECHO_SIDE_STATS[cost].value,
						},
					},
					substats: { [sub]: 10 },
				} satisfies EchoInstance;
			});

		const supportBuild = build(
			[
				[4, "hpPercent"],
				[3, "energyRegen"],
				[3, "energyRegen"],
				[1, "hpPercent"],
				[1, "hpPercent"],
			],
			"energyRegen",
		);
		const damageBuild = build(
			[
				[4, "critDmg"],
				[3, "atkPercent"],
				[3, "atkPercent"],
				[1, "atkPercent"],
				[1, "atkPercent"],
			],
			"critRate",
		);

		expect(isLegalCombo(supportBuild)).toBe(true);
		expect(isLegalCombo(damageBuild)).toBe(true);

		const supportScore = metric.score(supportBuild);
		expect(supportScore).toBeGreaterThan(0);
		// Shorekeeper's team crit scales with her ER, so the two builds must
		// produce different measured damage.
		expect(metric.score(damageBuild)).not.toBe(supportScore);

		const stats = metric.stats(supportBuild);
		expect(stats?.er).toBeGreaterThan(100);

		// The hook's exact sequence: a guide-ranked pool, seeded combos, then
		// the seeded search over the real metric.
		const poolSource: EchoInstance[] = [];
		for (const cost of [4, 3, 1]) {
			for (const main of [
				"hpPercent",
				"energyRegen",
				"critDmg",
				"atkPercent",
			]) {
				for (let index = 0; index < 3; index += 1) {
					const echo = build([[cost, main]], "energyRegen")[0];
					poolSource.push({ ...echo, uid: `pool:${cost}:${main}:${index}` });
				}
			}
		}
		expect(poolSource.length).toBeGreaterThan(20);

		const pool = selectTeamPool({
			inventory: poolSource,
			alwaysKeep: damageBuild,
			rank: (echo) => supportEchoScore(echo, supportGuideFor(1505)),
		});
		// Guide mains (HP%, ER, CD for Shorekeeper) rank above the damage main.
		const kept = new Set(damageBuild.map((echo) => echo.uid));
		const ranked = pool.echoes.filter((echo) => !kept.has(echo.uid));
		expect(pool.echoes.length).toBeGreaterThanOrEqual(poolSource.length);
		for (const echo of damageBuild) {
			expect(pool.echoes.some((entry) => entry.uid === echo.uid)).toBe(true);
		}
		expect(ranked.at(-1)?.mainStats.primary.key).toBe("atkPercent");
		expect(["hpPercent", "energyRegen", "critDmg"]).toContain(
			ranked[0].mainStats.primary.key,
		);

		const equipped = damageBuild.map((echo, index) =>
			index === 0 ? { ...echo, mainEcho: true } : echo,
		);
		const seeds = buildTeamSeeds({
			pool: pool.echoes,
			rank: (echo) => supportEchoScore(echo, supportGuideFor(1505)),
			equipped,
		});
		expect(seeds.length).toBeGreaterThan(1);
		expect(seeds[0].map((echo) => echo.uid)).toEqual(
			equipped.map((echo) => echo.uid),
		);

		const outcomes = await runTeamSearch({
			score: (combo) => metric.score(combo),
			pool: pool.echoes,
			seeds,
			maxEvaluations: 300,
			resultsLimit: 8,
		});
		expect(outcomes.evaluations).toBeLessThanOrEqual(300);
		expect(outcomes.ranked.length).toBeGreaterThan(1);
		expect(outcomes.ranked[0].score).toBeGreaterThanOrEqual(outcomes.seedBest);
		// Every returned build is a legal five-echo build.
		expect(outcomes.ranked.every((entry) => isLegalCombo(entry.combo))).toBe(
			true,
		);
		expect(outcomes.ranked[0].score).toBeGreaterThanOrEqual(
			metric.score(supportBuild),
		);
	});
});
