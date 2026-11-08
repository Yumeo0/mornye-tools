import { describe, expect, test } from "bun:test";
import type { AccountSnapshot, Echo, EchoProp } from "./account";
import {
	availableEchoCopies,
	DEFAULT_UPGRADE_OPTIONS,
	type EchoMaterialPolicy,
	type EchoUpgradePlan,
	echoTuningSlots,
} from "./echoUpgrade";
import {
	echoUpgradeRows,
	nextEchoStage,
	runEchoUpgradeBatch,
	type UpgradeRow,
	upgradeRowKey,
} from "./echoUpgradeBatch";

const prop: EchoProp = { key: "critRate", propId: 1, value: 6.3, raw: 630 };
function echo(incrId = 20, level = 0, subs = 0): Echo {
	return {
		incrId,
		itemId: 60000015,
		monsterId: 390070051,
		setId: 1,
		level,
		funcValue: 0,
		stackCount: 1,
		mainProps: [],
		subProps: Array.from({ length: subs }, () => ({ ...prop })),
		source: "sniffer",
	};
}
function fixture(echoes: Echo[]) {
	const snapshot: AccountSnapshot = {
		version: 1,
		updatedAt: "",
		echoes: [...echoes],
		resonators: [],
		weapons: [],
		profile: { id: "eu-123", playerId: 123, serverId: "eu", region: "Europe" },
	};
	const stages: [number, number][] = [];
	const rows = new Map<number, UpgradeRow>();
	const discarded: number[] = [];
	let stopped = false;
	const deps = {
		current: () => snapshot,
		refresh: async () => {},
		preview: async (
			id: number,
			target: number,
			_protectedIds: number[] = [],
			_policy: EchoMaterialPolicy = DEFAULT_UPGRADE_OPTIONS.materials,
		): Promise<EchoUpgradePlan> => {
			const current = snapshot.echoes.find((item) => item.incrId === id);
			if (!current) throw new Error("Missing fixture echo");
			return {
				incr_id: id,
				item_id: current.itemId,
				from_level: current.level,
				from_exp: 0,
				from_sub_props: current.subProps.map((p) => [p.propId, p.raw]),
				target_level: target,
				materials: target > current.level ? [{ id: 36000001, count: 9 }] : [],
				echo_materials: [],
				exp: 4500,
				max_credits: 3800,
				identify_count: Number(
					echoTuningSlots(current.itemId, target) > current.subProps.length,
				),
				tuners: [{ id: 36000014, count: 10 }],
			};
		},
		execute: async (
			plan: EchoUpgradePlan,
			_protectedIds: number[] = [],
			_policy: EchoMaterialPolicy = DEFAULT_UPGRADE_OPTIONS.materials,
		) => {
			stages.push([plan.incr_id, plan.target_level]);
			const current = snapshot.echoes.find(
				(item) => item.incrId === plan.incr_id,
			);
			if (!current) throw new Error("Missing fixture echo");
			current.level = plan.target_level;
			if (plan.identify_count)
				current.subProps = [...current.subProps, { ...prop }];
			return plan;
		},
		discard: async (
			echo: Echo,
		): Promise<{ marked: boolean; reason: string | null }> => {
			discarded.push(echo.incrId);
			const current = snapshot.echoes.find(
				(item) => item.incrId === echo.incrId,
			);
			if (!current) throw new Error("Missing fixture echo");
			current.funcValue = 2;
			return { marked: true, reason: null };
		},
		rating: (_echo: Echo): number | null => 100,
		stopped: () => stopped,
		report: (row: UpgradeRow) => {
			rows.set(row.originalId, row);
		},
	};
	return {
		snapshot,
		deps,
		stages,
		rows,
		discarded,
		stop: () => {
			stopped = true;
		},
	};
}

describe("automatic echo batches", () => {
	test("caps selected copies to live stack counts and gives every copy a unique queue key", () => {
		const stack = { ...echo(20), stackCount: 3 };
		const single = echo(30);
		const copies = availableEchoCopies(
			[stack, stack, stack, stack, single, single, echo(99)],
			[stack, single],
		);
		expect(copies.map((item) => item.incrId)).toEqual([20, 20, 20, 30]);
		expect(echoUpgradeRows(copies).map(upgradeRowKey)).toEqual([
			"20:0",
			"20:1",
			"20:2",
			"30:0",
		]);
	});

	test("upgrades selected stack copies independently and protects every split remainder", async () => {
		for (const retainOperatedId of [false, true]) {
			const stack = { ...echo(20), stackCount: 3 };
			const f = fixture([structuredClone(stack)]);
			const results = new Map<string, UpgradeRow>();
			const protectedSets: number[][] = [];
			f.deps.report = (row) => {
				results.set(upgradeRowKey(row), row);
			};
			const execute = f.deps.execute;
			f.deps.execute = async (plan, protectedIds = []) => {
				protectedSets.push([...protectedIds]);
				const current = f.snapshot.echoes.find(
					(item) => item.incrId === plan.incr_id,
				);
				if (!current) throw new Error("Missing source fixture echo");
				const source = structuredClone(current);
				const result = await execute(plan, protectedIds);
				if (source.stackCount <= 1) return result;
				const operated = f.snapshot.echoes.find(
					(item) => item.incrId === plan.incr_id,
				);
				if (!operated) throw new Error("Missing operated fixture echo");
				const nextId = 100 + f.stages.length;
				operated.stackCount = 1;
				if (!retainOperatedId) operated.incrId = nextId;
				f.snapshot.echoes.push({
					...source,
					incrId: retainOperatedId ? nextId : source.incrId,
					stackCount: source.stackCount - 1,
				});
				return { ...result, incr_id: operated.incrId };
			};
			// Each newly revealed substat fails; the next selected copy must
			// start from the unchanged remainder rather than the previous result.
			f.deps.rating = (item) => (item.subProps.length ? 50 : 100);
			await runEchoUpgradeBatch("eu-123", [stack, stack], 75, f.deps, {
				...DEFAULT_UPGRADE_OPTIONS,
				autoDiscard: true,
			});
			expect(f.stages).toEqual([
				[20, 5],
				[retainOperatedId ? 101 : 20, 5],
			]);
			expect(results.size).toBe(2);
			expect([...results.values()].map((row) => row.outcome)).toEqual([
				"discarded",
				"discarded",
			]);
			expect(
				new Set([...results.values()].map((row) => row.echo.incrId)).size,
			).toBe(2);
			const remaining = f.snapshot.echoes.find((item) => item.level === 0);
			if (!remaining) throw new Error("Missing remainder fixture echo");
			expect(remaining.stackCount).toBe(1);
			expect(remaining.funcValue).toBe(0);
			expect(protectedSets[1]).toContain(retainOperatedId ? 101 : 20);
			expect(protectedSets[1]).toContain(retainOperatedId ? 20 : 101);
		}
	});
	test("uses the chosen material policy for previews and mutations", async () => {
		const f = fixture([echo(20)]);
		const seen: EchoMaterialPolicy[] = [];
		const preview = f.deps.preview;
		const execute = f.deps.execute;
		f.deps.preview = async (
			id,
			target,
			protectedIds,
			policy = DEFAULT_UPGRADE_OPTIONS.materials,
		) => {
			seen.push(policy);
			return preview(id, target, protectedIds, policy);
		};
		f.deps.execute = async (
			plan,
			protectedIds,
			policy = DEFAULT_UPGRADE_OPTIONS.materials,
		) => {
			seen.push(policy);
			return execute(plan, protectedIds, policy);
		};
		const options = {
			materials: { discard_echoes: false, exp_material_ids: [36000002] },
			autoDiscard: false,
		};
		await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps, options);
		expect(seen).toHaveLength(10);
		expect(seen.every((policy) => policy === options.materials)).toBe(true);
	});
	test("auto-discard marks only the failing operated copy after a stack split", async () => {
		const f = fixture([{ ...echo(20), stackCount: 3 }, echo(30)]);
		const execute = f.deps.execute;
		f.deps.execute = async (plan) => {
			const result = await execute(plan);
			if (plan.incr_id === 20) {
				f.snapshot.echoes[0] = {
					...f.snapshot.echoes[0],
					incrId: 21,
					stackCount: 1,
				};
				f.snapshot.echoes.push({ ...echo(20), stackCount: 2 });
				return { ...result, incr_id: 21 };
			}
			return result;
		};
		f.deps.rating = (item) => (item.incrId === 21 ? 50 : 100);
		await runEchoUpgradeBatch("eu-123", [...f.snapshot.echoes], 75, f.deps, {
			...DEFAULT_UPGRADE_OPTIONS,
			autoDiscard: true,
		});
		expect(f.discarded).toEqual([21]);
		expect(f.rows.get(20)?.outcome).toBe("discarded");
		expect(f.rows.get(30)?.outcome).toBe("complete");
		expect(
			f.snapshot.echoes.find((item) => item.incrId === 20)?.funcValue,
		).toBe(0);
	});
	test("auto-discard preserves locks, equipment, unsplit stacks and unknown guides", async () => {
		const f = fixture([
			{ ...echo(20), funcValue: 1 },
			{ ...echo(30), equippedBy: 1 },
			{ ...echo(40), stackCount: 3 },
			echo(50),
		]);
		f.deps.rating = (item) => (item.incrId === 50 ? null : 10);
		await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps, {
			...DEFAULT_UPGRADE_OPTIONS,
			autoDiscard: true,
		});
		expect(f.discarded).toEqual([]);
		expect(f.rows.get(50)?.outcome).toBe("skipped");
	});
	test("auto-discard never runs after an uncertain upgrade result", async () => {
		const f = fixture([echo(20), echo(30)]);
		f.deps.execute = async () => {
			throw new Error("lost response");
		};
		await expect(
			runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps, {
				...DEFAULT_UPGRADE_OPTIONS,
				autoDiscard: true,
			}),
		).rejects.toThrow("lost response");
		expect(f.discarded).toEqual([]);
	});
	test("stopping during discard finishes that mark and does not start another echo", async () => {
		const f = fixture([echo(20), echo(30)]);
		f.deps.rating = () => 10;
		const discard = f.deps.discard;
		f.deps.discard = async (echo) => {
			const result = await discard(echo);
			f.stop();
			return result;
		};
		await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps, {
			...DEFAULT_UPGRADE_OPTIONS,
			autoDiscard: true,
		});
		expect(f.discarded).toEqual([20]);
		expect(f.rows.get(20)?.outcome).toBe("discarded");
		expect(f.rows.has(30)).toBe(false);
	});
	test("discard failure stops the batch without retrying or touching another echo", async () => {
		const f = fixture([echo(20), echo(30)]);
		f.deps.rating = () => 10;
		let calls = 0;
		f.deps.discard = async () => {
			calls++;
			throw new Error("mark not confirmed");
		};
		await expect(
			runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps, {
				...DEFAULT_UPGRADE_OPTIONS,
				autoDiscard: true,
			}),
		).rejects.toThrow("not confirmed");
		expect(calls).toBe(1);
		expect(f.rows.has(30)).toBe(false);
	});
	test("stops the failing echo after its new substat and completes the next selected echo", async () => {
		const f = fixture([echo(20), echo(30)]);
		f.deps.rating = (current) =>
			current.incrId === 20 && current.subProps.length ? 50 : 100;
		await runEchoUpgradeBatch("eu-123", [...f.snapshot.echoes], 75, f.deps);
		expect(f.stages).toEqual([
			[20, 5],
			[30, 5],
			[30, 10],
			[30, 15],
			[30, 20],
			[30, 25],
		]);
		expect(f.rows.get(20)?.outcome).toBe("below_threshold");
		expect(f.rows.get(30)?.outcome).toBe("complete");
	});
	test("skips already impossible echoes and unknown character guides without spending", async () => {
		const f = fixture([echo(20), echo(30)]);
		f.deps.rating = (current) => (current.incrId === 20 ? 74 : null);
		await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps);
		expect(f.stages).toEqual([]);
		expect(f.rows.get(20)?.outcome).toBe("below_threshold");
		expect(f.rows.get(30)?.outcome).toBe("skipped");
	});
	test("tunes already unlocked slots one at a time and stops without another level", async () => {
		const f = fixture([echo(20, 20)]);
		f.deps.rating = (current) => (current.subProps.length < 2 ? 100 : 50);
		await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps);
		expect(f.stages).toEqual([
			[20, 20],
			[20, 20],
		]);
	});
	test("follows only the operated copy when upgrading a stack", async () => {
		const f = fixture([{ ...echo(20), stackCount: 3 }]);
		const execute = f.deps.execute;
		f.deps.execute = async (plan) => {
			const result = await execute(plan);
			if (plan.incr_id === 20) {
				const operated = f.snapshot.echoes[0];
				operated.incrId = 21;
				operated.stackCount = 1;
				f.snapshot.echoes.push({ ...echo(20), stackCount: 2 });
				return { ...result, incr_id: 21 };
			}
			return result;
		};
		await runEchoUpgradeBatch("eu-123", [...f.snapshot.echoes], 75, f.deps);
		expect(f.stages).toEqual([
			[20, 5],
			[21, 10],
			[21, 15],
			[21, 20],
			[21, 25],
		]);
		expect(f.snapshot.echoes.find((item) => item.incrId === 20)?.level).toBe(0);
	});
	test("a stop or profile change during preview prevents execution", async () => {
		for (const changeProfile of [false, true]) {
			const f = fixture([echo(20), echo(30)]);
			const preview = f.deps.preview;
			f.deps.preview = async (id, target) => {
				const plan = await preview(id, target);
				if (changeProfile && f.snapshot.profile)
					f.snapshot.profile = { ...f.snapshot.profile, id: "other" };
				else f.stop();
				return plan;
			};
			await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps);
			expect(f.stages).toEqual([]);
		}
	});
	test("protects all selected entries and new split IDs from material consumption", async () => {
		const f = fixture([echo(20), echo(30)]);
		const preview = f.deps.preview;
		const execute = f.deps.execute;
		const protectedSets: number[][] = [];
		f.deps.preview = async (id, target, protectedIds = []) => {
			protectedSets.push([...protectedIds]);
			return preview(id, target, protectedIds);
		};
		f.deps.execute = async (plan, protectedIds = []) => {
			const result = await execute(plan, protectedIds);
			if (plan.incr_id === 20) {
				f.snapshot.echoes[0].incrId = 21;
				return { ...result, incr_id: 21 };
			}
			return result;
		};
		await runEchoUpgradeBatch("eu-123", [...f.snapshot.echoes], 75, f.deps);
		expect(protectedSets[0]).toEqual([20, 30]);
		expect(
			protectedSets
				.slice(1)
				.every((ids) => [20, 21, 30].every((id) => ids.includes(id))),
		).toBe(true);
	});
	test("a stop during execution finishes that request and starts no further stage", async () => {
		const f = fixture([echo(20), echo(30)]);
		const execute = f.deps.execute;
		f.deps.execute = async (plan) => {
			const result = await execute(plan);
			f.stop();
			return result;
		};
		await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps);
		expect(f.stages).toEqual([[20, 5]]);
	});
	test("an uncertain result stops the entire batch without retrying or touching the next echo", async () => {
		const f = fixture([echo(20), echo(30)]);
		let attempts = 0;
		f.deps.execute = async () => {
			attempts++;
			throw new Error("Timed out after sending upgrade");
		};
		await expect(
			runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps),
		).rejects.toThrow("Timed out");
		expect(attempts).toBe(1);
		expect(f.rows.has(30)).toBe(false);
	});
	test("a verdict equal to the threshold continues, and level 25 with untuned slots remains eligible", async () => {
		const f = fixture([echo(20, 25, 4)]);
		f.deps.rating = () => 75;
		await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps);
		expect(f.stages).toEqual([[20, 25]]);
		expect(nextEchoStage(echo(20, 25, 5))).toBe(null);
	});
});
