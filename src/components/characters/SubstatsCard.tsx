import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { RoleBuild } from "@/lib/characters";
import {
	energyRegenBreakpoint,
	normalizeStatName,
	parseSubstatTiers,
	rollValueSubstatTiers,
	type StatTier,
	statIconAsset,
	statIconUrl,
	substatPriorityWeights,
} from "@/lib/stats";

function SubstatChip({ stat, weight }: { stat: StatTier; weight: number }) {
	return (
		<div className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-3 py-2 flex-1 min-w-0">
			<img
				src={statIconAsset(stat.name) ?? statIconUrl(stat.code)}
				alt=""
				className="size-4 shrink-0"
			/>
			<span className="text-sm font-semibold truncate">
				{stat.name}
				{stat.breakpoint && (
					<span className="font-normal opacity-80"> [{stat.breakpoint}]</span>
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
			<CardContent className="p-4 flex flex-col gap-3">
				<Label className="text-base font-medium flex items-center gap-2">
					<img
						src="/icons/inventory/echo-sets.webp"
						alt=""
						className="size-5"
					/>{" "}
					Substats Priority
				</Label>

				<div className="flex flex-col gap-1">
					{tiers.map((tier, tierIndex) => (
						<div key={tier.map((stat) => stat.code).join("=")}>
							<div className="flex gap-2">
								{tier.map((stat) => (
									<SubstatChip
										key={stat.code}
										stat={stat}
										weight={weights.get(normalizeStatName(stat.name)) ?? 0}
									/>
								))}
							</div>
							{tierIndex < tiers.length - 1 && (
								<div className="text-center text-xs text-muted-foreground leading-none py-0.5">
									▼
								</div>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
