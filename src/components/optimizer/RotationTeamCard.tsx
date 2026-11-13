import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { PreviewBadge } from "@/components/PreviewBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VirtualGrid } from "@/components/VirtualGrid";
import type { RotationDamage } from "@/lib/calc/rotationDamage";
import type { TeamProfile } from "@/lib/calc/types";
import { charactersById, echoesByMonsterId } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { RotationMemberArt, shortRotationVariant } from "./RotationMemberArt";

function Damage({ score }: { score?: RotationDamage }) {
	return (
		<span
			className="shrink-0 text-xs font-semibold tabular-nums"
			title={score?.warning ?? score?.error ?? "Reference team damage"}
		>
			{score?.damage != null
				? `${score.warning ? "≈ " : ""}${new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(score.damage)}`
				: score
					? "—"
					: "…"}
			<span className="ml-1 font-normal text-muted-foreground">DMG</span>
		</span>
	);
}

export function RotationTeamCard({
	profiles,
	selectedId,
	damage,
	onSelect,
}: {
	profiles: TeamProfile[];
	selectedId?: string;
	damage: ReadonlyMap<string, RotationDamage>;
	onSelect: (id: string) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const profile = profiles[0];
	const multiple = profiles.length > 1;
	const loaded = profiles.some((p) => p.id === selectedId);
	return (
		<article
			className={cn(
				"flex min-w-0 flex-col border bg-card",
				loaded && "border-primary/60",
			)}
		>
			<Button
				variant="ghost"
				className="h-auto w-full flex-col items-stretch gap-3 whitespace-normal p-3"
				aria-label={
					multiple
						? `${profile.label}: ${profiles.length} variants`
						: `Load ${profile.label}`
				}
				aria-expanded={multiple ? expanded : undefined}
				onClick={() =>
					multiple ? setExpanded(!expanded) : onSelect(profile.id)
				}
			>
				{profile.customRotation && (
					<span className="flex items-center gap-2">
						{!multiple && profile.errors.length > 0 && (
							<Badge variant="outline" title={profile.errors.join(" · ")}>
								Unavailable
							</Badge>
						)}
						<Badge variant="secondary">Custom</Badge>
						<span className="truncate">{profile.label}</span>
					</span>
				)}
				<span className="grid grid-cols-3 gap-3">
					{profile.members.map((member) => (
						<span
							key={member.characterId}
							className="flex min-w-0 flex-col items-center gap-1 text-center"
						>
							<RotationMemberArt member={member} />
							<span className="mt-1 text-sm">{member.name}</span>
							<span className="flex items-center gap-1">
								<Badge variant="outline">
									{member.mainDps ? "DPS" : "Support"}
								</Badge>
								{charactersById.get(member.characterId)?.preview && (
									<PreviewBadge />
								)}
							</span>
						</span>
					))}
				</span>
				<span className="flex items-center justify-between gap-2">
					<Damage score={damage.get(profile.id)} />
					<span className="flex items-center gap-2">
						{loaded && <Badge>Loaded</Badge>}
						{multiple && (
							<>
								<span className="text-xs text-muted-foreground">
									{profiles.length} variants
								</span>
								<HugeiconsIcon
									icon={ArrowDown01Icon}
									className={cn(
										"size-4 transition-transform",
										expanded && "rotate-180",
									)}
								/>
							</>
						)}
					</span>
				</span>
			</Button>
			{expanded && (
				<VirtualGrid
					items={profiles}
					columns={1}
					gap={0}
					estimateRowHeight={86}
					getItemKey={(p) => p.id}
					className="max-h-80 overflow-y-auto border-t"
					renderItem={(variant) => (
						<Button
							variant={variant.id === selectedId ? "secondary" : "ghost"}
							className="h-auto w-full flex-col items-stretch gap-2 border-b p-3 whitespace-normal"
							aria-label={`Load ${variant.label}, ${variant.members.map((m) => `${m.variant}, ${m.mainEcho.name}`).join("; ")}`}
							onClick={() => onSelect(variant.id)}
						>
							<span className="grid grid-cols-3 gap-2">
								{variant.members.map((member) => (
									<span
										key={member.characterId}
										className="flex min-w-0 items-center gap-1.5 text-left"
										title={`${member.name}: ${member.mainEcho.name} · ${member.variant}`}
									>
										<img
											src={
												echoesByMonsterId.get(member.mainEcho.typeId)
													?.icon_middle
											}
											alt={member.mainEcho.name}
											className="size-8 shrink-0 object-contain bg-muted/50"
										/>
										<span className="min-w-0 text-xs/snug ">
											{shortRotationVariant(member.variant) ||
												member.mainEcho.name}
										</span>
									</span>
								))}
							</span>
							<span className="flex items-center justify-between gap-2">
								<Damage score={damage.get(variant.id)} />
								{variant.errors.length > 0 && (
									<Badge variant="outline" title={variant.errors.join(" · ")}>
										Unavailable
									</Badge>
								)}
								{variant.id === selectedId && <Badge>Loaded</Badge>}
							</span>
						</Button>
					)}
				/>
			)}
		</article>
	);
}
