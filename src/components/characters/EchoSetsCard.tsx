import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { echoIcon, type RoleBuild, sonataIcon } from "@/lib/characters";
import { sonataNames, splitStatCodes, statIconAsset } from "@/lib/stats";

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
			className="size-7 object-contain bg-muted/60"
		/>
	);
}

/** Build-guide card: recommended echo sets for a role, with their main stats. */
export function EchoSetsCard({ guide }: { guide: RoleBuild }) {
	const sets = guide.echo_sets?.sets ?? [];

	return (
		<Card>
			<CardContent className="p-4 space-y-3">
				<Label className="text-base font-medium flex items-center gap-2">
					<img src="/echo-sets.webp" alt="" className="size-5" /> Echo Sets
				</Label>

				{sets.map((set) => {
					const sonatas = sonataNames(set.sonata);
					const [firstSonata, ...restSonatas] = sonatas;
					return (
						<div
							key={`${set.variant}-${set.name}-${set.sonata ?? ""}`}
							className="flex items-center gap-4 bg-muted/50 p-3"
							title={set.name}
						>
							<div className="relative shrink-0 mr-2">
								{echoIcon(set.name) ? (
									<img
										src={echoIcon(set.name)}
										alt=""
										className="size-14 object-contain bg-black/30"
									/>
								) : (
									<div className="size-14 bg-black/30" />
								)}
								{firstSonata && (
									<img
										src={sonataIcon(firstSonata)}
										alt={firstSonata}
										title={firstSonata}
										className="absolute -top-2.5 -right-2.5 size-7 object-contain bg-muted/60"
									/>
								)}
							</div>
							<div className="flex-1 min-w-0">
								{restSonatas.length > 0 && (
									<div className="flex items-center gap-1.5">
										<span className="text-sm font-medium leading-none">+</span>
										{restSonatas.map((sonata, sonataIndex) => (
											<span key={sonata} className="flex items-center gap-1.5">
												{sonataIndex > 0 && (
													<span className="size-1 rounded-full bg-muted-foreground/60" />
												)}
												<SonataIcon name={sonata} />
											</span>
										))}
									</div>
								)}
								{pcLabel(set.variant) && (
									<p className="text-xs font-medium mt-0.5">
										{pcLabel(set.variant)}
									</p>
								)}
							</div>
							{set.value && (
								<span className="text-xs font-bold bg-primary/15 text-primary px-2 py-1">
									{set.value}
								</span>
							)}
						</div>
					);
				})}

				<div className="grid grid-cols-2 gap-2 pt-1">
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
								className={`flex items-center gap-2 bg-muted/50 px-3 py-2.5 ${slot.half ? "" : "col-span-2"}`}
							>
								<span className="text-xs text-muted-foreground font-medium">
									{slot.cost}
								</span>
								<span className="text-sm font-medium flex flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-1">
									{stats.map((stat) => (
										<span key={stat} className="flex items-center gap-1.5">
											{statIconAsset(stat) && (
												<img
													src={statIconAsset(stat)}
													alt=""
													className="size-4 shrink-0 brightness-0 opacity-70 dark:brightness-100 dark:opacity-80"
												/>
											)}
											{stat}
										</span>
									))}
								</span>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
