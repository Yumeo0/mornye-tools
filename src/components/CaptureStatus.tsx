import { Alert02Icon, Pulse02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { captureHealth } from "@/lib/sniffer";
import { useSnifferStatus } from "@/lib/snifferStatus";
import { cn } from "@/lib/utils";

export function CaptureStatus({
	compact,
	onOpen,
}: {
	compact: boolean;
	onOpen: () => void;
}) {
	const { status, error } = useSnifferStatus();
	const health = captureHealth(status, error);
	const attention = health.tone === "warning" || health.tone === "error";
	return (
		<Button
			variant="ghost"
			onClick={onOpen}
			title={`Passive listener: ${health.label}. ${health.detail} Open capture diagnostics.`}
			aria-label={`Passive listener: ${health.label}. Open capture diagnostics`}
			className={cn(
				"h-auto min-h-10 w-full shrink-0 gap-2 py-2",
				compact ? "justify-center px-0" : "justify-start px-3",
			)}
		>
			<HugeiconsIcon
				icon={attention ? Alert02Icon : Pulse02Icon}
				className={cn(
					"shrink-0",
					health.tone === "error"
						? "text-destructive"
						: health.tone === "ok"
							? "text-primary"
							: "text-muted-foreground",
				)}
			/>
			{!compact && (
				<span className="flex min-w-0 flex-col items-start gap-0.5">
					<span className="text-[10px] text-muted-foreground">
						Passive listener
					</span>
					<span className="max-w-full truncate text-xs">{health.label}</span>
				</span>
			)}
			<span className="sr-only" role="status" aria-atomic="true">
				Passive listener: {health.label}
			</span>
		</Button>
	);
}
