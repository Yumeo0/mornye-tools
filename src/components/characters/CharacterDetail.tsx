import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { BuildRollValue, BuildStats } from "@/components/characters/BuildStats";
import { ChainNodes } from "@/components/characters/ChainNodes";
import { CharacterArtwork } from "@/components/characters/CharacterArtwork";
import { EchoSetsCard } from "@/components/characters/EchoSetsCard";
import { SubstatsCard } from "@/components/characters/SubstatsCard";
import { EchoCard } from "@/components/echo/EchoCard";
import { PreviewBadge } from "@/components/PreviewBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
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
import { weaponIconUrl } from "@/components/weapon/WeaponCard";
import { useCharacterPanel } from "@/hooks/useCharacterPanel";
import {
	type AccountSnapshot,
	type Echo,
	statPropLines,
	weaponForResonator,
} from "@/lib/account";
import { buildRating } from "@/lib/buildRating";
import {
	buildByCharacterId,
	type CardAccount,
	type CharacterEntry,
} from "@/lib/characters";
import { qualityGradient, rarityTextClass } from "@/lib/rarity";
import {
	calculateRating,
	hasWantedMainStat,
	mainStatForEcho,
	statsForRole,
} from "@/lib/rating";

/** Character build view: owned state, equipped echoes and the role's guide. */
export function CharacterDetail({
	character,
	account,
	echoes,
	snapshot,
	onBack,
}: {
	character: CharacterEntry;
	account: CardAccount | undefined;
	echoes: Echo[];
	snapshot?: AccountSnapshot;
	onBack: () => void;
}) {
	const [selectedRole, setSelectedRole] = useState<string | null>(null);
	const panelInput = useMemo(() => {
		const resonator = snapshot?.resonators.find((r) => r.id === character.id);
		return resonator && snapshot
			? {
					resonator,
					weapon: weaponForResonator(snapshot, character.id),
					echoes,
				}
			: null;
	}, [snapshot, character.id, echoes]);
	const panel = useCharacterPanel(panelInput);

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

	// Wanted substats of the selected role: each equipped echo shows this
	// character's own roll value, not the best across relevant characters.
	const ratingCharacter = useMemo(
		() =>
			guide
				? {
						character_id: character.id,
						character_name: character.name,
						icon_pile: character.image,
						stats: statsForRole(guide, firstRolePriority),
					}
				: null,
		[guide, firstRolePriority, character],
	);
	const rating = useMemo(
		() => buildRating(ratingCharacter, echoes),
		[ratingCharacter, echoes],
	);

	const echoRollValue = (echo: Echo): number | null =>
		!ratingCharacter ||
		ratingCharacter.stats.subs.length === 0 ||
		!hasWantedMainStat(ratingCharacter, mainStatForEcho(echo))
			? null
			: calculateRating(
					ratingCharacter,
					statPropLines(echo.subProps),
					mainStatForEcho(echo),
				);

	const rolePicker = guide ? (
		<Select value={role} onValueChange={setSelectedRole}>
			<SelectTrigger
				size="sm"
				aria-label="Build role"
				className="w-auto min-w-36 max-w-full"
			>
				{role}
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{roleNames.map((roleName) => (
						<SelectItem key={roleName} value={roleName}>
							{roleName}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	) : null;

	return (
		<div className="@container/character-detail flex flex-col gap-5 px-4 pt-1 pb-4 sm:px-6 sm:pb-6">
			<section
				aria-label={character.name}
				className="relative isolate grid min-w-0 @min-[640px]/character-detail:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]"
			>
				<nav
					className="absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-3"
					aria-label="Resonator navigation"
				>
					<Button variant="secondary" size="sm" onClick={onBack}>
						<HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
						Resonators
					</Button>
					{character.preview ? (
						<PreviewBadge />
					) : (
						!account && <Badge variant="outline">Not owned</Badge>
					)}
				</nav>
				{/* The frame begins below the portrait's head; the artwork breaks its top edge. */}
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 top-4 bottom-0 overflow-hidden border bg-card"
				>
					<img
						src={qualityGradient(character.rarity)}
						alt=""
						className="absolute inset-0 size-full object-cover opacity-15"
					/>
					{character.elementIcon && (
						<img
							src={character.elementIcon}
							alt=""
							className="absolute -right-8 -bottom-16 size-80 -rotate-12 object-contain opacity-[0.04]"
						/>
					)}
					<div className="absolute top-0 bottom-0 left-8 w-px bg-border" />
					<div className="absolute top-0 bottom-0 left-10 w-px bg-border/40" />
				</div>

				{/* Clip artwork at the card edges, preserving the portrait column's center. */}
				<div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden @min-[640px]/character-detail:bottom-0 @min-[640px]/character-detail:h-auto">
					<CharacterArtwork
						characterId={character.id}
						image={character.image}
						name={character.name}
						className="absolute -top-2 left-1/2 h-[420px] w-[516px] -translate-x-1/2 drop-shadow-2xl @min-[640px]/character-detail:left-[21.25%] @min-[640px]/character-detail:h-[520px] @min-[640px]/character-detail:w-[640px]"
					/>
					<div className="absolute inset-x-0 bottom-0 h-4 bg-linear-to-t from-card to-transparent" />
				</div>

				<div className="relative min-h-56 self-stretch @min-[640px]/character-detail:min-h-72">
					{/* Keep sequence controls in their original coordinate space. */}
					<div className="absolute inset-y-0 left-1/2 w-full max-w-[305px] -translate-x-1/2 @min-[640px]/character-detail:max-w-[377px]">
						{account && (
							<ChainNodes
								chain={account.chain}
								icons={character.chainIcons ?? []}
								layout="arc"
								className="absolute top-1/2 right-0 h-44 w-20 -translate-y-1/2 @min-[640px]/character-detail:h-56"
							/>
						)}
					</div>
				</div>

				<div className="relative flex min-w-0 flex-col justify-center gap-4 px-6 pt-2 pb-8 @min-[640px]/character-detail:pt-12 @min-[640px]/character-detail:pr-8 @min-[640px]/character-detail:pb-6">
					<div className="relative isolate flex w-fit max-w-full flex-col gap-2 before:absolute before:-inset-x-3 before:-inset-y-2 before:-z-10 before:bg-card/65 before:backdrop-blur-sm">
						<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
							{character.elementIcon && (
								<span className="flex items-center gap-1.5">
									<img
										src={character.elementIcon}
										alt=""
										className="size-5 object-contain"
									/>
									{character.element}
								</span>
							)}
							{character.weaponTypeIcon && (
								<span className="flex items-center gap-1.5">
									<img
										src={character.weaponTypeIcon}
										alt=""
										className="size-4 object-contain"
									/>
									{character.weaponType}
								</span>
							)}
							{character.rarity && (
								<span
									role="img"
									className={rarityTextClass(character.rarity)}
									aria-label={`${character.rarity} stars`}
								>
									{"★".repeat(character.rarity)}
								</span>
							)}
						</div>
						<h2 className="text-3xl leading-tight font-bold tracking-tight @min-[800px]/character-detail:text-5xl">
							{character.name}
						</h2>
					</div>

					{account && (
						<div className="relative isolate flex w-fit flex-wrap items-center gap-x-5 gap-y-3 before:absolute before:-inset-x-3 before:-inset-y-1 before:-z-10 before:bg-card/65 before:backdrop-blur-sm">
							<div
								className="flex items-baseline gap-1.5"
								title="Resonator level"
							>
								<span className="text-xs text-muted-foreground">LV</span>
								<span className="text-2xl leading-none font-semibold tabular-nums">
									{account.level}
								</span>
							</div>
						</div>
					)}

					{account?.weapon && (
						<div className="relative mt-2 ml-4 flex min-h-20 items-center border bg-background/80 py-3 pr-4 pl-24">
							<img
								src={weaponIconUrl(account.weapon.itemId)}
								alt={account.weapon.name ?? "Equipped weapon"}
								className="absolute -top-5 -left-6 size-28 object-contain drop-shadow-xl"
							/>
							<div className="flex min-w-0 flex-col gap-1.5">
								<p className="text-xs font-medium [overflow-wrap:anywhere]">
									{account.weapon.name ?? "Equipped weapon"}
								</p>
								<div className="flex gap-2">
									<Badge variant="outline">Lv {account.weapon.level}</Badge>
									<Badge variant="outline">R{account.weapon.rank}</Badge>
								</div>
							</div>
						</div>
					)}
				</div>
			</section>

			{(account || guide || echoes.length > 0) && (
				<div className="relative -mt-9 mx-3 flex flex-col gap-5 @min-[640px]/character-detail:mx-5">
					{echoes.length > 0 && (
						<Card>
							<CardHeader className="flex flex-wrap items-center justify-between gap-3">
								<CardTitle>
									<span className="flex items-center gap-2">
										<img
											src="/icons/inventory/echoes.webp"
											alt=""
											className="size-5 object-contain"
										/>
										Equipped echoes
									</span>
								</CardTitle>
								<CardAction className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-x-5 gap-y-3">
									{rolePicker}
									<BuildRollValue rating={rating} />
								</CardAction>
							</CardHeader>
							<CardContent>
								<div className="grid gap-2 @min-[480px]/character-detail:grid-cols-2 @min-[800px]/character-detail:grid-cols-3 @min-[1200px]/character-detail:grid-cols-5">
									{echoes.map((echo) => (
										<EchoCard
											key={echo.incrId}
											echo={echo}
											rollValue={echoRollValue(echo)}
											rollSubstatTiers={ratingCharacter?.stats.subs}
											rollErBreakpoint={ratingCharacter?.stats.erBreakpoint}
										/>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{account && (
						<Card>
							<CardHeader>
								<CardTitle>Character stats</CardTitle>
							</CardHeader>
							<CardContent className="@container/build-stats">
								{panelInput && !panel.error ? (
									<>
										<BuildStats
											stats={panel.value?.stats ?? null}
											preferredStats={ratingCharacter?.stats}
										/>
										{panel.value?.notes.map((note) => (
											<p
												key={note}
												className="mt-3 text-xs text-muted-foreground"
											>
												{note}
											</p>
										))}
									</>
								) : (
									<p className="text-xs text-muted-foreground">
										{panel.error ??
											"Capture this Resonator's level and equipment to show stats."}
									</p>
								)}
							</CardContent>
						</Card>
					)}
					{guide && (
						<section
							aria-label="Build recommendations"
							className="flex flex-col gap-3"
						>
							{echoes.length === 0 && (
								<div className="flex justify-end">{rolePicker}</div>
							)}
							<div className="grid items-start gap-3 @min-[1000px]/character-detail:grid-cols-[minmax(0,1fr)_minmax(0,.65fr)]">
								<EchoSetsCard guide={guide} />
								<SubstatsCard
									guide={guide}
									fallbackPriority={firstRolePriority}
								/>
							</div>
						</section>
					)}
				</div>
			)}
		</div>
	);
}
