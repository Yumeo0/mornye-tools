import type { OptResultEntry } from "@wuwacalc/core/engine/optimizer/types";
import { useMemo } from "react";
import { ResultRow } from "@/components/optimizer/ResultRow";
import type { OptimizerBaseline } from "@/hooks/useOptimizerRun";
import type { Echo } from "@/lib/account";

// Result rows with the equipped build merged in at its ranked position.
type ResultRowModel =
	| { kind: "baseline" }
	| { kind: "result"; result: OptResultEntry; index: number };

/** Search results list; the equipped build is highlighted at its rank. */
export function OptimizerResultsPanel({
	results,
	baseline,
	running,
	expandedIndex,
	onExpandedChange,
	echoByUid,
	title = "Results",
	runningText = "Searching the captured inventory…",
	idleText = "Pick a target, team and rotation, then run the optimizer.",
}: {
	results: OptResultEntry[];
	baseline: OptimizerBaseline | null;
	running: boolean;
	expandedIndex: number | "baseline" | null;
	onExpandedChange: (index: number | "baseline" | null) => void;
	echoByUid: Map<string, Echo>;
	/** Panel heading; team mode names the measured rotation. */
	title?: string;
	runningText?: string;
	idleText?: string;
}) {
	const rows = useMemo<ResultRowModel[]>(() => {
		if (!baseline) {
			return results.map((result, index) => ({
				kind: "result",
				result,
				index,
			}));
		}
		const insertAt = results.findIndex(
			(entry) => entry.damage < baseline.damage,
		);
		const position = insertAt === -1 ? results.length : insertAt;
		const models: ResultRowModel[] = [];
		for (let index = 0; index < results.length; index += 1) {
			if (index === position) models.push({ kind: "baseline" });
			models.push({ kind: "result", result: results[index], index });
		}
		if (position === results.length) models.push({ kind: "baseline" });
		return models;
	}, [results, baseline]);

	return (
		<section className="bg-card text-card-foreground ring-foreground/10 flex min-h-40 flex-1 flex-col ring-1">
			<header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
				<h3 className="text-sm font-medium">{title}</h3>
			</header>
			{rows.length === 0 ? (
				<p className="px-3 py-6 text-center text-[11px] text-muted-foreground">
					{running ? runningText : idleText}
				</p>
			) : (
				<div className="min-h-0 flex-1 overflow-y-auto pr-1">
					{rows.map((row) =>
						row.kind === "baseline" && baseline ? (
							<ResultRow
								key="baseline"
								index={0}
								current
								result={{
									uids: baseline.uids,
									damage: baseline.damage,
									stats: baseline.stats,
								}}
								baseline={null}
								expanded={expandedIndex === "baseline"}
								onToggle={() =>
									onExpandedChange(
										expandedIndex === "baseline" ? null : "baseline",
									)
								}
								echoByUid={echoByUid}
							/>
						) : row.kind === "result" ? (
							<ResultRow
								key={row.index}
								index={row.index}
								result={row.result}
								baseline={baseline?.damage ?? null}
								expanded={expandedIndex === row.index}
								onToggle={() =>
									onExpandedChange(
										expandedIndex === row.index ? null : row.index,
									)
								}
								echoByUid={echoByUid}
							/>
						) : null,
					)}
				</div>
			)}
		</section>
	);
}
