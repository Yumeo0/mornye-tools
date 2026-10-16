import { ChainNodes } from "@/components/characters/ChainNodes";
import { CardBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { weaponIconUrl } from "@/components/weapon/WeaponCard";
import type { CardAccount, CharacterEntry } from "@/lib/characters";
import { qualityGradient } from "@/lib/rarity";

/** Grid card: portrait with the in-game overlays (element, weapon, owned state). */
export function CharacterCard({
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
						title={`${account.weapon.name} · Lvl ${account.weapon.level} · Rank ${account.weapon.rank}`}
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
								Lvl {account.level}
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
