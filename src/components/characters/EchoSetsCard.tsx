import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { echoIcon, type RoleBuild, sonataIcon } from "@/lib/characters";
import {
	shortStatLabel,
	sonataNames,
	splitStatCodes,
	statIconAsset,
} from "@/lib/stats";
import { cn } from "@/lib/utils";

// "3+2" -> "3PC + 2PC"
function pcLabel(variant: string | undefined): string {
	if (!variant) return "";
	return `${variant
		.split("+")
		.map((part) => `${part.trim()}PC`)
		.join(" + ")}`;
}

// Main stat rows in echo slot order: 4-cost, both 3-costs, both 1-costs
const MAIN_STAT_SLOTS = [
	{ cost: "4", index: 0, half: false },
	{ cost: "3", index: 1, half: true },
	{ cost: "3", index: 2, half: true },
	{ cost: "1", index: 3, half: true },
	{ cost: "1", index: 4, half: true },
];

function SonataIcon({ name }: { name: string }) {
	return (
		<img
			src={sonataIcon(name)}
			alt={name}
			title={name}
			className="size-6 object-contain"
		/>
	);
}

/** Build-guide card: recommended echo sets for a role, with their main stats. */
export function EchoSetsCard({ guide }: { guide: RoleBuild }) {
	const sets = guide.echo_sets?.sets ?? [];

	return (
		<Card className="@container/echo-guide">
			<CardHeader>
				<CardTitle>
					<span className="flex items-center gap-2">
						<img
							src="/icons/inventory/echo-sets.webp"
							alt=""
							className="size-5 object-contain"
						/>
						Echo sets
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid items-start gap-3 @min-[440px]/echo-guide:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
					<div className="grid min-w-0 grid-cols-2 gap-2 @min-[440px]/echo-guide:grid-cols-1">
						{sets.map((set) => {
							const sonatas = sonataNames(set.sonata);
							return (
								<div
									key={`${set.variant}-${set.name}-${set.sonata ?? ""}`}
									className="relative flex min-w-0 flex-col items-center gap-2 border bg-muted/40 px-2 py-3"
									title={set.name}
								>
									<div className="relative">
										{echoIcon(set.name) ? (
											<img
												src={echoIcon(set.name)}
												alt=""
												className="size-20 object-contain drop-shadow-lg"
											/>
										) : (
											<div className="size-20 bg-muted" />
										)}
										<div className="absolute -top-1 -right-1 flex flex-col gap-1">
											{sonatas.map((sonata) => (
												<SonataIcon key={sonata} name={sonata} />
											))}
										</div>
									</div>
									<div className="flex flex-wrap items-center justify-center gap-1.5">
										{pcLabel(set.variant) && (
											<span className="text-[10px] text-muted-foreground">
												{pcLabel(set.variant)}
											</span>
										)}
										{set.value && <Badge variant="outline">{set.value}</Badge>}
									</div>
								</div>
							);
						})}
					</div>

					<div className="grid min-w-0 grid-cols-2 gap-2">
						{MAIN_STAT_SLOTS.filter(
							(slot) => (guide.echo_sets?.main_stats ?? []).length > slot.index,
						).map((slot) => {
							const stats = splitStatCodes(
								guide.echo_sets?.main_stats[slot.index],
							);
							if (stats.length === 0) return null;
							return (
								<div
									key={`${slot.cost}-${slot.index}`}
									className={cn(
										"relative flex min-h-14 items-center gap-2 border bg-muted/30 px-3 py-3",
										!slot.half && "col-span-2",
									)}
								>
									<span
										title={`${slot.cost}-cost echo`}
										className="grid size-6 shrink-0 place-items-center border border-border text-xs text-muted-foreground font-medium"
									>
										{slot.cost}
									</span>
									<span className="text-xs font-medium flex flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-1">
										{stats.map((stat) => (
											<span
												key={stat}
												title={stat}
												className="flex items-center gap-1.5"
											>
												{statIconAsset(stat) && (
													<img
														src={statIconAsset(stat)}
														alt=""
														className="size-4 shrink-0 brightness-0 opacity-70 dark:brightness-100 dark:opacity-80"
													/>
												)}
												{shortStatLabel(stat)}
											</span>
										))}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
