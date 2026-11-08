import { describe, expect, test } from "bun:test";
import {
	FIXED_CURRENCY_IDS,
	inventoryCategoryIcons,
	inventoryCurrencies,
	inventoryDefinitions,
	inventoryItems,
} from "./inventory";

describe("captured inventory", () => {
	test("fixed currencies keep their order, exact balances, and zero balances", () => {
		const currencies = inventoryCurrencies([
			{ id: 50002, count: 7 },
			{ id: 2, count: 1234567 },
		]);
		expect(currencies.map((item) => item.id)).toEqual(FIXED_CURRENCY_IDS);
		expect(currencies.find((item) => item.id === 2)?.count).toBe(1234567);
		expect(currencies.find((item) => item.id === 50002)?.count).toBe(7);
		expect(currencies.find((item) => item.id === 50001)?.count).toBe(0);
		expect(currencies.filter((item) => !item.icon)).toEqual([]);
	});
	test("every quest item and category has published artwork", () => {
		const quests = [...inventoryDefinitions.values()].filter(
			(item) => item.category === "Quest Items",
		);
		expect(quests.length).toBeGreaterThan(0);
		expect(quests.filter((item) => !item.icon).map((item) => item.id)).toEqual(
			[],
		);
		expect([...inventoryCategoryIcons].filter(([, icon]) => !icon)).toEqual([]);
	});
	test("resolves upgrade resources without changing exact server counts", () => {
		const items = inventoryItems([
			{ id: 2, count: 1234567 },
			{ id: 36000014, count: 37 },
		]);
		expect(items[0]).toMatchObject({
			id: 2,
			name: "Shell Credit",
			count: 1234567,
		});
		expect(items[1]).toMatchObject({
			id: 36000014,
			name: "Premium Tuner",
			count: 37,
		});
		expect(items.every((item) => item.icon?.endsWith(".webp"))).toBe(true);
	});
	test("keeps unknown and zero-count items visible", () => {
		expect(
			inventoryItems([
				{ id: 999999999, count: 42 },
				{ id: 36000001, count: 0 },
			]),
		).toMatchObject([
			{ id: 999999999, name: "Item 999999999", icon: null, count: 42 },
			{ id: 36000001, count: 0 },
		]);
	});
});
