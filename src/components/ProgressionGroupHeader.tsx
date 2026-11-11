import { Badge } from "@/components/ui/badge";
import type { ProgressionGroup } from "@/lib/progression/groups";

export function ProgressionGroupHeader({
	group,
	count,
}: {
	group: ProgressionGroup;
	count: number;
}) {
	return (
		<header className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-3 py-2.5">
			<h2 className="min-w-0 flex-1 text-sm font-semibold">{group.title}</h2>
			<Badge variant="outline">{group.status}</Badge>
			<span className="text-xs tabular-nums text-muted-foreground">
				{count.toLocaleString()}
			</span>
		</header>
	);
}
