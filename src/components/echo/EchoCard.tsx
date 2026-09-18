import type { ReactNode } from "react";
import {
	isExcludedCharacter,
	maxSubStatValue,
	parseStatLines,
	statIconAsset,
	subStatRollColor,
} from "@/lib/stats";
import characterData from "../../configs/character_data.json";
import echoData from "../../configs/echo_data.json";

export interface InventoryEcho {
	echo_name: string;
	level: string;
	main_stats: string;
	sub_stats: string;
	equippedBy?: string;
	/** Sonata set name, detected by matching the set icon during scanning */
	echoSet?: string;
}

export interface CharacterEntry {
	character_id: number;
	character_name: string;
	icon_head_256: string;
}

interface EchoEntry {
	echo_name: string;
	echo_cost?: number;
	icon_middle?: string;
	echo_sets?: { id: number; name: string; icon: string }[];
}

// Deduplicate characters, drop excluded forms, and sort by name
export const allCharacters: CharacterEntry[] = [
	...new Map(
		(characterData as CharacterEntry[])
			.filter((character) => !isExcludedCharacter(character.character_id))
			.map((character) => [character.character_id, character]),
	).values(),
].sort((a, b) => a.character_name.localeCompare(b.character_name));

const charactersByLowerName = new Map(
	allCharacters.map((character) => [
		character.character_name.toLowerCase(),
		character,
	]),
);

// The echo data contains duplicate entries per name with different set lists
// (the same echo appears in multiple sonata groups), so merge the sets of all
// entries with the same name
const echoesByLowerName = new Map<string, EchoEntry>();
for (const echo of echoData as EchoEntry[]) {
	const key = echo.echo_name.toLowerCase();
	const existing = echoesByLowerName.get(key);
	if (!existing) {
		echoesByLowerName.set(key, {
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

// The sonata icon assets only ship in the IconElementAttri128 resolution
export function sonataIcon128(icon: string): string {
	return icon.replace(
		"IconElementAttri/T_IconElementAttri",
		"IconElementAttri128/T_IconElementAttri128_",
	);
}

export function echoKey(echo: InventoryEcho): string {
	return [
		echo.echo_name,
		echo.echoSet ?? "",
		echo.level,
		echo.main_stats,
		echo.sub_stats,
		echo.equippedBy ?? "",
	].join("|");
}

export function echoImage(name: string): string | undefined {
	return echoesByLowerName.get(name.toLowerCase())?.icon_middle;
}

export function echoSet(echo: InventoryEcho) {
	const sets = echoesByLowerName.get(echo.echo_name.toLowerCase())?.echo_sets;
	if (!sets?.length) return undefined;
	// Prefer the set detected by the scanner, fall back to the first one
	return sets.find((set) => set.name === echo.echoSet) ?? sets[0];
}

export function echoCost(name: string): number | undefined {
	return echoesByLowerName.get(name.toLowerCase())?.echo_cost;
}

// "Equipped by Phrolova" -> character entry
export function equippedCharacter(equippedBy: string | undefined) {
	const match = equippedBy?.match(/Equipped by (.+)/i);
	if (!match) return undefined;
	return charactersByLowerName.get(match[1].trim().toLowerCase());
}

function StatRow({
	name,
	value,
	muted,
}: {
	name: string;
	value: string;
	muted?: boolean;
}) {
	const icon = statIconAsset(name);
	const numeric = muted && value ? Number.parseFloat(value) : null;
	const maxValue = muted ? maxSubStatValue(name) : null;
	const rollColor =
		numeric !== null && maxValue ? subStatRollColor(numeric, maxValue) : null;
	return (
		<div className="flex min-w-0 items-center gap-1.5" title={name}>
			{icon && <img src={icon} alt="" className="size-3 shrink-0" />}
			<span
				className={`flex-1 truncate text-[11px] ${muted ? "text-muted-foreground" : ""}`}
			>
				{name}
			</span>
			{value && (
				<span
					className="text-[11px] font-semibold"
					style={rollColor ? { color: rollColor } : undefined}
				>
					{value}
				</span>
			)}
		</div>
	);
}

export function EchoCard({
	echo,
	actions,
	footer,
}: {
	echo: InventoryEcho;
	actions?: ReactNode;
	footer?: ReactNode;
}) {
	const image = echoImage(echo.echo_name);
	const set = echoSet(echo);
	const mainLines = parseStatLines(echo.main_stats);
	const subLines = parseStatLines(echo.sub_stats);
	return (
		<div className="flex h-full flex-col bg-muted/50 p-2.5 text-sm">
			<div className="flex gap-2.5">
				<div className="relative shrink-0">
					{image ? (
						<img
							src={image}
							alt={echo.echo_name}
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
						<span className="truncate font-medium" title={echo.echo_name}>
							{echo.echo_name}
						</span>
						<span className="text-xs font-bold text-yellow-400">
							{echo.level}
						</span>
					</div>
					{set && (
						<span
							className="block truncate text-[11px] text-muted-foreground"
							title={set.name}
						>
							{set.name}
						</span>
					)}
				</div>
				{actions && (
					<div className="flex shrink-0 items-start gap-1">{actions}</div>
				)}
			</div>
			<div className="mt-2 space-y-0.5">
				{mainLines.map((line) => (
					<StatRow key={line.name} {...line} />
				))}
			</div>
			{subLines.length > 0 && (
				<div className="mt-1 space-y-0.5 border-t pt-1">
					{subLines.map((line, index) => (
						<StatRow key={`${line.name}-${index}`} {...line} muted />
					))}
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
