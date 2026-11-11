import { UserRound } from "lucide-react";
import { useState } from "react";
import { EchoCard, equippedCharacter } from "@/components/echo/EchoCard";
import { EchoMarkControls } from "@/components/echo/EchoMarkControls";
import type { EchoRoll, EchoRollSummary } from "@/components/echo/echoRolls";
import type { FilterOption } from "@/components/filters";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import type { Echo } from "@/lib/account";
import { charactersById } from "@/lib/catalog";
import { ECHO_MARK_ICONS, type EchoMark } from "@/lib/echoMark";

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
	onChangeMark,
	markDisabled = false,
	markPending = false,
}: {
	echo: Echo;
	roll?: EchoRollSummary;
	characterOptions: FilterOption[];
	onChangeEquipped: (echo: Echo, value: string) => void;
	onCopyInfo: (echo: Echo, roll?: EchoRoll) => void;
	onRemove: (incrId: number) => void;
	onChangeMark?: (echo: Echo, mark: EchoMark) => void;
	markDisabled?: boolean;
	markPending?: boolean;
}) {
	const character = equippedCharacter(echo.equippedBy);
	const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(
		null,
	);
	const selectedRoll =
		roll?.options.find(
			(option) => option.character.character_id === selectedCharacterId,
		) ?? roll;
	return (
		<ContextMenu>
			<ContextMenuTrigger className="h-full">
				<EchoCard
					echo={echo}
					rollValue={selectedRoll?.rating}
					rollSubstatTiers={selectedRoll?.character.stats.subs}
					rollErBreakpoint={selectedRoll?.character.stats.erBreakpoint}
					rollOptions={roll?.options}
					onRollSelect={(option) =>
						setSelectedCharacterId(option.character.character_id)
					}
					rollCharacter={
						selectedRoll
							? {
									name: selectedRoll.character.character_name,
									icon:
										charactersById.get(selectedRoll.character.character_id)
											?.icon_head_256 ?? selectedRoll.character.icon_pile,
								}
							: null
					}
					actions={
						<Select
							disabled={echo.source !== "manual"}
							value={
								echo.equippedBy != null ? String(echo.equippedBy) : "unequipped"
							}
							onValueChange={(value) =>
								echo.source === "manual" &&
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
								<SelectGroup>
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
								</SelectGroup>
							</SelectContent>
						</Select>
					}
					markActions={
						onChangeMark && (
							<EchoMarkControls
								echo={echo}
								disabled={markDisabled}
								pending={markPending}
								onChange={onChangeMark}
							/>
						)
					}
				/>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuGroup>
					{onChangeMark && (
						<>
							<ContextMenuItem
								disabled={markDisabled}
								onClick={() =>
									onChangeMark(echo, echo.funcValue === 1 ? "none" : "locked")
								}
							>
								<img
									src={
										echo.funcValue === 1
											? ECHO_MARK_ICONS.unlocked
											: ECHO_MARK_ICONS.locked
									}
									alt=""
									className="size-4 object-contain"
								/>
								{echo.funcValue === 1 ? "Unlock echo" : "Lock echo"}
							</ContextMenuItem>
							<ContextMenuItem
								disabled={markDisabled}
								onClick={() =>
									onChangeMark(
										echo,
										echo.funcValue === 2 ? "none" : "discarded",
									)
								}
							>
								<img
									src={ECHO_MARK_ICONS.discarded}
									alt=""
									className="size-4 object-contain"
								/>
								{echo.funcValue === 2
									? "Remove discard mark"
									: "Mark as discard"}
							</ContextMenuItem>
						</>
					)}
					<ContextMenuItem onClick={() => onCopyInfo(echo, selectedRoll)}>
						Copy echo info
					</ContextMenuItem>
					{echo.source === "manual" && (
						<ContextMenuItem onClick={() => onRemove(echo.incrId)}>
							Remove manual echo
						</ContextMenuItem>
					)}
				</ContextMenuGroup>
			</ContextMenuContent>
		</ContextMenu>
	);
}
