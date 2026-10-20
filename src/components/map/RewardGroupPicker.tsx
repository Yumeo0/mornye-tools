import { Popover } from "@base-ui/react/popover";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { VirtualGrid } from "@/components/VirtualGrid";
import type { MarkerCluster } from "@/lib/map/clustering";
import { itemLabel } from "@/lib/map/collection";
import type { RewardMarker } from "@/lib/map/filters";
import { type MapReward, STATE_LABELS } from "@/lib/map/types";

const getKey = (item: RewardMarker) => item.reward.key;

export function RewardGroupPicker({
	group,
	x,
	y,
	canvas,
	onClose,
	onSelect,
}: {
	group: MarkerCluster<RewardMarker> | undefined;
	x: number;
	y: number;
	canvas: React.RefObject<HTMLCanvasElement | null>;
	onClose: () => void;
	onSelect: (reward: MapReward) => void;
}) {
	const anchor = useRef<HTMLSpanElement>(null);
	return (
		<Popover.Root
			open={!!group}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<span
				ref={anchor}
				className="pointer-events-none absolute size-px"
				style={{ left: x, top: y }}
			/>
			<Popover.Portal>
				<Popover.Positioner
					anchor={anchor}
					side="right"
					sideOffset={18}
					collisionPadding={12}
					className="z-50"
				>
					<Popover.Popup
						finalFocus={canvas}
						className="flex w-72 max-w-[calc(100vw-24px)] flex-col border bg-popover text-popover-foreground shadow-xl outline-none"
					>
						<div className="flex items-center justify-between gap-3 border-b px-3 py-2">
							<Popover.Title className="text-xs font-medium">
								{group?.items.length} rewards here
							</Popover.Title>
							<Popover.Close render={<Button variant="ghost" size="xs" />}>
								Close
							</Popover.Close>
						</div>
						<Popover.Description className="px-3 pt-2 text-[10px] text-muted-foreground">
							Select a reward to view its details.
						</Popover.Description>
						<div
							className="mt-2 flex min-h-0"
							style={{ height: Math.min(256, (group?.items.length ?? 0) * 72) }}
						>
							<VirtualGrid
								items={group?.items ?? []}
								columns={1}
								gap={0}
								estimateRowHeight={62}
								getItemKey={getKey}
								className="min-h-0 flex-1 overflow-y-auto"
								renderItem={({ reward, state }) => (
									<button
										type="button"
										className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
										onClick={() => {
											onSelect(reward);
											onClose();
										}}
									>
										<img
											src={reward.icon}
											alt=""
											className="size-8 shrink-0 rounded bg-muted p-1"
										/>
										<span className="flex min-w-0 flex-1 flex-col gap-1">
											<span className="truncate text-xs">
												{itemLabel(reward)}
											</span>
											<span className="text-[10px] text-muted-foreground">
												{reward.entityId} · Z {Math.round(reward.z)}
											</span>
											<span className="text-[10px] text-muted-foreground">
												{STATE_LABELS[state]}
											</span>
										</span>
									</button>
								)}
							/>
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
