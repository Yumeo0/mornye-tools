import categories from "@/configs/inventory_categories.json";
import catalog from "@/configs/inventory_data.json";

export interface InventoryItem {
	id: number;
	name: string;
	count: number;
	rarity: number;
	category: string;
	icon: string | null;
}

export const inventoryDefinitions = new Map(
	catalog.map((item) => [item.id, item]),
);

export const inventoryCategoryIcons = new Map(
	categories.map((category) => [category.name, category.icon]),
);

/** Always visible, independent of item filters and owned quantity. */
export const FIXED_CURRENCY_IDS = [2, 3, 4, 50002, 50001, 50005, 50004, 50003];
export const fixedCurrencyIds = new Set(FIXED_CURRENCY_IDS);

export function inventoryCurrencies(
	rows: { id: number; count: number }[],
): InventoryItem[] {
	const counts = new Map(rows.map((item) => [item.id, item.count]));
	return inventoryItems(
		FIXED_CURRENCY_IDS.map((id) => ({ id, count: counts.get(id) ?? 0 })),
	);
}

/** Keep every captured row, including unknown items and authoritative zero counts. */
export function inventoryItems(
	rows: { id: number; count: number }[],
): InventoryItem[] {
	return rows.map((row) => ({
		name: `Item ${row.id}`,
		rarity: 0,
		category: "Other",
		icon: null,
		...inventoryDefinitions.get(row.id),
		...row,
	}));
}
