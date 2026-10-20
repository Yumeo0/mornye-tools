import { type ReactNode, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useResponsiveColumns, VirtualGrid } from "@/components/VirtualGrid";
import { useAccount } from "@/lib/account";
import { useProgressionCatalog } from "@/lib/progression/catalog";
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

const COLUMNS = [{ minWidth: 1500, columns: 2 }];
const achievementKey = (entry: Achievement) => entry.id;
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
	group,
}: {
	achievement: Achievement;
	entry: AchievementEntry | undefined;
	group: string;
}) {
	const status = achievementStatus(entry);
	const current = entry?.current;
	const target = entry?.target;
	return (
		<article
			className="flex min-h-36 flex-col gap-3 border bg-card p-4"
			aria-label={achievement.name}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-1">
					<p className="text-[10px] tracking-widest text-muted-foreground">
						{group}
					</p>
					<h2 className="text-sm font-medium leading-snug">
						{achievement.name}
					</h2>
				</div>
				<Badge variant={status === "unclaimed" ? "outline" : "secondary"}>
					{STATUS_LABELS[status]}
				</Badge>
			</div>
			<p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
				{achievement.description}
			</p>
			<div className="mt-auto flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
				<span>
					{achievement.hidden ? "Hidden achievement" : `#${achievement.id}`}
				</span>
				{entry && entry.finishedAt > 0 ? (
					<time dateTime={new Date(entry.finishedAt * 1000).toISOString()}>
						{new Date(entry.finishedAt * 1000).toLocaleDateString()}
					</time>
				) : (
					<span>
						{current != null && target != null && target > 0
							? `${current.toLocaleString()} / ${target.toLocaleString()}`
							: STATUS_LABELS[status]}
					</span>
				)}
			</div>
			{current != null && target != null && target > 0 && (
				<progress
					aria-label={`${achievement.name} progress`}
					className="h-1 w-full appearance-none overflow-hidden [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
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
				"flex w-full items-center gap-2 border border-transparent px-2 py-1.5 text-left text-xs outline-none transition-colors hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring",
				active && "border-border bg-secondary",
				complete && COMPLETE_CLASS,
			)}
		>
			{children}
			<span
				className={cn(
					"shrink-0 text-[10px]",
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
	const [category, setCategory] = useState("all");
	const [groupId, setGroupId] = useState("all");
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("all");
	const [showHidden, setShowHidden] = useState(false);
	const columns = useResponsiveColumns(COLUMNS, 1);
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
				const states = { unclaimed: 0, incomplete: 1, unknown: 2, claimed: 3 };
				return (
					states[achievementStatus(snapshot?.entries[a.id])] -
						states[achievementStatus(snapshot?.entries[b.id])] || a.id - b.id
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
		<div className="flex min-h-0 flex-1 gap-4 pb-4">
			<nav
				aria-label="Achievement categories"
				className="flex w-74 shrink-0 flex-col gap-1 overflow-y-auto border-r pr-2"
			>
				<NavButton
					active={category === "all"}
					complete={isComplete(total)}
					onClick={() => selectCategory("all")}
					count={countText(total, snapshot != null)}
				>
					<span className="min-w-0 flex-1 truncate font-medium">
						All achievements
					</span>
				</NavButton>
				{catalog.categories.map((entry) => {
					const groups = catalog.groups.filter(
						(group) => group.categoryId === entry.id,
					);
					const counts = totals.get(entry.id);
					return (
						<div key={entry.id} className="flex flex-col gap-0.5">
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
								<span className="min-w-0 flex-1 truncate font-medium">
									{entry.name}
								</span>
							</NavButton>
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
												<span className="min-w-0 flex-1 truncate">
													{subCategoryName(group, entry.name)}
												</span>
											</NavButton>
										</li>
									);
								})}
							</ul>
						</div>
					);
				})}
			</nav>
			<section
				aria-label="Achievements"
				className="flex min-h-0 flex-1 flex-col gap-4"
			>
				<div className="flex flex-wrap items-center gap-3">
					<Input
						aria-label="Search achievements"
						placeholder="Search achievements, descriptions or ID…"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						className="min-w-48 flex-1"
					/>
					<Select
						items={STATUSES}
						value={status}
						onValueChange={(value) => setStatus(value ?? "all")}
					>
						<SelectTrigger aria-label="Achievement status" className="w-44">
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
				</div>
				<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
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
				{achievements.length ? (
					<VirtualGrid
						items={achievements}
						columns={columns}
						gap={10}
						estimateRowHeight={160}
						getItemKey={achievementKey}
						className="min-h-0 flex-1 overflow-y-auto pr-1"
						renderItem={(achievement) => (
							<AchievementRow
								key={achievement.id}
								achievement={achievement}
								entry={snapshot?.entries[achievement.id]}
								group={groupById.get(achievement.groupId)?.name ?? ""}
							/>
						)}
					/>
				) : (
					<p className="grid flex-1 place-items-center text-sm text-muted-foreground">
						No achievements match these filters.
					</p>
				)}
			</section>
		</div>
	);
}
