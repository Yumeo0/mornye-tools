import type { ReactNode } from "react";
import { SubStatRollBar } from "@/components/echo/SubStatRollBar";
import { Badge } from "@/components/ui/badge";
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
import { ECHO_MARK_ICONS } from "@/lib/echoMark";
import {
	normalizeStatName,
	ratingColor,
	shortStatLabel,
	statIconAsset,
	subStatRoll,
	subStatTierColor,
	substatPriorityWeights,
} from "@/lib/stats";

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
	muted,
	weight,
	previous,
}: {
	label: string;
	value: string;
	muted?: boolean;
	weight?: number;
	previous?: string | null;
}) {
	const icon = statIconAsset(label);
	const numeric = muted && value ? Number.parseFloat(value) : null;
	const roll = numeric !== null ? subStatRoll(label, numeric) : null;
	const valueColor = roll ? subStatTierColor(roll.tier, roll.tierCount) : null;
	return (
		<div
			className="group/stat min-w-0"
			title={`${label}${previous !== undefined ? ` · Equipped: ${previous ?? "No roll"}` : ""}${weight !== undefined ? ` · Roll value weight ×${weight}` : ""}`}
		>
			<div className="flex items-center gap-1.5">
				{previous !== undefined && previous !== value && (
					<span
						role="img"
						aria-label="Changed substat"
						className="size-1 shrink-0 rounded-full bg-primary"
					/>
				)}
				{icon && <img src={icon} alt="" className="size-3 shrink-0" />}
				<span
					className={`flex-1 truncate text-xs ${muted ? "text-muted-foreground" : ""}`}
				>
					{shortStatLabel(label)}
				</span>
				{value && (
					<span
						className="text-xs font-semibold tabular-nums"
						style={valueColor ? { color: valueColor } : undefined}
					>
						{value}
					</span>
				)}
				{weight !== undefined && weight > 0 && (
					<Badge
						className="hidden group-hover/stat:inline-flex group-focus-within/card:inline-flex"
						title="Roll value priority weight"
					>
						×{weight}
					</Badge>
				)}
			</div>
			{numeric !== null && (
				<SubStatRollBar
					statName={label}
					value={numeric}
					className="mt-0.5 h-1"
					revealOnHover
				/>
			)}
		</div>
	);
}

export function EchoCard({
	echo,
	rollValue,
	rollCharacter,
	rollSubstatTiers,
	rollErBreakpoint,
	rollBadge,
	actions,
	footer,
	markActions,
	compareTo,
}: {
	echo: Echo;
	/** Character-specific roll rating (0-100); hidden when null. */
	rollValue?: number | null;
	/** Character the roll value is for; shown as a small portrait. */
	rollCharacter?: { name: string; icon: string } | null;
	/** Priority tiers of the character whose roll value is displayed. */
	rollSubstatTiers?: string[][];
	rollErBreakpoint?: number;
	/** Optional badge at the left of the roll-value row. */
	rollBadge?: ReactNode;
	actions?: ReactNode;
	footer?: ReactNode;
	markActions?: ReactNode;
	/** Equipped echo in this slot; differences are marked with a dot. */
	compareTo?: Echo;
}) {
	const image = echoImage(echo);
	const set = echoSet(echo);
	const name = echoName(echo);
	const weights = rollSubstatTiers
		? substatPriorityWeights(rollSubstatTiers, rollErBreakpoint)
		: null;
	return (
		<div className="group/card flex h-full flex-col bg-muted/50 p-2.5 text-sm">
			<div className="flex gap-2.5">
				<div className="relative shrink-0">
					{image ? (
						<img
							src={image}
							alt={name}
							className="size-12 object-contain bg-black/30"
						/>
					) : (
						<div className="size-12 bg-black/30" />
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
					<div className="flex items-center justify-between gap-1.5">
						<span className="truncate font-medium" title={name}>
							{name}
						</span>
						<span className="flex shrink-0 items-center gap-1">
							{echo.stackCount > 1 && (
								<span
									className="border border-sky-400/40 bg-sky-400/10 px-1 text-[10px] font-bold text-sky-300"
									title={`Stack of ${echo.stackCount} identical echoes`}
								>
									×{echo.stackCount}
								</span>
							)}
							<span className="text-xs font-bold text-yellow-400">
								+{echo.level}
							</span>
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						{set && (
							<span
								className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground"
								title={set.name}
							>
								{set.name}
							</span>
						)}
						{echo.source === "manual" && (
							<span
								className="shrink-0 border border-amber-400/40 bg-amber-400/10 px-1 text-[9px] font-bold tracking-wide text-amber-300 uppercase"
								title="Added by hand"
							>
								Manual
							</span>
						)}
						{markActions ??
							((echo.funcValue === 1 || echo.funcValue === 2) && (
								<img
									src={
										echo.funcValue === 1
											? ECHO_MARK_ICONS.locked
											: ECHO_MARK_ICONS.discarded
									}
									alt={echo.funcValue === 1 ? "Locked" : "Discarded"}
									title={echo.funcValue === 1 ? "Locked" : "Discarded"}
									className="size-5 shrink-0 object-contain"
								/>
							))}
					</div>
				</div>
				{actions && (
					<div className="flex shrink-0 items-start gap-1">{actions}</div>
				)}
			</div>
			<div className="mt-2 flex flex-col gap-0.5">
				{echo.mainProps.map((prop) => (
					<StatRow
						key={`${prop.propId}-${prop.key}`}
						label={statLabel(prop.key)}
						value={formatStatValue(prop.key, prop.value)}
					/>
				))}
			</div>
			{echo.subProps.length > 0 && (
				<div className="mt-1 flex flex-col gap-0.5 border-t pt-1">
					{echo.subProps.map((prop, index) => (
						<StatRow
							// biome-ignore lint/suspicious/noArrayIndexKey: substat lines can repeat the same stat
							key={`${prop.propId}-${prop.key}-${index}`}
							label={statLabel(prop.key)}
							value={formatStatValue(prop.key, prop.value)}
							muted
							previous={
								compareTo
									? (() => {
											const propBefore = compareTo.subProps.find(
												(before) => before.key === prop.key,
											);
											return propBefore
												? formatStatValue(propBefore.key, propBefore.value)
												: null;
										})()
									: undefined
							}
							weight={
								weights
									? (weights.get(normalizeStatName(statLabel(prop.key))) ?? 0)
									: undefined
							}
						/>
					))}
				</div>
			)}
			{(rollValue != null || rollBadge) && (
				<div
					className="mt-2 flex items-center justify-end gap-1.5 border-t pt-1.5"
					title={
						rollCharacter
							? `Roll value for ${rollCharacter.name}`
							: "Roll value"
					}
				>
					{rollBadge && <span className="mr-auto">{rollBadge}</span>}
					{rollValue != null && (
						<>
							{rollCharacter && (
								<img
									src={rollCharacter.icon}
									alt={rollCharacter.name}
									title={rollCharacter.name}
									className="size-5 shrink-0 object-contain"
								/>
							)}
							<span
								className="text-xs font-bold leading-none"
								style={{ color: ratingColor(rollValue) }}
							>
								RV {rollValue}%
							</span>
						</>
					)}
				</div>
			)}
			{footer && (
				<div className="mt-auto flex items-center justify-between gap-2 border-t pt-2">
					{footer}
				</div>
			)}
		</div>
	);
}
