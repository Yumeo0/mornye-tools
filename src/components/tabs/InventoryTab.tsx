import { PackageIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo } from "react";
import { z } from "zod";
import {
	FilterLayout,
	FilterPanel,
	FilterSearch,
	FilterSummary,
	SortButtons,
} from "@/components/filters";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { useResponsiveColumns, VirtualGrid } from "@/components/VirtualGrid";
import { useAccount } from "@/lib/account";
import {
	fixedCurrencyIds,
	type InventoryItem,
	inventoryCategoryIcons,
	inventoryCurrencies,
	inventoryItems,
} from "@/lib/inventory";
import { useFilterState } from "@/lib/persistentState";
import { qualityGradient } from "@/lib/rarity";

const COLUMNS = [
	{ minWidth: 1536, columns: 7 },
	{ minWidth: 1280, columns: 6 },
	{ minWidth: 1024, columns: 5 },
	{ minWidth: 768, columns: 4 },
];
const SORT_OPTIONS = [
	{ value: "name", label: "Name", desc: false },
	{ value: "count", label: "Count", desc: true },
	{ value: "rarity", label: "Rarity", desc: true },
	{ value: "id", label: "ID", desc: false },
] as const;
const sortSchema = z.enum(["name", "count", "rarity", "id"]);
const itemKey = (item: InventoryItem) => item.id;

function ItemCard({ item }: { item: InventoryItem }) {
	return (
		<Card
			className="relative isolate h-full min-h-44 gap-0 py-0"
			role="article"
			aria-label={`${item.name}, ${item.count.toLocaleString()} owned`}
		>
			{item.rarity > 0 && (
				<img
					src={qualityGradient(item.rarity)}
					alt=""
					className="pointer-events-none absolute inset-0 size-full object-cover"
				/>
			)}
			<CardHeader className="relative flex justify-end p-2">
				<span className="bg-background/80 px-1.5 py-0.5 font-medium tabular-nums">
					{item.count.toLocaleString()}
				</span>
			</CardHeader>
			<CardContent className="relative flex min-h-24 flex-1 items-center justify-center px-3">
				{item.icon ? (
					<img
						src={item.icon}
						alt=""
						loading="lazy"
						className="size-24 object-contain"
					/>
				) : (
					<HugeiconsIcon
						icon={PackageIcon}
						className="size-10 text-muted-foreground"
					/>
				)}
			</CardContent>
			<CardFooter className="relative justify-center border-0 px-2 pb-3 pt-2">
				<CardTitle className="text-center text-balance">{item.name}</CardTitle>
			</CardFooter>
		</Card>
	);
}

export function InventoryTab() {
	const { snapshot, error } = useAccount();
	const columns = useResponsiveColumns(COLUMNS, 3);
	const [search, setSearch] = useFilterState("inventory.search", "");
	const [savedCategory, setCategory] = useFilterState(
		"inventory.category",
		"any",
	);
	const category = savedCategory === "Currencies" ? "any" : savedCategory;
	const [sort, setSort] = useFilterState<z.infer<typeof sortSchema>>(
		"inventory.sort",
		"name",
		sortSchema,
	);
	const [desc, setDesc] = useFilterState("inventory.desc", false);
	const items = useMemo(
		() =>
			inventoryItems(snapshot.inventory ?? []).filter(
				(item) => !fixedCurrencyIds.has(item.id),
			),
		[snapshot.inventory],
	);
	const currencies = useMemo(
		() => inventoryCurrencies(snapshot.inventory ?? []),
		[snapshot.inventory],
	);
	const categories = useMemo(() => {
		const counts = new Map<string, number>();
		for (const item of items) {
			if (item.category !== "Currencies")
				counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
		}
		return [
			{
				value: "any",
				label: "All items",
				icon: "/icons/navigation/inventory.webp",
				count: items.length,
			},
			...[...counts]
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([label, count]) => ({
					value: label,
					label,
					count,
					icon:
						inventoryCategoryIcons.get(label) ??
						"/icons/navigation/inventory.webp",
				})),
		];
	}, [items]);
	const filtered = useMemo(() => {
		const query = search.trim().toLocaleLowerCase();
		return items
			.filter(
				(item) =>
					(category === "any" || item.category === category) &&
					(!query ||
						`${item.name} ${item.id}`.toLocaleLowerCase().includes(query)),
			)
			.sort((a, b) => {
				const comparison =
					sort === "name" ? a.name.localeCompare(b.name) : a[sort] - b[sort];
				return (desc ? -comparison : comparison) || a.id - b.id;
			});
	}, [items, search, category, sort, desc]);
	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<FilterLayout
				filters={
					<FilterPanel
						label="Inventory filters"
						activeFilters={[
							...(search
								? [
										{
											label: `Search: ${search}`,
											onRemove: () => setSearch(""),
										},
									]
								: []),
							...(category !== "any"
								? [{ label: category, onRemove: () => setCategory("any") }]
								: []),
						]}
					>
						<FilterSearch
							value={search}
							onChange={setSearch}
							placeholder="Item name or ID…"
							inputProps={{ "aria-label": "Search inventory" }}
						/>
						<nav
							aria-label="Inventory categories"
							className="flex min-w-0 flex-col gap-1"
						>
							{categories.map((entry) => (
								<Button
									key={entry.value}
									variant={category === entry.value ? "secondary" : "ghost"}
									aria-pressed={category === entry.value}
									onClick={() => setCategory(entry.value)}
									className="h-auto w-full justify-start gap-2 px-2 py-1.5"
									title={entry.label}
								>
									<img
										src={entry.icon}
										alt=""
										className="size-6 shrink-0 object-contain"
									/>
									<span className="min-w-0 flex-1 truncate text-left">
										{entry.label}
									</span>
									<span className="text-xs text-muted-foreground tabular-nums">
										{entry.count.toLocaleString()}
									</span>
								</Button>
							))}
						</nav>
						<SortButtons
							options={SORT_OPTIONS}
							value={sort}
							desc={desc}
							onChange={(value, descending) => {
								setSort(value);
								setDesc(descending);
							}}
						/>
						<FilterSummary
							label={`${filtered.length.toLocaleString()} / ${items.length.toLocaleString()} items`}
							onReset={
								search || category !== "any" || sort !== "name" || desc
									? () => {
											setSearch("");
											setCategory("any");
											setSort("name");
											setDesc(false);
										}
									: undefined
							}
						/>
					</FilterPanel>
				}
			>
				<ul
					aria-label="Currencies"
					className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b bg-background px-2 py-2"
				>
					{currencies.map((item) => (
						<li
							key={item.id}
							title={item.name}
							className="flex items-center gap-1.5"
						>
							{item.icon && (
								<img src={item.icon} alt="" className="size-6 object-contain" />
							)}
							<span className="sr-only">{item.name}: </span>
							<span className="text-sm tabular-nums">
								{snapshot.inventory ? item.count.toLocaleString() : "—"}
							</span>
						</li>
					))}
				</ul>
				{filtered.length ? (
					<VirtualGrid
						items={filtered}
						columns={columns}
						minItemWidth={150}
						gap={12}
						estimateRowHeight={176}
						getItemKey={itemKey}
						renderItem={(item) => <ItemCard item={item} />}
						className="min-h-0 flex-1 overflow-y-auto pr-1"
					/>
				) : (
					<Empty>
						<EmptyHeader>
							<EmptyTitle>
								{items.length ? "No matching items" : "No items captured yet"}
							</EmptyTitle>
							<EmptyDescription>
								{items.length
									? "Try a different name, ID, or category."
									: "Open the in-game inventory while capture is running, or connect this profile to synchronize its items."}
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}
			</FilterLayout>
		</div>
	);
}
