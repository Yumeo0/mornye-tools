import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { charactersById, EchoCard } from "@/components/echo/EchoCard";
import { FilterIconButton } from "@/components/tabs/FilterControls";
import { CardBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { weaponName } from "@/components/weapon/WeaponCard";
import {
	type Echo,
	echoesForResonator,
	weaponForResonator,
} from "@/lib/account";
import {
	reviveBoolean,
	reviveNumberArray,
	reviveString,
	reviveStringArray,
	usePersistedState,
} from "@/lib/persisted";
import { qualityGradient, rarityTextClass } from "@/lib/rarity";
import {
	isExcludedCharacter,
	parseSubstatTiers,
	type StatTier,
	sonataNames,
	splitStatCodes,
	statIconAsset,
	statIconUrl,
} from "@/lib/stats";
import { useAccountSnapshot } from "@/lib/useAccountSnapshot";
import buildsData from "../../configs/character_builds.json";
import characterData from "../../configs/character_data.json";
import echoData from "../../configs/echo_data.json";

interface BuildSet {
	variant: string;
	name: string;
	sonata?: string;
	value?: string;
}

interface RoleBuild {
	echo_sets: {
		variant: string;
		sets: BuildSet[];
		main_stats: string[];
	};
	substats_priority: string | null;
}

interface BuildEntry {
	character_id: number | null;
	roles: Record<string, RoleBuild>;
}

interface EchoEntry {
	echo_name: string;
	icon_middle?: string;
	echo_sets?: { name: string; icon: string }[];
}

export interface CharacterEntry {
	id: number;
	name: string;
	image: string;
	rarity?: number;
	element?: string;
	elementIcon?: string | null;
	weaponType?: string;
	weaponTypeIcon?: string | null;
	/** Resonance chain node icons (IconDevice), index 0 = node 1. */
	chainIcons?: string[];
}

const builds = buildsData as Record<string, BuildEntry>;
const echoes = echoData as EchoEntry[];

const buildByCharacterId = new Map<number, BuildEntry>();
for (const entry of Object.values(builds)) {
	if (
		entry.character_id != null &&
		!buildByCharacterId.has(entry.character_id)
	) {
		buildByCharacterId.set(entry.character_id, entry);
	}
}

/** Owned state of a resonator shown on the cards. */
interface CardWeapon {
	itemId: number;
	level: number;
	rank: number;
	name: string | null;
}

export interface CardAccount {
	level: number;
	chain: number;
	echoCount: number;
	weapon: CardWeapon | null;
}

const echoByName = new Map<string, EchoEntry>();
for (const echo of echoes) {
	if (!echoByName.has(echo.echo_name.toLowerCase())) {
		echoByName.set(echo.echo_name.toLowerCase(), echo);
	}
}

// Sonata set name -> icon, derived from the echo data, using the higher
// resolution IconElementAttri128 assets
function sonataIconPath(icon: string): string {
	return icon.replace(
		"IconElementAttri/T_IconElementAttri",
		"IconElementAttri128/T_IconElementAttri128_",
	);
}

const sonataIcons = new Map<string, string>();
for (const echo of echoes) {
	for (const set of echo.echo_sets ?? []) {
		if (!sonataIcons.has(set.name)) {
			sonataIcons.set(set.name, sonataIconPath(set.icon));
		}
	}
}

function echoIcon(name: string): string | undefined {
	return echoByName.get(name.toLowerCase())?.icon_middle;
}

function sonataIcon(name: string): string {
	return (
		sonataIcons.get(name) ??
		`https://r2.tethys.gg/asset/sonata-icon/${encodeURIComponent(name)}.webp`
	);
}

// "3+2" -> "3PC + 2PC"
function pcLabel(variant: string | undefined): string {
	if (!variant) return "";
	return `${variant
		.split("+")
		.map((part) => `${part.trim()}PC`)
		.join(" + ")}`;
}

// Main stat rows in echo slot order: 4-cost, both 3-costs, both 1-costs
const MAIN_STAT_SLOTS = [
	{ cost: "4", index: 0, half: false },
	{ cost: "3", index: 1, half: true },
	{ cost: "3", index: 2, half: true },
	{ cost: "1", index: 3, half: true },
	{ cost: "1", index: 4, half: true },
];

// All characters (deduplicated, special forms excluded), sorted by name.
export const allCharacters: CharacterEntry[] = (() => {
	const seen = new Set<number>();
	const list: CharacterEntry[] = [];
	for (const character of characterData as {
		character_id: number;
		character_name: string;
		icon_pile: string;
		element: string;
		element_icon_round: string | null;
		weapon_type: string;
		weapon_type_icon: string | null;
		rarity: number;
		chain_icons: (string | null)[];
	}[]) {
		if (seen.has(character.character_id)) continue;
		if (isExcludedCharacter(character.character_id)) continue;
		seen.add(character.character_id);
		list.push({
			id: character.character_id,
			name: character.character_name,
			image: character.icon_pile,
			rarity: character.rarity,
			element: character.element,
			elementIcon: character.element_icon_round,
			weaponType: character.weapon_type,
			weaponTypeIcon: character.weapon_type_icon,
			chainIcons: (character.chain_icons ?? []).filter(Boolean) as string[],
		});
	}
	return list.sort((a, b) => a.name.localeCompare(b.name));
})();

// Distinct element / weapon-type filter options derived from the catalog
export const elementOptions = (() => {
	const map = new Map<string, string | null>();
	for (const character of allCharacters) {
		if (character.element && !map.has(character.element)) {
			map.set(character.element, character.elementIcon ?? null);
		}
	}
	return [...map].map(([value, icon]) => ({ value, icon }));
})();

export const weaponTypeOptions = (() => {
	const map = new Map<string, string | null>();
	for (const character of allCharacters) {
		if (character.weaponType && !map.has(character.weaponType)) {
			map.set(character.weaponType, character.weaponTypeIcon ?? null);
		}
	}
	return [...map].map(([value, icon]) => ({ value, icon }));
})();

// Character list filters, one input type per facet
export interface CharacterFilters {
	search: string;
	elements: string[];
	weaponTypes: string[];
	rarity: number[];
	ownedOnly: boolean;
	levelRange: [number, number];
	chainRange: [number, number];
}

export const LEVEL_RANGE: [number, number] = [1, 90];
export const CHAIN_RANGE: [number, number] = [0, 6];

export const DEFAULT_FILTERS: CharacterFilters = {
	search: "",
	elements: [],
	weaponTypes: [],
	rarity: [],
	ownedOnly: false,
	levelRange: LEVEL_RANGE,
	chainRange: CHAIN_RANGE,
};

const CHARACTER_SORT_KEYS = new Set<string>([
	"name",
	"level",
	"chain",
	"rarity",
	"echoes",
]);

// Saved filters are coerced onto the current shape so stale persisted data
// cannot break the tab.
export function reviveCharacterFilters(value: unknown): CharacterFilters {
	if (typeof value !== "object" || value === null) return DEFAULT_FILTERS;
	const raw = value as Partial<CharacterFilters>;
	const range = (
		saved: unknown,
		fallback: [number, number],
	): [number, number] =>
		Array.isArray(saved) &&
		saved.length === 2 &&
		saved.every((entry) => typeof entry === "number")
			? [saved[0], saved[1]]
			: fallback;
	return {
		search: reviveString(raw.search),
		elements: reviveStringArray(raw.elements),
		weaponTypes: reviveStringArray(raw.weaponTypes),
		rarity: reviveNumberArray(raw.rarity),
		ownedOnly: reviveBoolean(raw.ownedOnly),
		levelRange: range(raw.levelRange, LEVEL_RANGE),
		chainRange: range(raw.chainRange, CHAIN_RANGE),
	};
}

export const reviveCharacterSort = (value: unknown): CharacterSortKey => {
	const key = reviveString(value);
	return CHARACTER_SORT_KEYS.has(key) ? (key as CharacterSortKey) : "name";
};

const reviveCharacterId = (value: unknown): number | null =>
	typeof value === "number" && Number.isFinite(value) ? value : null;

export function matchesCharacterFilters(
	character: CharacterEntry,
	account: CardAccount | undefined,
	filters: CharacterFilters,
): boolean {
	if (filters.search) {
		const query = filters.search.toLowerCase();
		if (!character.name.toLowerCase().includes(query)) return false;
	}
	if (
		filters.elements.length > 0 &&
		(!character.element || !filters.elements.includes(character.element))
	) {
		return false;
	}
	if (
		filters.weaponTypes.length > 0 &&
		(!character.weaponType ||
			!filters.weaponTypes.includes(character.weaponType))
	) {
		return false;
	}
	if (
		filters.rarity.length > 0 &&
		(character.rarity == null || !filters.rarity.includes(character.rarity))
	) {
		return false;
	}
	if (filters.ownedOnly && !account) return false;
	// Level/chain ranges only concern owned characters; activating one hides
	// unowned characters instead of always sorting them into view.
	const levelActive =
		filters.levelRange[0] > LEVEL_RANGE[0] ||
		filters.levelRange[1] < LEVEL_RANGE[1];
	const chainActive =
		filters.chainRange[0] > CHAIN_RANGE[0] ||
		filters.chainRange[1] < CHAIN_RANGE[1];
	if ((levelActive || chainActive) && !account) return false;
	if (account) {
		if (
			account.level < filters.levelRange[0] ||
			account.level > filters.levelRange[1]
		) {
			return false;
		}
		if (
			account.chain < filters.chainRange[0] ||
			account.chain > filters.chainRange[1]
		) {
			return false;
		}
	}
	return true;
}

export type CharacterSortKey = "name" | "level" | "chain" | "rarity" | "echoes";

// `desc` is the natural default direction per key
export const CHARACTER_SORT_OPTIONS: {
	value: CharacterSortKey;
	label: string;
	desc: boolean;
}[] = [
	{ value: "name", label: "Name", desc: false },
	{ value: "level", label: "Lv", desc: true },
	{ value: "chain", label: "Chain", desc: true },
	{ value: "rarity", label: "Rarity", desc: true },
	{ value: "echoes", label: "Echoes", desc: true },
];

export function sortCharacters(
	list: CharacterEntry[],
	accounts: Map<number, CardAccount>,
	key: CharacterSortKey,
	desc: boolean,
): CharacterEntry[] {
	const dir = desc ? -1 : 1;
	if (key === "name") {
		return [...list].sort((a, b) => dir * a.name.localeCompare(b.name));
	}
	if (key === "rarity") {
		// Static data: every character has a rarity
		return [...list].sort((a, b) => dir * ((a.rarity ?? 0) - (b.rarity ?? 0)));
	}
	// Account-value sorts (level/chain/echoes): unowned characters have no
	// value and always sink to the bottom
	const owned = list.filter((character) => accounts.has(character.id));
	const unowned = list.filter((character) => !accounts.has(character.id));
	const value = (character: CharacterEntry): number => {
		const account = accounts.get(character.id);
		if (!account) return -1;
		switch (key) {
			case "level":
				return account.level;
			case "chain":
				return account.chain;
			case "echoes":
				return account.echoCount;
		}
	};
	owned.sort((a, b) => dir * (value(a) - value(b)));
	return [...owned, ...unowned];
}

function weaponIconUrl(itemId: number): string {
	return `/data/weapon-icons/${itemId}.webp`;
}

/** Resonance chain progress: per-node in-game icons, lit up to the owned chain. */
function ChainNodes({
	chain,
	icons,
	size = "size-4",
}: {
	chain: number;
	icons: string[];
	size?: string;
}) {
	if (icons.length === 0) {
		return (
			<span className="text-xs font-medium text-muted-foreground">
				Chain {chain}
			</span>
		);
	}
	return (
		<span
			className="flex items-center justify-center gap-1"
			title={`Resonance Chain ${chain}/6`}
		>
			{icons.slice(0, 6).map((icon, index) => {
				const active = index < chain;
				return (
					// Activated: plain white glyph with a tight yellow backglow
					<img
						key={icon}
						src={icon}
						alt=""
						className={`${size} object-contain`}
						style={{
							filter: active
								? "brightness(1.7) drop-shadow(0 0 1px rgba(254, 240, 138, 0.95)) drop-shadow(0 0 4px rgba(250, 204, 21, 0.55))"
								: undefined,
							opacity: active ? undefined : 0.25,
						}}
					/>
				);
			})}
		</span>
	);
}

/** Labeled dual-thumb range filter (level / chain). */
export function RangeFilter({
	label,
	min,
	max,
	value,
	onChange,
}: {
	label: string;
	min: number;
	max: number;
	value: [number, number];
	onChange: (value: [number, number]) => void;
}) {
	const active = value[0] > min || value[1] < max;
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span
				className={`text-[10px] leading-none ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}
			>
				{label} {value[0]}–{value[1]}
			</span>
			<Slider
				min={min}
				max={max}
				value={value}
				onValueChange={(next) => onChange([next[0], next[1]])}
				className="h-3.5"
			/>
		</div>
	);
}

function SonataIcon({ name }: { name: string }) {
	return (
		<img
			src={sonataIcon(name)}
			alt={name}
			title={name}
			className="size-7 object-contain bg-muted/60"
		/>
	);
}

function EchoSetsCard({ guide }: { guide: RoleBuild }) {
	const sets = guide.echo_sets?.sets ?? [];

	return (
		<Card>
			<CardContent className="p-4 space-y-3">
				<Label className="text-base font-medium flex items-center gap-2">
					<img src="/echo-sets.webp" alt="" className="size-5" /> Echo Sets
				</Label>

				{sets.map((set) => {
					const sonatas = sonataNames(set.sonata);
					const [firstSonata, ...restSonatas] = sonatas;
					return (
						<div
							key={`${set.variant}-${set.name}-${set.sonata ?? ""}`}
							className="flex items-center gap-4 bg-muted/50 p-3"
							title={set.name}
						>
							<div className="relative shrink-0 mr-2">
								{echoIcon(set.name) ? (
									<img
										src={echoIcon(set.name)}
										alt=""
										className="size-14 object-contain bg-black/30"
									/>
								) : (
									<div className="size-14 bg-black/30" />
								)}
								{firstSonata && (
									<img
										src={sonataIcon(firstSonata)}
										alt={firstSonata}
										title={firstSonata}
										className="absolute -top-2.5 -right-2.5 size-7 object-contain bg-muted/60"
									/>
								)}
							</div>
							<div className="flex-1 min-w-0">
								{restSonatas.length > 0 && (
									<div className="flex items-center gap-1.5">
										<span className="text-sm font-medium leading-none">+</span>
										{restSonatas.map((sonata, sonataIndex) => (
											<span key={sonata} className="flex items-center gap-1.5">
												{sonataIndex > 0 && (
													<span className="size-1 rounded-full bg-muted-foreground/60" />
												)}
												<SonataIcon name={sonata} />
											</span>
										))}
									</div>
								)}
								{pcLabel(set.variant) && (
									<p className="text-xs font-medium mt-0.5">
										{pcLabel(set.variant)}
									</p>
								)}
							</div>
							{set.value && (
								<span className="text-xs font-bold bg-primary/15 text-primary px-2 py-1">
									{set.value}
								</span>
							)}
						</div>
					);
				})}

				<div className="grid grid-cols-2 gap-2 pt-1">
					{MAIN_STAT_SLOTS.filter(
						(slot) => (guide.echo_sets?.main_stats ?? []).length > slot.index,
					).map((slot) => {
						const stats = splitStatCodes(
							guide.echo_sets?.main_stats[slot.index],
						);
						if (stats.length === 0) return null;
						return (
							<div
								key={`${slot.cost}-${slot.index}`}
								className={`flex items-center gap-2 bg-muted/50 px-3 py-2.5 ${slot.half ? "" : "col-span-2"}`}
							>
								<span className="text-xs text-muted-foreground font-medium">
									{slot.cost}
								</span>
								<span className="text-sm font-medium flex flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-1">
									{stats.map((stat) => (
										<span key={stat} className="flex items-center gap-1.5">
											{statIconAsset(stat) && (
												<img
													src={statIconAsset(stat)}
													alt=""
													className="size-4 shrink-0 brightness-0 opacity-70 dark:brightness-100 dark:opacity-80"
												/>
											)}
											{stat}
										</span>
									))}
								</span>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}

function SubstatChip({ stat }: { stat: StatTier }) {
	return (
		<div className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-3 py-2 flex-1 min-w-0">
			<img
				src={statIconAsset(stat.name) ?? statIconUrl(stat.code)}
				alt=""
				className="size-4 shrink-0"
			/>
			<span className="text-sm font-semibold truncate">
				{stat.name}
				{stat.breakpoint && (
					<span className="font-normal opacity-80"> [{stat.breakpoint}]</span>
				)}
			</span>
		</div>
	);
}

function SubstatsCard({
	guide,
	fallbackPriority,
}: {
	guide: RoleBuild;
	fallbackPriority?: string | null;
}) {
	// Roles without their own substat priority fall back to the first role's
	const tiers = parseSubstatTiers(
		guide.substats_priority ?? fallbackPriority ?? null,
	);
	if (tiers.length === 0) return null;

	return (
		<Card>
			<CardContent className="p-4 space-y-3">
				<Label className="text-base font-medium flex items-center gap-2">
					<img src="/echo-sets.webp" alt="" className="size-5" /> Substats
					Priority
				</Label>

				<div className="space-y-1">
					{tiers.map((tier, tierIndex) => (
						<div key={tier.map((stat) => stat.code).join("=")}>
							<div className="flex gap-2">
								{tier.map((stat) => (
									<SubstatChip key={stat.code} stat={stat} />
								))}
							</div>
							{tierIndex < tiers.length - 1 && (
								<div className="text-center text-xs text-muted-foreground leading-none py-0.5">
									▼
								</div>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function BuildDetail({
	character,
	account,
	echoes,
	onBack,
}: {
	character: CharacterEntry;
	account: CardAccount | undefined;
	echoes: Echo[];
	onBack: () => void;
}) {
	const [selectedRole, setSelectedRole] = useState<string | null>(null);

	const build = buildByCharacterId.get(character.id);
	const roleNames = Object.keys(build?.roles ?? {});
	const role = roleNames.includes(selectedRole ?? "")
		? (selectedRole as string)
		: roleNames[0];
	const guide = role ? build?.roles[role] : undefined;
	// Roles without their own substat priority fall back to the first role's
	const firstRolePriority = roleNames[0]
		? build?.roles[roleNames[0]]?.substats_priority
		: null;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="sm"
					onClick={onBack}
					className="flex items-center gap-2"
				>
					← Back to Characters
				</Button>
			</div>

			<div className="flex items-center gap-4">
				<img
					src={character.image}
					alt={character.name}
					className="w-16 h-16 object-contain"
				/>
				<div className="flex-1">
					<div className="flex flex-wrap items-center gap-2">
						{character.elementIcon && (
							<img
								src={character.elementIcon}
								alt={character.element}
								title={character.element}
								className="size-6 object-contain"
							/>
						)}
						{character.weaponTypeIcon && (
							<img
								src={character.weaponTypeIcon}
								alt={character.weaponType}
								title={character.weaponType}
								className="size-5 object-contain opacity-70"
							/>
						)}
						<h2 className="text-2xl font-bold">{character.name}</h2>
						{character.rarity && (
							<span
								className={`text-sm ${rarityTextClass(character.rarity)}`}
								title={`${character.rarity}★`}
							>
								{"★".repeat(character.rarity)}
							</span>
						)}
					</div>
					<div className="mt-1.5 flex items-center gap-3 text-sm">
						{account ? (
							<>
								<span className="font-medium">Lv {account.level}</span>
								<ChainNodes
									chain={account.chain}
									icons={character.chainIcons ?? []}
								/>
								<span className="text-muted-foreground">
									{account.echoCount}/5 echoes
								</span>
								{account.weapon && (
									<span className="truncate text-muted-foreground">
										{account.weapon.name}
									</span>
								)}
							</>
						) : (
							<p className="text-muted-foreground">
								Build guides from tethys.gg
							</p>
						)}
					</div>
				</div>
				{roleNames.length > 0 && (
					<Select value={role} onValueChange={setSelectedRole}>
						<SelectTrigger className="w-56">{role}</SelectTrigger>
						<SelectContent>
							{roleNames.map((roleName) => (
								<SelectItem key={roleName} value={roleName}>
									{roleName}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>

			{echoes.length > 0 && (
				<Card>
					<CardContent className="p-4 space-y-3">
						<Label className="text-base font-medium flex items-center gap-2">
							<img src="/echoes.webp" alt="" className="size-5" /> Equipped
							Echoes
						</Label>
						<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
							{echoes.map((echo) => (
								<EchoCard key={echo.incrId} echo={echo} />
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{guide && (
				<div className="space-y-4">
					<EchoSetsCard guide={guide} />
					<SubstatsCard guide={guide} fallbackPriority={firstRolePriority} />
				</div>
			)}
		</div>
	);
}

function CharacterCard({
	character,
	account,
	onOpen,
}: {
	character: CharacterEntry;
	account: CardAccount | undefined;
	onOpen: () => void;
}) {
	return (
		<Card
			onClick={onOpen}
			className="relative aspect-696/960 cursor-pointer overflow-hidden transition-colors hover:border-primary"
		>
			{character.image ? (
				<img
					src={character.image}
					alt={character.name}
					className={`absolute inset-0 h-full w-full object-cover ${
						account ? "" : "grayscale opacity-70"
					}`}
				/>
			) : (
				<div className="absolute inset-0 grid place-items-center bg-muted text-sm text-muted-foreground">
					{character.name}
				</div>
			)}
			<div className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/85 via-black/45 to-transparent" />
			{/* rarity-tinted bottom gradient, like the in-game cards */}
			<img
				src={qualityGradient(character.rarity)}
				alt=""
				aria-hidden
				className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-70"
			/>

			{/* element badge with weapon type glyph below it (top-left), equipped weapon (top-right) */}
			<div className="absolute inset-x-0 top-0 flex items-start justify-between p-1.5">
				<div className="flex flex-col items-start gap-0.5">
					{character.elementIcon ? (
						<img
							src={character.elementIcon}
							alt={character.element}
							title={character.element}
							className="size-6 object-contain drop-shadow-md"
						/>
					) : (
						<span className="size-6" />
					)}
					{character.weaponTypeIcon && (
						<img
							src={character.weaponTypeIcon}
							alt={character.weaponType}
							title={character.weaponType}
							className="size-5 object-contain opacity-80 drop-shadow"
						/>
					)}
				</div>
				{account?.weapon && (
					<img
						src={weaponIconUrl(account.weapon.itemId)}
						alt={account.weapon.name ?? undefined}
						title={`${account.weapon.name} · Lv ${account.weapon.level} · Rank ${account.weapon.rank}`}
						className="size-9 object-contain drop-shadow-md"
					/>
				)}
			</div>

			<div className="absolute inset-x-0 bottom-0 space-y-1.5 px-2 pt-12 pb-2.5 text-center">
				<p className="text-sm font-medium text-white drop-shadow">
					{character.name}
				</p>
				{account ? (
					<>
						<div className="flex justify-center">
							<ChainNodes
								chain={account.chain}
								icons={character.chainIcons ?? []}
							/>
						</div>
						<div className="flex flex-wrap items-center justify-center gap-1">
							<CardBadge title={`Level ${account.level}`}>
								Lv {account.level}
							</CardBadge>
							<CardBadge title="Echoes equipped">
								<img
									src="/echoes.webp"
									alt=""
									className="size-3.5 object-contain"
								/>
								{account.echoCount}/5
							</CardBadge>
						</div>
					</>
				) : null}
			</div>
		</Card>
	);
}

export function CharactersTab() {
	const { snapshot, error } = useAccountSnapshot();
	const [filters, setFilters] = usePersistedState(
		"characters.filters",
		DEFAULT_FILTERS,
		reviveCharacterFilters,
	);
	const [sortKey, setSortKey] = usePersistedState(
		"characters.sortKey",
		"name",
		reviveCharacterSort,
	);
	const [sortDesc, setSortDesc] = usePersistedState(
		"characters.sortDesc",
		CHARACTER_SORT_OPTIONS[0].desc ?? false,
		reviveBoolean,
	);
	const [selectedCharacterId, setSelectedCharacterId] = usePersistedState(
		"characters.selectedCharacterId",
		null,
		reviveCharacterId,
	);

	// All characters plus any captured resonator missing from the static data.
	const characters = useMemo(() => {
		const list = [...allCharacters];
		const known = new Set(list.map((character) => character.id));
		for (const resonator of snapshot.resonators) {
			if (known.has(resonator.id)) continue;
			known.add(resonator.id);
			list.push({
				id: resonator.id,
				name:
					charactersById.get(resonator.id)?.character_name ||
					resonator.name ||
					String(resonator.id),
				image: charactersById.get(resonator.id)?.icon_head_256 ?? "",
			});
		}
		return list.sort((a, b) => a.name.localeCompare(b.name));
	}, [snapshot.resonators]);

	const accountByCharacterId = useMemo(() => {
		const map = new Map<number, CardAccount>();
		for (const resonator of snapshot.resonators) {
			const weapon = weaponForResonator(snapshot, resonator.id);
			map.set(resonator.id, {
				level: resonator.level,
				chain: resonator.chain,
				echoCount: echoesForResonator(snapshot, resonator.id).length,
				weapon: weapon
					? {
							itemId: weapon.itemId,
							level: weapon.level,
							rank: weapon.rank,
							name: weaponName(weapon),
						}
					: null,
			});
		}
		return map;
	}, [snapshot]);

	const filteredCharacters = sortCharacters(
		characters.filter((character) =>
			matchesCharacterFilters(
				character,
				accountByCharacterId.get(character.id),
				filters,
			),
		),
		accountByCharacterId,
		sortKey,
		sortDesc,
	);
	const hasActiveFilters =
		JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS) ||
		sortKey !== "name" ||
		sortDesc !== (CHARACTER_SORT_OPTIONS[0].desc ?? false);

	const toggleFilterValue = (
		key: "elements" | "weaponTypes",
		value: string,
	) => {
		setFilters((prev) => ({
			...prev,
			[key]: prev[key].includes(value)
				? prev[key].filter((v) => v !== value)
				: [...prev[key], value],
		}));
	};

	const toggleRarity = (rarity: number) => {
		setFilters((prev) => ({
			...prev,
			rarity: prev.rarity.includes(rarity)
				? prev.rarity.filter((r) => r !== rarity)
				: [...prev.rarity, rarity],
		}));
	};

	const selectedCharacter = selectedCharacterId
		? (characters.find((c) => c.id === selectedCharacterId) ?? null)
		: null;

	if (selectedCharacter) {
		return (
			<div className="min-h-0 flex-1 overflow-y-auto">
				<BuildDetail
					character={selectedCharacter}
					account={accountByCharacterId.get(selectedCharacter.id)}
					echoes={echoesForResonator(snapshot, selectedCharacter.id)}
					onBack={() => setSelectedCharacterId(null)}
				/>
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3">
			{snapshot.player && (
				<Card className="shrink-0">
					<CardContent className="flex items-center gap-4">
						<div className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-base font-semibold">
							{snapshot.player.level}
						</div>
						<div className="min-w-0">
							<p className="truncate font-medium">
								{snapshot.player.name || "Player"}
							</p>
							<p className="text-xs text-muted-foreground">
								UID {snapshot.player.playerId} · World level{" "}
								{snapshot.player.worldLevel}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			<Card className="shrink-0">
				<CardContent className="flex flex-wrap items-end gap-x-4 gap-y-2">
					<div className="flex min-w-44 flex-1 flex-col gap-1">
						<span className="text-[10px] leading-none text-muted-foreground">
							Search
						</span>
						<Input
							type="text"
							placeholder="Character name..."
							value={filters.search}
							onChange={(e) =>
								setFilters((prev) => ({ ...prev, search: e.target.value }))
							}
						/>
					</div>

					<div className="flex flex-col gap-1">
						<span className="text-[10px] leading-none text-muted-foreground">
							Element
						</span>
						<div className="flex gap-1">
							{elementOptions.map((option) => (
								<FilterIconButton
									key={option.value}
									icon={option.icon ?? ""}
									title={option.value}
									colored
									pressed={filters.elements.includes(option.value)}
									onClick={() => toggleFilterValue("elements", option.value)}
								/>
							))}
						</div>
					</div>

					<div className="flex flex-col gap-1">
						<span className="text-[10px] leading-none text-muted-foreground">
							Weapon
						</span>
						<div className="flex gap-1">
							{weaponTypeOptions.map((option) => (
								<FilterIconButton
									key={option.value}
									icon={option.icon ?? ""}
									title={option.value}
									pressed={filters.weaponTypes.includes(option.value)}
									onClick={() => toggleFilterValue("weaponTypes", option.value)}
								/>
							))}
						</div>
					</div>

					<div className="flex flex-col gap-1">
						<span className="text-[10px] leading-none text-muted-foreground">
							Rarity
						</span>
						<div className="flex gap-1">
							{[4, 5].map((rarity) => (
								<Button
									key={rarity}
									type="button"
									variant={
										filters.rarity.includes(rarity) ? "default" : "outline"
									}
									size="sm"
									title={`${rarity}★ only`}
									className={rarityTextClass(rarity)}
									onClick={() => toggleRarity(rarity)}
								>
									{rarity}★
								</Button>
							))}
						</div>
					</div>

					<div className="flex flex-col gap-1">
						<span className="text-[10px] leading-none text-muted-foreground">
							Ownership
						</span>
						<span className="flex h-7 items-center gap-1.5 text-xs">
							<Switch
								checked={filters.ownedOnly}
								onCheckedChange={(checked) =>
									setFilters((prev) => ({ ...prev, ownedOnly: checked }))
								}
							/>
							Owned
						</span>
					</div>

					<div className="flex w-full flex-wrap items-end gap-x-6 gap-y-2 border-t pt-2">
						<div className="w-48">
							<RangeFilter
								label="Lv"
								min={LEVEL_RANGE[0]}
								max={LEVEL_RANGE[1]}
								value={filters.levelRange}
								onChange={(levelRange) =>
									setFilters((prev) => ({ ...prev, levelRange }))
								}
							/>
						</div>

						<div className="w-40">
							<RangeFilter
								label="Chain"
								min={CHAIN_RANGE[0]}
								max={CHAIN_RANGE[1]}
								value={filters.chainRange}
								onChange={(chainRange) =>
									setFilters((prev) => ({ ...prev, chainRange }))
								}
							/>
						</div>

						<div className="flex flex-wrap items-center gap-1.5">
							<span className="text-[10px] text-muted-foreground">Sort</span>
							{CHARACTER_SORT_OPTIONS.map((option) => {
								const active = sortKey === option.value;
								return (
									<Button
										key={option.value}
										type="button"
										variant={active ? "default" : "outline"}
										size="sm"
										title={
											active
												? `${option.label} (${sortDesc ? "descending" : "ascending"})`
												: `Sort by ${option.label}`
										}
										onClick={() => {
											if (active) {
												setSortDesc((d) => !d);
											} else {
												setSortKey(option.value);
												setSortDesc(option.desc);
											}
										}}
									>
										{option.label}
										{active &&
											(sortDesc ? (
												<ArrowDown className="size-3" />
											) : (
												<ArrowUp className="size-3" />
											))}
									</Button>
								);
							})}
						</div>

						<div className="ml-auto flex items-center gap-2">
							<span className="text-xs text-muted-foreground">
								Showing {filteredCharacters.length} of {characters.length}
							</span>
							{hasActiveFilters && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setFilters(DEFAULT_FILTERS);
										setSortKey("name");
										setSortDesc(false);
									}}
								>
									Reset
								</Button>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{error && <p className="text-sm text-destructive">{error}</p>}

			<div className="min-h-0 flex-1 overflow-y-auto pr-1">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
					{filteredCharacters.map((character) => (
						<CharacterCard
							key={character.id}
							character={character}
							account={accountByCharacterId.get(character.id)}
							onOpen={() => setSelectedCharacterId(character.id)}
						/>
					))}
				</div>

				{filteredCharacters.length === 0 && (
					<div className="py-8 text-center text-muted-foreground">
						No characters match the current filters.
					</div>
				)}
			</div>
		</div>
	);
}
