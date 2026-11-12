import { ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { BuildRollValue, BuildStats } from "@/components/characters/BuildStats";
import { EchoCard, echoImage, echoName } from "@/components/echo/EchoCard";
import { formatDamage, statPercent } from "@/components/optimizer/display";
import { Badge, CardBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Echo, statPropLines } from "@/lib/account";
import { buildRating } from "@/lib/buildRating";
import {
	type EquippedOptimizerEchoes,
	type OptimizerEchoChange,
	optimizerEchoDifference,
} from "@/lib/calc/optimizerResults";
import type { OptResultEntry, OptResultStats } from "@/lib/calc/types";
import {
	type CharacterInfo,
	calculateRating,
	mainStatForEcho,
} from "@/lib/rating";
import { cn } from "@/lib/utils";

function StatChips({
	stats,
	totalRv,
}: {
	stats: OptResultStats;
	totalRv?: number;
}) {
	const entries: Array<[string, string]> = [
		["HP", Math.round(stats.hp).toLocaleString()],
		["ATK", Math.round(stats.atk).toLocaleString()],
		["DEF", Math.round(stats.def).toLocaleString()],
		["CR", statPercent(stats.cr)],
		["CD", statPercent(stats.cd)],
		["ER", statPercent(stats.er)],
		["RV", totalRv === undefined ? "—" : `${totalRv}%`],
	];
	return (
		<dl className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs text-muted-foreground @min-[480px]/results:grid-cols-4 @min-[1040px]/results:grid-cols-7">
			{entries.map(([label, value]) => (
				<div
					key={label}
					className="flex min-w-0 items-baseline justify-end gap-1.5 whitespace-nowrap"
				>
					<dt className="@min-[1040px]/results:sr-only">{label}</dt>
					<dd className="font-semibold tabular-nums text-foreground">
						{value}
					</dd>
				</div>
			))}
		</dl>
	);
}

const echoChangeLabels = {
	kept: "Already equipped",
	new: "New to this build",
	main: "Move to main echo",
	passive: "Move main echo to a passive slot",
	removed: "Remove from build",
};

function EchoThumb({
	echo,
	change,
}: {
	echo?: Echo;
	change?: OptimizerEchoChange | "removed";
}) {
	const image = echo && echoImage(echo);
	const label = echo ? `${echoName(echo)} +${echo.level}` : "Unavailable echo";
	const marker =
		change === "new"
			? "+"
			: change === "main"
				? "M"
				: change === "passive"
					? "↔"
					: change === "removed"
						? "−"
						: null;
	return (
		<span
			title={`${label}${change ? ` · ${echoChangeLabels[change]}` : ""}${echo ? `\n${statPropLines(echo.mainProps).join(" · ")}\n${statPropLines(echo.subProps).join(" · ")}` : ""}`}
			className={cn(
				"relative inline-flex size-7 shrink-0 bg-muted/60",
				change === "kept" && "opacity-50",
				marker && "ring-1 ring-primary/70",
				change === "removed" && "ring-destructive/70",
			)}
		>
			{image && (
				<img
					src={image}
					alt={echo ? echoName(echo) : ""}
					className="size-full object-contain"
				/>
			)}
			{marker && (
				<span
					className={cn(
						"absolute -bottom-0.5 -right-0.5 flex min-w-3 items-center justify-center bg-primary px-0.5 text-[9px] font-semibold leading-3 text-primary-foreground",
						change === "removed" &&
							"bg-popover text-destructive ring-1 ring-destructive/70",
					)}
					aria-hidden="true"
				>
					{marker}
				</span>
			)}
			{(change || !image) && (
				<span className="sr-only">
					{!image ? label : ""}
					{change ? ` · ${echoChangeLabels[change]}` : ""}
				</span>
			)}
		</span>
	);
}

function echoChangeBadge(slot: number, change?: OptimizerEchoChange) {
	const label =
		slot === 0
			? change === "new"
				? "Main · New"
				: change === "main"
					? "New main"
					: "Main"
			: change === "new"
				? "New"
				: change === "passive"
					? "Was main"
					: null;
	return label ? (
		<CardBadge title={change ? echoChangeLabels[change] : "Main echo"}>
			{label}
		</CardBadge>
	) : undefined;
}

/** One optimizer result: damage, stats and the five echoes, expandable. */
export function ResultRow({
	index,
	result,
	baseline,
	equippedEchoes = null,
	expanded,
	current,
	onToggle,
	echoByUid,
	ratingCharacter,
	equipAction,
}: {
	index: number;
	result: OptResultEntry;
	baseline: number | null;
	equippedEchoes?: EquippedOptimizerEchoes | null;
	expanded: boolean;
	/** The currently equipped build (highlighted reference row). */
	current?: boolean;
	onToggle: () => void;
	echoByUid: Map<string, Echo>;
	ratingCharacter: CharacterInfo | null;
	equipAction?: {
		label: string;
		disabled: boolean;
		reason?: string;
		onEquip: () => void;
	};
}) {
	const echoes = result.uids.map((uid) => echoByUid.get(uid));
	const rating = useMemo(() => {
		const pieces = result.uids.flatMap((uid) => echoByUid.get(uid) ?? []);
		if (pieces.length !== result.uids.length) return null;
		const energy = result.energy?.find(
			(e) => e.characterId === ratingCharacter?.character_id,
		);
		return buildRating(
			ratingCharacter,
			pieces,
			result.stats?.er,
			energy ? Math.max(energy.required, energy.kitMinimum) : undefined,
		);
	}, [result, echoByUid, ratingCharacter]);
	const difference = optimizerEchoDifference(result.uids, equippedEchoes);
	const hasChanges =
		difference &&
		(difference.added.length > 0 ||
			difference.removed.length > 0 ||
			difference.mainChanged);
	const mainOnly =
		difference &&
		!difference.added.length &&
		!difference.removed.length &&
		difference.mainChanged;
	const delta =
		baseline != null && baseline > 0 ? result.damage / baseline - 1 : null;

	return (
		<div
			className={`border-b border-border/60 last:border-b-0 ${
				current ? "bg-amber-400/10" : ""
			}`}
		>
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={expanded}
				className={`flex w-full flex-col gap-1 px-3 py-1.5 text-left transition-colors ${
					current ? "hover:bg-amber-400/15" : "hover:bg-muted/40"
				}`}
			>
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
					<span className="flex w-8 shrink-0 justify-start">
						<span className="text-[11px] text-muted-foreground">
							#{index + 1}
						</span>
					</span>
					<span className="w-24 shrink-0 text-sm font-semibold tabular-nums">
						{formatDamage(result.damage)}
					</span>
					{current ? (
						<span className="flex w-16 shrink-0 justify-start">
							<CardBadge
								title="Currently equipped build"
								className="bg-amber-500/80"
							>
								Current
							</CardBadge>
						</span>
					) : delta != null ? (
						<span
							className={`w-16 shrink-0 text-[11px] font-semibold ${
								delta >= 0 ? "text-emerald-400" : "text-red-400"
							}`}
						>
							{delta >= 0 ? "+" : ""}
							{(delta * 100).toFixed(1)}%
						</span>
					) : (
						<span className="w-16 shrink-0" />
					)}
					{result.stats && (
						<span className="order-last basis-full min-w-0 @min-[1040px]/results:order-none @min-[1040px]/results:flex-1 @min-[1040px]/results:basis-0">
							<StatChips stats={result.stats} totalRv={rating?.total} />
						</span>
					)}
					<span className="ml-auto flex shrink-0 items-center justify-end gap-1 @min-[1040px]/results:w-60">
						{!current && hasChanges && (
							<Badge
								variant="outline"
								title={`${difference.added.length} new echoes · ${difference.removed.length} removed${difference.mainChanged ? " · main echo changed" : ""}`}
							>
								{difference.added.length
									? `${difference.added.length} new`
									: difference.removed.length
										? `${difference.removed.length} removed`
										: "Main swap"}
							</Badge>
						)}
						{echoes.map((echo, slot) => (
							<EchoThumb
								key={result.uids[slot]}
								echo={echo}
								change={current ? undefined : difference?.changes[slot]}
							/>
						))}
						<ChevronDown
							className={`size-4 shrink-0 text-muted-foreground transition-transform ${
								expanded ? "rotate-180" : ""
							}`}
						/>
					</span>
				</div>
			</button>
			{expanded && (
				<div className="flex flex-col gap-2 border-t border-border/60 bg-muted/20 px-3 py-2">
					<div className="flex flex-wrap items-center gap-3">
						<BuildRollValue rating={rating} />
						<div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-3">
							{hasChanges && (
								<figure
									className="flex flex-wrap items-center gap-2"
									aria-label={
										mainOnly
											? "Main echo change"
											: "Echo changes from equipped build"
									}
								>
									<figcaption className="text-[11px] text-muted-foreground">
										{mainOnly ? "Main" : "Changes"}
									</figcaption>
									<span className="flex items-center gap-1">
										{(mainOnly
											? equippedEchoes?.mainUid
												? [equippedEchoes.mainUid]
												: []
											: difference.removed
										).map((uid) => (
											<EchoThumb
												key={uid}
												echo={echoByUid.get(uid)}
												change={mainOnly ? undefined : "removed"}
											/>
										))}
									</span>
									{(mainOnly
										? equippedEchoes?.mainUid
										: difference.removed.length > 0) && (
										<span aria-hidden="true" className="text-muted-foreground">
											→
										</span>
									)}
									<span className="flex items-center gap-1">
										{(mainOnly ? [result.uids[0]] : difference.added).map(
											(uid) => (
												<EchoThumb
													key={uid}
													echo={echoByUid.get(uid)}
													change={mainOnly ? "main" : "new"}
												/>
											),
										)}
									</span>
								</figure>
							)}
							{equipAction && (
								<div className="flex flex-col items-end gap-1">
									<Button
										size="sm"
										disabled={equipAction.disabled}
										title={equipAction.reason}
										onClick={equipAction.onEquip}
									>
										{equipAction.label}
									</Button>
									{equipAction.disabled && equipAction.reason && (
										<span className="max-w-72 text-right text-xs text-muted-foreground">
											{equipAction.reason}
										</span>
									)}
								</div>
							)}
						</div>
					</div>
					<div className="grid grid-cols-1 gap-2 @min-[360px]/results:grid-cols-2 @min-[600px]/results:grid-cols-3 @min-[860px]/results:grid-cols-5">
						{echoes.map((echo, slot) =>
							echo ? (
								<div
									key={result.uids[slot]}
									className={cn(
										"bg-card ring-1",
										difference?.changes[slot] &&
											difference.changes[slot] !== "kept"
											? "ring-primary/70"
											: "ring-foreground/10",
									)}
								>
									<EchoCard
										echo={echo}
										compareTo={
											!current && equippedEchoes?.uids[slot]
												? echoByUid.get(equippedEchoes.uids[slot])
												: undefined
										}
										rollValue={
											ratingCharacter
												? calculateRating(
														ratingCharacter,
														statPropLines(echo.subProps),
														mainStatForEcho(echo),
													)
												: null
										}
										rollSubstatTiers={ratingCharacter?.stats.subs}
										rollErBreakpoint={ratingCharacter?.stats.erBreakpoint}
										rollCharacter={
											ratingCharacter
												? {
														name: ratingCharacter.character_name,
														icon: ratingCharacter.icon_pile,
													}
												: null
										}
										rollBadge={echoChangeBadge(slot, difference?.changes[slot])}
									/>
								</div>
							) : null,
						)}
					</div>
					{result.stats && (
						<div className="@container/build-stats py-3 empty:hidden">
							<BuildStats
								stats={result.stats}
								preferredStats={ratingCharacter?.stats}
								showAttributes={false}
								hideZeroBonuses
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
