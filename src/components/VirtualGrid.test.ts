// Row chunking for the virtualized grids; a wrong chunk size would reorder
// cards or leave holes in rows, so the mapping is pinned here.

import { describe, expect, test } from "bun:test";

import { chunkIntoRows } from "@/components/VirtualGrid";

describe("chunkIntoRows", () => {
	test("splits items into full rows and one partial row", () => {
		expect(chunkIntoRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
	});

	test("fills a single row when the column count exceeds the length", () => {
		expect(chunkIntoRows([1, 2], 4)).toEqual([[1, 2]]);
	});

	test("returns no rows for an empty list", () => {
		expect(chunkIntoRows([], 3)).toEqual([]);
	});

	test("keeps a full last row whole", () => {
		expect(chunkIntoRows([1, 2, 3, 4], 2)).toEqual([
			[1, 2],
			[3, 4],
		]);
	});

	test("rejects a zero or negative column count", () => {
		expect(() => chunkIntoRows([1], 0)).toThrow();
		expect(() => chunkIntoRows([1], -1)).toThrow();
	});
});
