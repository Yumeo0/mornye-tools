import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoleBuild } from "@/lib/characters";
import {
	energyRegenBreakpoint,
	normalizeStatName,
	parseSubstatTiers,
	rollValueSubstatTiers,
	type StatTier,
	shortStatLabel,
	statIconAsset,
	statIconUrl,
	substatPriorityWeights,
} from "@/lib/stats";
import { cn } from "@/lib/utils";

function SubstatChip({
	stat,
	weight,
	first,
}: {
	stat: StatTier;
	weight: number;
	first: boolean;
}) {
	return (
		<div
			title={stat.name}
			className={cn(
				"flex min-w-0 flex-[1_1_10rem] items-center gap-2 border bg-muted/30 px-2.5 py-2",
				first && "border-primary/30 bg-primary/10",
			)}
		>
			<img
				src={statIconAsset(stat.name) ?? statIconUrl(stat.code)}
				alt=""
				className="size-4 shrink-0"
			/>
			<span className="min-w-0 flex-1 text-xs font-medium">
				{shortStatLabel(stat.name)}
				{stat.breakpoint && (
					<span className="font-normal text-muted-foreground">
						{" "}
						[{stat.breakpoint}]
					</span>
				)}
			</span>
			<Badge title="Roll value priority weight">×{weight}</Badge>
		</div>
	);
}

/** Build-guide card: substat priority tiers, high to low. */
export function SubstatsCard({
	guide,
	fallbackPriority,
}: {
	guide: RoleBuild;
	fallbackPriority?: string | null;
}) {
	// Roles without their own substat priority fall back to the first role's
	const priority = guide.substats_priority ?? fallbackPriority ?? null;
	const tiers = parseSubstatTiers(priority);
	if (tiers.length === 0) return null;
	const weights = substatPriorityWeights(
		rollValueSubstatTiers(priority).map((tier) =>
			tier.map((stat) => stat.name),
		),
		energyRegenBreakpoint(priority),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Substat priority</CardTitle>
			</CardHeader>
			<CardContent>
				<ol className="relative flex flex-col gap-2 before:absolute before:top-3 before:bottom-3 before:left-2.5 before:w-px before:bg-border">
					{tiers.map((tier, tierIndex) => (
						<li
							key={tier.map((stat) => stat.code).join("=")}
							className="relative flex items-start gap-3"
						>
							<span
								className="relative mt-2 grid size-5 shrink-0 place-items-center bg-card text-[10px] tabular-nums text-muted-foreground"
								title={`Priority ${tierIndex + 1}`}
							>
								{tierIndex + 1}
							</span>
							<div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
								{tier.map((stat) => (
									<SubstatChip
										key={stat.code}
										stat={stat}
										weight={weights.get(normalizeStatName(stat.name)) ?? 0}
										first={tierIndex === 0}
									/>
								))}
							</div>
						</li>
					))}
				</ol>
			</CardContent>
		</Card>
	);
}
