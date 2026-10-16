import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { RoleBuild } from "@/lib/characters";
import {
	parseSubstatTiers,
	type StatTier,
	statIconAsset,
	statIconUrl,
} from "@/lib/stats";

function SubstatChip({ stat }: { stat: StatTier }) {
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
	const tiers = parseSubstatTiers(
		guide.substats_priority ?? fallbackPriority ?? null,
	);
	if (tiers.length === 0) return null;

	return (
		<Card>
			<CardContent className="p-4 space-y-3">
				<Label className="text-base font-medium flex items-center gap-2">
					<img src="/echo-sets.webp" alt="" className="size-5" /> Substats
					Priority
				</Label>

				<div className="space-y-1">
					{tiers.map((tier, tierIndex) => (
						<div key={tier.map((stat) => stat.code).join("=")}>
							<div className="flex gap-2">
								{tier.map((stat) => (
									<SubstatChip key={stat.code} stat={stat} />
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
