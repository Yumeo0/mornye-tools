import { ArrowRight01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChainNodes } from "@/components/characters/ChainNodes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { weaponIconUrl, weaponName } from "@/components/weapon/WeaponCard";
import portraits from "@/configs/spine_portraits.json";
import {
	type AccountSnapshot,
	type SavedTeam,
	weaponForResonator,
} from "@/lib/account";
import { charactersById } from "@/lib/catalog";
import { qualityGradient } from "@/lib/rarity";
import type { SpinePortraitModel } from "@/lib/spine-types";
import { teamName } from "@/lib/teams";
import { cn } from "@/lib/utils";

const models: Record<string, SpinePortraitModel> = portraits;
const connectionHint = "View only. Connect to edit or switch teams.";

/** Full Resonator artwork in the same visual language as the character detail. */
export function TeamMember({
	roleId,
	snapshot,
	slot,
	compact = false,
}: {
	roleId?: number;
	snapshot: AccountSnapshot;
	slot: number;
	compact?: boolean;
}) {
	const character = roleId ? charactersById.get(roleId) : undefined;
	const poster = roleId ? models[roleId]?.poster : undefined;
	const image = poster || character?.icon_pile;
	const owned = snapshot.resonators.find((role) => role.id === roleId);
	const weapon = roleId ? weaponForResonator(snapshot, roleId) : undefined;
	const name =
		character?.character_name || owned?.name || `Resonator ${roleId}`;
	return (
		<section
			aria-label={roleId ? name : `Empty slot ${slot + 1}`}
			className={cn(
				"relative isolate flex min-w-0 flex-col justify-end",
				compact ? "h-64" : "h-64 @min-[1000px]/teams:h-68",
			)}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-7 bottom-0 overflow-hidden"
			>
				{roleId && (
					<img
						src={qualityGradient(character?.rarity)}
						alt=""
						className="absolute inset-0 size-full object-cover opacity-15"
					/>
				)}
				{character?.element_icon_round && (
					<img
						src={character.element_icon_round}
						alt=""
						className="absolute top-7 right-0 size-36 -rotate-12 object-contain opacity-[0.05]"
					/>
				)}
			</div>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 overflow-hidden"
			>
				{image ? (
					<img
						src={image}
						alt=""
						loading="lazy"
						draggable={false}
						className={cn(
							"absolute left-1/2 max-w-none -translate-x-1/2 object-contain drop-shadow-xl [mask-image:linear-gradient(to_bottom,black_68%,transparent_96%)]",
							poster
								? compact
									? "top-0 h-80 w-auto"
									: slot === 1
										? "-top-2 h-100 w-auto"
										: "top-0 h-92 w-auto"
								: compact
									? "-top-10 h-80 w-58"
									: slot === 1
										? "-top-12 h-100 w-72.5"
										: "-top-8 h-92 w-66.5",
						)}
					/>
				) : (
					<span className="absolute inset-0 flex items-center justify-center pb-12 font-mono text-8xl font-extralight text-muted-foreground/10">
						{String(slot + 1).padStart(2, "0")}
					</span>
				)}
			</div>
			{weapon && !compact && (
				<img
					src={weaponIconUrl(weapon.itemId)}
					alt=""
					title={`${weaponName(weapon)} · Lv. ${weapon.level} · R${weapon.rank}`}
					className="absolute top-[42%] right-1 size-14 -rotate-12 object-contain drop-shadow-lg"
				/>
			)}
			<div className="relative flex min-w-0 flex-col gap-2.5 bg-linear-to-t from-card via-card/95 to-transparent px-3 pt-8 pb-5">
				<h3
					className={cn(
						"min-h-12 min-w-0 content-end leading-tight font-semibold tracking-tight [overflow-wrap:anywhere]",
						compact ? "text-base" : "text-lg @min-[1000px]/teams:text-xl",
						!roleId && "text-muted-foreground",
					)}
				>
					{character?.element_icon_round && (
						<img
							src={character.element_icon_round}
							alt={character.element}
							title={character.element}
							className="mr-1.5 inline-block size-5 object-contain align-[-0.15em]"
						/>
					)}
					{roleId ? name : "Empty slot"}
				</h3>
				<div className="flex h-8 min-w-0 shrink-0 items-center gap-3">
					{owned && (
						<>
							<div
								className="flex shrink-0 items-baseline gap-1.5"
								title={`Level ${owned.level}`}
							>
								<span className="text-[10px] font-medium tracking-widest text-muted-foreground">
									LV
								</span>
								<span
									className={cn(
										"font-mono leading-none font-medium",
										compact ? "text-lg" : "text-2xl",
									)}
								>
									{owned.level}
								</span>
							</div>
							{!compact && character?.chain_icons.some(Boolean) ? (
								<ChainNodes
									chain={owned.chain}
									icons={character.chain_icons.filter(
										(icon): icon is string => !!icon,
									)}
									className="min-w-0 max-w-24"
									size="size-3"
								/>
							) : (
								<Badge variant="outline">C{owned.chain}</Badge>
							)}
						</>
					)}
				</div>
			</div>
		</section>
	);
}

/** One full-width composition with aligned character details. */
export function TeamShowcase({
	team,
	snapshot,
	connected,
	busy,
	switching,
	onEdit,
	onUse,
}: {
	team: SavedTeam;
	snapshot: AccountSnapshot;
	connected: boolean;
	busy: boolean;
	switching: boolean;
	onEdit: () => void;
	onUse: () => void;
}) {
	return (
		<article
			aria-label={teamName(team)}
			className={cn(
				"relative isolate grid w-full min-w-0 border bg-card @min-[800px]/teams:grid-cols-[9rem_minmax(0,1fr)]",
				team.isCurrent && "border-primary/40",
			)}
		>
			{team.isCurrent && (
				<div
					aria-hidden="true"
					className="absolute inset-y-6 left-0 w-0.5 bg-primary"
				/>
			)}
			<header className="relative flex flex-wrap items-center justify-between gap-4 px-5 pt-5 @min-[800px]/teams:flex-col @min-[800px]/teams:items-start @min-[800px]/teams:py-7 @min-[800px]/teams:pl-6">
				<div className="flex min-w-0 flex-col items-start gap-3">
					{team.isCurrent && <Badge variant="primary">Current team</Badge>}
					<h2 className="text-2xl leading-tight font-semibold tracking-tight [overflow-wrap:anywhere]">
						{teamName(team)}
					</h2>
				</div>
				<div className="flex flex-wrap gap-2 @min-[800px]/teams:w-full @min-[800px]/teams:flex-col @min-[800px]/teams:items-start">
					{!team.isCurrent && (
						<Tooltip disabled={connected}>
							<TooltipTrigger
								aria-description={!connected ? connectionHint : undefined}
								render={
									<Button
										variant="secondary"
										size="sm"
										className="data-disabled:opacity-50"
										disabled={!connected || busy || !team.roleIds.length}
										focusableWhenDisabled={!connected}
										onClick={onUse}
									/>
								}
							>
								{switching ? "Switching…" : "Use team"}
								<HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
							</TooltipTrigger>
							<TooltipContent>{connectionHint}</TooltipContent>
						</Tooltip>
					)}
					<Tooltip disabled={connected}>
						<TooltipTrigger
							aria-description={!connected ? connectionHint : undefined}
							render={
								<Button
									variant="ghost"
									size="sm"
									className="data-disabled:opacity-50"
									disabled={!connected || busy}
									focusableWhenDisabled={!connected}
									onClick={onEdit}
								/>
							}
						>
							<HugeiconsIcon icon={PencilEdit02Icon} data-icon="inline-start" />
							Edit team
						</TooltipTrigger>
						<TooltipContent>{connectionHint}</TooltipContent>
					</Tooltip>
				</div>
			</header>
			<div className="grid min-w-0 grid-cols-3">
				{[0, 1, 2].map((slot) => (
					<TeamMember
						key={slot}
						roleId={team.roleIds[slot]}
						snapshot={snapshot}
						slot={slot}
					/>
				))}
			</div>
		</article>
	);
}
