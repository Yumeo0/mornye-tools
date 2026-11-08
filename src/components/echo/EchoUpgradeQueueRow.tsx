import { Cancel01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { EchoCard, echoName } from "@/components/echo/EchoCard";
import type { EchoRoll } from "@/components/echo/echoRolls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { charactersById } from "@/lib/catalog";
import type { UpgradeRow } from "@/lib/echoUpgradeBatch";
import { cn } from "@/lib/utils";

const OUTCOMES: Record<UpgradeRow["outcome"], string> = {
	queued: "Queued",
	upgrading: "Upgrading",
	complete: "Complete",
	below_threshold: "Below target",
	discarded: "Marked discard",
	consumed: "Used as fodder",
	skipped: "Skipped",
	stopped: "Stopped",
	error: "Error",
};

export function EchoUpgradeQueueRow({
	row,
	index,
	roll,
	running,
	onRemove,
}: {
	row: UpgradeRow;
	index: number;
	roll?: EchoRoll;
	running: boolean;
	onRemove?: () => void;
}) {
	const active = running && row.outcome === "upgrading";
	const echo = row.echo;
	return (
		<div
			aria-current={active ? "step" : undefined}
			data-echo-id={echo.incrId}
			data-outcome={row.outcome}
			className={cn(
				"h-full min-w-0 border border-transparent",
				active && "border-primary ring-1 ring-primary",
				row.outcome === "error" && "border-destructive/50",
				row.outcome === "consumed" && "grayscale opacity-50",
			)}
		>
			<EchoCard
				echo={{ ...echo, stackCount: 1 }}
				rollValue={roll?.rating}
				rollCharacter={
					roll
						? {
								name: roll.character.character_name,
								icon:
									charactersById.get(roll.character.character_id)
										?.icon_head_256 ?? roll.character.icon_pile,
							}
						: null
				}
				actions={
					onRemove ? (
						<Button
							size="icon-sm"
							variant="ghost"
							disabled={running}
							onClick={onRemove}
							aria-label={`Remove ${echoName(echo)} +${echo.level} copy ${(row.copyIndex ?? 0) + 1} from queue`}
						>
							<HugeiconsIcon icon={Cancel01Icon} />
						</Button>
					) : undefined
				}
				footer={
					<div className="flex min-w-0 flex-1 flex-col gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs tabular-nums text-muted-foreground">
								#{index + 1}
							</span>
							<Badge variant={active ? "secondary" : "outline"}>
								{active && (
									<HugeiconsIcon
										icon={Loading03Icon}
										className="size-3 motion-safe:animate-spin"
									/>
								)}
								{OUTCOMES[row.outcome]}
							</Badge>
							{row.possible !== null && (
								<span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
									Best possible {row.possible}%
								</span>
							)}
						</div>
						<p
							className={cn(
								"text-xs text-muted-foreground",
								active && "text-foreground",
								row.outcome === "error" && "text-destructive",
							)}
						>
							{row.message}
						</p>
					</div>
				}
			/>
		</div>
	);
}
