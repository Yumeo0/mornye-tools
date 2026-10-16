import { describe, expect, test } from "bun:test";

import { sortByKey } from "@/lib/sorting";

interface Item {
	name: string;
	value: number;
	unequipped?: boolean;
}

const items: Item[] = [
	{ name: "b", value: 2 },
	{ name: "a", value: 1, unequipped: true },
	{ name: "c", value: 3 },
];

const byValue = (_key: string, a: Item, b: Item) => a.value - b.value;

describe("sortByKey", () => {
	test("none keeps the capture order; ascending reverses it", () => {
		expect(sortByKey(items, "none", false, byValue)).toEqual(items);
		expect(sortByKey(items, "none", true, byValue)).toEqual(
			[...items].reverse(),
		);
	});

	test("ascending and descending flip the comparator", () => {
		expect(sortByKey(items, "value", true, byValue).map((i) => i.name)).toEqual(
			["a", "b", "c"],
		);
		expect(
			sortByKey(items, "value", false, byValue).map((i) => i.name),
		).toEqual(["c", "b", "a"]);
	});

	test("bottom items sink to the bottom in both directions", () => {
		const isBottom = (item: Item) => item.unequipped === true;
		for (const asc of [true, false]) {
			const names = sortByKey(items, "value", asc, byValue, isBottom).map(
				(i) => i.name,
			);
			expect(names.at(-1)).toBe("a");
		}
	});

	test("does not mutate the input", () => {
		const input = [...items];
		sortByKey(input, "value", true, byValue);
		expect(input).toEqual(items);
	});
});
