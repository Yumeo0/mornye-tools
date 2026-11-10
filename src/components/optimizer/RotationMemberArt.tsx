import type { TeamMemberProfile } from "@/lib/calc/types";
import { charactersById, echoesByMonsterId } from "@/lib/catalog";
import { qualityGradient } from "@/lib/rarity";
import { cn } from "@/lib/utils";

export function shortRotationVariant(variant: string) {
	return variant
		.replace(/Resonance Mode - /g, "")
		.replace(/^Rotation 1(?: · |$)/, "")
		.replace(/Rotation (\d+)/g, "Loop $1");
}

/** Character portrait with the rotation's fixed slot-one echo. */
export function RotationMemberArt({
	member,
	className,
	compact = false,
}: {
	member: TeamMemberProfile;
	className?: string;
	compact?: boolean;
}) {
	const character = charactersById.get(member.characterId);
	const echo = echoesByMonsterId.get(member.mainEcho.typeId);
	return (
		<span
			className={cn(
				"relative inline-block shrink-0",
				compact ? "size-14" : "size-20",
				className,
			)}
		>
			{character && (
				<img
					src={character.icon_head_256}
					alt=""
					className="size-full object-contain"
				/>
			)}
			{character?.element_icon_round && (
				<img
					src={character.element_icon_round}
					alt={character.element}
					className="absolute left-0 top-0 size-4 object-contain"
				/>
			)}
			<span
				title={`Slot 1 · ${member.mainEcho.name} (fixed)`}
				className={cn(
					"absolute -bottom-1 -right-1 flex items-center justify-center overflow-hidden bg-amber-100 ring-1 ring-amber-700/30 dark:bg-amber-950 dark:ring-amber-300/30",
					compact ? "size-7" : "size-9",
				)}
			>
				<img
					src={qualityGradient(5)}
					alt=""
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 size-full object-cover"
				/>
				{echo?.icon_middle ? (
					<img
						src={echo.icon_middle}
						alt={member.mainEcho.name}
						className="relative size-full object-contain"
					/>
				) : (
					<span className="relative">1</span>
				)}
			</span>
		</span>
	);
}
