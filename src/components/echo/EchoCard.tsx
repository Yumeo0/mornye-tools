import type { ReactNode } from "react";
import { SubStatRollBar } from "@/components/echo/SubStatRollBar";
import { type Echo, formatStatValue, statLabel } from "@/lib/account";
import {
	isExcludedCharacter,
	ratingColor,
	statIconAsset,
	subStatRoll,
	subStatTierColor,
} from "@/lib/stats";
import characterData from "../../configs/character_data.json";
import echoData from "../../configs/echo_data.json";

export interface CharacterEntry {
	character_id: number;
	character_name: string;
	icon_head_256: string;
}

interface EchoSetEntry {
	id: number;
	name: string;
	icon: string;
}

export interface EchoEntry {
	echo_name: string;
	echo_id: number;
	monster_id?: number | null;
	echo_cost?: number;
	icon_middle?: string;
	echo_sets?: EchoSetEntry[];
}

/** Deduplicate characters, drop excluded forms, and sort by name. */
export const allCharacters: CharacterEntry[] = [
	...new Map(
		(characterData as CharacterEntry[])
			.filter((character) => !isExcludedCharacter(character.character_id))
			.map((character) => [character.character_id, character]),
	).values(),
].sort((a, b) => a.character_name.localeCompare(b.character_name));

export const charactersById = new Map(
	allCharacters.map((character) => [character.character_id, character]),
);

// Catalog entries by calculator id (`MonsterId`). Entries may repeat per set;
// merge them so each echo exposes every possible sonata.
const echoesByMonsterId = new Map<number, EchoEntry>();
for (const echo of echoData as EchoEntry[]) {
	if (echo.monster_id == null) continue;
	const existing = echoesByMonsterId.get(echo.monster_id);
	if (!existing) {
		echoesByMonsterId.set(echo.monster_id, {
			...echo,
			echo_sets: [...(echo.echo_sets ?? [])],
		});
		continue;
	}
	for (const set of echo.echo_sets ?? []) {
		if (!existing.echo_sets?.some((s) => s.id === set.id)) {
			existing.echo_sets = [...(existing.echo_sets ?? []), set];
		}
	}
}

/** Every echo species (merged across sets), sorted by name. */
export const allEchoSpecies: EchoEntry[] = [...echoesByMonsterId.values()].sort(
	(a, b) => a.echo_name.localeCompare(b.echo_name),
);

/** The sonata icon assets only ship in the IconElementAttri128 resolution. */
export function sonataIcon128(icon: string): string {
	return icon.replace(
		"IconElementAttri/T_IconElementAttri",
		"IconElementAttri128/T_IconElementAttri128_",
	);
}

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
export function echoSet(echo: Echo): EchoSetEntry | undefined {
	const sets = echoesByMonsterId.get(echo.monsterId)?.echo_sets;
	if (!sets?.length) return undefined;
	return sets.find((set) => set.id === echo.setId) ?? sets[0];
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
	const format = (props: Echo["mainProps"]) =>
		props
			.map(
				(prop) =>
					`${statLabel(prop.key)} ${formatStatValue(prop.key, prop.value)}`,
			)
			.join(" / ");
	const mains = format(echo.mainProps);
	if (mains) lines.push(`Main: ${mains}`);
	const subs = format(echo.subProps);
	if (subs) lines.push(`Subs: ${subs}`);
	if (roll) {
		lines.push(`RV ${roll.rating}% (${roll.character.character_name})`);
	}
	return lines.join("\n");
}

export function equippedCharacter(
	equippedBy: number | null | undefined,
): CharacterEntry | undefined {
	if (equippedBy == null) return undefined;
	return charactersById.get(equippedBy);
}

function StatRow({
	label,
	value,
	muted,
}: {
	label: string;
	value: string;
	muted?: boolean;
}) {
	const icon = statIconAsset(label);
	const numeric = muted && value ? Number.parseFloat(value) : null;
	const roll = numeric !== null ? subStatRoll(label, numeric) : null;
	const valueColor = roll ? subStatTierColor(roll.tier, roll.tierCount) : null;
	return (
		<div className="min-w-0" title={label}>
			<div className="flex items-center gap-1.5">
				{icon && <img src={icon} alt="" className="size-3 shrink-0" />}
				<span
					className={`flex-1 truncate text-[11px] ${muted ? "text-muted-foreground" : ""}`}
				>
					{label}
				</span>
				{value && (
					<span
						className="text-[11px] font-semibold"
						style={valueColor ? { color: valueColor } : undefined}
					>
						{value}
					</span>
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
	actions,
	footer,
}: {
	echo: Echo;
	/** Best rating among relevant characters (0-100); hidden when null. */
	rollValue?: number | null;
	/** Character the roll value is for; shown as a small portrait. */
	rollCharacter?: { name: string; icon: string } | null;
	actions?: ReactNode;
	footer?: ReactNode;
}) {
	const image = echoImage(echo);
	const set = echoSet(echo);
	const name = echoName(echo);
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
							className="absolute -top-1 -right-1 size-4 object-contain bg-muted/60"
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
					</div>
				</div>
				{actions && (
					<div className="flex shrink-0 items-start gap-1">{actions}</div>
				)}
			</div>
			<div className="mt-2 space-y-0.5">
				{echo.mainProps.map((prop) => (
					<StatRow
						key={`${prop.propId}-${prop.key}`}
						label={statLabel(prop.key)}
						value={formatStatValue(prop.key, prop.value)}
					/>
				))}
			</div>
			{echo.subProps.length > 0 && (
				<div className="mt-1 space-y-0.5 border-t pt-1">
					{echo.subProps.map((prop, index) => (
						<StatRow
							// biome-ignore lint/suspicious/noArrayIndexKey: substat lines can repeat the same stat
							key={`${prop.propId}-${prop.key}-${index}`}
							label={statLabel(prop.key)}
							value={formatStatValue(prop.key, prop.value)}
							muted
						/>
					))}
				</div>
			)}
			{rollValue != null && (
				<div
					className="mt-2 flex items-center justify-end gap-1.5 border-t pt-1.5"
					title={
						rollCharacter
							? `Roll value — best on ${rollCharacter.name}`
							: "Roll value"
					}
				>
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
