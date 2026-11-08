import { useMemo, useState } from "react";
import { FilterLayout, FilterPanel } from "@/components/filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useResponsiveColumns, VirtualGrid } from "@/components/VirtualGrid";
import { useAccount } from "@/lib/account";
import { useProgressionCatalog } from "@/lib/progression/catalog";
import { progressionFor, questStatus } from "@/lib/progression/state";
import {
	QUEST_STATUS_LABELS,
	QUEST_STATUS_ORDER,
	type QuestDefinition,
	type QuestStatus,
} from "@/lib/progression/types";

const COLUMNS = [{ minWidth: 1500, columns: 2 }];
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
	status,
}: {
	quest: QuestDefinition;
	status: QuestStatus;
}) {
	return (
		<article
			className="flex min-h-36 items-start gap-3 border bg-card p-4"
			aria-label={quest.name}
		>
			<img
				src={quest.icon}
				alt=""
				className="size-10 shrink-0 object-contain"
			/>
			<div className="flex min-w-0 flex-1 flex-col gap-3">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<p className="text-[10px] tracking-widest text-muted-foreground">
							{quest.typeName}
						</p>
						<h2 className="text-sm font-medium leading-snug">{quest.name}</h2>
					</div>
					<Badge variant={status === "completed" ? "outline" : "secondary"}>
						{QUEST_STATUS_LABELS[status]}
					</Badge>
				</div>
				{quest.description && (
					<p
						title={quest.description}
						className="line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground"
					>
						{quest.description}
					</p>
				)}
			</div>
		</article>
	);
}

export function QuestsTab({ active }: { active: boolean }) {
	const account = useAccount();
	const { catalog, error, retry } = useProgressionCatalog(active);
	const snapshot = progressionFor(account.snapshot)?.quests;
	const [search, setSearch] = useState("");
	const [type, setType] = useState("all");
	const [status, setStatus] = useState("all");
	const columns = useResponsiveColumns(COLUMNS, 1);
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
					<FilterPanel label="Quest filters">
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
							<p>
								{unknown > 0
									? "Log in with account sync enabled to load all quest completion data."
									: "Completion synced from your current account."}
							</p>
							<span>{quests.length.toLocaleString()} shown</span>
						</div>
					</FilterPanel>
				}
			>
				{quests.length ? (
					<VirtualGrid
						items={quests}
						columns={columns}
						minItemWidth={420}
						gap={10}
						estimateRowHeight={160}
						getItemKey={(entry) => entry.quest.id}
						className="min-h-0 flex-1 overflow-y-auto pr-1"
						renderItem={(entry) => (
							<QuestRow
								key={entry.quest.id}
								quest={entry.quest}
								status={entry.status}
							/>
						)}
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
