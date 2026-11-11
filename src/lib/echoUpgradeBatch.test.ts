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
	bestPossibleEchoRating,
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
				result_level: target,
				materials: target > current.level ? [{ id: 36000001, count: 9 }] : [],
				echo_materials: [],
				exp: target > current.level ? 4500 : 0,
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
			current.level = plan.result_level;
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
		successChance: (_echo: Echo, _threshold: number): number | null => 100,
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
	test("low-chance echoes follow auto-discard without spending, then continue the queue", async () => {
		for (const autoDiscard of [false, true]) {
			const f = fixture([{ ...echo(20), funcValue: 1 }, echo(30, 5, 1)]);
			f.deps.successChance = (item) => (item.incrId === 20 ? 4 : 100);
			const preview = f.deps.preview;
			f.deps.preview = async (id, target, protectedIds = [], policy) => {
				expect(protectedIds.includes(20)).toBe(!autoDiscard);
				return preview(id, target, protectedIds, policy);
			};
			await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps, {
				...DEFAULT_UPGRADE_OPTIONS,
				minSuccessChance: 5,
				autoDiscard,
			});
			expect(f.stages.every(([id]) => id === 30)).toBe(true);
			expect(f.rows.get(20)).toMatchObject({
				outcome: autoDiscard ? "discarded" : "low_chance",
				successChance: 4,
			});
			expect(f.rows.get(20)?.message).toContain("Success chance 4%");
			expect(f.snapshot.echoes[0].funcValue).toBe(autoDiscard ? 2 : 1);
			expect(f.rows.get(30)?.outcome).toBe("complete");
			expect(f.discarded).toEqual(autoDiscard ? [20] : []);
		}
	});

	test("confirmed low-chance discards can feed a later target and become consumed", async () => {
		const f = fixture([{ ...echo(20, 5, 1), funcValue: 1 }, echo(30, 10, 2)]);
		f.deps.successChance = (item) => (item.subProps.length === 1 ? 4 : 100);
		const preview = f.deps.preview;
		f.deps.preview = async (id, target, protectedIds = [], policy) => {
			const plan = await preview(id, target, protectedIds, policy);
			if (target === 15) {
				expect(f.rows.get(20)?.outcome).toBe("discarded");
				expect(protectedIds).not.toContain(20);
				plan.echo_materials = [
					{ incr_id: 20, item_id: 60000015, count: 1, exp: 3300 },
				];
			}
			return plan;
		};
		const execute = f.deps.execute;
		f.deps.execute = async (...args) => {
			const result = await execute(...args);
			if (result.echo_materials.length)
				f.snapshot.echoes = f.snapshot.echoes.filter(
					(item) => item.incrId !== 20,
				);
			return result;
		};
		await runEchoUpgradeBatch("eu-123", [...f.snapshot.echoes], 75, f.deps, {
			...DEFAULT_UPGRADE_OPTIONS,
			minSuccessChance: 5,
			autoDiscard: true,
		});
		expect(f.discarded).toEqual([20]);
		expect(f.rows.get(20)).toMatchObject({
			outcome: "consumed",
			successChance: 4,
		});
		expect(f.rows.get(30)?.outcome).toBe("complete");
	});

	test("low-chance discards preserve equipped echoes and unsplit stacks", async () => {
		const f = fixture([
			{ ...echo(20), funcValue: 1 },
			{ ...echo(30), equippedBy: 1, funcValue: 1 },
			{ ...echo(40), stackCount: 3, funcValue: 1 },
		]);
		f.deps.successChance = () => 4;
		await runEchoUpgradeBatch("eu-123", [...f.snapshot.echoes], 75, f.deps, {
			...DEFAULT_UPGRADE_OPTIONS,
			minSuccessChance: 5,
			autoDiscard: true,
		});
		expect(f.discarded).toEqual([20]);
		expect(f.rows.get(30)?.outcome).toBe("low_chance");
		expect(f.rows.get(40)?.outcome).toBe("low_chance");
		expect(f.snapshot.echoes[1].funcValue).toBe(1);
		expect(f.snapshot.echoes[2].funcValue).toBe(1);
	});

	test("failed low-chance discard stops the batch without retrying or upgrading another echo", async () => {
		const f = fixture([echo(20), echo(30)]);
		f.deps.successChance = () => 4;
		let calls = 0;
		f.deps.discard = async () => {
			calls++;
			throw new Error("Discard response lost");
		};
		await expect(
			runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps, {
				...DEFAULT_UPGRADE_OPTIONS,
				minSuccessChance: 5,
				autoDiscard: true,
			}),
		).rejects.toThrow("Discard response lost");
		expect(calls).toBe(1);
		expect(f.stages).toEqual([]);
		expect(f.rows.get(20)?.outcome).toBe("error");
		expect(f.rows.has(30)).toBe(false);
	});

	test("rechecks chance after every new substat, including already unlocked slots", async () => {
		for (const level of [0, 25]) {
			const f = fixture([echo(20, level)]);
			f.deps.successChance = (item) => (item.subProps.length < 2 ? 20 : 2);
			await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps, {
				...DEFAULT_UPGRADE_OPTIONS,
				minSuccessChance: 10,
			});
			expect(f.stages).toEqual(
				level === 0
					? [
							[20, 5],
							[20, 10],
						]
					: [
							[20, 25],
							[20, 25],
						],
			);
			expect(f.rows.get(20)).toMatchObject({
				outcome: "low_chance",
				successChance: 2,
			});
		}
	});

	test("disabling the cutoff avoids probability work and a chance equal to the cutoff continues", async () => {
		for (const minimum of [0, 10]) {
			const f = fixture([echo(20)]);
			let calls = 0;
			f.deps.successChance = () => {
				calls++;
				return 10 - Number.EPSILON;
			};
			await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps, {
				...DEFAULT_UPGRADE_OPTIONS,
				minSuccessChance: minimum,
			});
			expect(f.rows.get(20)?.outcome).toBe("complete");
			expect(calls === 0).toBe(minimum === 0);
		}
	});

	test("rechecks changed substat values after preview before executing", async () => {
		const f = fixture([echo(20, 5, 1)]);
		f.deps.successChance = (item) => (item.subProps[0].raw === 630 ? 20 : 1);
		const preview = f.deps.preview;
		f.deps.preview = async (...args) => {
			const plan = await preview(...args);
			f.snapshot.echoes[0].subProps[0].raw = 690;
			return plan;
		};
		await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps, {
			...DEFAULT_UPGRADE_OPTIONS,
			minSuccessChance: 10,
		});
		expect(f.stages).toEqual([]);
		expect(f.rows.get(20)?.outcome).toBe("low_chance");
	});

	test("unknown probability data and invalid cutoffs cannot start spending", async () => {
		const f = fixture([echo(20)]);
		f.deps.successChance = () => null;
		await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps, {
			...DEFAULT_UPGRADE_OPTIONS,
			minSuccessChance: 10,
			autoDiscard: true,
		});
		expect(f.stages).toEqual([]);
		expect(f.discarded).toEqual([]);
		expect(f.rows.get(20)?.outcome).toBe("skipped");
		for (const minimum of [-1, 101, NaN, Infinity]) {
			await expect(
				runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps, {
					...DEFAULT_UPGRADE_OPTIONS,
					minSuccessChance: minimum,
				}),
			).rejects.toThrow("minimum success chance");
		}
	});

	test("a Havoc Song of Feathered Trace piece cannot pass the threshold using Suisui's substats", async () => {
		const f = fixture([
			{
				...echo(20, 20),
				itemId: 60002155,
				monsterId: 6000215,
				setId: 33,
				mainProps: [{ propId: 1, key: "havoc", raw: 3000, value: 30 }],
				subProps: [
					{ propId: 2, key: "hpPercent", raw: 1160, value: 11.6 },
					{ propId: 3, key: "critDmg", raw: 2100, value: 21 },
					{ propId: 4, key: "energyRegen", raw: 1240, value: 12.4 },
					{ propId: 5, key: "basicAtk", raw: 1160, value: 11.6 },
				],
			},
		]);
		f.deps.rating = bestPossibleEchoRating;
		await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps);
		expect(f.stages).toEqual([]);
		expect(f.rows.get(20)?.outcome).toBe("below_threshold");
		expect(f.rows.get(20)?.possible).toBe(64);
	});

	test("evaluates extra unlocked substats individually after oversized discarded EXP", async () => {
		for (const failAfterTwoRolls of [false, true]) {
			const f = fixture([echo(20)]);
			const preview = f.deps.preview;
			f.deps.preview = async (id, target, protectedIds, policy) => {
				const plan = await preview(id, target, protectedIds, policy);
				return plan.from_level === 0
					? {
							...plan,
							result_level: 17,
							exp: 59325,
							materials: [],
							echo_materials: [
								{ incr_id: 40, item_id: 60000015, count: 1, exp: 59325 },
							],
						}
					: plan;
			};
			f.deps.rating = (echo) =>
				failAfterTwoRolls && echo.subProps.length >= 2 ? 60 : 100;
			await runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps);
			expect(f.stages).toEqual(
				failAfterTwoRolls
					? [
							[20, 5],
							[20, 17],
						]
					: [
							[20, 5],
							[20, 17],
							[20, 17],
							[20, 20],
							[20, 25],
						],
			);
			expect(f.rows.get(20)?.outcome).toBe(
				failAfterTwoRolls ? "below_threshold" : "complete",
			);
		}
	});
	test("stops without retrying if the resulting level differs from the preview", async () => {
		const f = fixture([echo(20)]);
		const execute = f.deps.execute;
		f.deps.execute = async (plan) => {
			const result = await execute(plan);
			f.snapshot.echoes[0].level++;
			return result;
		};
		await expect(
			runEchoUpgradeBatch("eu-123", f.snapshot.echoes, 75, f.deps),
		).rejects.toThrow("could not be verified");
		expect(f.stages).toEqual([[20, 5]]);
	});
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

	test("reuses failed locked stack copies while protecting every split remainder", async () => {
		for (const retainOperatedId of [false, true]) {
			const stack = { ...echo(20), stackCount: 3, funcValue: 1 };
			const f = fixture([structuredClone(stack)]);
			const results = new Map<string, UpgradeRow>();
			const protectedSets: number[][] = [];
			f.deps.report = (row) => {
				results.set(upgradeRowKey(row), row);
			};
			const preview = f.deps.preview;
			f.deps.preview = async (id, target, protectedIds, policy) => {
				const plan = await preview(id, target, protectedIds, policy);
				const failed = [...results.values()].find(
					(row) => row.outcome === "discarded",
				);
				if (failed)
					plan.echo_materials = [
						{
							incr_id: failed.echo.incrId,
							item_id: failed.echo.itemId,
							count: 1,
							exp: 3600,
						},
					];
				return plan;
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
				f.snapshot.echoes = f.snapshot.echoes.filter(
					(item) =>
						!plan.echo_materials.some(
							(material) => material.incr_id === item.incrId,
						),
				);
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
				minSuccessChance: 0,
			});
			expect(f.stages).toEqual([
				[20, 5],
				[retainOperatedId ? 101 : 20, 5],
			]);
			expect(results.size).toBe(2);
			expect([...results.values()].map((row) => row.outcome)).toEqual([
				"consumed",
				"discarded",
			]);
			expect(
				new Set([...results.values()].map((row) => row.echo.incrId)).size,
			).toBe(2);
			const remaining = f.snapshot.echoes.find((item) => item.level === 0);
			if (!remaining) throw new Error("Missing remainder fixture echo");
			expect(remaining.stackCount).toBe(1);
			expect(remaining.funcValue).toBe(1);
			expect(protectedSets[1]).toContain(retainOperatedId ? 101 : 20);
			expect(protectedSets[1]).not.toContain(retainOperatedId ? 20 : 101);
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
			minSuccessChance: 0,
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
			minSuccessChance: 0,
		});
		expect(f.discarded).toEqual([21]);
		expect(f.rows.get(20)?.outcome).toBe("discarded");
		expect(f.rows.get(30)?.outcome).toBe("complete");
		expect(
			f.snapshot.echoes.find((item) => item.incrId === 20)?.funcValue,
		).toBe(0);
	});
	test("auto-discard replaces locks but preserves equipment, unsplit stacks and unknown guides", async () => {
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
			minSuccessChance: 0,
		});
		expect(f.discarded).toEqual([20]);
		expect(f.rows.get(20)?.echo.funcValue).toBe(2);
		expect(f.rows.get(50)?.outcome).toBe("skipped");
	});
	test("a locked failed echo feeds a later target and stays visible as consumed, even when stopping", async () => {
		for (const stopAfterConsumption of [false, true]) {
			const f = fixture([{ ...echo(20), funcValue: 1 }, echo(30), echo(40)]);
			const preview = f.deps.preview;
			const execute = f.deps.execute;
			const protectedSets: number[][] = [];
			f.deps.rating = (item) =>
				item.incrId === 40
					? null
					: item.incrId === 20 && item.level > 0
						? 50
						: 100;
			f.deps.preview = async (id, target, protectedIds = [], policy) => {
				protectedSets.push([...protectedIds]);
				const plan = await preview(id, target, protectedIds, policy);
				if (id === 30 && target === 5) {
					expect(f.rows.get(20)?.outcome).toBe("discarded");
					expect(
						f.snapshot.echoes.find((echo) => echo.incrId === 20)?.funcValue,
					).toBe(2);
					expect(protectedIds).not.toContain(20);
					expect(protectedIds).toEqual([30, 40]);
					plan.echo_materials = [
						{ incr_id: 20, item_id: 60000015, count: 1, exp: 3600 },
					];
				}
				return plan;
			};
			f.deps.execute = async (plan, protectedIds, policy) => {
				const result = await execute(plan, protectedIds, policy);
				if (plan.echo_materials.length) {
					f.snapshot.echoes = f.snapshot.echoes.filter(
						(echo) => echo.incrId !== 20,
					);
					if (stopAfterConsumption) f.stop();
				}
				return result;
			};
			await runEchoUpgradeBatch("eu-123", [...f.snapshot.echoes], 75, f.deps, {
				...DEFAULT_UPGRADE_OPTIONS,
				autoDiscard: true,
				minSuccessChance: 0,
			});
			expect(f.discarded).toEqual([20]);
			expect(protectedSets[0]).toEqual([20, 30, 40]);
			expect(f.rows.get(20)).toMatchObject({
				originalId: 20,
				outcome: "consumed",
				echo: { incrId: 20 },
				message: "Used as upgrade material.",
			});
			expect(f.snapshot.echoes.some((echo) => echo.incrId === 20)).toBe(false);
			if (stopAfterConsumption)
				expect(f.stages).toEqual([
					[20, 5],
					[30, 5],
				]);
			else expect(f.rows.get(30)?.outcome).toBe("complete");
		}
	});
	test("unmarked failures stay protected when automatic discard is off or declined", async () => {
		for (const autoDiscard of [false, true]) {
			const f = fixture([echo(20, 5, 1), echo(30)]);
			const preview = f.deps.preview;
			f.deps.rating = (item) => (item.incrId === 20 ? 50 : 100);
			f.deps.discard = async () => ({
				marked: false,
				reason: "Echo kept its mark.",
			});
			f.deps.preview = async (id, target, protectedIds = [], policy) => {
				if (id === 30) expect(protectedIds).toContain(20);
				return preview(id, target, protectedIds, policy);
			};
			await runEchoUpgradeBatch("eu-123", [...f.snapshot.echoes], 75, f.deps, {
				...DEFAULT_UPGRADE_OPTIONS,
				autoDiscard,
			});
			expect(f.rows.get(20)?.outcome).toBe("below_threshold");
		}
	});
	test("previewing discard fodder does not mark it consumed when execution fails", async () => {
		const f = fixture([echo(20, 5, 1), echo(30)]);
		const preview = f.deps.preview;
		f.deps.rating = (item) => (item.incrId === 20 ? 50 : 100);
		f.deps.preview = async (id, target, protectedIds, policy) => ({
			...(await preview(id, target, protectedIds, policy)),
			echo_materials: [{ incr_id: 20, item_id: 60000015, count: 1, exp: 3600 }],
		});
		f.deps.execute = async () => {
			throw new Error("lost response");
		};
		await expect(
			runEchoUpgradeBatch("eu-123", [...f.snapshot.echoes], 75, f.deps, {
				...DEFAULT_UPGRADE_OPTIONS,
				autoDiscard: true,
				minSuccessChance: 0,
			}),
		).rejects.toThrow("lost response");
		expect(f.rows.get(20)?.outcome).toBe("discarded");
		expect(f.snapshot.echoes.some((echo) => echo.incrId === 20)).toBe(true);
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
				minSuccessChance: 0,
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
			minSuccessChance: 0,
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
				minSuccessChance: 0,
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
