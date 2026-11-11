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
import type { EnergyStatus, OptPrgr } from "@/lib/calc/types";
import { EnergyReadout } from "./EnergyReadout";
import { OptimizerInfo } from "./OptimizerInfo";

/** Search objective and run/cancel button with progress. */
export function OptimizerRunBar({
	energy,
	mode,
	onModeChange,
	running,
	phase,
	progress,
	progressPercent,
	canRun,
	disabledReason,
	onRun,
	onCancel,
}: {
	energy?: EnergyStatus[];
	/** Search objective: the target's own damage or total team damage. */
	mode: "damage" | "team";
	onModeChange: (mode: "damage" | "team") => void;
	running: boolean;
	phase: "baseline" | "search" | "team" | "stats" | null;
	progress: OptPrgr | null;
	progressPercent: number;
	canRun: boolean;
	disabledReason?: string;
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
				? "Reading the searched Resonator's stats…"
				: progress
					? `${progressPercent}% of evaluation budget · ${Math.round(progress.processed).toLocaleString()}${
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
		<div className="flex flex-col gap-1">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
				{energy && (
					<div className="min-w-0 flex-1 basis-72">
						<EnergyReadout energy={energy} />
					</div>
				)}
				<div className="ml-auto flex flex-wrap items-center justify-end gap-2">
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
							title="Search objective"
							className="w-32"
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
					<Button
						onClick={running ? onCancel : onRun}
						disabled={!running && !canRun}
						variant={running ? "destructive" : "default"}
						size="sm"
					>
						{running ? (
							<>
								<Square className="size-4" /> Cancel
							</>
						) : (
							<>
								<Play className="size-4" /> Run optimizer
							</>
						)}
					</Button>
				</div>
			</div>
			{!running && !canRun && disabledReason && (
				<p role="status" className="text-right text-xs text-muted-foreground">
					{disabledReason}
				</p>
			)}

			{running && (
				<div className="flex items-center gap-2">
					<div
						role="progressbar"
						aria-label="Optimizer search"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={progressPercent}
						className="h-1 flex-1 overflow-hidden bg-muted"
					>
						<div
							className="h-full bg-primary transition-[width] duration-200"
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
					<span className="text-[10px] tabular-nums text-muted-foreground">
						{progressPercent}%{progress && ` · ${formatMs(progress.elapsedMs)}`}
					</span>
					<OptimizerInfo label="Search progress">
						<p>{phaseLabel}</p>
					</OptimizerInfo>
				</div>
			)}
		</div>
	);
}
