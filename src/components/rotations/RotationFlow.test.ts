import { expect, test } from "bun:test";
import type { RotationNode } from "@/lib/calc/types";
import { flowRows, flowTurns } from "@/lib/rotationFlow";

const action = (id: string, characterId = 1): RotationNode => ({
	id,
	kind: "action",
	characterId,
	actionId: "basic",
});

test("turns keep contiguous actions together and split at swaps and loop boundaries", () => {
	const nodes: RotationNode[] = [
		action("a"),
		action("b"),
		action("swap", 2),
		{
			id: "loop",
			kind: "loop",
			count: 3,
			children: [action("c", 2), action("d", 2)],
		},
		action("e", 2),
	];
	const rows = flowTurns(flowRows(nodes));
	expect(
		rows.map((r) => [
			r.node.id,
			r.end ?? false,
			r.index,
			r.turnId,
			r.turnStart,
			r.turnCount,
		]),
	).toEqual([
		["a", false, 0, "a", true, 2],
		["b", false, 1, "a", false, 2],
		["swap", false, 2, "swap", true, 1],
		["loop", false, 3, undefined, undefined, undefined],
		["c", false, 4, "c", true, 2],
		["d", false, 5, "c", false, 2],
		["loop", true, 6, undefined, undefined, undefined],
		["e", false, 7, "e", true, 1],
	]);
	expect(rows[4].parentId).toBe("loop");
	expect(rows[4].depth).toBe(1);
	expect(flowTurns([])).toEqual([]);
});
