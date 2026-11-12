import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { type GameVersionStatus, gameVersionWarning } from "@/lib/sniffer";
import { useSnifferStatus } from "@/lib/snifferStatus";

/** Subscribe here so listener polling does not re-render every app tab. */
export function GameVersionBanner({
	onOpenUpdates,
}: {
	onOpenUpdates: () => void;
}) {
	const { status } = useSnifferStatus();
	return (
		<GameVersionWarning
			version={status?.game_version}
			onOpenUpdates={onOpenUpdates}
		/>
	);
}

/** Remains visible across tabs for as long as the installed release is unsupported. */
export function GameVersionWarning({
	version,
	onOpenUpdates,
}: {
	version: GameVersionStatus | undefined;
	onOpenUpdates: () => void;
}) {
	const warning = gameVersionWarning(version);
	if (!warning) return null;
	return (
		<Alert className="shrink-0 border-x-0 border-t-0 px-4 py-3">
			<HugeiconsIcon icon={Alert02Icon} />
			<AlertTitle>Game update not yet supported</AlertTitle>
			<AlertDescription>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<p>{warning}</p>
					<Button
						variant="outline"
						size="sm"
						className="shrink-0 self-start"
						onClick={onOpenUpdates}
					>
						Open update settings
					</Button>
				</div>
			</AlertDescription>
		</Alert>
	);
}
