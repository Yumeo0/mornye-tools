import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { echoKey } from "@/components/echo/EchoCard";
import { EchoUpgradePanel } from "@/components/echo/EchoUpgradePanel";
import { EchoUpgradePickerDialog } from "@/components/echo/EchoUpgradePickerDialog";
import { EchoUpgradeQueueRow } from "@/components/echo/EchoUpgradeQueueRow";
import { computeEchoRolls } from "@/components/echo/echoRolls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { useResponsiveColumns, VirtualGrid } from "@/components/VirtualGrid";
import { type AccountSnapshot, type Echo, useAccount } from "@/lib/account";
import { availableEchoCopies } from "@/lib/echoUpgrade";
import {
	echoUpgradeRows,
	type UpgradeRow,
	upgradeRowKey,
	useEchoUpgradeBatch,
} from "@/lib/echoUpgradeBatch";

const COLUMNS = [
	{ minWidth: 1536, columns: 3 },
	{ minWidth: 1024, columns: 2 },
];

export function EchoUpgraderTab() {
	const { snapshot, error } = useAccount();
	return (
		<EchoUpgraderContent
			key={snapshot.profile?.id ?? "none"}
			snapshot={snapshot}
			error={error}
		/>
	);
}

function EchoUpgraderContent({
	snapshot,
	error,
}: {
	snapshot: AccountSnapshot;
	error: string | null;
}) {
	const batch = useEchoUpgradeBatch();
	const running = batch.phase === "running" || batch.phase === "stopping";
	const [selected, setSelected] = useState<Echo[]>([]);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [showResults, setShowResults] = useState(running);
	const profileId = snapshot.profile?.id ?? null;
	const results = showResults || running;
	const columns = useResponsiveColumns(COLUMNS, 1);
	const currentEchoes = new Map(
		snapshot.echoes.map((echo) => [echo.incrId, echo]),
	);
	const selectedEchoes = availableEchoCopies(selected, snapshot.echoes);
	const rows: UpgradeRow[] = results
		? batch.rows
		: echoUpgradeRows(selectedEchoes);
	const rowEchoes = useMemo(() => rows.map((row) => row.echo), [rows]);
	const rolls = useMemo(() => computeEchoRolls(rowEchoes), [rowEchoes]);
	const activeIndex = running
		? rows.findIndex((row) => row.outcome === "upgrading")
		: -1;
	const queueEchoes = results
		? batch.profileId === profileId
			? availableEchoCopies(
					batch.rows.map((row) => row.echo),
					snapshot.echoes,
				)
			: []
		: selectedEchoes;
	const changeResults = (show: boolean) => {
		if (!show && results) setSelected(queueEchoes);
		setShowResults(show);
	};
	const selectButton = (
		<Button
			variant="outline"
			disabled={running}
			onClick={() => setPickerOpen(true)}
		>
			<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
			Select echoes
		</Button>
	);

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<header className="flex shrink-0 flex-col gap-1">
				<h1 className="text-xl font-semibold tracking-tight">Echo Upgrader</h1>
				<p className="text-xs text-muted-foreground">
					Build your queue and upgrade each echo while its rolls can still reach
					your target.
				</p>
			</header>
			<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto xl:flex-row xl:overflow-hidden">
				<section
					aria-label="Echo upgrade queue"
					className="flex min-h-80 min-w-0 flex-1 flex-col gap-3 xl:min-h-0"
				>
					<div className="flex shrink-0 flex-wrap items-center gap-3">
						<h2 className="text-sm font-medium">
							{results ? "Batch queue" : "Selected echoes"}
						</h2>
						<Badge variant="outline">
							{rows.length} {rows.length === 1 ? "echo" : "echoes"}
						</Badge>
						<div className="ml-auto flex items-center gap-2">
							{rows.length > 0 && (
								<Button
									variant="ghost"
									size="sm"
									disabled={running}
									onClick={() => {
										setSelected([]);
										setShowResults(false);
									}}
								>
									Clear queue
								</Button>
							)}
							{selectButton}
						</div>
					</div>
					<p
						role="status"
						aria-live="polite"
						className="text-xs text-muted-foreground"
					>
						{activeIndex >= 0
							? `Upgrading echo ${activeIndex + 1} of ${rows.length} · ${rows[activeIndex].message}`
							: running
								? "Preparing the next echo…"
								: results
									? "Batch results appear on each echo below."
									: "Each selected copy is upgraded separately, in queue order."}
					</p>
					{rows.length > 0 ? (
						<VirtualGrid
							items={rows}
							columns={columns}
							gap={8}
							estimateRowHeight={340}
							overscan={3}
							getItemKey={upgradeRowKey}
							scrollToIndex={activeIndex}
							className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-1"
							renderItem={(row, index) => (
								<EchoUpgradeQueueRow
									row={row}
									index={index}
									roll={rolls.get(echoKey(row.echo))}
									running={running}
									onRemove={
										running
											? undefined
											: () => {
													setSelected(
														availableEchoCopies(
															rows
																.filter(
																	(entry) =>
																		upgradeRowKey(entry) !== upgradeRowKey(row),
																)
																.map(
																	(entry) =>
																		currentEchoes.get(entry.echo.incrId) ??
																		entry.echo,
																),
															snapshot.echoes,
														),
													);
													setShowResults(false);
												}
									}
								/>
							)}
						/>
					) : (
						<Empty className="border">
							<EmptyHeader>
								<EmptyTitle>Your upgrade queue is empty</EmptyTitle>
								<EmptyDescription>
									Open the echo picker to filter your inventory and choose the
									echoes you want to upgrade.
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>{selectButton}</EmptyContent>
						</Empty>
					)}
					{error && (
						<p role="alert" className="text-xs text-destructive">
							{error}
						</p>
					)}
				</section>
				<EchoUpgradePanel
					echoes={selectedEchoes}
					profileId={profileId}
					showResults={showResults}
					onShowResultsChange={changeResults}
				/>
			</div>
			{pickerOpen && !running && (
				<EchoUpgradePickerDialog
					selected={queueEchoes}
					onClose={() => setPickerOpen(false)}
					onConfirm={(echoes) => {
						setSelected(echoes);
						setShowResults(false);
						setPickerOpen(false);
					}}
				/>
			)}
		</div>
	);
}
