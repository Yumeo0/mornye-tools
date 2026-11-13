import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	RotationMemberArt,
	shortRotationVariant,
} from "@/components/optimizer/RotationMemberArt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
} from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RotationChains } from "@/lib/calc/ownedRotationDamage";
import type { SuggestedTeam } from "@/lib/teamSuggestions";

export const formatDamage = (damage: number) =>
	new Intl.NumberFormat(undefined, {
		notation: "compact",
		maximumFractionDigits: 2,
	}).format(damage);

export function SuggestedTeamCard({
	team,
	chains,
	connected,
	busy,
	replaceHint,
	selected,
	onReplace,
}: {
	team: SuggestedTeam;
	chains: RotationChains;
	connected: boolean;
	busy: boolean;
	replaceHint?: string;
	selected: boolean;
	onReplace: () => void;
}) {
	const hint = !connected
		? "Connect to this profile's game account to replace teams."
		: replaceHint;
	return (
		<Card className="min-w-0 gap-3">
			<CardHeader className="flex items-center justify-between gap-3">
				<CardAction className="shrink-0 self-center">
					<Tooltip disabled={!hint}>
						<TooltipTrigger
							aria-description={hint}
							render={
								<Button
									variant={selected ? "secondary" : "outline"}
									size="sm"
									className="data-disabled:opacity-50"
									disabled={busy || !!hint}
									focusableWhenDisabled={!!hint}
									aria-pressed={selected}
									onClick={onReplace}
								/>
							}
						>
							Replace team
							<HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
						</TooltipTrigger>
						<TooltipContent>{hint}</TooltipContent>
					</Tooltip>
				</CardAction>
				<span
					className="font-mono text-xs whitespace-nowrap tabular-nums"
					title={team.warning ?? "Rotation damage at your Resonance Chains"}
				>
					{team.warning && "≈ "}
					{formatDamage(team.damage)} DMG
				</span>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{team.profile.customRotation && (
					<p className="text-xs [overflow-wrap:anywhere]">
						{team.profile.label}
					</p>
				)}
				<div className="grid grid-cols-3 gap-3">
					{team.profile.members.map((member) => (
						<div
							key={member.characterId}
							className="flex min-w-0 flex-col items-center gap-1 text-center"
						>
							<RotationMemberArt member={member} compact />
							<span className="mt-1 text-xs font-medium">{member.name}</span>
							<span className="text-[11px] text-muted-foreground">
								{shortRotationVariant(member.variant) || "Default rotation"}
							</span>
							<Badge
								variant="outline"
								title="Resonance Chain used in this calculation"
							>
								S{chains[member.characterId] ?? member.minSequence}
							</Badge>
						</div>
					))}
				</div>
				{team.warning && (
					<p className="text-xs text-muted-foreground">{team.warning}</p>
				)}
			</CardContent>
		</Card>
	);
}
