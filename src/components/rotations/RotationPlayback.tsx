import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { OptimizerInfo } from "@/components/optimizer/OptimizerInfo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
	tab,
	onTabChange,
	onSelectNode,
}: {
	entries: RotationPlaybackEntry[];
	pending: boolean;
	className?: string;
	errors: RotationDiagnostic[];
	tab: string;
	onTabChange: (tab: string) => void;
	onSelectNode: (nodeId: string) => void;
}) {
	const [onlyAutomatic, setOnlyAutomatic] = useState(false);
	const automatic = entries.filter((entry) => entry.automatic);
	const visible = onlyAutomatic ? automatic : entries;
	return (
		<Tabs
			aria-label="Rotation report"
			value={tab}
			onValueChange={(value) => onTabChange(String(value))}
			className={cn(
				"min-h-0 flex-1 gap-0 border bg-card xl:w-80 xl:flex-none",
				className,
			)}
		>
			<header className="flex h-11 shrink-0 items-center gap-1 border-b px-2">
				<TabsList variant="line" aria-label="Report view">
					<TabsTrigger value="playback">Playback</TabsTrigger>
					<TabsTrigger value="errors">
						Errors{" "}
						<Badge variant={errors.length ? "secondary" : "outline"}>
							{errors.length}
						</Badge>
					</TabsTrigger>
				</TabsList>
				<span className="flex-1" />
				{tab === "playback" && (
					<>
						<Button
							variant={onlyAutomatic ? "secondary" : "ghost"}
							size="sm"
							aria-pressed={onlyAutomatic}
							onClick={() => setOnlyAutomatic(!onlyAutomatic)}
						>
							Auto{" "}
							<span className="text-[10px] tabular-nums text-muted-foreground">
								{automatic.length}
							</span>
						</Button>
						<OptimizerInfo label="Playback details">
							<p>
								Updates after edits. Auto marks engine-triggered attacks,
								including off-field follow-ups.
							</p>
							<p>
								Time is the cast start. Damage includes its hits. Generated
								attacks are read-only.
							</p>
						</OptimizerInfo>
					</>
				)}
			</header>
			<TabsContent
				value="playback"
				aria-label="Rotation playback"
				aria-busy={pending}
				className="flex min-h-0 flex-col"
			>
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
										entry.automatic && "bg-primary/5",
									)}
								>
									<span className="w-11 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
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
										<div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
											<span>{label.type}</span>
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
											className="whitespace-normal break-words text-[11px]"
											title={entry.name}
										>
											{label.name}
										</p>
									</div>
									<OptimizerInfo
										label={`${entry.name} details`}
										triggerContent={
											<span className="text-[10px] tabular-nums">
												{entry.damage > 0
													? Math.round(entry.damage).toLocaleString()
													: "—"}
											</span>
										}
									>
										<p>{entry.name}</p>
										<p>
											{entry.time.toFixed(2)}s · {entry.duration.toFixed(2)}s ·{" "}
											{Math.round(entry.damage).toLocaleString()} DMG
										</p>
										{entry.source && <p>{entry.source}</p>}
									</OptimizerInfo>
								</div>
							);
						}}
					/>
				) : (
					<p className="m-auto px-4 text-xs text-muted-foreground">
						{pending
							? "Simulating…"
							: onlyAutomatic
								? "No automatic attacks"
								: "Add actions to preview"}
					</p>
				)}
			</TabsContent>
			<TabsContent value="errors" className="flex min-h-0 flex-col">
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
											onClick={() => onSelectNode(issue.nodeId!)}
										>
											<span className="min-w-0 flex-1">{issue.message}</span>
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
					<Empty>
						<EmptyHeader>
							<EmptyTitle>No errors</EmptyTitle>
							<EmptyDescription>
								{pending
									? "Simulation is running."
									: "Rotation checks appear here."}
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
			</TabsContent>
		</Tabs>
	);
}
