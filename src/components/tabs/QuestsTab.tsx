import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { FilterLayout, FilterPanel } from "@/components/filters";
import { ProgressionGroupHeader } from "@/components/ProgressionGroupHeader";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { VirtualGrid } from "@/components/VirtualGrid";
import { useAccount } from "@/lib/account";
import { useFilterState } from "@/lib/persistentState";
import { useProgressionCatalog } from "@/lib/progression/catalog";
import { progressionRows } from "@/lib/progression/groups";
import { progressionFor, questStatus } from "@/lib/progression/state";
import {
	QUEST_STATUS_LABELS,
	QUEST_STATUS_ORDER,
	type QuestDefinition,
} from "@/lib/progression/types";

const STATUSES = [
	{ value: "all", label: "All statuses" },
	{ value: "incomplete", label: "Incomplete" },
	...QUEST_STATUS_ORDER.map((value) => ({
		value,
		label: QUEST_STATUS_LABELS[value],
	})),
];

function QuestFilter({
	label,
	items,
	value,
	onChange,
}: {
	label: string;
	items: { value: string; label: string }[];
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<Select
				items={items}
				value={value}
				onValueChange={(next) => onChange(next ?? "all")}
			>
				<SelectTrigger aria-label={label} className="w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent alignItemWithTrigger={false}>
					<SelectGroup>
						{items.map((item) => (
							<SelectItem key={item.value} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</Field>
	);
}

function QuestRow({
	quest,
	expanded,
	onExpandedChange,
}: {
	quest: QuestDefinition;
	expanded: boolean;
	onExpandedChange: (open: boolean) => void;
}) {
	const hasDescription = Boolean(
		quest.description.trim() && quest.description.trim() !== quest.name.trim(),
	);
	const heading = (
		<>
			<img src={quest.icon} alt="" className="size-8 shrink-0 object-contain" />
			<h3 className="min-w-0 flex-1 text-sm/snug font-medium ">{quest.name}</h3>
		</>
	);
	return (
		<article aria-label={quest.name} className="border-b bg-card">
			<Collapsible open={expanded} onOpenChange={onExpandedChange}>
				{hasDescription ? (
					<CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
						{heading}
						<HugeiconsIcon
							icon={ArrowDown01Icon}
							className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180"
						/>
					</CollapsibleTrigger>
				) : (
					<div className="flex items-center gap-3 px-3 py-2.5">{heading}</div>
				)}
				{hasDescription && (
					<CollapsibleContent>
						<p className="whitespace-pre-line pb-3 pl-14 pr-4 text-sm/relaxed  text-muted-foreground">
							{quest.description}
						</p>
					</CollapsibleContent>
				)}
			</Collapsible>
		</article>
	);
}

export function QuestsTab({ active }: { active: boolean }) {
	const account = useAccount();
	const { catalog, error, retry } = useProgressionCatalog(active);
	const snapshot = progressionFor(account.snapshot)?.quests;
	const [search, setSearch] = useFilterState("quests.search", "");
	const [type, setType] = useFilterState("quests.type", "all");
	const [status, setStatus] = useFilterState("quests.status", "all");
	const [expandedQuest, setExpandedQuest] = useState<number | null>(null);
	const entries = useMemo(
		() =>
			(catalog?.allQuests ?? []).map((quest) => ({
				quest,
				status: questStatus(quest.id, snapshot),
			})),
		[catalog, snapshot],
	);
	const types = useMemo(
		() => [
			{ value: "all", label: "All quest types" },
			...Array.from(new Set(entries.map(({ quest }) => quest.typeName)))
				.sort((a, b) => a.localeCompare(b))
				.map((name) => ({ value: name, label: name })),
		],
		[entries],
	);
	const quests = useMemo(() => {
		const query = search.trim().toLowerCase();
		return entries
			.filter((entry) => {
				if (type !== "all" && entry.quest.typeName !== type) return false;
				if (status === "incomplete") {
					if (entry.status === "unknown" || entry.status === "completed")
						return false;
				} else if (status !== "all" && entry.status !== status) return false;
				return (
					!query ||
					`${entry.quest.name} ${entry.quest.description} ${entry.quest.typeName} ${entry.quest.id}`
						.toLowerCase()
						.includes(query)
				);
			})
			.sort(
				(a, b) =>
					QUEST_STATUS_ORDER.indexOf(a.status) -
						QUEST_STATUS_ORDER.indexOf(b.status) ||
					a.quest.name.localeCompare(b.quest.name) ||
					a.quest.id - b.quest.id,
			);
	}, [entries, search, type, status]);
	const rows = useMemo(
		() =>
			progressionRows(quests, ({ quest, status }) => ({
				id: `${status}:${quest.typeName}`,
				title: quest.typeName,
				status: QUEST_STATUS_LABELS[status],
				order: QUEST_STATUS_ORDER.indexOf(status),
			})),
		[quests],
	);

	const completed = entries.filter(
		(entry) => entry.status === "completed",
	).length;
	const unknown = entries.filter((entry) => entry.status === "unknown").length;

	if (error)
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3">
				<p>{error}</p>
				<Button variant="outline" onClick={retry}>
					Retry
				</Button>
			</div>
		);
	if (!catalog)
		return (
			<p
				role="status"
				className="grid flex-1 place-items-center text-sm text-muted-foreground"
			>
				Loading quests…
			</p>
		);

	return (
		<section
			aria-label="Quests"
			className="flex min-h-0 min-w-0 flex-1 flex-col"
		>
			<FilterLayout
				filters={
					<FilterPanel
						label="Quest filters"
						activeFilters={[
							...(search
								? [{ label: `“${search}”`, onRemove: () => setSearch("") }]
								: []),
							...(type !== "all"
								? [{ label: type, onRemove: () => setType("all") }]
								: []),
							...(status !== "all"
								? [
										{
											label:
												STATUSES.find((item) => item.value === status)?.label ??
												status,
											onRemove: () => setStatus("all"),
										},
									]
								: []),
						]}
					>
						<header className="flex flex-col gap-2">
							<h1 className="text-lg font-medium">Quests</h1>
							<p className="text-xs text-muted-foreground">
								{unknown === entries.length ? "—" : completed.toLocaleString()}{" "}
								/ {entries.length.toLocaleString()} completed
							</p>
						</header>
						<FieldGroup className="gap-4">
							<Field>
								<FieldLabel htmlFor="quest-search">Search quests</FieldLabel>
								<Input
									id="quest-search"
									placeholder="Search quests…"
									title="Search quests, descriptions or ID"
									value={search}
									onChange={(event) => setSearch(event.target.value)}
								/>
							</Field>
							<QuestFilter
								label="Quest type"
								items={types}
								value={type}
								onChange={setType}
							/>
							<QuestFilter
								label="Quest status"
								items={STATUSES}
								value={status}
								onChange={setStatus}
							/>
						</FieldGroup>
						<div className="flex flex-col gap-3 text-xs text-muted-foreground">
							{unknown > 0 && (
								<p>
									Log in with account sync enabled to load all quest completion
									data.
								</p>
							)}
							<span>{quests.length.toLocaleString()} shown</span>
						</div>
					</FilterPanel>
				}
			>
				{quests.length ? (
					<VirtualGrid
						items={rows}
						columns={1}
						gap={0}
						estimateRowHeight={56}
						getItemKey={(row) =>
							row.kind === "header" ? row.group.id : row.entry.quest.id
						}
						className="min-h-0 flex-1 overflow-y-auto pr-1"
						renderItem={(row) =>
							row.kind === "header" ? (
								<ProgressionGroupHeader group={row.group} count={row.count} />
							) : (
								<QuestRow
									quest={row.entry.quest}
									expanded={expandedQuest === row.entry.quest.id}
									onExpandedChange={(open) =>
										setExpandedQuest(open ? row.entry.quest.id : null)
									}
								/>
							)
						}
					/>
				) : (
					<p className="grid flex-1 place-items-center text-sm text-muted-foreground">
						No quests match these filters.
					</p>
				)}
			</FilterLayout>
		</section>
	);
}
