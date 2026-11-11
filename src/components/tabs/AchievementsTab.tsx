import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ReactNode, useMemo } from "react";
import {
	FilterField,
	FilterLayout,
	FilterPanel,
	FilterSearch,
} from "@/components/filters";
import { ProgressionGroupHeader } from "@/components/ProgressionGroupHeader";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { VirtualGrid } from "@/components/VirtualGrid";
import { useAccount } from "@/lib/account";
import { useFilterState } from "@/lib/persistentState";
import { useProgressionCatalog } from "@/lib/progression/catalog";
import { progressionRows } from "@/lib/progression/groups";
import {
	type AchievementStatus,
	achievementStatus,
	isAchievementComplete,
	progressionFor,
} from "@/lib/progression/state";
import type {
	Achievement,
	AchievementEntry,
	ProgressionCatalog,
} from "@/lib/progression/types";
import { cn } from "@/lib/utils";

type Group = ProgressionCatalog["groups"][number];

const STATUS_ORDER = { unclaimed: 0, incomplete: 1, unknown: 2, claimed: 3 };
const STATUSES = [
	{ value: "all", label: "All achievements" },
	{ value: "incomplete", label: "Incomplete" },
	{ value: "completed", label: "Completed" },
	{ value: "unclaimed", label: "Reward unclaimed" },
	{ value: "unknown", label: "Not synced" },
];
const STATUS_LABELS: Record<AchievementStatus, string> = {
	unknown: "Not synced",
	incomplete: "Incomplete",
	unclaimed: "Reward unclaimed",
	claimed: "Completed",
};

function AchievementRow({
	achievement,
	entry,
}: {
	achievement: Achievement;
	entry: AchievementEntry | undefined;
}) {
	const current = entry?.current;
	const target = entry?.target;
	const hasProgress = current != null && target != null && target > 1;
	const finished =
		entry && entry.finishedAt > 0 ? new Date(entry.finishedAt * 1000) : null;
	return (
		<article
			className="grid gap-x-6 gap-y-1 border-b bg-card px-3 py-3 md:grid-cols-[minmax(12rem,0.65fr)_minmax(0,1fr)_auto]"
			aria-label={achievement.name}
			title={`#${achievement.id}${achievement.hidden ? " · Hidden achievement" : ""}`}
		>
			<h3 className="text-sm font-medium leading-snug">{achievement.name}</h3>
			<p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
				{achievement.description}
			</p>
			{(finished || hasProgress) && (
				<footer className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
					{finished ? (
						<time dateTime={finished.toISOString()}>
							{finished.toLocaleDateString()}
						</time>
					) : (
						<span />
					)}
					{hasProgress && (
						<span className="tabular-nums">
							{current.toLocaleString()} / {target.toLocaleString()}
						</span>
					)}
				</footer>
			)}
			{hasProgress && (
				<progress
					aria-label={`${achievement.name} progress`}
					className="h-1 w-full md:col-start-2 appearance-none overflow-hidden [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
					max={target}
					value={Math.min(Math.max(current, 0), target)}
				/>
			)}
		</article>
	);
}

const COMPLETE_CLASS = "text-emerald-600 dark:text-emerald-400";

/** One navigator row; `aria-pressed` carries the selection state. */
function NavButton({
	active,
	complete,
	onClick,
	count,
	children,
}: {
	active: boolean;
	complete: boolean;
	onClick: () => void;
	count: string;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={cn(
				"flex w-full items-center gap-2 border border-transparent px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring",
				active && "border-border bg-secondary",
				complete && COMPLETE_CLASS,
			)}
		>
			{children}
			<span
				className={cn(
					"shrink-0 text-xs tabular-nums",
					complete ? "opacity-80" : "text-muted-foreground",
				)}
			>
				{count}
			</span>
		</button>
	);
}

/** `— / total` before the login snapshot, `completed / total` after. */
function countText(
	counts: { total: number; completed: number } | undefined,
	synced: boolean,
): string {
	return `${synced ? (counts?.completed ?? 0) : "—"} / ${counts?.total ?? 0}`;
}

/** Every achievement in this scope is done; empty scopes never count. */
function isComplete(counts: { total: number; completed: number } | undefined) {
	return (
		counts != null && counts.total > 0 && counts.completed === counts.total
	);
}

/** "Exploration: Huanglong" reads as "Huanglong" under the Exploration tab. */
function subCategoryName(group: Group, categoryName: string): string {
	const prefix = `${categoryName}: `;
	return group.name.startsWith(prefix)
		? group.name.slice(prefix.length)
		: group.name;
}

export function AchievementsTab({ active }: { active: boolean }) {
	const account = useAccount();
	const { catalog, error, retry } = useProgressionCatalog(active);
	const snapshot = progressionFor(account.snapshot)?.achievements;
	const [category, setCategory] = useFilterState(
		"achievements.category",
		"all",
	);
	const [groupId, setGroupId] = useFilterState("achievements.groupId", "all");
	const [search, setSearch] = useFilterState("achievements.search", "");
	const [status, setStatus] = useFilterState("achievements.status", "all");
	const [showHidden, setShowHidden] = useFilterState(
		"achievements.showHidden",
		false,
	);
	const groupById = useMemo(
		() => new Map(catalog?.groups.map((group) => [group.id, group]) ?? []),
		[catalog],
	);
	const totals = useMemo(() => {
		const result = new Map<
			number | "all",
			{ total: number; completed: number }
		>();
		for (const achievement of catalog?.achievements ?? []) {
			const group = groupById.get(achievement.groupId);
			if (!group) continue;
			for (const key of [group.categoryId, group.id, "all"] as const) {
				const count = result.get(key) ?? { total: 0, completed: 0 };
				count.total += 1;
				if (isAchievementComplete(snapshot?.entries[achievement.id]))
					count.completed += 1;
				result.set(key, count);
			}
		}
		return result;
	}, [catalog, groupById, snapshot]);
	const achievements = useMemo(() => {
		const query = search.trim().toLowerCase();
		return (catalog?.achievements ?? [])
			.filter((achievement) => {
				const group = groupById.get(achievement.groupId);
				const entry = snapshot?.entries[achievement.id];
				const state = achievementStatus(entry);
				if (!showHidden && achievement.hidden && !isAchievementComplete(entry))
					return false;
				if (category !== "all" && String(group?.categoryId) !== category)
					return false;
				if (groupId !== "all" && String(achievement.groupId) !== groupId)
					return false;
				if (
					status === "completed"
						? !isAchievementComplete(entry)
						: status !== "all" && state !== status
				)
					return false;
				return (
					!query ||
					`${achievement.name} ${achievement.description} ${group?.name} ${achievement.id}`
						.toLowerCase()
						.includes(query)
				);
			})
			.sort((a, b) => {
				return (
					STATUS_ORDER[achievementStatus(snapshot?.entries[a.id])] -
						STATUS_ORDER[achievementStatus(snapshot?.entries[b.id])] ||
					a.id - b.id
				);
			});
	}, [
		catalog,
		groupById,
		snapshot,
		category,
		groupId,
		search,
		status,
		showHidden,
	]);
	const rows = useMemo(
		() =>
			progressionRows(achievements, (achievement) => {
				const status = achievementStatus(snapshot?.entries[achievement.id]);
				return {
					id: `${status}:${achievement.groupId}`,
					title:
						groupById.get(achievement.groupId)?.name ?? "Other achievements",
					status: STATUS_LABELS[status],
					order: STATUS_ORDER[status],
				};
			}),
		[achievements, snapshot, groupById],
	);

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
				Loading achievements…
			</p>
		);
	const total = totals.get("all");
	const selectCategory = (value: string) => {
		setCategory(value);
		setGroupId("all");
	};
	return (
		<FilterLayout
			filters={
				<FilterPanel
					label="Achievement filters"
					activeFilters={[
						...(search
							? [{ label: `“${search}”`, onRemove: () => setSearch("") }]
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
						...(category !== "all"
							? [
									{
										label:
											groupById.get(Number(groupId))?.name ??
											catalog.categories.find(
												(item) => String(item.id) === category,
											)?.name ??
											"Category",
										onRemove: () => selectCategory("all"),
									},
								]
							: []),
						...(showHidden
							? [{ label: "Hidden", onRemove: () => setShowHidden(false) }]
							: []),
					]}
				>
					<div className="flex flex-col gap-4">
						<FilterSearch
							value={search}
							onChange={setSearch}
							placeholder="Search achievements…"
							inputProps={{
								"aria-label": "Search achievements",
								title: "Search achievements, descriptions or ID",
							}}
						/>
						<FilterField label="Status">
							<Select
								items={STATUSES}
								value={status}
								onValueChange={(value) => setStatus(value ?? "all")}
							>
								<SelectTrigger
									aria-label="Achievement status"
									className="w-full"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent alignItemWithTrigger={false}>
									<SelectGroup>
										{STATUSES.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</FilterField>
					</div>
					<div className="flex flex-col items-start gap-3 text-xs text-muted-foreground">
						<label
							htmlFor="show-hidden-achievements"
							className="flex items-center gap-2"
						>
							<Switch
								id="show-hidden-achievements"
								checked={showHidden}
								onCheckedChange={setShowHidden}
							/>
							Reveal hidden achievements
						</label>
						<span>{achievements.length.toLocaleString()} shown</span>
					</div>

					<nav
						aria-label="Achievement categories"
						className="flex min-w-0 flex-col gap-1"
					>
						<NavButton
							active={category === "all"}
							complete={isComplete(total)}
							onClick={() => selectCategory("all")}
							count={countText(total, snapshot != null)}
						>
							<span className="min-w-0 flex-1 whitespace-normal break-words font-medium">
								All achievements
							</span>
						</NavButton>
						{catalog.categories.map((entry) => {
							const groups = catalog.groups.filter(
								(group) => group.categoryId === entry.id,
							);
							const counts = totals.get(entry.id);
							return (
								<Collapsible
									key={entry.id}
									defaultOpen={category === String(entry.id)}
									className="flex flex-col gap-0.5"
								>
									<div className="flex items-center">
										<NavButton
											active={category === String(entry.id)}
											complete={isComplete(counts)}
											onClick={() => selectCategory(String(entry.id))}
											count={countText(counts, snapshot != null)}
										>
											<img
												src={entry.icon}
												alt=""
												className="size-6 shrink-0 object-contain"
											/>
											<span className="min-w-0 flex-1 whitespace-normal break-words font-medium">
												{entry.name}
											</span>
										</NavButton>
										<CollapsibleTrigger
											render={<Button variant="ghost" size="icon-xs" />}
											aria-label={`Expand ${entry.name} categories`}
										>
											<HugeiconsIcon icon={ArrowDown01Icon} />
										</CollapsibleTrigger>
									</div>
									<CollapsibleContent>
										<ul
											aria-label={`${entry.name} sub-categories`}
											className="ml-3 flex flex-col gap-0.5 border-l pl-1"
										>
											{groups.map((group) => {
												const groupCounts = totals.get(group.id);
												return (
													<li key={group.id}>
														<NavButton
															active={groupId === String(group.id)}
															complete={isComplete(groupCounts)}
															onClick={() => {
																setCategory(String(entry.id));
																setGroupId(String(group.id));
															}}
															count={countText(groupCounts, snapshot != null)}
														>
															<span className="min-w-0 flex-1 whitespace-normal break-words">
																{subCategoryName(group, entry.name)}
															</span>
														</NavButton>
													</li>
												);
											})}
										</ul>
									</CollapsibleContent>
								</Collapsible>
							);
						})}
					</nav>
				</FilterPanel>
			}
		>
			<section
				aria-label="Achievements"
				className="flex min-h-0 min-w-0 flex-1 flex-col gap-4"
			>
				{achievements.length ? (
					<VirtualGrid
						items={rows}
						columns={1}
						gap={0}
						estimateRowHeight={76}
						getItemKey={(row) =>
							row.kind === "header" ? row.group.id : row.entry.id
						}
						className="min-h-0 flex-1 overflow-y-auto pr-1"
						renderItem={(row) =>
							row.kind === "header" ? (
								<ProgressionGroupHeader group={row.group} count={row.count} />
							) : (
								<AchievementRow
									achievement={row.entry}
									entry={snapshot?.entries[row.entry.id]}
								/>
							)
						}
					/>
				) : (
					<p className="grid flex-1 place-items-center text-sm text-muted-foreground">
						No achievements match these filters.
					</p>
				)}
			</section>
		</FilterLayout>
	);
}
