import { expect, test } from "bun:test";
import { makeFixture } from "../../calculator/fixture";
import {
	evaluate,
	evaluateFast,
	getCatalog,
	resolveRotationStats,
} from "./calc/riley/engine.generated.js";
import { referenceScenario } from "./calc/rotationDamage";
import type { RotationNode } from "./calc/types";
import {
	baseRotationActions,
	customRotationProfile,
	customRotationSchema,
	flattenRotation,
	insertRotationNode,
	rotationActionName,
	rotationEndingOptions,
	rotationKits,
	rotationLibrarySchema,
	rotationPaletteActions,
	rotationSize,
	rotationStageOptions,
	seedRotation,
	updateRotationNode,
} from "./customRotations";

test("Phrolova has one conditional Intro in the palette while saved Intro IDs retain their endings", () => {
	const kits = getCatalog().rotationKits!.filter(
		(k) => k.member.name === "Phrolova",
	);
	expect(kits.length).toBeGreaterThan(0);
	for (const kit of kits) {
		const intros = baseRotationActions(kit).filter((a) => a.kind === "Intro");
		expect(intros.length).toBeGreaterThan(1);
		const palette = rotationPaletteActions(kit).filter(
			(a) => a.kind === "Intro",
		);
		expect(palette).toHaveLength(1);
		expect(palette[0].name).toContain("Suite of Quietus");
		expect(palette[0].name).toContain("Suite of Immortality");
		for (const intro of intros) {
			expect(intro.baseId).toBe(intro.id);
			expect(intro.paletteId).toBe(palette[0].id);
			const ending = kit.actions.find(
				(a) => a.baseId === intro.id && a.variant === "instant dodge",
			)!;
			expect(ending).toBeDefined();
			expect(rotationEndingOptions(kit, ending)).toContainEqual({
				value: ending.id,
				label: "Instant dodge",
			});
		}
	}
	const kit = kits.find((k) => k.member.loadoutId === 16082)!;
	const prefix = "7bcbb24ea8c3ef873a8479fcd99d25dd305d8a1f:16082:";
	for (const suffix of [20, 38, 59, 81, 105, 124])
		expect(kit.actions.find((a) => a.id === `${prefix}${suffix}`)?.kind).toBe(
			"Intro",
		);
});

test("the palette contains base presses and placed blocks retain editable endings", () => {
	const kit = getCatalog().rotationKits!.find(
		(k) => k.member.name === "Phrolova",
	)!;
	const palette = baseRotationActions(kit);
	expect(palette.every((a) => !a.variant)).toBe(true);
	expect(new Set(palette.map((a) => a.baseId)).size).toBe(palette.length);
	const third = palette.find(
		(a) => a.kind === "Basic" && a.name.endsWith(" 3"),
	)!;
	expect(third).toBeDefined();
	expect(palette.filter((a) => a.name === third.name)).toHaveLength(1);
	const options = rotationEndingOptions(kit, third);
	expect(options[0]).toEqual({ value: third.id, label: "Normal" });
	expect(options.map((o) => o.label)).toContain("Instant dodge");
	expect(options.map((o) => o.label)).toContain("Dodge on hit");
	// Authored template IDs continue to identify their exact original form.
	const legacy = kit.actions.find(
		(a) =>
			a.baseId === third.id &&
			a.variant === "instant dodge" &&
			!a.id.includes("/ending/"),
	)!;
	expect(legacy).toBeDefined();
	expect(
		rotationEndingOptions(kit, legacy).find((o) => o.value === legacy.id)
			?.label,
	).toBe("Instant dodge");
	const rotation = seedRotation([kit]);
	const node = {
		id: "placed",
		kind: "action" as const,
		characterId: kit.member.characterId,
		actionId: third.id,
	};
	const changed = {
		...rotation,
		nodes: updateRotationNode([node], node.id, (n) => ({
			...n,
			actionId: options.find((o) => o.label === "Dodge on hit")!.value,
		})),
	};
	const restored = rotationLibrarySchema.parse(
		JSON.parse(JSON.stringify([changed])),
	)[0];
	expect(restored.nodes).toEqual(changed.nodes);
	expect(node.actionId).toBe(third.id);
	const selected = kit.actions.find(
		(a) => a.id === (restored.nodes[0] as typeof node).actionId,
	)!;
	expect(selected.baseId).toBe(third.id);
	expect(
		rotationEndingOptions(kit, selected).find((o) => o.value === selected.id)
			?.label,
	).toBe("Dodge on hit");
});

test("one Basic block exposes modeled stages and keeps its ending when the stages change", () => {
	const kit = getCatalog().rotationKits!.find(
		(k) => k.member.name === "Phrolova",
	)!;
	const palette = rotationPaletteActions(kit);
	const basics = palette.filter(
		(a) => a.stages?.name === "Basic - Movement of Life and Death",
	);
	expect(basics).toHaveLength(1);
	const basic = basics[0];
	expect(rotationActionName(basic)).toBe("Basic - Movement of Life and Death");
	expect(basic.stages!.parts).toEqual(["1", "2", "3"]);
	const options = rotationStageOptions(kit, basic);
	expect(options.map((o) => o.label)).toEqual([
		"1",
		"1 → 2",
		"1 → 2 → 3",
		"2",
		"2 → 3",
		"3",
	]);
	const instant = kit.actions.find(
		(a) => a.baseId === basic.id && a.variant === "instant dodge",
	)!;
	const changedId = rotationStageOptions(kit, instant).find(
		(o) => o.label === "1 → 2",
	)!.value;
	const changed = kit.actions.find((a) => a.id === changedId)!;
	expect(changed.stages!.parts).toEqual(["1", "2"]);
	expect(changed.variant).toBe("instant dodge");
	expect(
		rotationEndingOptions(kit, changed).some((o) => o.value === changedId),
	).toBe(true);
	const legacy = kit.actions.find(
		(a) =>
			a.baseId === basic.id &&
			a.variant === "instant dodge" &&
			!a.id.includes("/ending/"),
	)!;
	expect(
		rotationStageOptions(kit, legacy).find((o) => o.label === "1 → 2 → 3")!
			.value,
	).toBe(legacy.id);
	const rotation = seedRotation([kit]);
	rotation.nodes = [
		{
			id: "stages",
			kind: "action",
			characterId: kit.member.characterId,
			actionId: changedId,
		},
	];
	expect(
		rotationLibrarySchema.parse(JSON.parse(JSON.stringify([rotation])))[0]
			.nodes,
	).toEqual(rotation.nodes);
});

test("stage families retain named intermediate attacks and keep different modes and echo actions separate", () => {
	const kits = getCatalog().rotationKits!;
	const camellya = kits.find((k) => k.member.name === "Camellya")!;
	const waltz = rotationPaletteActions(camellya).find(
		(a) => a.stages?.name === "Basic - Vining Waltz",
	)!;
	expect(waltz.stages!.parts).toEqual(["1", "2", "3", "Blazing Waltz", "4"]);
	expect(
		rotationStageOptions(camellya, waltz).some(
			(o) => o.label === "3 → Blazing Waltz → 4",
		),
	).toBe(true);
	const cantarella = kits.find((k) => k.member.name === "Cantarella")!;
	const illusion = rotationPaletteActions(cantarella).find(
		(a) => a.stages?.name === "Basic - Illusion Collapse",
	)!;
	const illusionOptions = rotationStageOptions(cantarella, illusion);
	expect(illusionOptions.map((o) => o.label)).toContain("3 (1 hit)");
	expect(illusionOptions.map((o) => o.label)).toContain("3 (2 hits)");
	expect(new Set(illusionOptions.map((o) => o.label)).size).toBe(
		illusionOptions.length,
	);
	const jinhsi = kits.find((k) => k.member.name === "Jinhsi")!;
	const families = rotationPaletteActions(jinhsi).filter((a) => a.stages);
	expect(families.map(rotationActionName)).toContain("Basic - Incarnation");
	expect(families.map(rotationActionName)).toContain(
		"Basic - Slash of Breaking Dawn",
	);
	for (const kit of kits)
		expect(kit.actions.some((a) => a.kind === "Echo" && a.stages)).toBe(false);
});

test("compatible presets share modeled stages without remapping saved action IDs", () => {
	const kits = getCatalog().rotationKits!;
	const phrolova = kits.find((k) => k.member.loadoutId === 16082)!;
	const prefix = "7bcbb24ea8c3ef873a8479fcd99d25dd305d8a1f:16082:";
	expect(phrolova.actions.find((a) => a.id === `${prefix}1`)?.name).toBe(
		"Basic - Movement of Life and Death 2",
	);
	expect(phrolova.actions.find((a) => a.id === `${prefix}49`)?.name).toBe(
		"Basic - Movement of Life and Death 123",
	);
	const cantarella = kits.find((k) => k.member.loadoutId === 16071)!;
	const sting = rotationPaletteActions(cantarella).find(
		(a) => a.stages?.name === "Forte Basic - Phantom Sting",
	)!;
	expect(rotationStageOptions(cantarella, sting).map((o) => o.label)).toContain(
		"1 → 2 → 3",
	);
	// Denia's resonance modes are different combat setups, rather than rotation presets.
	const strain = kits.find((k) => k.member.loadoutId === 12112)!;
	const breakdown = rotationPaletteActions(strain).find(
		(a) => a.stages?.name === "Basic - Breakdown Form",
	)!;
	expect(
		rotationStageOptions(strain, breakdown).map((o) => o.label),
	).not.toContain("4");
});

const action = (id: string): RotationNode => ({
	id,
	kind: "action",
	characterId: 1404,
	actionId: "skill",
});
test("nested loops preserve the authored order and bound expansion", () => {
	const nodes: RotationNode[] = [
		action("a"),
		{
			id: "loop",
			kind: "loop",
			count: 2,
			children: [
				action("b"),
				{ id: "inner", kind: "loop", count: 3, children: [action("c")] },
			],
		},
	];
	expect(flattenRotation(nodes).map((n) => n.id)).toEqual([
		"a",
		"b",
		"c",
		"c",
		"c",
		"b",
		"c",
		"c",
		"c",
	]);
	expect(rotationSize(nodes)).toBe(9);
	expect(() =>
		flattenRotation([
			{ id: "huge", kind: "loop", count: 2001, children: [action("a")] },
		]),
	).toThrow();
});
test("dragging moves rather than copies, can cross loop boundaries, and rejects self nesting", () => {
	const nodes: RotationNode[] = [
		action("a"),
		{ id: "loop", kind: "loop", count: 2, children: [action("b")] },
		action("c"),
	];
	const nested = insertRotationNode(nodes, nodes[0], "loop", "b");
	expect(nested.map((n) => n.id)).toEqual(["loop", "c"]);
	expect(
		nested[0].kind === "loop" && nested[0].children.map((n) => n.id),
	).toEqual(["a", "b"]);
	const moved = insertRotationNode(nested, action("b"), null, "loop");
	expect(moved.map((n) => n.id)).toEqual(["b", "loop", "c"]);
	expect(flattenRotation(moved).map((n) => n.id)).toEqual(["b", "a", "a", "c"]);
	expect(insertRotationNode(nodes, nodes[1], "loop")).toBe(nodes);
	expect(insertRotationNode(nodes, nodes[1], "missing")).toBe(nodes);
	expect(updateRotationNode(nodes, "b", () => null)[1]).toEqual({
		id: "loop",
		kind: "loop",
		count: 2,
		children: [],
	});
	expect(nodes[1].kind === "loop" && nodes[1].children).toHaveLength(1);
});
test("rotation libraries round-trip and remain selectable with the full custom program", () => {
	const catalog = getCatalog();
	const { profile } = makeFixture(catalog);
	const kits = profile.members.map(
		(m) =>
			catalog.rotationKits!.find(
				(k) =>
					k.member.loadoutId === m.loadoutId &&
					k.member.mainEcho.engineId === m.mainEcho.engineId,
			)!,
	);
	const rotation = seedRotation(kits, "My team");
	const restored = rotationLibrarySchema.parse(
		JSON.parse(JSON.stringify([rotation])),
	)[0];
	expect(restored).toEqual(rotation);
	expect(rotationKits(restored, catalog)).toEqual(kits);
	const custom = customRotationProfile(restored, catalog);
	expect(custom.errors).toEqual([]);
	expect(custom.label).toBe("My team");
	expect(custom.customRotation).toBe(restored);
	expect(custom.members.map((m) => m.characterId)).toEqual(
		profile.members.map((m) => m.characterId),
	);
	expect(
		customRotationProfile(
			{ ...rotation, members: rotation.members.slice(0, 2) },
			catalog,
		).errors,
	).toContain("Select three supported Resonators.");
	expect(
		customRotationSchema.safeParse({
			...rotation,
			nodes: [{ id: "bad", kind: "loop", count: 0, children: [] }],
		}).success,
	).toBe(false);
	expect(
		customRotationSchema.safeParse({
			...rotation,
			nodes: [
				{ id: "bad", kind: "wait", characterId: 1404, seconds: Infinity },
			],
		}).success,
	).toBe(false);
});

test("validation diagnostics retain nested block sources while team checks remain global", () => {
	const catalog = getCatalog();
	const { profile } = makeFixture(catalog);
	const kits = profile.members.map(
		(m) =>
			catalog.rotationKits!.find(
				(k) =>
					k.member.loadoutId === m.loadoutId &&
					k.member.mainEcho.engineId === m.mainEcho.engineId,
			)!,
	);
	const rotation = seedRotation(kits);
	const echo = kits[0].actions.find(
		(a) => a.mainEchoId && a.mainEchoId !== kits[0].member.mainEcho.engineId,
	)!;
	rotation.nodes.push({
		id: "invalid-loop",
		kind: "loop",
		count: 2,
		children: [
			{
				id: "wrong-echo",
				kind: "action",
				characterId: kits[0].member.characterId,
				actionId: echo.id,
			},
			{
				id: "missing-action",
				kind: "action",
				characterId: kits[0].member.characterId,
				actionId: "removed",
			},
			{ id: "outsider", kind: "wait", characterId: 999999, seconds: 1 },
		],
	});
	const result = customRotationProfile(rotation, catalog);
	expect(
		result.diagnosticDetails!.find((issue) =>
			issue.message.includes("main echo"),
		)?.nodeId,
	).toBe("wrong-echo");
	expect(
		result.diagnosticDetails!.find((issue) =>
			issue.message.includes("unavailable"),
		)?.nodeId,
	).toBe("missing-action");
	expect(
		result.diagnosticDetails!.find((issue) =>
			issue.message.includes("outside the team"),
		)?.nodeId,
	).toBe("outsider");
	const incomplete = customRotationProfile(
		{ ...rotation, members: [] },
		catalog,
	);
	expect(
		incomplete.diagnosticDetails!.find((issue) =>
			issue.message.includes("three supported"),
		)?.nodeId,
	).toBeUndefined();
});

test("repeated Hsin swap-in errors retain the opening block through the bundled simulator", () => {
	const catalog = getCatalog();
	const preset = catalog.teams.find((profile) =>
		profile.members.some((member) => member.loadoutId === 13111),
	)!;
	const kits = preset.members.map(
		(member) =>
			catalog.rotationKits!.find(
				(kit) =>
					kit.member.loadoutId === member.loadoutId &&
					kit.member.mainEcho.engineId === member.mainEcho.engineId,
			)!,
	);
	const hsin = kits.find((kit) => kit.member.loadoutId === 13111)!;
	const opening = hsin.actions.find(
		(action) =>
			action.name === "Basic - Illumining Form: Pillars Aligned 1" &&
			!action.variant,
	)!;
	expect(opening).toBeDefined();
	const rotation = seedRotation(kits);
	rotation.nodes = [
		...["opening", "repeated"].map((id) => ({
			id,
			kind: "action" as const,
			characterId: hsin.member.characterId,
			actionId: opening.id,
		})),
		...kits
			.filter((kit) => kit !== hsin)
			.map((kit) => ({
				id: `wait-${kit.member.characterId}`,
				kind: "wait" as const,
				characterId: kit.member.characterId,
				seconds: 1,
			})),
	];
	const scenario = {
		...resolveRotationStats(referenceScenario(preset)),
		profileId: `custom:${rotation.id}`,
		rotation,
	};
	for (const simulate of [evaluate, evaluateFast]) {
		let caught: unknown;
		try {
			simulate(scenario);
		} catch (error) {
			caught = error;
		}
		expect(caught).toMatchObject({
			rotationDiagnostic: {
				message: expect.stringContaining(
					"swaps in GROUNDED on Basic - Illumining Form: Pillars Aligned 1",
				),
				nodeId: "opening",
			},
		});
	}
});
