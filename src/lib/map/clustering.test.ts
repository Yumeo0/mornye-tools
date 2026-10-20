import { describe, expect, test } from "bun:test";
import { clusterMarkers, clusterZoomLevel } from "./clustering";

const marker = (key: string, x: number, y: number) => ({
	reward: { key, x, y },
});
const members = (groups: ReturnType<typeof clusterMarkers>) =>
	groups.map((g) => g.items.map((i) => i.reward.key));

describe("stable reward clusters", () => {
	test("nearby rewards across grid boundaries group, including negative coordinates", () => {
		const points = [
			marker("a", -1, -1),
			marker("b", 1, 1),
			marker("c", 33, 0),
			marker("d", 500, 500),
		];
		expect(members(clusterMarkers(points, 0))).toEqual([
			["a", "b"],
			["c"],
			["d"],
		]);
		expect(members(clusterMarkers([...points].reverse(), 0))).toEqual(
			members(clusterMarkers(points, 0)),
		);
	});
	test("viewport clipping cannot split a cluster because membership uses the full map", () => {
		const groups = clusterMarkers(
			[marker("a", 0, 0), marker("b", 25, 0), marker("c", 100, 0)],
			0,
		);
		const inView = (cameraX: number) =>
			groups.filter((g) => Math.abs(g.x - cameraX) < 40);
		expect(members(inView(-10))).toEqual([["a", "b"]]);
		expect(members(inView(40))).toEqual([["a", "b"]]);
	});
	test("small zoom reversals keep membership; significant zoom separates close rewards", () => {
		expect(clusterZoomLevel(1.5 ** 0.69, 0)).toBe(0);
		const next = clusterZoomLevel(1.5 ** 0.71, 0);
		expect(next).toBe(1);
		expect(clusterZoomLevel(1.5 ** 0.5, next)).toBe(1);
		expect(clusterZoomLevel(1.5 ** 0.29, next)).toBe(0);
		const points = [marker("a", 0, 0), marker("b", 30, 0)];
		expect(clusterMarkers(points, 0)).toHaveLength(1);
		expect(clusterMarkers(points, 1)).toHaveLength(2);
	});
	test("coincident rewards stay selectable at maximum zoom and every item occurs once", () => {
		const points = [
			marker("a", 10, 10),
			marker("b", 10, 10),
			marker("c", 5000, 5000),
		];
		const groups = clusterMarkers(points, clusterZoomLevel(0.08));
		expect(members(groups)).toEqual([["a", "b"], ["c"]]);
		expect(groups.flatMap((g) => g.items)).toHaveLength(points.length);
	});
});
