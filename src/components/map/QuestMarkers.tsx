import { useMemo } from "react";
import type { QuestMarker } from "@/lib/progression/types";
import {
	QUEST_STATUS_ICONS,
	QUEST_STATUS_LABELS,
} from "@/lib/progression/types";
import { cn } from "@/lib/utils";

export function QuestMarkers({
	markers,
	view,
	size,
	selected,
	onSelect,
}: {
	markers: QuestMarker[];
	view: { x: number; y: number; scale: number };
	size: { width: number; height: number };
	selected: number | null;
	onSelect: (markers: QuestMarker[]) => void;
}) {
	const groups = useMemo(() => {
		const result = new Map<string, QuestMarker[]>();
		for (const marker of markers) {
			const key = `${marker.point.x.toFixed(1)}:${marker.point.y.toFixed(1)}`;
			const group = result.get(key) ?? [];
			if (!group.some((entry) => entry.quest.id === marker.quest.id))
				group.push(marker);
			result.set(key, group);
		}
		return [...result.entries()];
	}, [markers]);
	return (
		<section
			className="pointer-events-none absolute inset-0 overflow-hidden"
			aria-label="Side quest markers"
		>
			{groups.map(([key, group]) => {
				const marker =
					group.find((entry) => entry.quest.id === selected) ??
					group.find(
						(entry) =>
							entry.status === "active" || entry.status === "available",
					) ??
					group[0];
				const x = (marker.point.x - view.x) * view.scale + size.width / 2;
				const y = (marker.point.y - view.y) * view.scale + size.height / 2;
				if (x < -24 || y < -24 || x > size.width + 24 || y > size.height + 24)
					return null;
				return (
					<button
						key={key}
						type="button"
						aria-label={`${group.map((entry) => entry.quest.name).join(", ")} · ${QUEST_STATUS_LABELS[marker.status]}`}
						title={`${marker.quest.name} · ${QUEST_STATUS_LABELS[marker.status]}${group.length > 1 ? ` · ${group.length} quests` : ""}`}
						onClick={() => onSelect(group)}
						style={{ left: x, top: y }}
						className={cn(
							"pointer-events-auto absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring",
							group.some((entry) => entry.quest.id === selected) &&
								"scale-125 drop-shadow-[0_0_4px_#fff]",
							marker.status === "unknown" && "opacity-70",
						)}
					>
						<img
							src={QUEST_STATUS_ICONS[marker.status]}
							alt=""
							className="size-8 object-contain"
						/>
						{group.length > 1 && (
							<span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border bg-popover text-[9px] font-semibold text-popover-foreground">
								{group.length}
							</span>
						)}
					</button>
				);
			})}
		</section>
	);
}
