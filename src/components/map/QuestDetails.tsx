import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { QUEST_STATUS_LABELS, type QuestMarker } from "@/lib/progression/types";

export function QuestDetails({
	marker,
	nearby,
	onSelect,
	onClose,
}: {
	marker: QuestMarker;
	nearby: QuestMarker[];
	onSelect: (id: number) => void;
	onClose: () => void;
}) {
	const { quest, point, status, objective } = marker;
	const items = nearby.map((entry) => ({
		value: String(entry.quest.id),
		label: entry.quest.name,
	}));
	return (
		<aside
			aria-label="Side quest details"
			className="absolute right-3 top-3 flex max-h-[calc(100%_-_1.5rem)] w-80 flex-col gap-3 overflow-y-auto border bg-background/95 p-4 shadow-xl max-[1000px]:w-60"
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 flex-col gap-2">
					<p className="text-[10px] tracking-[.15em] text-muted-foreground">
						SIDE QUEST
					</p>
					<h2 className="text-sm font-medium">{quest.name}</h2>
				</div>
				<Button
					variant="ghost"
					size="icon-xs"
					aria-label="Close quest details"
					onClick={onClose}
				>
					×
				</Button>
			</div>
			<Badge
				variant={
					status === "available" || status === "active"
						? "outline"
						: "secondary"
				}
			>
				{QUEST_STATUS_LABELS[status]}
			</Badge>
			{nearby.length > 1 && (
				<Select
					items={items}
					value={String(quest.id)}
					onValueChange={(value) => {
						if (value) onSelect(Number(value));
					}}
				>
					<SelectTrigger aria-label="Quests at this location">
						<SelectValue />
					</SelectTrigger>
					<SelectContent alignItemWithTrigger={false}>
						<SelectGroup>
							{items.map((item) => (
								<SelectItem key={item.value} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			)}
			{quest.description && (
				<p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
					{quest.description}
				</p>
			)}
			<Separator />
			<div className="flex flex-col gap-1 text-xs">
				<p className="text-[10px] tracking-widest text-muted-foreground">
					{objective ? "CURRENT OBJECTIVE" : "QUEST GIVER"}
				</p>
				{objective && <p>{objective}</p>}
				{point.area && <p>{point.area}</p>}
			</div>
			{quest.prerequisites.length > 0 && (
				<div className="flex flex-col gap-2 text-xs">
					<p className="text-[10px] tracking-widest text-muted-foreground">
						REQUIREMENTS
					</p>
					<ul className="flex list-inside list-disc flex-col gap-1 text-muted-foreground">
						{[...new Set(quest.prerequisites)].map((requirement) => (
							<li key={requirement}>{requirement}</li>
						))}
					</ul>
				</div>
			)}
			{status === "unknown" && (
				<p className="text-xs text-muted-foreground">
					Start capture before logging in to sync quest status automatically.
				</p>
			)}
			{quest.hiddenAccept && (
				<p className="text-[10px] text-muted-foreground">
					The game hides this quest's acceptance marker.
				</p>
			)}
		</aside>
	);
}
