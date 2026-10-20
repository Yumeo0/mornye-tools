import {
	isQuestStatusVisible,
	type QuestStatusRow,
} from "@/lib/progression/state";
import type { QuestStatus } from "@/lib/progression/types";
import { cn } from "@/lib/utils";

export function QuestFilters({
	rows,
	overrides,
	synced,
	error,
	onStatusChange,
}: {
	rows: QuestStatusRow[];
	overrides: Record<string, boolean>;
	synced: boolean;
	error: string | null;
	onStatusChange: (statuses: QuestStatus[], visible: boolean) => void;
}) {
	const visibleCount = rows.filter((row) =>
		isQuestStatusVisible(overrides, row.status),
	).length;
	const total = rows.reduce((sum, row) => sum + row.total, 0);
	return (
		<section aria-label="Side quest filters" className="flex flex-col">
			<h2 className="border-t px-4 pb-1 pt-3 text-[10px] tracking-[.15em] text-muted-foreground">
				SIDE QUESTS
			</h2>
			{rows.length > 0 ? (
				<label className="flex cursor-pointer items-center gap-2 border-b border-t px-2.5 py-1.5 text-[10px] tracking-[.1em] text-muted-foreground hover:bg-muted/50">
					<input
						type="checkbox"
						className="accent-primary"
						checked={visibleCount === rows.length}
						ref={(element) => {
							if (element)
								element.indeterminate =
									visibleCount > 0 && visibleCount < rows.length;
						}}
						onChange={(event) =>
							onStatusChange(
								rows.map((row) => row.status),
								event.target.checked,
							)
						}
					/>
					<span className="min-w-0 flex-1 truncate">Side quests</span>
					<span className="tabular-nums">{total.toLocaleString()}</span>
				</label>
			) : (
				<p className="px-2.5 py-1.5 text-[10px] text-muted-foreground">
					No side quests on this map.
				</p>
			)}
			{rows.map((row) => {
				const visible = isQuestStatusVisible(overrides, row.status);
				return (
					<label
						key={row.status}
						className="flex cursor-pointer items-center gap-2 py-1 pl-5 pr-2.5 text-[11px] hover:bg-muted/50"
					>
						<input
							type="checkbox"
							className="accent-primary"
							checked={visible}
							onChange={(event) =>
								onStatusChange([row.status], event.target.checked)
							}
						/>
						<img
							src={row.icon}
							alt=""
							className={cn(
								"size-5 shrink-0 object-contain",
								!visible && "opacity-40",
							)}
						/>
						<span className="min-w-0 flex-1 truncate">{row.label}</span>
						<span className="text-[10px] text-muted-foreground tabular-nums">
							{row.total.toLocaleString()}
						</span>
					</label>
				);
			})}
			{!synced && (
				<p className="px-2.5 py-1 text-[10px] text-muted-foreground">
					Waiting for quest status from login.
				</p>
			)}
			{error && (
				<p className="px-2.5 py-1 text-[10px] text-destructive">{error}</p>
			)}
		</section>
	);
}
