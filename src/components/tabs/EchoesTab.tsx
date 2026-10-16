import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddEchoDialog } from "@/components/echo/AddEchoDialog";
import { echoInfoText, echoKey } from "@/components/echo/EchoCard";
import { EchoFilterBar } from "@/components/echo/EchoFilterBar";
import { EchoInventoryCard } from "@/components/echo/EchoInventoryCard";
import {
	type EchoFilters,
	type EchoSortKey,
	EMPTY_ECHO_FILTERS,
	matchesEchoFilters,
	sortEchoes,
} from "@/components/echo/echoFilters";
import { computeEchoRolls, type EchoRoll } from "@/components/echo/echoRolls";
import {
	characterFilterOptions,
	type FilterOption,
} from "@/components/filters";
import {
	type GridBreakpoint,
	useResponsiveColumns,
	VirtualGrid,
} from "@/components/VirtualGrid";
import { useAccountSnapshot } from "@/hooks/useAccountSnapshot";
import {
	addManualEcho,
	type Echo,
	removeManualEcho,
	setEquippedOverride,
} from "@/lib/account";

// Mirrors the previous `sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4` classes
// (the virtualized grid needs the column count in JS).
const ECHO_GRID_BREAKPOINTS: readonly GridBreakpoint[] = [
	{ minWidth: 1536, columns: 4 },
	{ minWidth: 1280, columns: 3 },
	{ minWidth: 640, columns: 2 },
];
const ECHO_GRID_FALLBACK_COLUMNS = 1;
const ECHO_GRID_GAP = 8; // gap-2
// Initial row estimate, also used as the uniform minimum row height until a
// taller row reports its real size.
const ECHO_ROW_ESTIMATE_PX = 280;
// Rows rendered beyond the viewport. Cards are cheap to mount and their icons
// are cached, so a deep buffer costs little and keeps a fast scroll from
// flashing blank rows while React catches up with it.
const ECHO_ROW_OVERSCAN = 6;

export function EchoesTab() {
	const { snapshot, error } = useAccountSnapshot();
	const echoes = snapshot.echoes;
	const [actionError, setActionError] = useState<string | null>(null);
	const [toast, setToast] = useState<string | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showToast = useCallback((message: string) => {
		setToast(message);
		if (toastTimer.current) clearTimeout(toastTimer.current);
		toastTimer.current = setTimeout(() => setToast(null), 1600);
	}, []);

	useEffect(
		() => () => {
			if (toastTimer.current) clearTimeout(toastTimer.current);
		},
		[],
	);

	const copyEchoInfo = useCallback(
		(echo: Echo, roll?: EchoRoll) => {
			navigator.clipboard
				.writeText(echoInfoText(echo, roll))
				.then(() => showToast("Echo info copied"))
				.catch((error) => {
					console.error("Copy failed:", error);
					setActionError(String(error));
				});
		},
		[showToast],
	);

	const addEcho = useCallback(
		async (echo: Echo) => {
			try {
				await addManualEcho(echo);
				setAddOpen(false);
				showToast("Echo added");
			} catch (error) {
				console.error("Add echo failed:", error);
				setActionError(String(error));
			}
		},
		[showToast],
	);

	const removeEcho = useCallback(
		async (incrId: number) => {
			try {
				await removeManualEcho(incrId);
				showToast("Manual echo removed");
			} catch (error) {
				console.error("Remove echo failed:", error);
				setActionError(String(error));
			}
		},
		[showToast],
	);

	const [filters, setFilters] = useState<EchoFilters>(EMPTY_ECHO_FILTERS);
	const [sortBy, setSortBy] = useState<EchoSortKey>("none");
	const [sortAsc, setSortAsc] = useState(false);

	const characterOptions: FilterOption[] = useMemo(
		() => characterFilterOptions(snapshot.resonators),
		[snapshot.resonators],
	);

	const filteredEchoes = echoes.filter((echo) =>
		matchesEchoFilters(echo, filters),
	);

	const rollByEcho = useMemo(() => computeEchoRolls(echoes), [echoes]);
	const sortedEchoes = useMemo(
		() =>
			sortEchoes(
				filteredEchoes,
				sortBy,
				sortAsc,
				(echo) => rollByEcho.get(echoKey(echo))?.rating ?? 0,
			),
		[filteredEchoes, sortBy, sortAsc, rollByEcho],
	);

	const changeEquippedBy = useCallback(async (echo: Echo, value: string) => {
		try {
			if (value === "unequipped") {
				await setEquippedOverride(echo.incrId, null, null);
			} else {
				await setEquippedOverride(
					echo.incrId,
					Number(value),
					echo.slot ?? null,
				);
			}
			// `account_set_equipped_override` emits `account-updated`, so the
			// hook refreshes without an explicit refetch.
		} catch (e) {
			setActionError(String(e));
		}
	}, []);

	const getEchoKey = useCallback((echo: Echo) => String(echo.incrId), []);

	const renderEcho = useCallback(
		(echo: Echo, index: number) => (
			<EchoInventoryCard
				key={`${echoKey(echo)}-${index}`}
				echo={echo}
				roll={rollByEcho.get(echoKey(echo))}
				characterOptions={characterOptions}
				onChangeEquipped={changeEquippedBy}
				onCopyInfo={copyEchoInfo}
				onRemove={removeEcho}
			/>
		),
		[rollByEcho, characterOptions, changeEquippedBy, copyEchoInfo, removeEcho],
	);

	const gridColumns = useResponsiveColumns(
		ECHO_GRID_BREAKPOINTS,
		ECHO_GRID_FALLBACK_COLUMNS,
	);

	// All echo cards share one height (`auto-rows-fr`-style): the tallest row
	// seen so far sets the uniform minimum, and rows taller than that raise it
	// for every row at once.
	const [echoRowHeight, setEchoRowHeight] = useState(ECHO_ROW_ESTIMATE_PX);
	const handleMeasuredRowHeight = useCallback((height: number) => {
		setEchoRowHeight((current) => (height > current ? height : current));
	}, []);

	if (echoes.length === 0) {
		return (
			<p className="py-8 text-center text-sm text-muted-foreground">
				No echoes captured yet. Open the Echo inventory once while the sniffer
				is running; the capture fills this list automatically.
			</p>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<EchoFilterBar
				filters={filters}
				onFiltersChange={setFilters}
				sortBy={sortBy}
				sortAsc={sortAsc}
				onSortChange={(key, asc) => {
					setSortBy(key);
					setSortAsc(asc);
				}}
				resultCount={filteredEchoes.length}
				totalCount={echoes.length}
				characterOptions={characterOptions}
				onAddEcho={() => setAddOpen(true)}
			/>

			{filteredEchoes.length === 0 ? (
				<div className="min-h-0 flex-1 overflow-y-auto pr-1">
					<p className="py-8 text-center text-sm text-muted-foreground">
						No echoes match the current filters.
					</p>
				</div>
			) : (
				<VirtualGrid
					items={sortedEchoes}
					columns={gridColumns}
					gap={ECHO_GRID_GAP}
					estimateRowHeight={echoRowHeight}
					minRowHeight={echoRowHeight}
					overscan={ECHO_ROW_OVERSCAN}
					onMeasuredRowHeight={handleMeasuredRowHeight}
					getItemKey={getEchoKey}
					renderItem={renderEcho}
					className="min-h-0 flex-1 overflow-y-auto pr-1"
				/>
			)}

			{addOpen && (
				<AddEchoDialog onClose={() => setAddOpen(false)} onAdded={addEcho} />
			)}

			{toast && (
				<div className="bg-popover text-popover-foreground pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 border px-3 py-1.5 text-xs shadow-md">
					{toast}
				</div>
			)}

			{(error ?? actionError) && (
				<p className="text-sm text-destructive">{error ?? actionError}</p>
			)}
		</div>
	);
}
