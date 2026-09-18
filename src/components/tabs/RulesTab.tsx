import { useState } from "react";
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
import {
	parseSubstatTiers,
	type StatTier,
	sonataNames,
	splitStatCodes,
	statIconUrl,
} from "@/lib/stats";
import buildsData from "../../configs/character_builds.json";
import characterData from "../../configs/character_data.json";
import echoData from "../../configs/echo_data.json";

interface Character {
	character_id: number;
	character_name: string;
	icon_pile: string;
}

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

const builds = buildsData as Record<string, BuildEntry>;
const echoes = echoData as EchoEntry[];

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
								<span className="text-sm font-medium flex-1 text-center">
									{stats.join(" • ")}
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
			<img src={statIconUrl(stat.code)} alt="" className="size-4 shrink-0" />
			<span className="text-sm font-semibold truncate">{stat.name}</span>
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

function buildCharacters(): (Character & { roles: string[] })[] {
	const characters: (Character & { roles: string[] })[] = [];
	const seen = new Set<number>();
	for (const character of characterData as Character[]) {
		if (seen.has(character.character_id)) continue;
		const build = Object.values(builds).find(
			(entry) => entry.character_id === character.character_id,
		);
		if (build) {
			seen.add(character.character_id);
			characters.push({
				...character,
				roles: Object.keys(build.roles),
			});
		}
	}
	return characters;
}

const allCharacters = buildCharacters();

function BuildDetail({
	character,
	onBack,
}: {
	character: (typeof allCharacters)[0];
	onBack: () => void;
}) {
	const [selectedRole, setSelectedRole] = useState<string | null>(null);

	const build = Object.values(builds).find(
		(entry) => entry.character_id === character.character_id,
	);
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
					src={character.icon_pile}
					alt={character.character_name}
					className="w-16 h-16 object-contain"
				/>
				<div className="flex-1">
					<h2 className="text-2xl font-bold">{character.character_name}</h2>
					<p className="text-muted-foreground">Build guides from tethys.gg</p>
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

			{guide && (
				<div className="space-y-4">
					<EchoSetsCard guide={guide} />
					<SubstatsCard guide={guide} fallbackPriority={firstRolePriority} />
				</div>
			)}
		</div>
	);
}

export function RulesTab() {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(
		null,
	);

	const filteredCharacters = allCharacters.filter((character) =>
		character.character_name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const selectedCharacter = selectedCharacterId
		? (allCharacters.find((c) => c.character_id === selectedCharacterId) ??
			null)
		: null;

	if (selectedCharacter) {
		return (
			<BuildDetail
				character={selectedCharacter}
				onBack={() => setSelectedCharacterId(null)}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<Input
					type="text"
					placeholder="Search characters by name..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>

				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
					{filteredCharacters.map((character) => (
						<Card
							key={character.character_id}
							className="cursor-pointer hover:border-primary transition-colors"
							onClick={() => setSelectedCharacterId(character.character_id)}
						>
							<CardContent className="p-4 flex flex-col items-center gap-3">
								<div className="relative w-full aspect-square">
									<img
										src={character.icon_pile}
										alt={character.character_name}
										className="w-full h-full object-contain"
									/>
								</div>
								<div className="text-center space-y-1 w-full">
									<p className="text-sm font-medium truncate">
										{character.character_name}
									</p>
									<p className="text-xs text-muted-foreground">
										{character.roles.length} Role
										{character.roles.length === 1 ? "" : "s"}
									</p>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				{filteredCharacters.length === 0 && (
					<div className="text-center py-8 text-muted-foreground">
						No characters found matching "{searchQuery}"
					</div>
				)}
			</div>
		</div>
	);
}
