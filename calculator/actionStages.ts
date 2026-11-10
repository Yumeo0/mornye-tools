import type { RotationAction } from "../src/lib/calc/types";
import { type Action, ActionGroup } from "../wuwa_calc/src/engine/rotation";

interface Stage {
	action: Action;
	descriptor: RotationAction;
	label: string;
	number?: number;
}
interface Family {
	name: string;
	kind: string;
	stages: Map<Action, Stage>;
	sequences: { action: Action; parts: Stage[] }[];
}

/** Append real ActionGroups for selectable, contiguous stages. All original IDs
 * and groups keep their identity; no damage, resource, or hit data is approximated. */
export function addActionStages(
	actions: RotationAction[],
	registry: Map<string, Action>,
	register: (action: Action) => string,
	extendEndings: () => void,
) {
	const bases = actions.filter((a) => a.id === a.baseId);
	const byAction = new Map(bases.map((a) => [registry.get(a.id)!, a]));
	const families = new Map<string, Family>();
	const familyOf = new Map<Action, Family>();
	for (const descriptor of bases) {
		const action = registry.get(descriptor.id)!;
		if (
			action instanceof ActionGroup ||
			["Echo", "Intro", "Outro", "Liberation", "Action"].includes(
				descriptor.kind,
			)
		)
			continue;
		const match = /^(.*\S) ([1-9])(\s+\([^)]*\))?$/.exec(descriptor.name);
		if (!match) continue;
		const key = `${descriptor.kind}:${match[1]}`;
		let family = families.get(key);
		if (!family) {
			family = {
				name: match[1]!,
				kind: descriptor.kind,
				stages: new Map(),
				sequences: [],
			};
			families.set(key, family);
		}
		family.stages.set(action, {
			action,
			descriptor,
			label: `${match[2]}${match[3] ?? ""}`,
			number: Number(match[2]),
		});
		familyOf.set(action, family);
	}
	// Existing chains also describe named intermediate stages, e.g. Camellya's
	// Blazing Waltz between Vining Waltz 3 and 4. Mixed attack types stay separate.
	for (const descriptor of bases) {
		const action = registry.get(descriptor.id)!;
		if (!(action instanceof ActionGroup) || action.actions.length < 2) continue;
		const candidates = new Set(
			action.actions.map((a) => familyOf.get(a)).filter(Boolean),
		);
		if (candidates.size !== 1) continue;
		const family = [...candidates][0]!;
		if (action.actions.some((a) => byAction.get(a)?.kind !== family.kind))
			continue;
		for (const child of action.actions) {
			if (family.stages.has(child)) continue;
			const part = byAction.get(child)!;
			family.stages.set(child, {
				action: child,
				descriptor: part,
				label: part.name.replace(/^[^-]+ - /, ""),
			});
			familyOf.set(child, family);
		}
		family.sequences.push({
			action,
			parts: action.actions.map((a) => family.stages.get(a)!),
		});
	}
	const metadata = new Map<string, NonNullable<RotationAction["stages"]>>();
	for (const family of families.values()) {
		if (family.stages.size < 2) continue;
		const stages = [...family.stages.values()];
		const labels = new Map<string, Stage[]>();
		for (const stage of stages)
			labels.set(stage.label, [...(labels.get(stage.label) ?? []), stage]);
		for (const [label, duplicates] of labels) {
			if (duplicates.length < 2) continue;
			for (const [i, stage] of duplicates.entries()) {
				const hits = stage.action.bullets.length;
				const sameHits =
					duplicates.filter((s) => s.action.bullets.length === hits).length > 1;
				stage.label = `${label} (${hits} ${hits === 1 ? "hit" : "hits"}${sameHits ? ` · ${i + 1}` : ""})`;
			}
		}
		const familyId = stages[0]!.descriptor.id;
		const choices = new Map<string, { action: Action; parts: Stage[] }>();
		const keyOf = (parts: Stage[]) =>
			JSON.stringify(parts.map((s) => s.descriptor.id));
		for (const stage of stages)
			choices.set(keyOf([stage]), { action: stage.action, parts: [stage] });
		for (const sequence of family.sequences)
			choices.set(keyOf(sequence.parts), sequence);
		const add = (parts: Stage[]) => {
			if (parts.length < 2 || choices.has(keyOf(parts))) return;
			if (
				parts.some(
					(part, i) => i > 0 && !part.action.follows(parts[i - 1]!.action),
				)
			)
				return;
			const group = new ActionGroup(
				`${family.name} ${parts.map((s) => s.label).join(" → ")}`,
				parts.map((s) => s.action),
			);
			register(group);
			choices.set(keyOf(parts), { action: group, parts });
		};
		// Offer each slice of an authored chain, including named intermediate hits.
		for (const sequence of family.sequences)
			for (let start = 0; start < sequence.parts.length; start++)
				for (let end = start + 2; end <= sequence.parts.length; end++)
					add(sequence.parts.slice(start, end));
		// Numbered stages can also form chains absent from the preset (e.g. 1 → 2).
		const walk = (parts: Stage[]) => {
			add(parts);
			const last = parts.at(-1)!;
			if (last.number == null) return;
			for (const next of stages)
				if (next.number === last.number + 1 && next.action.follows(last.action))
					walk([...parts, next]);
		};
		for (const stage of stages) walk([stage]);
		for (const { action, parts } of choices.values()) {
			const id = register(action);
			metadata.set(id, {
				familyId,
				name: family.name,
				parts: parts.map((s) => s.label),
			});
		}
	}
	extendEndings();
	for (const descriptor of actions) {
		const stages = metadata.get(descriptor.id);
		if (stages) metadata.set(descriptor.baseId ?? descriptor.id, stages);
	}
	for (const descriptor of actions) {
		const stages = metadata.get(descriptor.baseId ?? descriptor.id);
		if (!stages) continue;
		descriptor.stages = stages;
		const base = registry.get(descriptor.baseId ?? descriptor.id)!;
		descriptor.seconds = (
			base instanceof ActionGroup ? base.actions : [base]
		).reduce((total, part) => total + part.animFrames / 60, 0);
	}
}
