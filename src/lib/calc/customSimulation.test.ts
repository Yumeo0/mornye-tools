import { expect, test } from "bun:test";
import { makeFixture } from "../../../calculator/fixture";
import {
	baseRotationActions,
	customRotationSchema,
	flattenRotation,
	rotationPaletteActions,
	rotationStageOptions,
	seedRotation,
	updateRotationNode,
} from "../customRotations";
import {
	evaluate,
	getCatalog,
	resolveRotationStats,
} from "./riley/engine.generated.js";
import { searchInventory } from "./search";
import type { Scenario } from "./types";

function phrolovaFixture() {
	const catalog = getCatalog();
	const profile = catalog.teams.find(
		(t) =>
			!t.errors.length &&
			t.members.map((m) => m.name).join("/") === "Phrolova/Shorekeeper/Lucilla",
	)!;
	const kits = profile.members.map(
		(m) =>
			catalog.rotationKits!.find(
				(k) =>
					k.member.loadoutId === m.loadoutId &&
					k.member.mainEcho.engineId === m.mainEcho.engineId,
			)!,
	);
	const rotation = seedRotation(kits);
	const scenario: Scenario = {
		profileId: `custom:${rotation.id}`,
		rotation,
		cycles: 1,
		members: profile.members.map((m) => ({
			characterId: m.characterId,
			chain: m.minSequence,
			weaponId: m.weapons[0].id,
			weaponRank: m.weapons[0].ranks[0],
			echoSource: "rotation",
			echoes: [],
		})),
	};
	return { kits, scenario: resolveRotationStats(scenario) };
}

test("equivalent Phrolova Intro entries preserve state-dependent playback and damage", () => {
	const { scenario, kits } = phrolovaFixture();
	const kit = kits[0];
	const intros = baseRotationActions(kit).filter((a) => a.kind === "Intro");
	const baseline = evaluate({ ...scenario, capturePlayback: true });
	const steps = flattenRotation(scenario.rotation!.nodes).filter(
		(n) =>
			n.kind === "action" &&
			kit.actions.find((a) => a.id === n.actionId)?.kind === "Intro",
	);
	expect(steps.length).toBeGreaterThan(0);
	expect(
		baseline.playback!.some((e) => e.name.includes("Suite of Immortality")),
	).toBe(true);
	for (const intro of intros) {
		let nodes = scenario.rotation!.nodes;
		for (const step of steps) {
			if (step.kind !== "action") continue;
			const current = kit.actions.find((a) => a.id === step.actionId)!;
			const replacement = kit.actions.find(
				(a) => a.baseId === intro.id && a.variant === current.variant,
			)!;
			nodes = updateRotationNode(nodes, step.id, (n) => ({
				...n,
				actionId: replacement.id,
			}));
		}
		expect(
			evaluate({
				...scenario,
				rotation: { ...scenario.rotation!, nodes },
				capturePlayback: true,
			}),
		).toEqual(baseline);
	}
});

test("Phrolova playback includes engine-generated Hecate attacks without changing the saved flow", () => {
	const { scenario, kits } = phrolovaFixture();
	const before = JSON.stringify(scenario);
	const result = evaluate({ ...scenario, capturePlayback: true });
	const events = result.playback!;
	const phrolova = kits[0].member.characterId;
	const liberation = events.find(
		(e) => e.characterId === phrolova && e.kind === "Liberation",
	)!;
	const hecate = events.filter((e) => e.automatic && e.name.includes("Hecate"));
	expect(hecate.length).toBeGreaterThan(0);
	expect(hecate.some((e) => e.name.startsWith("Basic - Hecate"))).toBe(true);
	expect(hecate.some((e) => e.name.startsWith("Enhanced - Hecate"))).toBe(true);
	expect(
		hecate.every(
			(e) =>
				e.characterId === phrolova &&
				e.time >= liberation.time &&
				e.source === "Phrolova: Maestro",
		),
	).toBe(true);
	expect(
		events.every(
			(e, i) =>
				Number.isFinite(e.time) &&
				e.duration >= 0 &&
				(i === 0 || e.time >= events[i - 1].time),
		),
	).toBe(true);
	expect(events.reduce((n, e) => n + e.damage, 0)).toBe(result.teamDamage);
	for (const member of scenario.members)
		expect(
			events
				.filter((e) => e.characterId === member.characterId)
				.reduce((n, e) => n + e.damage, 0),
		).toBe(result.damageByMember[member.characterId]);
	const unlinked = evaluate(scenario);
	expect(unlinked.playback).toBeUndefined();
	expect(result.teamDamage).toBe(unlinked.teamDamage);
	expect(result.duration).toBe(unlinked.duration);
	expect(result.energy).toEqual(unlinked.energy);
	const steps = flattenRotation(scenario.rotation!.nodes);
	const failures = result.diagnosticDetails!.filter((issue) =>
		issue.message.includes("Requires: Concerto"),
	);
	expect(failures.length).toBeGreaterThan(0);
	for (const issue of failures) {
		const step = steps.find((n) => n.id === issue.nodeId)!;
		expect(step).toBeDefined();
		expect(step.kind).toBe("action");
		if (step.kind === "action")
			expect(kits[1].actions.find((a) => a.id === step.actionId)?.kind).toBe(
				"Outro",
			);
	}
	expect(
		result.diagnosticDetails!.find((issue) => issue.message.includes("% ER"))
			?.nodeId,
	).toBeUndefined();
	expect(JSON.stringify(scenario)).toBe(before);
	expect(customRotationSchema.parse(scenario.rotation)).toEqual(
		scenario.rotation!,
	);

	// Newly generated endings execute the actual engine form, rather than just changing a label.
	const basic = baseRotationActions(kits[0]).find(
		(a) => a.kind === "Basic" && a.name.endsWith(" 2"),
	)!;
	const instant = kits[0].actions.find(
		(a) => a.baseId === basic.id && a.variant === "instant dodge",
	)!;
	const single = (actionId: string): Scenario => ({
		...scenario,
		rotation: {
			...scenario.rotation!,
			nodes: [
				{ id: "basic", kind: "action", characterId: phrolova, actionId },
				...kits.slice(1).map((k) => ({
					id: `wait:${k.member.characterId}`,
					kind: "wait" as const,
					characterId: k.member.characterId,
					seconds: 0.05,
				})),
			],
		},
		capturePlayback: true,
	});
	const normal = evaluate(single(basic.id));
	const cut = evaluate(single(instant.id));
	expect(normal.teamDamage).toBeGreaterThan(cut.teamDamage);
	expect(normal.duration).toBeGreaterThan(cut.duration);
	expect(cut.playback!.some((e) => e.kind === "Dodge")).toBe(true);
	const invalid = baseRotationActions(kits[0]).find(
		(a) => a.kind === "Basic" && a.name.endsWith(" 1"),
	)!;
	try {
		evaluate(single(invalid.id));
		throw new Error("Expected the swap-in chain check to fail");
	} catch (error) {
		expect((error as Error).message).toContain("a swap-in opens on");
		expect(
			(error as Error & { rotationDiagnostic: { nodeId: string } })
				.rotationDiagnostic.nodeId,
		).toBe("basic");
	}
});

function fixture() {
	const catalog = getCatalog();
	const fixture = makeFixture(catalog, 10);
	const kits = fixture.profile.members.map(
		(m) =>
			catalog.rotationKits!.find(
				(k) =>
					k.member.loadoutId === m.loadoutId &&
					k.member.mainEcho.engineId === m.mainEcho.engineId,
			)!,
	);
	const rotation = seedRotation(kits, "Custom Jiyan");
	const scenario: Scenario = {
		...fixture.scenario,
		profileId: `custom:${rotation.id}`,
		rotation,
	};
	return { ...fixture, kits, rotation, scenario };
}

test("selected Basic stages run their real hits, timing and endings", () => {
	const { scenario, kits } = phrolovaFixture();
	const kit = kits[0];
	const basic = rotationPaletteActions(kit).find(
		(a) => a.stages?.name === "Basic - Movement of Life and Death",
	)!;
	const options = rotationStageOptions(kit, basic);
	const stageId = (label: string) =>
		options.find((o) => o.label === label)!.value;
	const forte = kit.actions.find(
		(a) => a.name.startsWith("Forte Basic") && a.variant === "instant dodge",
	)!;
	const run = (ids: string[]) =>
		evaluate({
			...scenario,
			capturePlayback: true,
			rotation: {
				...scenario.rotation!,
				nodes: [
					...[stageId("2"), stageId("3"), forte.id, ...ids].map(
						(actionId, i) => ({
							id: `stage:${i}`,
							kind: "action" as const,
							characterId: kit.member.characterId,
							actionId,
						}),
					),
					...kits.slice(1).map((k) => ({
						id: `wait:${k.member.characterId}`,
						kind: "wait" as const,
						characterId: k.member.characterId,
						seconds: 0.05,
					})),
				],
			},
		});
	const pair = run([stageId("1 → 2")]);
	const separate = run([stageId("1"), stageId("2")]);
	expect(pair.teamDamage).toBe(separate.teamDamage);
	expect(pair.duration).toBe(separate.duration);
	expect(pair.energy).toEqual(separate.energy);
	expect(
		pair.playback!.filter(
			(e) => e.name === "Basic - Movement of Life and Death 1",
		),
	).toHaveLength(1);
	expect(
		pair.playback!.filter(
			(e) => e.name === "Basic - Movement of Life and Death 3",
		),
	).toHaveLength(1);
	const full = run([stageId("1 → 2 → 3")]);
	expect(full.teamDamage).toBeGreaterThan(pair.teamDamage);
	expect(
		full.playback!.filter(
			(e) => e.name === "Basic - Movement of Life and Death 3",
		),
	).toHaveLength(2);
	const cut = kit.actions.find(
		(a) => a.baseId === stageId("1 → 2") && a.variant === "instant dodge",
	)!;
	const dodged = run([cut.id]);
	expect(dodged.teamDamage).toBeLessThan(pair.teamDamage);
	expect(dodged.playback!.filter((e) => e.kind === "Dodge")).toHaveLength(
		pair.playback!.filter((e) => e.kind === "Dodge").length + 1,
	);
});

test("Camellya reports Ephemeral's Concerto threshold and the specific missing mode buff", () => {
	const catalog = getCatalog();
	const profile = catalog.teams.find(
		(team) =>
			!team.errors.length &&
			team.members.some((member) => member.name === "Camellya"),
	)!;
	const kits = profile.members.map(
		(m) =>
			catalog.rotationKits!.find(
				(kit) =>
					kit.member.loadoutId === m.loadoutId &&
					kit.member.mainEcho.engineId === m.mainEcho.engineId,
			)!,
	);
	const camellya = kits.find((kit) => kit.member.name === "Camellya")!;
	const ephemeral = baseRotationActions(camellya).find(
		(action) => action.name === "Forte Skill - Ephemeral",
	)!;
	const blossom = baseRotationActions(camellya).find(
		(action) => action.name === "Skill - Crimson Blossom",
	)!;
	const rotation = seedRotation(kits);
	let inserted = false;
	rotation.nodes = flattenRotation(rotation.nodes).flatMap((node) => {
		if (node.kind === "action" && node.actionId === blossom.id) return [];
		if (!inserted && node.kind === "action" && node.actionId === ephemeral.id) {
			inserted = true;
			return [node, { ...node, id: "early-ephemeral" }];
		}
		return [node];
	});
	const scenario: Scenario = {
		profileId: `custom:${rotation.id}`,
		rotation,
		cycles: 1,
		capturePlayback: true,
		members: profile.members.map((m) => ({
			characterId: m.characterId,
			chain: m.minSequence,
			weaponId: m.weapons[0].id,
			weaponRank: m.weapons[0].ranks[0],
			echoSource: "rotation",
			echoes: [],
		})),
	};
	const result = evaluate(resolveRotationStats(scenario));
	expect(
		result.diagnosticDetails!.find(
			(issue) => issue.nodeId === "early-ephemeral",
		)?.message,
	).toBe(
		"Camellya: Forte Skill - Ephemeral — Requires: Concerto >= 100 (current: -40).",
	);
	expect(
		result.diagnosticDetails!.find(
			(issue) => issue.nodeId === "early-ephemeral",
		)?.summary,
	).toBe("Requires: Concerto >= 100 (current: -40)");
	expect(
		result.diagnosticDetails!.some(
			(issue) => issue.summary === "Requires: Concerto >= 100 (current: 30)",
		),
	).toBe(true);
	expect(
		result.diagnostics.some((message) =>
			message.includes("missing buff: Camellya: Blossom Mode"),
		),
	).toBe(true);
	expect(
		result.diagnostics.some((message) =>
			message.includes("unmet resource or buff condition"),
		),
	).toBe(false);
});
test("custom rotations simulate explicit actions and loops without mutating built-in teams", () => {
	const f = fixture();
	const before = evaluate({
		...f.scenario,
		profileId: f.profile.id,
		rotation: undefined,
	});
	const result = evaluate(f.scenario);
	const linked = evaluate({ ...f.scenario, capturePlayback: true });
	expect(linked.teamDamage).toBe(result.teamDamage);
	expect(linked.duration).toBe(result.duration);
	expect(linked.energy).toEqual(result.energy);
	expect(result.feasible).toBe(true);
	expect(result.teamDamage).toBeGreaterThan(0);
	expect(result.duration).toBeGreaterThan(0);
	expect(result.energy).toHaveLength(3);
	const shorter = {
		...f.rotation,
		nodes: f.rotation.nodes.map((n) =>
			n.kind === "loop" ? { ...n, count: 1 } : n,
		),
	};
	const short = evaluate({ ...f.scenario, rotation: shorter });
	expect(short.teamDamage).toBeLessThan(result.teamDamage);
	expect(short.duration).toBeLessThan(result.duration);
	expect(
		evaluate({ ...f.scenario, profileId: f.profile.id, rotation: undefined }),
	).toEqual(before);
});

test("fatal rotation errors retain the exact authored node, including nested loops", () => {
	const f = fixture();
	const intro = f.kits[0].actions.find((a) => a.kind === "Intro")!;
	try {
		evaluate({
			...f.scenario,
			rotation: {
				...f.rotation,
				nodes: [
					{
						id: "bad-loop",
						kind: "loop",
						count: 2,
						children: [
							{
								id: "bad-intro",
								kind: "action",
								characterId: f.kits[0].member.characterId,
								actionId: intro.id,
							},
						],
					},
					...f.rotation.nodes,
				],
			},
		});
		throw new Error("Expected the free Intro to be rejected");
	} catch (error) {
		expect(
			(error as Error & { rotationDiagnostic: { nodeId: string } })
				.rotationDiagnostic.nodeId,
		).toBe("bad-intro");
	}
});
test("custom programs reject free Intros, misplaced Outros and echo mismatches", () => {
	const f = fixture();
	const intro = f.kits[0].actions.find((a) => a.kind === "Intro")!;
	expect(() =>
		evaluate({
			...f.scenario,
			rotation: {
				...f.rotation,
				nodes: [
					{
						id: "free",
						kind: "action",
						characterId: f.kits[0].member.characterId,
						actionId: intro.id,
					},
					...f.rotation.nodes,
				],
			},
		}),
	).toThrow("Intro must follow");
	const otherEcho = f.kits[0].actions.find(
		(a) => a.mainEchoId && a.mainEchoId !== f.kits[0].member.mainEcho.engineId,
	)!;
	expect(() =>
		evaluate({
			...f.scenario,
			rotation: {
				...f.rotation,
				nodes: [
					...f.rotation.nodes,
					{
						id: "wrong-echo",
						kind: "action",
						characterId: f.kits[0].member.characterId,
						actionId: otherEcho.id,
					},
				],
			},
		}),
	).toThrow("main echo");
	const outro = f.kits[0].actions.find((a) => a.kind === "Outro")!;
	expect(() =>
		evaluate({
			...f.scenario,
			rotation: {
				...f.rotation,
				nodes: [
					{
						id: "outro",
						kind: "action",
						characterId: f.kits[0].member.characterId,
						actionId: outro.id,
					},
					...f.rotation.nodes,
				],
			},
		}),
	).toThrow("end of a character");
});
test("optimizer evaluates custom programs against the same owned echo inventory", async () => {
	const f = fixture();
	const target = f.scenario.members[2];
	const result = await searchInventory(
		{
			scenario: f.scenario,
			targetId: target.characterId,
			objective: { kind: "teamDamage" },
			inventory: [...target.echoes, ...f.inventory],
			mainTypeId: f.profile.members[2].mainEcho.typeId,
			resultsLimit: 50,
			budget: 4,
		},
		evaluate,
		() => {},
	);
	expect(result.baselineEvaluation?.feasible).toBe(true);
	expect(result.results.length).toBeGreaterThan(0);
	expect(
		result.results.every(
			(r) => r.uids.length === 5 && Number.isFinite(r.damage),
		),
	).toBe(true);
});
