// Virtualized responsive grid. Rows of `columns` items are chunked up front
// and only the rows intersecting the scroll viewport (plus overscan) are
// mounted, which keeps large collections (1000+ cards) cheap to render.
//
// The layout classes that used to drive the grid (`grid gap-2 sm:grid-cols-2
// …`) cannot be used here because row chunking needs the column count in JS.
// `useResponsiveColumns` mirrors the Tailwind breakpoints and each virtual row
// renders its own grid with the same column widths and gap.
//
// `minRowHeight` replaces the old `auto-rows-fr` equal-height effect: every
// row is at least that tall, and taller rows report their height through
// `onMeasuredRowHeight` so the caller can raise the shared minimum. Row
// heights are measured dynamically, and whenever the row layout changes every
// cached measurement is invalidated: mounted rows re-report their size while
// the rest fall back to `estimateRowHeight` until they scroll into range.

import { useVirtualizer } from "@tanstack/react-virtual";
import {
	type Key,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

export interface GridBreakpoint {
	/** Matches Tailwind's `min-width` breakpoints in px. */
	minWidth: number;
	columns: number;
}

/** Pure row chunking; exported for tests. */
export function chunkIntoRows<T>(items: readonly T[], columns: number): T[][] {
	if (columns < 1) throw new Error("columns must be at least 1");
	const rows: T[][] = [];
	for (let index = 0; index < items.length; index += columns) {
		rows.push(items.slice(index, index + columns));
	}
	return rows;
}

/** Column count for the current viewport; exported for tests. */
export function columnsForViewport(
	rules: readonly GridBreakpoint[],
	fallback: number,
): number {
	for (const rule of rules) {
		if (window.matchMedia(`(min-width: ${rule.minWidth}px)`).matches) {
			return rule.columns;
		}
	}
	return fallback;
}

/**
 * Column count that follows viewport breakpoints the same way the Tailwind
 * `sm:`/`xl:`/… classes used to. `rules` must be a stable (module-level)
 * array so the change listeners are not re-subscribed on every render.
 */
export function useResponsiveColumns(
	rules: readonly GridBreakpoint[],
	fallback: number,
): number {
	const [columns, setColumns] = useState(() =>
		columnsForViewport(rules, fallback),
	);

	useEffect(() => {
		const update = () => setColumns(columnsForViewport(rules, fallback));
		const queries = rules.map((rule) =>
			window.matchMedia(`(min-width: ${rule.minWidth}px)`),
		);
		for (const query of queries) query.addEventListener("change", update);
		// Re-sync in case the viewport changed between render and effect.
		update();
		return () => {
			for (const query of queries) query.removeEventListener("change", update);
		};
	}, [rules, fallback]);

	return columns;
}

export interface VirtualGridProps<T> {
	items: readonly T[];
	renderItem: (item: T, index: number) => ReactNode;
	/** Column count, e.g. from `useResponsiveColumns`. */
	columns: number;
	/** Card gap in px (matches the previous `gap-*` class). */
	gap: number;
	/** Row height in px used until a row has been measured. */
	estimateRowHeight: number | (() => number);
	/**
	 * Uniform minimum row height in px: every row is at least this tall so all
	 * cards line up (like the old `auto-rows-fr` grid). A row whose content is
	 * taller still grows — `onMeasuredRowHeight` reports it so the caller can
	 * raise the minimum for every row at once.
	 */
	minRowHeight?: number;
	/** Height of a rendered row, reported on mount (natural or minimum). */
	onMeasuredRowHeight?: (height: number) => void;
	/** Stable per-item key; rows key off their first item. */
	getItemKey: (item: T, index: number) => Key;
	overscan?: number;
	/** Classes for the scroll container (sizing/overflow), e.g.
	 * `min-h-0 flex-1 overflow-y-auto pr-1`. */
	className?: string;
}

export function VirtualGrid<T>({
	items,
	renderItem,
	columns,
	gap,
	estimateRowHeight,
	minRowHeight,
	onMeasuredRowHeight,
	getItemKey,
	overscan = 2,
	className,
}: VirtualGridProps<T>) {
	const scrollRef = useRef<HTMLDivElement>(null);

	const rows = useMemo(() => {
		const chunked = chunkIntoRows(items, columns);
		return chunked.map((row, rowIndex) => ({
			row,
			// Global index of the row's first item; children derive theirs
			// from this so React keys stay stable for a given layout.
			firstIndex: rowIndex * columns,
			// Column count and length are part of the key so a layout change
			// invalidates cached measurements even when the first item does
			// not change.
			key: `${columns}|${getItemKey(row[0], rowIndex * columns)}|${row.length}`,
		}));
	}, [items, columns, getItemKey]);

	const estimateSize = useMemo(
		() =>
			typeof estimateRowHeight === "function"
				? estimateRowHeight
				: () => estimateRowHeight,
		[estimateRowHeight],
	);

	const virtualizer = useVirtualizer({
		count: rows.length,
		estimateSize,
		getScrollElement: () => scrollRef.current,
		getItemKey: useCallback(
			(index: number) => rows[index]?.key ?? String(index),
			[rows],
		),
		overscan,
		gap,
	});

	// Report each rendered row's height so the caller can keep the uniform
	// minimum in sync. `getBoundingClientRect` (not `offsetHeight`) keeps this
	// correct even while the list is mid-transform.
	const onMeasuredRowHeightRef = useRef(onMeasuredRowHeight);
	onMeasuredRowHeightRef.current = onMeasuredRowHeight;

	// Row keys embed the column count and `setOptions` bumps the size-cache
	// version whenever edge keys change, so measurements collected under a
	// different chunking are dropped automatically. Mounted rows re-measure
	// immediately; the rest wait until they scroll into range.

	const measureRef = useCallback(
		(node: HTMLDivElement | null) => {
			virtualizer.measureElement(node);
			if (node) {
				onMeasuredRowHeightRef.current?.(node.getBoundingClientRect().height);
			}
		},
		[virtualizer],
	);

	const virtualRowMinHeight =
		minRowHeight == null ? undefined : `${minRowHeight}px`;

	return (
		<div ref={scrollRef} className={className}>
			<div
				className="relative w-full"
				style={{ height: virtualizer.getTotalSize() }}
			>
				{virtualizer.getVirtualItems().map((virtualRow) => {
					const { row, firstIndex } = rows[virtualRow.index];
					return (
						<div
							key={virtualRow.key}
							data-index={virtualRow.index}
							ref={measureRef}
							className="absolute top-0 left-0 flex w-full flex-col"
							style={{
								transform: `translateY(${virtualRow.start}px)`,
								minHeight: virtualRowMinHeight,
							}}
						>
							<div
								className="grid flex-1"
								style={{
									gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
									gap,
								}}
							>
								{row.map((item, offset) =>
									renderItem(item, firstIndex + offset),
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
