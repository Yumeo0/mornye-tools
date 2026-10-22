import type { OptPrgr } from "@wuwacalc/core/engine/optimizer/types";
import { Play, Square } from "lucide-react";
import { formatMs } from "@/components/optimizer/display";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";

/** Search objective and run/cancel button with progress. */
export function OptimizerRunBar({
	mode,
	onModeChange,
	running,
	phase,
	progress,
	progressPercent,
	canRun,
	onRun,
	onCancel,
}: {
	/** Search objective: the target's own damage or a teammate's rotation. */
	mode: "damage" | "team";
	onModeChange: (mode: "damage" | "team") => void;
	running: boolean;
	phase: "baseline" | "search" | "team" | "stats" | null;
	progress: OptPrgr | null;
	progressPercent: number;
	canRun: boolean;
	onRun: () => void;
	onCancel: () => void;
}) {
	const teamMode = mode === "team";
	const phaseLabel =
		phase === "baseline"
			? teamMode
				? "Scoring the equipped support build…"
				: "Evaluating the current build…"
			: phase === "stats"
				? "Reading the searched character's stats…"
				: progress
					? `${progressPercent}% · ${Math.round(progress.processed).toLocaleString()}${
							progress.total != null
								? ` / ${progress.total.toLocaleString()}`
								: ""
						} builds · ${formatMs(progress.elapsedMs)} elapsed · ~${formatMs(
							progress.remainingMs,
						)} left`
					: teamMode
						? "Preparing the team search…"
						: "Preparing search…";

	return (
		<>
			<div className="flex flex-wrap items-end gap-4 border-t border-border/60 pt-4">
				<div className="flex flex-col gap-1">
					<span className="text-[10px] leading-none text-muted-foreground">
						Search objective
					</span>
					<Select
						value={mode}
						onValueChange={(next) =>
							onModeChange(next === "team" ? "team" : "damage")
						}
						disabled={running}
					>
						<SelectTrigger
							aria-label="Search objective"
							size="sm"
							className="w-40"
						>
							{teamMode ? "Team damage" : "Own damage"}
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="damage">Own damage</SelectItem>
								<SelectItem value="team">Team damage</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>
				<span className="flex-1" />
				<Button
					onClick={running ? onCancel : onRun}
					disabled={!running && !canRun}
					variant={running ? "destructive" : "default"}
					size="lg"
				>
					{running ? (
						<>
							<Square className="size-4" /> Cancel
						</>
					) : (
						<>
							<Play className="size-4" />{" "}
							{teamMode ? "Run team search" : "Run optimizer"}
						</>
					)}
				</Button>
			</div>

			{running && (
				<div className="flex flex-col gap-1.5">
					<div className="h-1.5 w-full overflow-hidden bg-muted">
						<div
							className="h-full bg-primary transition-[width] duration-200"
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
					<p className="text-[11px] text-muted-foreground">{phaseLabel}</p>
				</div>
			)}
		</>
	);
}
