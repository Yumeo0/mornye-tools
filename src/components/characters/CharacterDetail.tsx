import { useMemo, useState } from "react";
import { ChainNodes } from "@/components/characters/ChainNodes";
import { EchoSetsCard } from "@/components/characters/EchoSetsCard";
import { SubstatsCard } from "@/components/characters/SubstatsCard";
import { EchoCard } from "@/components/echo/EchoCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { type Echo, statPropLines } from "@/lib/account";
import {
	buildByCharacterId,
	type CardAccount,
	type CharacterEntry,
} from "@/lib/characters";
import { rarityTextClass } from "@/lib/rarity";
import { rollValueForWantedSubstats } from "@/lib/rating";
import { parseSubstatTiers } from "@/lib/stats";

/** Character build view: owned state, equipped echoes and the role's guide. */
export function CharacterDetail({
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

	// Wanted substats of the selected role: each equipped echo shows this
	// character's own roll value, not the best across relevant characters.
	const wantedSubstats = useMemo(() => {
		const priority = guide?.substats_priority ?? firstRolePriority ?? null;
		return parseSubstatTiers(priority)
			.flat()
			.map((stat) => stat.name);
	}, [guide, firstRolePriority]);

	const echoRollValue = (echo: Echo): number | null =>
		wantedSubstats.length === 0
			? null
			: rollValueForWantedSubstats(
					wantedSubstats,
					statPropLines(echo.subProps),
				);

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
								<span className="font-medium">Lvl {account.level}</span>
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
								<EchoCard
									key={echo.incrId}
									echo={echo}
									rollValue={echoRollValue(echo)}
								/>
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
