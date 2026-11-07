import { expect, test } from "bun:test";
import type { RewardMarker } from "./filters";
import { rewardsInBox } from "./selection";

const item = (key: string, kind = "chest") =>
	({ reward: { key, kind }, state: "remaining" }) as RewardMarker;

test("box selects entire visible stacks, excludes resources and works in every drag direction", () => {
	const groups = [
		{
			x: 10,
			y: 20,
			items: [
				item("a"),
				item("b"),
				item("resource", "collection"),
				item("nest", "combat"),
			],
		},
		{ x: 30, y: 40, items: [item("boundary")] },
		{ x: 31, y: 40, items: [item("outside")] },
	];
	for (const [start, end] of [
		[
			{ x: 10, y: 20 },
			{ x: 30, y: 40 },
		],
		[
			{ x: 30, y: 40 },
			{ x: 10, y: 20 },
		],
		[
			{ x: 10, y: 40 },
			{ x: 30, y: 20 },
		],
		[
			{ x: 30, y: 20 },
			{ x: 10, y: 40 },
		],
	]) {
		expect(
			rewardsInBox(groups, start, end).map((reward) => reward.key),
		).toEqual(["a", "b", "boundary"]);
	}
	expect(rewardsInBox(groups, { x: 100, y: 100 }, { x: 200, y: 200 })).toEqual(
		[],
	);
});
