import type { ReactNode } from "react";
import { EchoMarkStatus } from "@/components/echo/EchoMarkStatus";
import type { EchoRoll } from "@/components/echo/echoRolls";
import { SubStatRollBar } from "@/components/echo/SubStatRollBar";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	type Echo,
	formatStatValue,
	statLabel,
	statPropLines,
} from "@/lib/account";
import {
	type CatalogCharacter,
	catalogCharacters,
	charactersById,
	type EchoSet,
	type EchoSpecies,
	echoesByMonsterId,
	echoSetsFor,
	groupEchoSpecies,
	sonataIcon128,
} from "@/lib/catalog";
import {
	normalizeStatName,
	ratingColor,
	shortStatLabel,
	statIconAsset,
	substatPriorityWeights,
} from "@/lib/stats";
import { cn } from "@/lib/utils";

/** Every character, deduplicated and sorted by name. */
export const allCharacters: CatalogCharacter[] = [...catalogCharacters].sort(
	(a, b) => a.character_name.localeCompare(b.character_name),
);

/** Every visible species once, with all sets and their underlying game variants. */
export const allEchoSpecies: EchoSpecies[] = groupEchoSpecies(
	echoesByMonsterId.values(),
).sort((a, b) => a.echo_name.localeCompare(b.echo_name));

export function echoKey(echo: Echo): string {
	return `incr:${echo.incrId}`;
}

export function echoName(echo: Echo): string {
	return (
		echoesByMonsterId.get(echo.monsterId)?.echo_name ?? `Echo ${echo.monsterId}`
	);
}

export function echoImage(echo: Echo): string | undefined {
	return echoesByMonsterId.get(echo.monsterId)?.icon_middle;
}

export function echoCost(echo: Echo): number | undefined {
	return echoesByMonsterId.get(echo.monsterId)?.echo_cost;
}

/** The sonata set of the echo instance (`set_id`), falling back to the first. */
export function echoSet(echo: Echo): EchoSet | undefined {
	const entry = echoesByMonsterId.get(echo.monsterId);
	if (!entry) return undefined;
	return echoSetsFor(entry, echo.setId)[0];
}

/** Plain-text summary of an echo, used by the right-click "copy info" menu. */
export function echoInfoText(
	echo: Echo,
	roll?: { rating: number; character: { character_name: string } } | null,
): string {
	const name = echoName(echo);
	const set = echoSet(echo);
	const stack = echo.stackCount > 1 ? ` ×${echo.stackCount}` : "";
	const lines = [
		`${name} +${echo.level}${stack}${set ? ` · ${set.name}` : ""}`,
	];
	const mains = statPropLines(echo.mainProps).join(" / ");
	if (mains) lines.push(`Main: ${mains}`);
	const subs = statPropLines(echo.subProps).join(" / ");
	if (subs) lines.push(`Subs: ${subs}`);
	if (roll) {
		lines.push(`RV ${roll.rating}% (${roll.character.character_name})`);
	}
	return lines.join("\n");
}

export function equippedCharacter(
	equippedBy: number | null | undefined,
): CatalogCharacter | undefined {
	if (equippedBy == null) return undefined;
	return charactersById.get(equippedBy);
}

function StatRow({
	label,
	value,
	weight,
	previous,
}: {
	label: string;
	value: string;
	weight?: number;
	previous?: string | null;
}) {
	const numeric = Number.parseFloat(value);
	const contributes = weight !== undefined && weight > 0;
	const icon = statIconAsset(label);
	return (
		<div
			className="min-w-0 py-1"
			title={`${label}${previous !== undefined ? ` · Equipped: ${previous ?? "No roll"}` : ""}${weight !== undefined ? ` · RV weight ×${weight}` : ""}`}
		>
			<div className="flex min-h-4 items-center gap-1.5">
				{previous !== undefined && previous !== value && (
					<span
						role="img"
						aria-label="Changed substat"
						className="size-1 shrink-0 rounded-full bg-primary"
					/>
				)}
				{icon && (
					<img src={icon} alt="" className="size-3 shrink-0 opacity-70" />
				)}
				<span
					className={cn(
						"min-w-0 flex-1 truncate text-xs",
						!contributes && "text-muted-foreground",
					)}
				>
					{shortStatLabel(label)}
				</span>
				<span
					className={cn(
						"shrink-0 text-xs tabular-nums",
						contributes ? "font-semibold" : "text-muted-foreground",
					)}
				>
					{value}
				</span>
			</div>
			<SubStatRollBar
				statName={label}
				value={numeric}
				className="mt-1 h-0.5"
				dimmed={!contributes}
			/>
		</div>
	);
}

export function EchoCard({
	echo,
	rollValue,
	rollCharacter,
	rollSubstatTiers,
	rollErBreakpoint,
	rollOptions,
	onRollSelect,
	rollBadge,
	actions,
	equipment,
	footer,
	markActions,
	compareTo,
}: {
	echo: Echo;
	/** Character-specific roll rating (0-100); hidden when null. */
	rollValue?: number | null;
	/** Character the roll value is for, with a portrait and readable name. */
	rollCharacter?: { name: string; icon: string } | null;
	/** Priority tiers of the character whose roll value is displayed. */
	rollSubstatTiers?: string[][];
	rollErBreakpoint?: number;
	/** Nonzero RVs available to view instead of the default best score. */
	rollOptions?: EchoRoll[];
	onRollSelect?: (roll: EchoRoll) => void;
	/** Slot/change annotation shown beside the roll value. */
	rollBadge?: ReactNode;
	/** Secondary actions or a selection checkbox, always in the header corner. */
	actions?: ReactNode;
	/** Equipment state and its control, sharing the mark toolbar. */
	equipment?: ReactNode;
	footer?: ReactNode;
	/** Mark controls beside equipment or rating; otherwise show a read-only status. */
	markActions?: ReactNode;
	/** Equipped echo in this slot; differences are marked with a dot. */
	compareTo?: Echo;
}) {
	const image = echoImage(echo);
	const set = echoSet(echo);
	const name = echoName(echo);
	const cost = echoCost(echo);
	const primary = echo.mainProps[0];
	const hasRating = rollValue != null || !!rollBadge;
	const markControl = markActions || <EchoMarkStatus echo={echo} />;
	const weights =
		rollValue != null && rollValue > 0 && rollSubstatTiers
			? substatPriorityWeights(rollSubstatTiers, rollErBreakpoint)
			: null;
	const rollLabel = (
		<>
			{rollCharacter?.icon && (
				<img
					src={rollCharacter.icon}
					alt=""
					className="size-5 shrink-0 object-contain"
				/>
			)}
			<span
				className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
				title={rollCharacter?.name}
			>
				{rollCharacter?.name ?? "Roll value"}
			</span>
			<span className="flex shrink-0 items-baseline gap-1.5">
				{rollCharacter && (
					<span className="text-[10px] font-medium tracking-wide text-muted-foreground">
						RV
					</span>
				)}
				<span
					className="text-base font-bold leading-none tabular-nums"
					style={{
						color: `color-mix(in oklab, ${ratingColor(rollValue ?? 0)} 82%, var(--foreground))`,
					}}
				>
					{rollValue}%
				</span>
			</span>
		</>
	);
	return (
		<Card
			className="group/card @container/echo-card h-full min-w-0 gap-0 py-0"
			role="group"
			aria-label={`${name}, level ${echo.level}`}
		>
			<CardHeader className="flex items-start gap-2 p-2.5 pb-1.5">
				<div className="relative grid size-9 shrink-0 place-items-center bg-muted/70">
					{image && (
						<img src={image} alt="" className="size-full object-contain" />
					)}
					{set && (
						<img
							src={sonataIcon128(set.icon)}
							alt={set.name}
							title={set.name}
							className="absolute -top-1 -right-1 size-4 object-contain"
						/>
					)}
				</div>
				<div className="min-w-0 flex-1">
					<CardTitle className="truncate" title={name}>
						{name}
					</CardTitle>
					<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
						<span className="text-muted-foreground">Cost {cost ?? "—"}</span>
						<span className="font-semibold tabular-nums">+{echo.level}</span>
						{echo.stackCount > 1 && (
							<span
								className="text-muted-foreground"
								title={`Stack of ${echo.stackCount} identical echoes`}
							>
								×{echo.stackCount}
							</span>
						)}
						{echo.source === "manual" && (
							<Badge variant="outline">Manual</Badge>
						)}
					</div>
				</div>
				{actions && <CardAction className="shrink-0">{actions}</CardAction>}
			</CardHeader>
			<CardContent className="px-2.5 pb-1.5">
				{primary ? (
					<div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
						<p className="min-w-0" title={statLabel(primary.key)}>
							{shortStatLabel(statLabel(primary.key))}{" "}
							<span className="tabular-nums">
								{formatStatValue(primary.key, primary.value)}
							</span>
						</p>
						{echo.mainProps.slice(1).map((prop) => (
							<p key={prop.key} className="tabular-nums">
								+{formatStatValue(prop.key, prop.value)}{" "}
								{shortStatLabel(statLabel(prop.key))}
							</p>
						))}
					</div>
				) : (
					<p className="text-xs text-muted-foreground">
						Main stat not captured
					</p>
				)}
			</CardContent>
			<Separator />
			<CardContent className="flex-1 px-2.5 py-1.5">
				{echo.subProps.length ? (
					echo.subProps.map((prop, index) => {
						const propBefore = compareTo?.subProps.find(
							(before) => before.key === prop.key,
						);
						return (
							<StatRow
								// biome-ignore lint/suspicious/noArrayIndexKey: substat lines can repeat the same stat
								key={`${prop.propId}-${prop.key}-${index}`}
								label={statLabel(prop.key)}
								value={formatStatValue(prop.key, prop.value)}
								previous={
									compareTo
										? propBefore
											? formatStatValue(propBefore.key, propBefore.value)
											: null
										: undefined
								}
								weight={
									weights
										? (weights.get(normalizeStatName(statLabel(prop.key))) ?? 0)
										: undefined
								}
							/>
						);
					})
				) : (
					<p className="py-1 text-xs text-muted-foreground">
						No substats revealed
					</p>
				)}
			</CardContent>
			<CardFooter className="mt-auto flex-col items-stretch gap-0 p-0">
				{hasRating && (
					<div
						className="flex min-w-0 items-center gap-2 px-2.5 py-1"
						title={
							rollCharacter
								? `RV (Roll Value) for ${rollCharacter.name}`
								: "RV (Roll Value)"
						}
					>
						{rollBadge}
						{rollValue != null &&
							(onRollSelect && rollOptions && rollOptions.length > 1 ? (
								<Select
									value={rollCharacter?.name}
									items={rollOptions.map(({ character }) => ({
										value: character.character_name,
										label: character.character_name,
									}))}
									onValueChange={(value) => {
										const option = rollOptions.find(
											(roll) => roll.character.character_name === value,
										);
										if (option) onRollSelect(option);
									}}
								>
									<SelectTrigger
										size="sm"
										className="w-full min-w-0"
										aria-label={`View RV for another Resonator, currently ${rollCharacter?.name}, ${rollValue}%`}
									>
										{rollLabel}
									</SelectTrigger>
									<SelectContent
										align="end"
										alignItemWithTrigger={false}
										width="content"
									>
										<SelectGroup>
											{rollOptions.map(({ character, rating }) => (
												<SelectItem
													key={character.character_id}
													value={character.character_name}
												>
													<span className="min-w-0 flex-1">
														{character.character_name}
													</span>
													<span className="font-semibold tabular-nums">
														{rating}%
													</span>
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							) : (
								<div className="flex h-7 min-w-0 flex-1 items-center gap-2">
									{rollLabel}
								</div>
							))}
						{!equipment && (
							<div className="ml-auto shrink-0">{markControl}</div>
						)}
					</div>
				)}
				{equipment && (
					<>
						{hasRating && <Separator />}
						<div className="flex min-w-0 items-center gap-2 px-2.5 py-1">
							<div className="min-w-0 flex-1">{equipment}</div>
							<div className="shrink-0">{markControl}</div>
						</div>
					</>
				)}
				{!equipment && !hasRating && (
					<div className="px-2.5 py-1">{markControl}</div>
				)}
				{footer && (
					<>
						<Separator />
						<div className="px-2.5 py-1">{footer}</div>
					</>
				)}
			</CardFooter>
		</Card>
	);
}
