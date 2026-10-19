import type { OptPrgr } from "@wuwacalc/core/engine/optimizer/types";
import { Play, Square } from "lucide-react";
import { formatMs } from "@/components/optimizer/display";
import {
	MAX_RESULTS_LIMIT,
	MIN_RESULTS_LIMIT,
} from "@/components/optimizer/optimizerOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";

/** Results limit, mode, engine picker and the run/cancel button with progress. */
export function OptimizerRunBar({
	resultsLimit,
	onResultsLimitChange,
	engine,
	onEngineChange,
	mode,
	onModeChange,
	running,
	phase,
	progress,
	progressPercent,
	canRun,
	gpuAvailable,
	onRun,
	onCancel,
}: {
	resultsLimit: number;
	onResultsLimitChange: (value: number) => void;
	engine: "gpu" | "cpu";
	onEngineChange: (engine: "gpu" | "cpu") => void;
	/** Search objective: the target's own damage or a teammate's rotation. */
	mode: "damage" | "team";
	onModeChange: (mode: "damage" | "team") => void;
	running: boolean;
	phase: "baseline" | "search" | "team" | "stats" | null;
	progress: OptPrgr | null;
	progressPercent: number;
	canRun: boolean;
	gpuAvailable: boolean;
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
			<div className="flex flex-wrap items-end gap-4">
				<div className="flex flex-col gap-1">
					<span className="text-[10px] leading-none text-muted-foreground">
						Mode
					</span>
					<Select
						value={mode}
						onValueChange={(next) =>
							onModeChange(next === "team" ? "team" : "damage")
						}
						disabled={running}
					>
						<SelectTrigger size="sm" className="w-40">
							{teamMode ? "Team damage" : "Own damage"}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="damage">Own damage</SelectItem>
							<SelectItem value="team">Team damage</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-[10px] leading-none text-muted-foreground">
						Results kept
					</span>
					<Input
						type="number"
						min={MIN_RESULTS_LIMIT}
						max={MAX_RESULTS_LIMIT}
						value={String(resultsLimit)}
						onChange={(event) => {
							const next = Number.parseInt(event.target.value, 10);
							if (Number.isFinite(next)) {
								onResultsLimitChange(
									Math.min(
										MAX_RESULTS_LIMIT,
										Math.max(MIN_RESULTS_LIMIT, next),
									),
								);
							}
						}}
						className="h-8 w-24"
					/>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-[10px] leading-none text-muted-foreground">
						Engine
					</span>
					<Select
						value={engine}
						onValueChange={(next) =>
							onEngineChange(next === "gpu" ? "gpu" : "cpu")
						}
						disabled={teamMode}
					>
						<SelectTrigger size="sm" className="w-34">
							{teamMode
								? "Exact simulation"
								: engine === "gpu"
									? "GPU (WebGPU)"
									: "CPU (workers)"}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="gpu" disabled={!gpuAvailable}>
								GPU (WebGPU)
							</SelectItem>
							<SelectItem value="cpu">CPU (workers)</SelectItem>
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
