import { expect, test } from "bun:test";
import { progressionRows } from "./groups";

test("progression groups sort by status and category without losing or reordering entries", () => {
	const entries = [
		{ id: 1, category: "B", status: "Completed", order: 1 },
		{ id: 2, category: "B", status: "Incomplete", order: 0 },
		{ id: 3, category: "A", status: "Incomplete", order: 0 },
		{ id: 4, category: "B", status: "Incomplete", order: 0 },
	];
	const groupFor = (entry: (typeof entries)[number]) => ({
		id: `${entry.category}:${entry.status}`,
		title: entry.category,
		status: entry.status,
		order: entry.order,
	});
	const rows = progressionRows(entries, groupFor);
	expect(
		rows
			.filter((row) => row.kind === "header")
			.map((row) => [row.group.title, row.group.status, row.count]),
	).toEqual([
		["A", "Incomplete", 1],
		["B", "Incomplete", 2],
		["B", "Completed", 1],
	]);
	expect(
		rows.filter((row) => row.kind === "entry").map((row) => row.entry.id),
	).toEqual([3, 2, 4, 1]);
	expect(progressionRows([], groupFor)).toEqual([]);
});
