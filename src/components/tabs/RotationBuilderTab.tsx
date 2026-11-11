import {
	Add01Icon,
	ArrowDown01Icon,
	ArrowUp01Icon,
	CheckmarkCircle02Icon,
	Clock01Icon,
	Copy01Icon,
	Delete02Icon,
	DragDropVerticalIcon,
	PlayIcon,
	Redo02Icon,
	RepeatIcon,
	Undo02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { FilterSelect } from "@/components/filters";
import { EnergyReadout } from "@/components/optimizer/EnergyReadout";
import { OptimizerInfo } from "@/components/optimizer/OptimizerInfo";
import { PreviewBadge } from "@/components/PreviewBadge";
import {
	flowRows,
	ROTATION_DRAG_TYPE,
	RotationFlow,
} from "@/components/rotations/RotationFlow";
import { RotationPlayback } from "@/components/rotations/RotationPlayback";
import { RotationTeamDialog } from "@/components/rotations/RotationTeamDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VirtualGrid } from "@/components/VirtualGrid";
import { useCustomRotations } from "@/hooks/useCustomRotations";
import {
	ensureCoreReady,
	evaluateScenario,
	getCalculatorCatalog,
} from "@/lib/calc/core";
import {
	referenceScenario,
	rotationDamageFromResult,
} from "@/lib/calc/rotationDamage";
import {
	rememberRotationDamage,
	rotationDamageKey,
	rotationReferenceRevision,
} from "@/lib/calc/rotationDamageCache";
import type {
	CalculatorCatalog,
	CustomRotation,
	RotationDiagnostic,
	RotationNode,
	SimulationResult,
} from "@/lib/calc/types";
import { charactersById } from "@/lib/catalog";
import {
	customRotationProfile,
	customRotationSchema,
	findRotationNode,
	insertRotationNode,
	newNodeId,
	rotationActionName,
	rotationKits,
	rotationPaletteActions,
	rotationSize,
	seedRotation,
	splitRotationActionName,
	updateRotationNode,
} from "@/lib/customRotations";
import { useFilterState } from "@/lib/persistentState";
import { cn } from "@/lib/utils";

type History = { past: CustomRotation[]; future: CustomRotation[] };
const noHistory = (): History => ({ past: [], future: [] });
export function RotationBuilderTab({
	active,
	onOptimize,
}: {
	active: boolean;
	onOptimize: (rotation: CustomRotation) => void;
}) {
	const [library, setLibrary] = useCustomRotations();
	const [selected, setSelected] = useFilterState(
		"rotations.selected.v1",
		"",
		z.string(),
	);
	const [catalog, setCatalog] = useState<CalculatorCatalog | null>(
		getCalculatorCatalog,
	);
	const [error, setError] = useState<string | null>(null);
	const [history, setHistory] = useState<History>(noHistory);
	const [selectedNode, setSelectedNode] = useState<string | null>(null);
	const [nodeNavigation, setNodeNavigation] = useState(0);
	const [selectedMember, setSelectedMember] = useState(0);
	const [search, setSearch] = useState("");
	const [kind, setKind] = useState("any");
	const [dropKey, setDropKey] = useState<string | null>(null);
	const [testing, setTesting] = useState(false);
	const [playbackOpen, setPlaybackOpen] = useState(false);
	const [teamEditor, setTeamEditor] = useState<{
		initial: CustomRotation;
		creating: boolean;
	} | null>(null);
	const [testResult, setTestResult] = useState<{
		key: string;
		result?: SimulationResult;
		error?: string;
		diagnostic?: RotationDiagnostic;
	} | null>(null);
	const cancelTest = useRef<(() => void) | null>(null);
	const rotation = library.find((r) => r.id === selected) ?? library[0] ?? null;
	const key = JSON.stringify(rotation);
	useEffect(() => {
		if (!active || catalog) return;
		let live = true;
		ensureCoreReady()
			.then((c) => {
				if (live) setCatalog(c);
			})
			.catch((e) => {
				if (live) setError(String(e));
			});
		return () => {
			live = false;
		};
	}, [active, catalog]);
	useEffect(() => {
		void key;
		cancelTest.current?.();
		cancelTest.current = null;
		setTesting(false);
	}, [key]);
	useEffect(() => () => cancelTest.current?.(), []);
	const kits = useMemo(
		() => (rotation && catalog ? rotationKits(rotation, catalog) : []),
		[rotation, catalog],
	);
	const kit = kits[selectedMember] ?? kits[0];
	const profile = useMemo(
		() =>
			rotation && catalog ? customRotationProfile(rotation, catalog) : null,
		[rotation, catalog],
	);
	const node =
		rotation && selectedNode
			? findRotationNode(rotation.nodes, selectedNode)
			: undefined;
	const rows = rotation ? flowRows(rotation.nodes).filter((r) => !r.end) : [];
	const nodeRow = rows.find((r) => r.node.id === selectedNode);
	const actions = useMemo(
		() =>
			(kit ? rotationPaletteActions(kit) : [])
				.filter(
					(a) =>
						(!a.mainEchoId || a.mainEchoId === kit?.member.mainEcho.engineId) &&
						(kind === "any" || a.kind === kind) &&
						`${rotationActionName(a)} ${a.kind} ${a.variant}`
							.toLowerCase()
							.includes(search.toLowerCase()),
				)
				.toSorted(
					(a, b) =>
						a.kind.localeCompare(b.kind) ||
						a.name.localeCompare(b.name) ||
						a.variant.localeCompare(b.variant),
				),
		[kit, kind, search],
	);
	const edit = (next: CustomRotation) => {
		if (!rotation) return;
		const parsed = customRotationSchema.safeParse(next);
		if (!parsed.success) {
			toast.error("Keep rotations under 2,000 actions and five nested loops.");
			return;
		}
		setHistory((h) => ({ past: [...h.past.slice(-49), rotation], future: [] }));
		setLibrary((previous) =>
			previous.map((r) => (r.id === rotation.id ? parsed.data : r)),
		);
	};
	const selectRotation = (id: string) => {
		setSelected(id);
		setHistory(noHistory());
		setSelectedNode(null);
		setSelectedMember(0);
	};
	const create = (copy = false) => {
		if (library.length >= 100) {
			toast.error("Rotation library is full.");
			return;
		}
		const next =
			copy && rotation
				? {
						...structuredClone(rotation),
						id: newNodeId(),
						name: `${rotation.name} copy`.slice(0, 100),
					}
				: { id: newNodeId(), name: "New rotation", members: [], nodes: [] };
		if (!copy) {
			setTeamEditor({ initial: next, creating: true });
			return;
		}
		setLibrary((previous) => [...previous, next]);
		selectRotation(next.id);
	};
	const undo = (redo = false) => {
		if (!rotation) return;
		const next = redo ? history.future[0] : history.past.at(-1);
		if (!next) return;
		setLibrary((previous) =>
			previous.map((r) => (r.id === rotation.id ? next : r)),
		);
		setHistory(
			redo
				? { past: [...history.past, rotation], future: history.future.slice(1) }
				: {
						past: history.past.slice(0, -1),
						future: [rotation, ...history.future],
					},
		);
	};
	const add = (next: RotationNode | RotationNode[]) => {
		if (!rotation) return;
		const additions = Array.isArray(next) ? next : [next];
		if (!additions.length) return;
		const parentId =
			node?.kind === "loop" ? node.id : (nodeRow?.parentId ?? null);
		const siblings = parentId
			? (
					findRotationNode(rotation.nodes, parentId) as Extract<
						RotationNode,
						{ kind: "loop" }
					>
				).children
			: rotation.nodes;
		const beforeId =
			node?.kind === "loop" || !nodeRow
				? null
				: (siblings[siblings.findIndex((n) => n.id === selectedNode) + 1]?.id ??
					null);
		edit({
			...rotation,
			nodes: additions.reduce(
				(nodes, block) => insertRotationNode(nodes, block, parentId, beforeId),
				rotation.nodes,
			),
		});
		setSelectedNode(additions[additions.length - 1].id);
	};
	const addAction = (actionId: string) => {
		if (kit)
			add({
				id: newNodeId(),
				kind: "action",
				characterId: kit.member.characterId,
				actionId,
			});
	};
	const drop = (
		event: DragEvent,
		parentId: string | null,
		beforeId?: string,
	) => {
		event.preventDefault();
		event.stopPropagation();
		setDropKey(null);
		if (!rotation) return;
		try {
			const data = JSON.parse(event.dataTransfer.getData(ROTATION_DRAG_TYPE));
			const source =
				typeof data.nodeId === "string"
					? findRotationNode(rotation.nodes, data.nodeId)
					: undefined;
			const owner = kits.find((k) => k.member.characterId === data.characterId);
			const next: RotationNode | undefined =
				source ??
				(owner?.actions.some((a) => a.id === data.actionId)
					? {
							id: newNodeId(),
							kind: "action",
							characterId: owner.member.characterId,
							actionId: data.actionId,
						}
					: undefined);
			if (!next || next.id === beforeId) return;
			edit({
				...rotation,
				nodes: insertRotationNode(rotation.nodes, next, parentId, beforeId),
			});
			setSelectedNode(next.id);
		} catch {
			toast.error("This block could not be moved.");
		}
	};
	const move = (direction: -1 | 1) => {
		if (!rotation || !node || !nodeRow) return;
		const parent = nodeRow.parentId
			? findRotationNode(rotation.nodes, nodeRow.parentId)
			: null;
		const siblings = parent?.kind === "loop" ? parent.children : rotation.nodes;
		const index = siblings.findIndex((n) => n.id === node.id);
		if (index + direction < 0 || index + direction >= siblings.length) return;
		edit({
			...rotation,
			nodes: insertRotationNode(
				rotation.nodes,
				node,
				nodeRow.parentId,
				direction < 0
					? siblings[index - 1].id
					: (siblings[index + 2]?.id ?? null),
			),
		});
	};
	const test = () => {
		if (!rotation || !profile || profile.errors.length) return;
		setTesting(true);
		setTestResult(null);
		cancelTest.current?.();
		cancelTest.current = evaluateScenario(
			{
				...referenceScenario(profile),
				capturePlayback: true,
			},
			(result, problem, diagnostic) => {
				rememberRotationDamage(
					rotationDamageKey(rotationReferenceRevision, profile),
					result
						? rotationDamageFromResult(result)
						: { damage: null, error: problem ?? "Simulation failed." },
				);
				setTesting(false);
				setTestResult({
					key,
					...(result ? { result } : { error: problem ?? "Simulation failed." }),
					...(diagnostic ? { diagnostic } : {}),
				});
			},
		);
	};
	// biome-ignore lint/correctness/useExhaustiveDependencies: The serialized document and catalog fully define this debounced preview; state updates must not reschedule it.
	useEffect(() => {
		if (!active || !catalog || !rotation || !profile || profile.errors.length)
			return;
		const timer = setTimeout(test, 500);
		return () => {
			clearTimeout(timer);
			cancelTest.current?.();
		};
	}, [key, active, catalog]);
	const measured = testResult?.key === key ? testResult : null;
	const problems: RotationDiagnostic[] = [
		...new Map(
			[
				...(error ? [{ message: error }] : []),
				...(profile?.diagnosticDetails ??
					profile?.errors.map((message) => ({ message })) ??
					[]),
				...(measured?.error
					? [measured.diagnostic ?? { message: measured.error }]
					: []),
				...(measured?.result?.diagnosticDetails ??
					measured?.result?.diagnostics.map((message) => ({ message })) ??
					[]),
			].map((issue) => [JSON.stringify(issue), issue]),
		).values(),
	];
	const goToNode = (id: string) => {
		if (!rotation) return;
		const target = findRotationNode(rotation.nodes, id);
		if (!target) return;
		setSelectedNode(id);
		setNodeNavigation((n) => n + 1);
		if (target.kind !== "loop") {
			const member = kits.findIndex(
				(k) => k.member.characterId === target.characterId,
			);
			if (member >= 0) setSelectedMember(member);
		}
		setPlaybackOpen(false);
	};
	const showErrors = () => {
		setPlaybackOpen(true);
	};
	return (
		<div className="@container/builder flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
			{teamEditor && catalog && (
				<RotationTeamDialog
					initial={teamEditor.initial}
					catalog={catalog}
					creating={teamEditor.creating}
					onClose={() => setTeamEditor(null)}
					onSave={(next) => {
						if (teamEditor.creating) {
							if (library.length >= 100) {
								toast.error("Rotation library is full.");
								return;
							}
							setLibrary((all) => [...all, next]);
							selectRotation(next.id);
						} else {
							edit(next);
							setSelectedMember(0);
							setSelectedNode(null);
						}
						setTeamEditor(null);
					}}
				/>
			)}
			<header className="flex shrink-0 flex-wrap items-center gap-2">
				<h1 className="mr-2 text-lg font-semibold">Rotations</h1>
				<div className="w-48">
					<FilterSelect
						label="Saved rotations"
						hideLabel
						value={rotation?.id ?? "none"}
						options={
							library.length
								? library
										.toSorted((a, b) => a.name.localeCompare(b.name))
										.map((r) => ({
											value: r.id,
											label: r.name || "Untitled rotation",
										}))
								: [{ value: "none", label: "Your rotations" }]
						}
						onChange={selectRotation}
					/>
				</div>
				<Button
					variant="outline"
					size="sm"
					disabled={!catalog}
					onClick={() => create()}
				>
					<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
					New
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Duplicate rotation"
					disabled={!rotation}
					onClick={() => create(true)}
				>
					<HugeiconsIcon icon={Copy01Icon} />
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Delete rotation"
					disabled={!rotation}
					onClick={() => {
						if (!rotation) return;
						const deleted = rotation;
						setLibrary((all) => all.filter((r) => r.id !== deleted.id));
						selectRotation("");
						toast("Rotation deleted", {
							action: {
								label: "Undo",
								onClick: () => {
									setLibrary((all) => [...all, deleted]);
									selectRotation(deleted.id);
								},
							},
						});
					}}
				>
					<HugeiconsIcon icon={Delete02Icon} />
				</Button>
				{rotation && (
					<>
						<Field className="min-w-32 max-w-56 flex-1">
							<FieldLabel htmlFor="rotation-name" className="sr-only">
								Rotation name
							</FieldLabel>
							<Input
								id="rotation-name"
								value={rotation.name}
								maxLength={100}
								onChange={(e) => edit({ ...rotation, name: e.target.value })}
							/>
						</Field>
						<Button
							variant="outline"
							size="sm"
							disabled={!catalog}
							onClick={() =>
								setTeamEditor({
									initial: structuredClone(rotation),
									creating: false,
								})
							}
						>
							Edit team
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={!history.past.length}
							onClick={() => undo()}
							aria-label="Undo"
						>
							<HugeiconsIcon icon={Undo02Icon} />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={!history.future.length}
							onClick={() => undo(true)}
							aria-label="Redo"
						>
							<HugeiconsIcon icon={Redo02Icon} />
						</Button>
						<span
							className="flex items-center gap-1 text-xs text-muted-foreground"
							title="Changes save automatically"
						>
							<HugeiconsIcon
								icon={CheckmarkCircle02Icon}
								className="size-3.5"
							/>
							Autosave
						</span>
						<Button
							variant="outline"
							size="sm"
							disabled={testing || !!profile?.errors.length || !catalog}
							onClick={test}
						>
							<HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />
							{testing ? "Testing…" : "Test"}
						</Button>
						<Button
							size="sm"
							disabled={!!profile?.errors.length || !catalog}
							onClick={() => onOptimize(rotation)}
						>
							Optimize
						</Button>
					</>
				)}
				<OptimizerInfo label="Rotation builder">
					<p>
						Drag blocks to reorder. Drop above a block to insert, or on a loop’s
						end to nest.
					</p>
					<p>
						Select a block, then add actions after it. Move buttons support
						keyboard editing.
					</p>
					<p>
						Resonator changes swap automatically. Intros and Outros must be
						placed explicitly.
					</p>
					<p>
						Tests use rotation stat templates, the first supported weapon, and
						the minimum modeled chain. The optimizer uses your selected builds.
					</p>
					<p>
						Saved automatically. Custom rotations appear in the optimizer’s
						rotation picker.
					</p>
				</OptimizerInfo>
			</header>
			{!rotation && error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			{!rotation ? (
				<Empty>
					<EmptyHeader>
						<HugeiconsIcon icon={RepeatIcon} className="size-12 text-primary" />
						<EmptyTitle>No rotations yet</EmptyTitle>
						<EmptyDescription>
							Create a rotation to select a team and add actions.
						</EmptyDescription>
					</EmptyHeader>
					<Button onClick={() => create()} disabled={!catalog}>
						<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
						Create rotation
					</Button>
				</Empty>
			) : (
				<>
					<div className="flex min-h-[480px] flex-1 flex-col gap-3 lg:min-h-0 lg:flex-row">
						<aside className="flex h-72 shrink-0 flex-col gap-3 border bg-card p-3 lg:h-auto lg:w-72">
							<ToggleGroup
								aria-label="Resonator actions"
								value={[String(selectedMember)]}
								onValueChange={(values) => {
									if (values.length) {
										setSelectedMember(Number(values[0]));
										setKind("any");
										setSearch("");
									}
								}}
								className="w-full"
							>
								{kits.map((memberKit, index) => (
									<ToggleGroupItem
										key={memberKit.member.characterId}
										value={String(index)}
										aria-label={`${memberKit.member.name} actions`}
										title={memberKit.member.name}
										className={cn(
											"h-12 min-w-0 flex-1 p-1",
											index === selectedMember &&
												"bg-primary/20 ring-2 ring-inset ring-primary border-b-2 border-b-primary",
										)}
									>
										<img
											src={
												charactersById.get(memberKit.member.characterId)
													?.icon_head_256
											}
											alt={memberKit.member.name}
											className="size-10 object-contain"
										/>
									</ToggleGroupItem>
								))}
							</ToggleGroup>
							<div className="flex items-center justify-between">
								<h2 className="text-xs font-semibold">Actions</h2>
								{kit && <Badge variant="outline">{kit.member.name}</Badge>}
								{kit && charactersById.get(kit.member.characterId)?.preview && (
									<PreviewBadge />
								)}
							</div>
							<FieldGroup className="gap-2">
								<Field>
									<FieldLabel htmlFor="action-search" className="sr-only">
										Search actions
									</FieldLabel>
									<Input
										id="action-search"
										placeholder="Search actions…"
										value={search}
										onChange={(e) => setSearch(e.target.value)}
									/>
								</Field>
								<Field>
									<FilterSelect
										label="Action category"
										hideLabel
										value={kind}
										options={[
											{ value: "any", label: "All actions" },
											...[...new Set(kit?.actions.map((a) => a.kind) ?? [])]
												.sort()
												.map((value) => ({ value, label: value })),
										]}
										onChange={setKind}
									/>
								</Field>
							</FieldGroup>
							{!kit ? (
								<Empty>
									<EmptyHeader>
										<EmptyDescription>
											Select a Resonator first.
										</EmptyDescription>
									</EmptyHeader>
								</Empty>
							) : (
								<VirtualGrid
									items={actions}
									columns={1}
									gap={6}
									estimateRowHeight={60}
									getItemKey={(a) => a.id}
									className="min-h-0 flex-1 overflow-y-auto"
									renderItem={(action) => (
										<Button
											variant="outline"
											draggable
											className="h-auto w-full justify-start gap-2 p-2 text-left"
											title={`${action.name}${action.variant ? ` · ${action.variant}` : ""}. Drag or click to add.`}
											onDragStart={(event) => {
												event.dataTransfer.setData(
													ROTATION_DRAG_TYPE,
													JSON.stringify({
														characterId: kit.member.characterId,
														actionId: action.id,
													}),
												);
												event.dataTransfer.effectAllowed = "copy";
											}}
											onClick={() => addAction(action.id)}
										>
											<img
												src={
													charactersById.get(kit.member.characterId)
														?.icon_head_256
												}
												alt=""
												className="size-9 object-contain"
											/>
											<span className="flex min-w-0 flex-1 flex-col gap-1">
												<span className="flex items-center gap-1 text-xs text-muted-foreground">
													<span>
														{
															splitRotationActionName(
																rotationActionName(action),
																action.kind,
															).type
														}
													</span>
													{action.variant && (
														<span className="truncate">· {action.variant}</span>
													)}
												</span>
												<span className="whitespace-normal break-words">
													{
														splitRotationActionName(
															rotationActionName(action),
															action.kind,
														).name
													}
												</span>
											</span>
											<HugeiconsIcon icon={Add01Icon} />
										</Button>
									)}
								/>
							)}
							{kit && (
								<div className="flex gap-1">
									<Button
										variant="outline"
										size="sm"
										className="flex-1"
										onClick={() => {
											if (!rotation) return;
											const template = seedRotation([kit]);
											add(template.nodes.filter((n) => n.kind !== "loop"));
										}}
									>
										+ Opener
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="flex-1"
										onClick={() => {
											const template = seedRotation([kit]);
											const loop = template.nodes.find(
												(n) => n.kind === "loop",
											);
											if (loop?.kind === "loop") add(loop.children);
										}}
									>
										+ Intro visit
									</Button>
								</div>
							)}
						</aside>
						<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 xl:flex-row">
							<div className="flex shrink-0 gap-1 xl:hidden">
								<Button
									size="sm"
									variant={playbackOpen ? "ghost" : "secondary"}
									aria-pressed={!playbackOpen}
									onClick={() => setPlaybackOpen(false)}
								>
									Flow
								</Button>
								<Button
									size="sm"
									variant={playbackOpen ? "secondary" : "ghost"}
									aria-pressed={playbackOpen}
									onClick={() => setPlaybackOpen(true)}
								>
									Inspect{" "}
									<span className="text-xs text-muted-foreground">
										{problems.length
											? `${problems.length} errors`
											: `${measured?.result?.playback?.filter((e) => e.automatic).length ?? 0} Auto`}
									</span>
								</Button>
							</div>
							<section
								aria-label="Rotation flow"
								className={cn(
									"flex min-h-[460px] min-w-0 flex-1 flex-col border bg-card lg:min-h-0",
									playbackOpen && "hidden xl:flex",
								)}
							>
								<header className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
									<HugeiconsIcon
										icon={DragDropVerticalIcon}
										className="size-4 text-primary"
									/>
									<h2 className="text-xs font-semibold">Flow</h2>
									<span className="text-xs tabular-nums text-muted-foreground">
										{rotationSize(rotation.nodes)} actions
									</span>
									<span className="flex-1" />
									{kits.length === 3 && !rotation.nodes.length && (
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												edit({ ...rotation, nodes: seedRotation(kits).nodes })
											}
										>
											Starter
										</Button>
									)}
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											add({
												id: newNodeId(),
												kind: "loop",
												count: 3,
												children: [],
											})
										}
									>
										<HugeiconsIcon icon={RepeatIcon} data-icon="inline-start" />
										Loop
									</Button>
									<Button
										variant="ghost"
										size="sm"
										disabled={!kit}
										onClick={() => {
											if (kit)
												add({
													id: newNodeId(),
													kind: "wait",
													characterId: kit.member.characterId,
													seconds: 1,
												});
										}}
									>
										<HugeiconsIcon
											icon={Clock01Icon}
											data-icon="inline-start"
										/>
										Wait
									</Button>
								</header>
								<RotationFlow
									key={nodeNavigation}
									nodes={rotation.nodes}
									kits={kits}
									problems={problems}
									selectedId={selectedNode}
									dropKey={dropKey}
									onDropKey={setDropKey}
									onSelect={(id) => {
										setSelectedNode(id);
										const n = findRotationNode(rotation.nodes, id);
										if (n && n.kind !== "loop") {
											const i = kits.findIndex(
												(k) => k.member.characterId === n.characterId,
											);
											if (i >= 0) setSelectedMember(i);
										}
									}}
									onDrop={drop}
									onCount={(id, count) =>
										edit({
											...rotation,
											nodes: updateRotationNode(rotation.nodes, id, (n) =>
												n.kind === "loop" ? { ...n, count } : n,
											),
										})
									}
									onAddLoop={() =>
										add({
											id: newNodeId(),
											kind: "loop",
											count: 3,
											children: [],
										})
									}
									onEnding={(id, actionId) =>
										edit({
											...rotation,
											nodes: updateRotationNode(rotation.nodes, id, (n) =>
												n.kind === "action" ? { ...n, actionId } : n,
											),
										})
									}
								/>
								{node && (
									<footer className="flex shrink-0 flex-wrap items-center gap-1 border-t p-2">
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label="Move block up"
											onClick={() => move(-1)}
										>
											<HugeiconsIcon icon={ArrowUp01Icon} />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label="Move block down"
											onClick={() => move(1)}
										>
											<HugeiconsIcon icon={ArrowDown01Icon} />
										</Button>
										<div className="w-40">
											<FilterSelect
												label="Move block into"
												hideLabel
												value={nodeRow?.parentId ?? "root"}
												options={[
													{ value: "root", label: "Main flow" },
													...rows
														.filter(
															(r) =>
																r.node.kind === "loop" &&
																r.node.id !== node.id &&
																!(
																	node.kind === "loop" &&
																	findRotationNode(node.children, r.node.id)
																),
														)
														.map((r, i) => ({
															value: r.node.id,
															label: `Loop ${i + 1} · ×${r.node.kind === "loop" ? r.node.count : 1}`,
														})),
												]}
												onChange={(id) =>
													edit({
														...rotation,
														nodes: insertRotationNode(
															rotation.nodes,
															node,
															id === "root" ? null : id,
														),
													})
												}
											/>
										</div>
										{node.kind === "wait" && (
											<Field orientation="horizontal" className="w-auto">
												<FieldLabel htmlFor="wait-duration">s</FieldLabel>
												<Input
													id="wait-duration"
													type="number"
													min={0.05}
													max={60}
													step={0.05}
													value={node.seconds}
													className="w-20"
													onChange={(e) =>
														edit({
															...rotation,
															nodes: updateRotationNode(
																rotation.nodes,
																node.id,
																(n) =>
																	n.kind === "wait"
																		? {
																				...n,
																				seconds: Math.max(
																					0.05,
																					Math.min(
																						60,
																						Number(e.target.value) || 0.05,
																					),
																				),
																			}
																		: n,
															),
														})
													}
												/>
											</Field>
										)}
										<span className="flex-1" />
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label="Duplicate block"
											onClick={() => {
												const clone = (n: RotationNode): RotationNode => ({
													...n,
													id: newNodeId(),
													...(n.kind === "loop"
														? { children: n.children.map(clone) }
														: {}),
												});
												const copy = clone(node);
												const parentId = nodeRow?.parentId ?? null;
												const parent = parentId
													? findRotationNode(rotation.nodes, parentId)
													: null;
												const siblings =
													parent?.kind === "loop"
														? parent.children
														: rotation.nodes;
												const beforeId =
													siblings[
														siblings.findIndex((n) => n.id === node.id) + 1
													]?.id ?? null;
												edit({
													...rotation,
													nodes: insertRotationNode(
														rotation.nodes,
														copy,
														parentId,
														beforeId,
													),
												});
												setSelectedNode(copy.id);
											}}
										>
											<HugeiconsIcon icon={Copy01Icon} />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label="Delete block"
											onClick={() => {
												edit({
													...rotation,
													nodes: updateRotationNode(
														rotation.nodes,
														node.id,
														() => null,
													),
												});
												setSelectedNode(null);
											}}
										>
											<HugeiconsIcon icon={Delete02Icon} />
										</Button>
									</footer>
								)}
							</section>
							<RotationPlayback
								entries={measured?.result?.playback ?? []}
								pending={testing}
								hasActions={rows.length > 0}
								errors={problems}
								onSelectNode={goToNode}
								className={cn(
									"min-h-[460px] lg:min-h-0",
									!playbackOpen && "hidden xl:flex",
								)}
							/>
						</div>
					</div>
					{measured?.result && (
						<div className="flex shrink-0 flex-wrap items-center gap-4 border bg-card px-4 py-3">
							<Button variant="ghost" size="sm" onClick={showErrors}>
								{measured.result.feasible
									? "Ready"
									: `Errors · ${problems.length}`}
							</Button>
							<span className="text-sm font-semibold tabular-nums">
								{Math.round(measured.result.teamDamage).toLocaleString()}{" "}
								<span className="text-xs font-normal text-muted-foreground">
									DMG
								</span>
							</span>
							<span className="text-sm tabular-nums">
								{Math.round(
									measured.result.teamDamage /
										Math.max(0.01, measured.result.duration),
								).toLocaleString()}{" "}
								<span className="text-xs text-muted-foreground">DPS</span>
							</span>
							<span className="text-xs tabular-nums text-muted-foreground">
								{measured.result.duration.toFixed(1)}s
							</span>
							<EnergyReadout energy={measured.result.energy} />
						</div>
					)}
				</>
			)}
		</div>
	);
}
