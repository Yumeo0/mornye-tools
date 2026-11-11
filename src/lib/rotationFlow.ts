import type { RotationNode } from "@/lib/calc/types";

export interface FlowRow {
	node: RotationNode;
	parentId: string | null;
	depth: number;
	end?: boolean;
}
export function flowRows(
	nodes: RotationNode[],
	parentId: string | null = null,
	depth = 0,
): FlowRow[] {
	return nodes.flatMap((node): FlowRow[] => [
		{ node, parentId, depth },
		...(node.kind === "loop"
			? [
					...flowRows(node.children, node.id, depth + 1),
					{ node, parentId, depth, end: true },
				]
			: []),
	]);
}

export function flowTurns(rows: FlowRow[]) {
	const turns: Array<
		FlowRow & {
			index: number;
			turnId?: string;
			turnStart?: boolean;
			turnCount?: number;
		}
	> = [];
	let start = -1;
	for (const [index, row] of rows.entries()) {
		const previous = rows[index - 1];
		if (row.node.kind === "loop") {
			start = -1;
			turns.push({ ...row, index });
			continue;
		}
		if (
			start < 0 ||
			previous?.node.kind === "loop" ||
			previous?.parentId !== row.parentId ||
			previous?.node.characterId !== row.node.characterId
		)
			start = index;
		const first = rows[start];
		turns.push({
			...row,
			index,
			turnId: first.node.id,
			turnStart: index === start,
		});
	}
	const counts = new Map<string, number>();
	for (const row of turns)
		if (row.turnId) counts.set(row.turnId, (counts.get(row.turnId) ?? 0) + 1);
	return turns.map((row) => ({
		...row,
		turnCount: row.turnId ? counts.get(row.turnId) : undefined,
	}));
}
