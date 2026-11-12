import { type StatKey, statLabel } from "@/lib/account";
import type { BuildRating } from "@/lib/buildRating";
import type { OptResultStats } from "@/lib/calc/types";
import type { CharacterInfo } from "@/lib/rating";
import { normalizeStatName, ratingColor } from "@/lib/stats";
import { cn } from "@/lib/utils";

const attackStats: StatKey[] = [
	"basicAtk",
	"heavyAtk",
	"resonanceSkill",
	"resonanceLiberation",
	"healingBonus",
];
const elementStats: StatKey[] = [
	"glacio",
	"fusion",
	"electro",
	"aero",
	"spectro",
	"havoc",
];
const percent = (value: number) => `${value.toFixed(1)}%`;
const panelStatName = (name: string) =>
	normalizeStatName(name).replace(/%$/, "");

/** Label/value rows stay readable at narrow widths and cover every panel bonus. */
export function BuildStats({
	stats,
	preferredStats,
	showAttributes = true,
	hideZeroBonuses = false,
}: {
	stats: OptResultStats;
	preferredStats?: CharacterInfo["stats"];
	showAttributes?: boolean;
	hideZeroBonuses?: boolean;
}) {
	const preferred = new Set(
		preferredStats
			? [
					...preferredStats["1cost"].flat(),
					...preferredStats["3cost"].flat(),
					...preferredStats["4cost"].flat(),
					...preferredStats.subs.flat(),
				].map(panelStatName)
			: [],
	);
	const groups: { label: string; entries: [string, string][] }[] = [];
	if (showAttributes) {
		groups.push({
			label: "Attributes",
			entries: [
				["HP", Math.round(stats.hp).toLocaleString()],
				["ATK", Math.round(stats.atk).toLocaleString()],
				["DEF", Math.round(stats.def).toLocaleString()],
				["Energy Regen", percent(stats.er)],
				["Crit. Rate", percent(stats.cr)],
				["Crit. DMG", percent(stats.cd)],
			],
		});
	}
	const formatBonuses = (entries: [string, number][]): [string, string][] =>
		entries
			.filter(([, value]) => !hideZeroBonuses || Number(value.toFixed(1)) !== 0)
			.map(([label, value]) => [label, percent(value)]);
	if (stats.bonuses) {
		const bonus = stats.bonuses;
		groups.push({
			label: "Damage & healing",
			entries: formatBonuses([
				...attackStats.map((key): [string, number] => [
					statLabel(key),
					bonus[key] ?? 0,
				]),
				...[
					["intro", "Intro Skill DMG Bonus"],
					["outro", "Outro Skill DMG Bonus"],
					["echo", "Echo Skill DMG Bonus"],
					["damage", "All DMG Bonus"],
					["tuneBreak", "Tune Break Boost"],
				].map(([key, label]): [string, number] => {
					const value = bonus[key as keyof typeof bonus];
					return [label, value ?? 0];
				}),
			]),
		});
		groups.push({
			label: "Elemental damage",
			entries: formatBonuses([
				...elementStats.map((key): [string, number] => [
					statLabel(key),
					bonus[key] ?? 0,
				]),
				["Physical DMG Bonus", bonus.physical ?? 0],
			]),
		});
	}
	const visibleGroups = groups.filter((group) => group.entries.length > 0);
	if (visibleGroups.length === 0) return null;
	return (
		<div
			className={cn(
				"grid gap-x-6 gap-y-4",
				visibleGroups.length === 3 && "@min-[640px]/build-stats:grid-cols-3",
				visibleGroups.length === 2 && "@min-[640px]/build-stats:grid-cols-2",
			)}
		>
			{visibleGroups.map((group) => (
				<section key={group.label} className="min-w-0" aria-label={group.label}>
					<h4 className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
						{group.label}
					</h4>
					<dl className="flex flex-col gap-1.5 text-xs">
						{group.entries.map(([label, value]) => {
							const highlighted = preferred.has(panelStatName(label));
							return (
								<div
									key={label}
									className={cn(
										"-mx-2 flex items-baseline justify-between gap-3 border-l-2 border-transparent px-2 py-0.5",
										highlighted && "border-primary/50 bg-primary/8",
									)}
									title={
										highlighted
											? "Recommended by the selected build guide"
											: undefined
									}
								>
									<dt
										className={cn(
											"text-muted-foreground",
											highlighted && "font-medium text-foreground",
										)}
									>
										{label}
										{highlighted && (
											<span className="sr-only"> (recommended)</span>
										)}
									</dt>
									<dd
										className={cn(
											"shrink-0 font-medium tabular-nums",
											highlighted && "font-semibold text-foreground",
										)}
									>
										{value}
									</dd>
								</div>
							);
						})}
					</dl>
				</section>
			))}
		</div>
	);
}

export function BuildRollValue({ rating }: { rating: BuildRating | null }) {
	if (!rating) return null;
	const completion =
		rating.maximum !== null && rating.maximum > 0
			? Math.min(100, (rating.total / rating.maximum) * 100)
			: null;
	const color =
		completion === null
			? "var(--foreground)"
			: completion >= 95
				? "var(--color-amber-400)"
				: ratingColor(completion);
	const maximum =
		rating.maximum !== null
			? `${rating.maximum}%`
			: rating.maximumEr !== null
				? "Unreachable"
				: "—";
	const description = [
		"Total echo RV / theoretical maximum with perfect substats, keeping main stats and weapon.",
		`ER target ${percent(rating.requiredEr)}.`,
		...(rating.maximum === null && rating.maximumEr !== null
			? [`Perfect-roll ER limit ${percent(rating.maximumEr)}.`]
			: []),
	].join(" ");
	return (
		<dl className="flex w-fit items-baseline gap-2" title={description}>
			<dt className="text-[10px] font-medium tracking-widest text-muted-foreground">
				RV
				<span className="sr-only">
					{" "}
					(Roll Value), total / ER-satisfied maximum
				</span>
			</dt>
			<dd className="flex items-baseline gap-2 whitespace-nowrap tabular-nums">
				<span
					className="text-2xl leading-none font-bold tracking-tight"
					style={{
						color: `color-mix(in oklab, ${color} 82%, var(--foreground))`,
						textShadow:
							completion !== null && completion >= 85
								? "0 0 16px color-mix(in oklab, currentColor 30%, transparent)"
								: undefined,
					}}
				>
					{rating.total}
					<span className="ml-0.5 text-sm font-semibold">%</span>
				</span>
				<span className="text-sm text-muted-foreground/50">/</span>
				<span className="text-sm font-medium text-muted-foreground">
					{maximum}
				</span>
			</dd>
		</dl>
	);
}
