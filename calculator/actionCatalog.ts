import type { RotationAction } from "../src/lib/calc/types";
import {
	type Action,
	ActionGroup,
	CancelledStep,
	DashMarker,
	EveryOther,
	IntroEntry,
} from "../wuwa_calc/src/engine/rotation";
import { CAST_NAME, Cast } from "../wuwa_calc/src/engine/stats";

/** Presets allocate their own Intro entries. Group equal runtime choices only
 * in the palette, keeping every authored ID and its endings available. */
export function groupIntroPaletteActions(
	actions: RotationAction[],
	registry: Map<string, Action>,
) {
	const identities = new Map<Action, number>();
	const groups = new Map<string, string>();
	for (const descriptor of actions) {
		if (descriptor.id !== descriptor.baseId) continue;
		const action = registry.get(descriptor.id);
		if (!(action instanceof IntroEntry)) continue;
		const choices = action.intros.map((intro) => {
			const id = identities.get(intro) ?? identities.size;
			identities.set(intro, id);
			return id;
		});
		// IntroEntry resolves by membership in this set. Its chain kind is used
		// by preset scheduling, not by the custom editor's explicit action flow.
		const signature = JSON.stringify(
			[...new Set(choices)].sort((a, b) => a - b),
		);
		const paletteId = groups.get(signature) ?? descriptor.id;
		groups.set(signature, paletteId);
		descriptor.paletteId = paletteId;
	}
}

/** Add editable forms after authored IDs are assigned, preserving existing saved rotations. */
export function addActionEndings(
	actions: RotationAction[],
	refs: Map<Action, RotationAction>,
	registry: Map<string, Action>,
	register: (action: Action) => RotationAction,
) {
	const signatures = new Map<string, Action>();
	const roots = new Map<Action, Action>();
	const identity = new Map<Action, number>();
	const keyOf = (action: Action) => {
		const id = identity.get(action) ?? identity.size;
		identity.set(action, id);
		return id;
	};
	const baseOf = (action: Action): Action => {
		const known = roots.get(action);
		if (known) return known;
		let base = action;
		if (action instanceof CancelledStep) base = baseOf(action.of);
		else if (action instanceof EveryOther) base = baseOf(action.gated);
		else if (action.cancelOf) base = baseOf(action.cancelOf);
		else if (action.formOf && action.name === action.formOf.name)
			base = baseOf(action.formOf);
		else if (action instanceof ActionGroup) {
			const children = action.actions
				.filter((a) => !(a instanceof DashMarker))
				.map(baseOf);
			if (children.length === 1) base = children[0];
			else {
				const signature = JSON.stringify([action.name, children.map(keyOf)]);
				base =
					signatures.get(signature) ?? new ActionGroup(action.name, children);
				signatures.set(signature, base);
			}
		}
		roots.set(action, base);
		return base;
	};
	const processed = new Set<Action>();
	const extend = () => {
		const originals = [...refs.entries()].filter(
			([action]) => !processed.has(action),
		);
		for (const [action] of originals) processed.add(action);
		const bases = new Map<Action, RotationAction>();
		for (const [action, descriptor] of originals) {
			if (action instanceof DashMarker) continue;
			const base = baseOf(action);
			const baseDescriptor = register(base);
			descriptor.baseId = baseDescriptor.id;
			bases.set(base, baseDescriptor);
		}
		const forms: [string, (action: Action) => Action][] = [
			["cancel", (a) => a.cancel()],
			["instant cancel", (a) => a.instaCancel()],
			["hold cancel", (a) => a.holdCancel()],
			["mash cancel", (a) => a.mashCancel()],
			["dodge cancel", (a) => a.dodgeCancel()],
			["instant dodge", (a) => a.instaDodge()],
			["dodge on hit", (a) => a.hitDodge()],
			["cancel on hit", (a) => a.hitCancel()],
			["jump cancel", (a) => a.jumpCancel()],
			["instant jump", (a) => a.instaJump()],
			["jump on hit", (a) => a.jumpOnHit()],
			["swap cancel", (a) => a.swapCancel()],
			["instant swap", (a) => a.instaSwap()],
			["mash swap", (a) => a.mashSwap()],
		];
		for (const [base, descriptor] of bases) {
			const baseId = descriptor.id;
			descriptor.baseId = baseId;
			descriptor.variant = "";
			const first = base instanceof ActionGroup ? base.actions[0] : base;
			const kind = first.mainslot
				? "Echo"
				: first.cast === null
					? "Action"
					: (CAST_NAME[first.cast] ?? "Action");
			for (const a of actions)
				if (a.baseId === baseId) {
					a.name = base.name || first.name;
					a.kind = kind;
				}
			if (
				(first.cast === null && !first.mainslot) ||
				first.cast === Cast.Outro ||
				first.cast === Cast.Dodge ||
				first.cast === Cast.Jump
			)
				continue;
			for (const [label, make] of forms) {
				if (
					actions.some(
						(a) => a.baseId === baseId && a.variant.toLowerCase() === label,
					)
				)
					continue;
				try {
					const modified = make(base);
					const id = `${baseId}/ending/${label.replaceAll(" ", "-")}`;
					registry.set(id, modified);
					actions.push({ ...descriptor, id, baseId, variant: label });
				} catch {
					// For example: on-hit cuts require multiple hit frames; Intro entries disallow them.
				}
			}
		}
	};
	extend();
	return extend;
}
