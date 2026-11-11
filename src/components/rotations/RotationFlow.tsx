import {
	Add01Icon,
	ArrowDown01Icon,
	ArrowRight01Icon,
	Clock01Icon,
	DragDropVerticalIcon,
	RepeatIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type DragEvent, useEffect, useMemo, useState } from "react";
import { FilterSelect } from "@/components/filters";
import { PreviewBadge } from "@/components/PreviewBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { VirtualGrid } from "@/components/VirtualGrid";
import type {
	RotationDiagnostic,
	RotationKit,
	RotationNode,
} from "@/lib/calc/types";
import { charactersById } from "@/lib/catalog";
import {
	rotationActionName,
	rotationEndingOptions,
	rotationStageOptions,
	splitRotationActionName,
} from "@/lib/customRotations";
import { flowRows, flowTurns } from "@/lib/rotationFlow";
import { cn } from "@/lib/utils";

export const ROTATION_DRAG_TYPE = "application/x-mornye-rotation";
export { flowRows } from "@/lib/rotationFlow";
export function RotationFlow({
	nodes,
	kits,
	problems,
	selectedId,
	dropKey,
	onDropKey,
	onSelect,
	onDrop,
	onCount,
	onAddLoop,
	onEnding,
}: {
	nodes: RotationNode[];
	kits: RotationKit[];
	problems: RotationDiagnostic[];
	selectedId: string | null;
	dropKey: string | null;
	onDropKey: (key: string | null) => void;
	onSelect: (id: string) => void;
	onDrop: (
		event: DragEvent,
		parentId: string | null,
		beforeId?: string,
	) => void;
	onCount: (id: string, count: number) => void;
	onAddLoop: () => void;
	onEnding: (nodeId: string, actionId: string) => void;
}) {
	const rows = useMemo(() => flowTurns(flowRows(nodes)), [nodes]);
	const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
	useEffect(() => {
		const turnId = rows.find((row) => row.node.id === selectedId)?.turnId;
		if (turnId)
			setCollapsed((previous) => {
				if (!previous.has(turnId)) return previous;
				const next = new Set(previous);
				next.delete(turnId);
				return next;
			});
	}, [selectedId, rows]);
	const visibleRows = rows.filter(
		(row) => !row.turnId || row.turnStart || !collapsed.has(row.turnId),
	);
	const firstProblem = new Map<string, string>();
	for (const issue of problems) {
		if (issue.nodeId && !firstProblem.has(issue.nodeId))
			firstProblem.set(issue.nodeId, issue.summary ?? issue.message);
	}
	return (
		<section
			aria-label="Rotation canvas"
			className="flex min-h-0 flex-1 flex-col bg-muted/10"
			onDragOver={(event) => {
				if (event.dataTransfer.types.includes(ROTATION_DRAG_TYPE)) {
					event.preventDefault();
					onDropKey("root");
				}
			}}
			onDrop={(event) => onDrop(event, null)}
		>
			{rows.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<HugeiconsIcon
							icon={DragDropVerticalIcon}
							className="size-8 text-muted-foreground"
						/>
						<EmptyTitle>Build your flow</EmptyTitle>
						<EmptyDescription>
							Drag an action here, or click one to add it.
						</EmptyDescription>
					</EmptyHeader>
					<Button variant="outline" onClick={onAddLoop}>
						<HugeiconsIcon icon={RepeatIcon} data-icon="inline-start" />
						Loop
					</Button>
				</Empty>
			) : (
				<VirtualGrid
					items={visibleRows}
					columns={1}
					gap={0}
					estimateRowHeight={76}
					getItemKey={(row) => `${row.node.id}${row.end ? ":end" : ""}`}
					scrollToIndex={visibleRows.findIndex(
						(row) => row.node.id === selectedId && !row.end,
					)}
					className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
					renderItem={({
						node,
						parentId,
						depth,
						end,
						index,
						turnId,
						turnStart,
						turnCount,
					}) => {
						const kit =
							node.kind !== "loop"
								? kits.find((k) => k.member.characterId === node.characterId)
								: undefined;
						const action =
							node.kind === "action"
								? kit?.actions.find((a) => a.id === node.actionId)
								: undefined;
						const character = kit && charactersById.get(kit.member.characterId);
						const label =
							action &&
							splitRotationActionName(rotationActionName(action), action.kind);
						const key = `${node.id}${end ? ":end" : ""}`;
						const problem = !end && firstProblem.get(node.id);
						const folded = turnId && collapsed.has(turnId);
						const turnErrors = turnStart
							? rows.filter(
									(row) =>
										row.turnId === turnId && firstProblem.has(row.node.id),
								).length
							: 0;
						const previous = rows
							.slice(0, index)
							.findLast((row) => row.node.kind !== "loop")?.node;
						const swapping =
							!end &&
							node.kind !== "loop" &&
							previous &&
							previous.kind !== "loop" &&
							previous.characterId !== node.characterId;
						return (
							<section
								aria-label={
									end
										? "End loop"
										: node.kind === "loop"
											? `Loop ${node.count} times`
											: (action?.name ?? "Wait")
								}
								className="relative py-2"
								style={{ paddingLeft: depth * 28 + 20 }}
								onDragOver={(event) => {
									if (event.dataTransfer.types.includes(ROTATION_DRAG_TYPE)) {
										event.preventDefault();
										event.stopPropagation();
										onDropKey(key);
										if (folded && turnId)
											setCollapsed((previous) => {
												const next = new Set(previous);
												next.delete(turnId);
												return next;
											});
									}
								}}
								onDragLeave={(event) => {
									if (
										!event.currentTarget.contains(
											event.relatedTarget as Node | null,
										)
									)
										onDropKey(null);
								}}
								onDrop={(event) =>
									onDrop(
										event,
										end ? node.id : parentId,
										end ? undefined : node.id,
									)
								}
							>
								{[0, 1, 2, 3, 4, 5].slice(0, depth + 1).map((level) => (
									<span
										aria-hidden="true"
										key={`rail-${level}`}
										className={cn(
											"pointer-events-none absolute inset-y-0 w-px",
											level === depth ? "bg-border" : "bg-primary/20",
										)}
										style={{ left: level * 28 + 10 }}
									/>
								))}
								<span
									aria-hidden="true"
									className="absolute top-1/2 h-px w-2.5 bg-border"
									style={{ left: depth * 28 + 10 }}
								/>
								{dropKey === key && (
									<span className="absolute inset-x-5 top-0 h-0.5 bg-primary" />
								)}
								{turnStart && character && turnId && (
									<Button
										variant="ghost"
										className="mb-2 h-auto w-full justify-start gap-2 border-y bg-muted/40 px-2 py-2"
										aria-label={`${folded ? "Expand" : "Collapse"} ${character.character_name} turn`}
										aria-expanded={!folded}
										onClick={() =>
											setCollapsed((previous) => {
												const next = new Set(previous);
												if (next.has(turnId)) next.delete(turnId);
												else next.add(turnId);
												return next;
											})
										}
									>
										{swapping && (
											<HugeiconsIcon
												icon={ArrowRight01Icon}
												data-icon="inline-start"
											/>
										)}
										<img
											src={character.icon_head_256}
											alt=""
											className="size-8 object-contain"
										/>
										<span>{character.character_name}</span>
										<span className="text-xs text-muted-foreground">
											{turnCount} actions
										</span>
										{turnErrors > 0 && (
											<Badge variant="outline">{turnErrors} errors</Badge>
										)}
										<HugeiconsIcon
											icon={ArrowDown01Icon}
											className={cn(
												"ml-auto size-4 transition-transform",
												folded && "-rotate-90",
											)}
										/>
									</Button>
								)}
								{folded ? null : end ? (
									<div className="flex items-center gap-2 py-1 text-muted-foreground">
										<HugeiconsIcon icon={RepeatIcon} className="size-3.5" />
										<span className="text-[10px]">
											↳ ×{node.kind === "loop" ? node.count : 1}
										</span>
										<Button
											size="icon-xs"
											variant="ghost"
											aria-label="Select loop to add actions"
											onClick={() => onSelect(node.id)}
										>
											<HugeiconsIcon icon={Add01Icon} />
										</Button>
									</div>
								) : (
									<div
										className={cn(
											"@container/block group flex min-w-0 items-center gap-2 border bg-card p-2 transition-colors",
											selectedId === node.id
												? "border-primary ring-1 ring-primary/20"
												: "border-border/70 hover:border-primary/40",
											node.kind === "loop" &&
												"border-l-2 border-l-primary bg-primary/5",
											problem && "border-destructive/60",
										)}
									>
										<Button
											variant="ghost"
											size="icon-xs"
											draggable
											aria-label="Drag block; use move buttons for keyboard reordering"
											title="Drag to reorder"
											onDragStart={(event) => {
												event.dataTransfer.setData(
													ROTATION_DRAG_TYPE,
													JSON.stringify({ nodeId: node.id }),
												);
												event.dataTransfer.effectAllowed = "move";
											}}
											onDragEnd={() => onDropKey(null)}
											className="cursor-grab active:cursor-grabbing"
										>
											<HugeiconsIcon icon={DragDropVerticalIcon} />
										</Button>
										{node.kind === "loop" ? (
											<>
												<Button
													variant="ghost"
													onClick={() => onSelect(node.id)}
													className="min-w-0 flex-1 justify-start"
												>
													<HugeiconsIcon
														icon={RepeatIcon}
														data-icon="inline-start"
													/>
													Loop
												</Button>
												<Field
													orientation="horizontal"
													className="w-auto gap-1"
												>
													<FieldLabel
														htmlFor={`loop-${node.id}`}
														className="text-xs"
													>
														×
													</FieldLabel>
													<Input
														id={`loop-${node.id}`}
														type="number"
														min={1}
														max={20}
														className="w-16"
														value={node.count}
														onChange={(e) =>
															onCount(
																node.id,
																Math.max(
																	1,
																	Math.min(20, Number(e.target.value) || 1),
																),
															)
														}
													/>
												</Field>
											</>
										) : (
											<>
												<Button
													variant="ghost"
													onClick={() => onSelect(node.id)}
													className="h-auto min-w-0 flex-1 justify-start gap-3 p-0"
												>
													<span className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
														<span className="flex max-w-full items-center gap-1.5">
															<Badge variant="secondary">
																{node.kind === "wait"
																	? "Wait"
																	: (label?.type ?? "Missing")}
															</Badge>
															{character?.preview && <PreviewBadge />}
														</span>
														<span className="max-w-full whitespace-normal break-words text-xs">
															{node.kind === "wait"
																? `${node.seconds}s`
																: (label?.name ?? "Action unavailable")}
														</span>
													</span>
												</Button>
												{node.kind === "action" && action && kit && (
													<div
														className={cn(
															"flex shrink-0 flex-col gap-1 @[38rem]/block:w-auto @[38rem]/block:flex-row",
															action.stages ? "w-max min-w-44" : "w-36",
														)}
													>
														{action.stages && (
															<div className="min-w-44">
																<FilterSelect
																	label="Attack stages"
																	fitContent
																	hideLabel
																	value={action.id}
																	options={rotationStageOptions(kit, action)}
																	onChange={(actionId) =>
																		onEnding(node.id, actionId)
																	}
																/>
															</div>
														)}
														<div className="@[38rem]/block:w-36">
															<FilterSelect
																label="Action ending"
																hideLabel
																value={action.id}
																options={rotationEndingOptions(kit, action)}
																onChange={(actionId) =>
																	onEnding(node.id, actionId)
																}
															/>
														</div>
													</div>
												)}
												<span
													className="flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground"
													title="Base action time; simulation includes cancels and cooldown waits"
												>
													<HugeiconsIcon
														icon={Clock01Icon}
														className="size-3"
													/>
													{node.kind === "wait"
														? node.seconds.toFixed(2)
														: (action?.seconds ?? 0).toFixed(2)}
													s
												</span>
											</>
										)}
										<span className="w-5 text-right text-[10px] tabular-nums text-muted-foreground">
											{String(index + 1).padStart(2, "0")}
										</span>
									</div>
								)}
								{problem && !folded && (
									<Alert variant="destructive" className="border-t-0">
										<AlertDescription>{problem}</AlertDescription>
									</Alert>
								)}
							</section>
						);
					}}
				/>
			)}
			<section
				aria-label="Append actions"
				className={cn(
					"mx-5 mb-4 flex min-h-12 shrink-0 items-center justify-center gap-2 border border-dashed text-xs text-muted-foreground",
					dropKey === "root" && "border-primary bg-primary/5",
				)}
				onDragOver={(event) => {
					if (event.dataTransfer.types.includes(ROTATION_DRAG_TYPE)) {
						event.preventDefault();
						onDropKey("root");
					}
				}}
				onDrop={(event) => onDrop(event, null)}
			>
				<HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
				<span>Drop here</span>
			</section>
		</section>
	);
}
