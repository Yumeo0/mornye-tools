import { z } from "zod";
import type {
	CalculatorCatalog,
	CustomRotation,
	RotationAction,
	RotationDiagnostic,
	RotationKit,
	RotationNode,
	TeamProfile,
} from "./calc/types";

export const MAX_ROTATION_STEPS = 2000;
const nodeSchema: z.ZodType<RotationNode> = z.lazy(() =>
	z.discriminatedUnion("kind", [
		z.object({
			id: z.string(),
			kind: z.literal("action"),
			characterId: z.number().int().positive(),
			actionId: z.string(),
		}),
		z.object({
			id: z.string(),
			kind: z.literal("wait"),
			characterId: z.number().int().positive(),
			seconds: z.number().min(0.05).max(60),
		}),
		z.object({
			id: z.string(),
			kind: z.literal("loop"),
			count: z.number().int().min(1).max(20),
			children: z.array(nodeSchema).max(200),
		}),
	]),
);
export const customRotationSchema: z.ZodType<CustomRotation> = z
	.object({
		id: z.string().min(1),
		name: z.string().max(100),
		members: z
			.array(
				z.object({
					loadoutId: z.number().int(),
					mainEchoId: z.number().int(),
					mainDps: z.boolean(),
				}),
			)
			.max(3),
		nodes: z.array(nodeSchema).max(200),
	})
	.refine(
		(r) => rotationSize(r.nodes) <= MAX_ROTATION_STEPS,
		"Rotation is too long",
	);
export const rotationLibrarySchema = z.array(customRotationSchema).max(100);
export const newNodeId = () => crypto.randomUUID();
export function baseRotationActions(kit: RotationKit) {
	return kit.actions.filter(
		(action) =>
			action.id === action.baseId &&
			(!action.mainEchoId ||
				action.mainEchoId === kit.member.mainEcho.engineId),
	);
}
/** One draggable entry per attack family; placed blocks still save exact action IDs. */
export function rotationPaletteActions(kit: RotationKit) {
	const palette = new Map<string, RotationAction>();
	for (const action of baseRotationActions(kit)) {
		const key = action.stages?.familyId ?? action.paletteId ?? action.id;
		const previous = palette.get(key);
		if (
			!previous ||
			(action.stages?.parts.length ?? 0) > (previous.stages?.parts.length ?? 0)
		)
			palette.set(key, action);
	}
	return [...palette.values()];
}
export const rotationActionName = (action: RotationAction) =>
	action.stages?.name ?? action.name;

export function splitRotationActionName(name: string, kind: string) {
	const separator = name.indexOf(" - ");
	if (separator < 0) return { type: kind, name };
	const type = name.slice(0, separator);
	return { type, name: name.slice(separator + 3).replaceAll(`${type} - `, "") };
}

export function rotationStageOptions(kit: RotationKit, action: RotationAction) {
	const stages = action.stages;
	if (!stages) return [];
	return baseRotationActions(kit)
		.flatMap((candidate) =>
			candidate.stages?.familyId === stages.familyId
				? [{ action: candidate, parts: candidate.stages.parts }]
				: [],
		)
		.toSorted((a, b) =>
			a.parts.join(" → ").localeCompare(b.parts.join(" → "), undefined, {
				numeric: true,
			}),
		)
		.map(({ action: stage, parts }) => {
			const forms = kit.actions.filter((a) => a.baseId === stage.id);
			// Keep the current exact legacy ID, or match its ending on the new sequence.
			const selected =
				stage.id === action.baseId
					? action
					: action.variant
						? (forms.find((a) => a.variant === action.variant) ?? stage)
						: stage;
			return {
				value: selected.id,
				label: parts.join(" → "),
			};
		});
}
export function rotationEndingOptions(
	kit: RotationKit,
	action: RotationAction,
) {
	const family = kit.actions.filter(
		(a) => a.baseId === (action.baseId ?? action.id),
	);
	// Keep the selected legacy form when equivalent forms have different saved IDs.
	const options = new Map<string, RotationAction>();
	for (const form of family)
		if (!options.has(form.variant)) options.set(form.variant, form);
	options.set(action.variant, action);
	return [...options.values()]
		.toSorted(
			(a, b) =>
				Number(!!a.variant) - Number(!!b.variant) ||
				a.variant.localeCompare(b.variant),
		)
		.map((form) => ({
			value: form.id,
			label: form.variant
				? form.variant.charAt(0).toUpperCase() + form.variant.slice(1)
				: "Normal",
		}));
}
export function rotationSize(nodes: RotationNode[], depth = 0): number {
	if (depth > 5) return Infinity;
	return nodes.reduce(
		(n, node) =>
			n +
			(node.kind === "loop"
				? node.count * rotationSize(node.children, depth + 1)
				: 1),
		0,
	);
}
export function flattenRotation(
	nodes: RotationNode[],
): Exclude<RotationNode, { kind: "loop" }>[] {
	if (rotationSize(nodes) > MAX_ROTATION_STEPS)
		throw new Error(
			`Keep rotations under ${MAX_ROTATION_STEPS} actions and five nested loops.`,
		);
	return nodes.flatMap((node) =>
		node.kind === "loop"
			? Array.from({ length: node.count }, () =>
					flattenRotation(node.children),
				).flat()
			: [node],
	);
}
export function rotationKits(
	rotation: CustomRotation,
	catalog: CalculatorCatalog,
): RotationKit[] {
	return rotation.members.flatMap((m) => {
		const kit = catalog.rotationKits.find(
			(k) =>
				k.member.loadoutId === m.loadoutId &&
				k.member.mainEcho.engineId === m.mainEchoId,
		);
		return kit ? [kit] : [];
	});
}
export function customRotationProfile(
	rotation: CustomRotation,
	catalog: CalculatorCatalog,
): TeamProfile & {
	customRotation: CustomRotation;
	diagnosticDetails: RotationDiagnostic[];
} {
	const kits = rotationKits(rotation, catalog);
	const issues: RotationDiagnostic[] = [];
	const report = (message: string, nodeId?: string) =>
		issues.push({ message, ...(nodeId ? { nodeId } : {}) });
	if (kits.length !== 3) report("Select three supported Resonators.");
	if (new Set(kits.map((k) => k.member.characterId)).size !== kits.length)
		report("Each Resonator must be different.");
	let steps: ReturnType<typeof flattenRotation> = [];
	try {
		steps = flattenRotation(rotation.nodes);
	} catch (error) {
		report(String(error));
	}
	if (!steps.length) report("Add actions to the rotation.");
	for (const kit of kits)
		if (!steps.some((s) => s.characterId === kit.member.characterId))
			report(`${kit.member.name}: add at least one action.`);
	for (const step of steps) {
		const kit = kits.find((k) => k.member.characterId === step.characterId);
		if (!kit) {
			report("Remove actions for Resonators outside the team.", step.id);
			continue;
		}
		if (step.kind === "action") {
			const action = kit.actions.find((a) => a.id === step.actionId);
			if (!action)
				report(
					`${kit.member.name}: an action is unavailable in this variant.`,
					step.id,
				);
			else if (
				action.mainEchoId &&
				action.mainEchoId !== kit.member.mainEcho.engineId
			)
				report(
					`${kit.member.name}: select the main echo used by the action.`,
					step.id,
				);
		}
	}
	return {
		id: `custom:${rotation.id}`,
		label: rotation.name || "Untitled rotation",
		members: kits.map((k) => ({
			...k.member,
			mainDps:
				rotation.members.find((m) => m.loadoutId === k.member.loadoutId)
					?.mainDps ?? false,
		})),
		errors: [...new Set(issues.map((issue) => issue.message))],
		diagnosticDetails: issues,
		customRotation: rotation,
	};
}
export function seedRotation(
	kits: RotationKit[],
	name = "New rotation",
): CustomRotation {
	const actions = (kit: RotationKit, ids: string[]): RotationNode[] =>
		ids.map((actionId) => ({
			id: newNodeId(),
			kind: "action",
			characterId: kit.member.characterId,
			actionId,
		}));
	return {
		id: newNodeId(),
		name,
		members: kits.map((k, i) => ({
			loadoutId: k.member.loadoutId,
			mainEchoId: k.member.mainEcho.engineId,
			mainDps: i === 0,
		})),
		nodes: [
			...kits.flatMap((k) => actions(k, k.start)),
			...kits.flatMap((k, i) => actions(k, i === 0 ? k.opener : k.repeat)),
			{
				id: newNodeId(),
				kind: "loop",
				count: 3,
				children: kits.flatMap((k) => actions(k, k.repeat)),
			},
		],
	};
}
export function findRotationNode(
	nodes: RotationNode[],
	id: string,
): RotationNode | undefined {
	for (const node of nodes) {
		if (node.id === id) return node;
		if (node.kind === "loop") {
			const found = findRotationNode(node.children, id);
			if (found) return found;
		}
	}
}
export function updateRotationNode(
	nodes: RotationNode[],
	id: string,
	update: (node: RotationNode) => RotationNode | null,
): RotationNode[] {
	return nodes.flatMap((node) => {
		if (node.id === id) {
			const next = update(node);
			return next ? [next] : [];
		}
		return [
			{
				...node,
				...(node.kind === "loop"
					? { children: updateRotationNode(node.children, id, update) }
					: {}),
			},
		];
	});
}
/** Insert before a sibling, or append into a loop/root. Self-descendant moves are rejected. */
export function insertRotationNode(
	nodes: RotationNode[],
	node: RotationNode,
	parentId: string | null,
	beforeId: string | null = null,
): RotationNode[] {
	if (
		node.id === parentId ||
		(node.kind === "loop" &&
			parentId &&
			findRotationNode(node.children, parentId))
	)
		return nodes;
	const clean = updateRotationNode(nodes, node.id, () => null);
	const insert = (list: RotationNode[]) => {
		const index = beforeId ? list.findIndex((n) => n.id === beforeId) : -1;
		const next = [...list];
		next.splice(index < 0 ? next.length : index, 0, node);
		return next;
	};
	if (!parentId) return insert(clean);
	if (findRotationNode(clean, parentId)?.kind !== "loop") return nodes;
	return updateRotationNode(clean, parentId, (parent) =>
		parent.kind === "loop"
			? { ...parent, children: insert(parent.children) }
			: parent,
	);
}
