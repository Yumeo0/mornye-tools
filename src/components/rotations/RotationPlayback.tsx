import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { OptimizerInfo } from "@/components/optimizer/OptimizerInfo";
import { PreviewBadge } from "@/components/PreviewBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VirtualGrid } from "@/components/VirtualGrid";
import type {
	RotationDiagnostic,
	RotationPlaybackEntry,
} from "@/lib/calc/types";
import { charactersById } from "@/lib/catalog";
import { splitRotationActionName } from "@/lib/customRotations";
import { cn } from "@/lib/utils";

export function RotationPlayback({
	entries,
	pending,
	className,
	errors,
	onSelectNode,
	hasActions,
}: {
	entries: RotationPlaybackEntry[];
	pending: boolean;
	className?: string;
	errors: RotationDiagnostic[];
	onSelectNode: (nodeId: string) => void;
	hasActions: boolean;
}) {
	const [onlyAutomatic, setOnlyAutomatic] = useState(false);
	const automatic = entries.filter((entry) => entry.automatic);
	const visible = onlyAutomatic ? automatic : entries;
	return (
		<section
			aria-label="Rotation report"
			aria-busy={pending}
			className={cn(
				"flex min-h-0 flex-1 flex-col border bg-card xl:w-80 xl:flex-none",
				className,
			)}
		>
			<header className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
				<h2 className="text-sm font-medium">Simulation</h2>
				{errors.length > 0 && (
					<Badge className="text-destructive">
						{errors.length} {errors.length === 1 ? "error" : "errors"}
					</Badge>
				)}
				<span className="flex-1" />
				{!errors.length && entries.length > 0 && (
					<>
						<Button
							variant={onlyAutomatic ? "secondary" : "ghost"}
							size="sm"
							aria-pressed={onlyAutomatic}
							onClick={() => setOnlyAutomatic(!onlyAutomatic)}
						>
							Auto{" "}
							<span className="text-xs tabular-nums text-muted-foreground">
								{automatic.length}
							</span>
						</Button>
						<OptimizerInfo label="Playback details">
							<p>Press Test to refresh. Auto marks generated attacks.</p>
							<p>Time = cast start. Damage includes all its hits.</p>
						</OptimizerInfo>
					</>
				)}
			</header>
			{errors.length ? (
				<VirtualGrid
					items={errors}
					columns={1}
					gap={8}
					estimateRowHeight={86}
					getItemKey={(issue) => JSON.stringify(issue)}
					className="min-h-0 flex-1 overflow-y-auto p-3"
					renderItem={(issue) => (
						<Alert key={JSON.stringify(issue)} variant="destructive">
							<AlertDescription>
								{issue.nodeId ? (
									<Button
										variant="ghost"
										className="h-auto w-full justify-start whitespace-normal p-0 text-left"
										aria-label={`Show block: ${issue.message}`}
										onClick={() => {
											if (issue.nodeId) onSelectNode(issue.nodeId);
										}}
									>
										<span className="min-w-0 flex-1">
											{issue.message}
											<span className="mt-2 block text-xs underline underline-offset-4">
												Go to action
											</span>
										</span>
										<HugeiconsIcon
											icon={ArrowRight01Icon}
											data-icon="inline-end"
										/>
									</Button>
								) : (
									issue.message
								)}
							</AlertDescription>
						</Alert>
					)}
				/>
			) : (
				<div className="flex min-h-0 flex-1 flex-col">
					{visible.length ? (
						<VirtualGrid
							items={visible}
							columns={1}
							gap={0}
							estimateRowHeight={56}
							getItemKey={(entry) => entry.id}
							className="min-h-0 flex-1 overflow-y-auto px-2"
							renderItem={(entry) => {
								const character = charactersById.get(entry.characterId);
								const label = splitRotationActionName(entry.name, entry.kind);
								return (
									<div
										key={entry.id}
										className={cn(
											"relative flex items-center gap-2 border-b border-border/50 py-2",
											entry.automatic &&
												"ml-4 border-l-2 border-l-primary/30 bg-primary/5 pl-2",
										)}
									>
										<span className="w-11 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
											{entry.time.toFixed(2)}s
										</span>
										<span
											aria-hidden="true"
											className={cn(
												"absolute inset-y-0 left-14 w-px bg-border",
												entry.automatic && "bg-primary/30",
											)}
										/>
										{character && (
											<img
												src={character.icon_head_256}
												alt={character.character_name}
												className="z-10 size-8 shrink-0 bg-card object-contain"
											/>
										)}
										<div className="z-10 min-w-0 flex-1">
											<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
												<span>{label.type}</span>
												{character?.preview && <PreviewBadge />}
												{entry.automatic && (
													<Badge
														variant="outline"
														className="border-primary/30 text-primary"
													>
														Auto
													</Badge>
												)}
											</div>
											<p
												className="whitespace-normal break-words text-sm"
												title={entry.name}
											>
												{label.name}
											</p>
										</div>
										<OptimizerInfo
											label={`${entry.name} details`}
											triggerContent={
												<span className="text-xs tabular-nums">
													{entry.damage > 0
														? Math.round(entry.damage).toLocaleString()
														: "—"}
												</span>
											}
										>
											<p>{entry.name}</p>
											<p>
												{entry.time.toFixed(2)}s · {entry.duration.toFixed(2)}s
												· {Math.round(entry.damage).toLocaleString()} DMG
											</p>
											{entry.source && <p>{entry.source}</p>}
										</OptimizerInfo>
									</div>
								);
							}}
						/>
					) : (
						<p className="m-auto px-4 text-sm text-muted-foreground">
							{pending
								? "Simulating…"
								: onlyAutomatic
									? "No automatic attacks"
									: !hasActions
										? "Add actions to preview"
										: "Test to preview"}
						</p>
					)}
				</div>
			)}
		</section>
	);
}
