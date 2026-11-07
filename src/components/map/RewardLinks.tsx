import { VirtualGrid } from "@/components/VirtualGrid";
import { itemLabel, tracksCollection } from "@/lib/map/collection";
import type { RewardMarker } from "@/lib/map/filters";
import { type MapReward, STATE_LABELS } from "@/lib/map/types";

export function RewardLinks({
	label,
	items,
	onSelect,
}: {
	label: string;
	items: RewardMarker[];
	onSelect: (reward: MapReward) => void;
}) {
	if (!items.length) return null;
	return (
		<section aria-label={label} className="flex flex-col gap-2 border-t pt-3">
			<h3 className="text-[10px] tracking-[.15em] text-muted-foreground">
				{label.toUpperCase()} · {items.length}
			</h3>
			<div
				className="flex min-h-0"
				style={{ height: Math.min(280, items.length * 70) }}
			>
				<VirtualGrid
					items={items}
					columns={1}
					gap={0}
					estimateRowHeight={70}
					getItemKey={(item) => item.reward.key}
					className="min-h-0 flex-1 overflow-y-auto"
					renderItem={({ reward, state }) => (
						<button
							type="button"
							className="flex w-full items-center gap-2 p-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
							onClick={() => onSelect(reward)}
							title="View on map"
						>
							<img
								src={reward.icon}
								alt=""
								className="size-8 shrink-0 bg-muted p-1"
							/>
							<span className="flex min-w-0 flex-1 flex-col gap-1">
								<span className="text-xs">
									{reward.title || itemLabel(reward)}
								</span>
								<span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
									{tracksCollection(reward) ? (
										<>
											<span className={`map-state-dot state-${state}`} />
											{STATE_LABELS[state]}
										</>
									) : (
										"View location"
									)}
								</span>
							</span>
						</button>
					)}
				/>
			</div>
		</section>
	);
}
