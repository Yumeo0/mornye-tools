import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PreviewBadge({ className }: { className?: string }) {
	return (
		<Badge
			variant="outline"
			title="Preview data from ww.nanoka.cc. Subject to change."
			className={cn(
				"border-amber-600/30 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-950 dark:text-amber-200",
				className,
			)}
		>
			Preview
		</Badge>
	);
}
