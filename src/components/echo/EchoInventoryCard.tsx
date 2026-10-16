import { UserRound } from "lucide-react";
import { EchoCard, equippedCharacter } from "@/components/echo/EchoCard";
import type { EchoRoll } from "@/components/echo/echoRolls";
import type { FilterOption } from "@/components/filters";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import type { Echo } from "@/lib/account";
import { charactersById } from "@/lib/catalog";

/**
 * One echo in the inventory grid: the card plus its context menu (copy info,
 * remove manual echo) and the equipped-character select.
 */
export function EchoInventoryCard({
	echo,
	roll,
	characterOptions,
	onChangeEquipped,
	onCopyInfo,
	onRemove,
}: {
	echo: Echo;
	roll?: EchoRoll;
	characterOptions: FilterOption[];
	onChangeEquipped: (echo: Echo, value: string) => void;
	onCopyInfo: (echo: Echo, roll?: EchoRoll) => void;
	onRemove: (incrId: number) => void;
}) {
	const character = equippedCharacter(echo.equippedBy);
	return (
		<ContextMenu>
			<ContextMenuTrigger className="h-full">
				<EchoCard
					echo={echo}
					rollValue={roll?.rating}
					rollCharacter={
						roll
							? {
									name: roll.character.character_name,
									icon:
										charactersById.get(roll.character.character_id)
											?.icon_head_256 ?? roll.character.icon_pile,
								}
							: null
					}
					actions={
						<Select
							value={
								echo.equippedBy != null ? String(echo.equippedBy) : "unequipped"
							}
							onValueChange={(value) =>
								onChangeEquipped(echo, value ?? "unequipped")
							}
						>
							<SelectTrigger
								title={
									charactersById.get(echo.equippedBy ?? -1)?.character_name ||
									"Not equipped"
								}
								className="size-8 w-8 justify-center p-0.5 [&>svg:last-child]:hidden"
							>
								{character ? (
									<img
										src={character.icon_head_256}
										alt={character.character_name}
										className="size-full object-contain"
									/>
								) : (
									<UserRound className="size-4 text-muted-foreground" />
								)}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="unequipped">Not equipped</SelectItem>
								{characterOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.icon && (
											<img
												src={option.icon}
												alt=""
												className="size-5 object-contain"
											/>
										)}
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					}
				/>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onClick={() => onCopyInfo(echo, roll)}>
					Copy echo info
				</ContextMenuItem>
				{echo.source === "manual" && (
					<ContextMenuItem onClick={() => onRemove(echo.incrId)}>
						Remove manual echo
					</ContextMenuItem>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);
}
