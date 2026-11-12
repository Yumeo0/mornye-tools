import {
	Copy01Icon,
	Delete02Icon,
	Logout01Icon,
	MoreHorizontalIcon,
	UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ReactNode, useState } from "react";
import {
	EchoCard,
	echoName,
	equippedCharacter,
} from "@/components/echo/EchoCard";
import { EchoMarkControls } from "@/components/echo/EchoMarkControls";
import { EchoMarkIcon } from "@/components/echo/EchoMarkStatus";
import type { EchoRoll, EchoRollSummary } from "@/components/echo/echoRolls";
import type { FilterOption } from "@/components/filters";
import { Button } from "@/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import type { Echo } from "@/lib/account";
import type { EchoMark } from "@/lib/echoMark";

/** Inventory actions share one menu, with equipment and marks in one toolbar. */
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
	onUnequip,
	unequipDisabledReason,
	unequipPending = false,
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
	onUnequip?: (echo: Echo) => void;
	unequipDisabledReason?: string | null;
	unequipPending?: boolean;
}) {
	const character = equippedCharacter(echo.equippedBy);
	const name = echoName(echo);
	const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(
		null,
	);
	const selectedRoll =
		roll?.options.find(
			(option) => option.character.character_id === selectedCharacterId,
		) ?? roll;
	const unequipDisabled =
		!onUnequip || !!unequipDisabledReason || unequipPending;
	const commands: {
		key: string;
		label: string;
		icon: ReactNode;
		disabled?: boolean;
		title?: string;
		destructive?: boolean;
		onClick: () => void;
	}[] = [
		{
			key: "copy",
			label: "Copy echo info",
			icon: <HugeiconsIcon icon={Copy01Icon} />,
			onClick: () => onCopyInfo(echo, selectedRoll),
		},
		...(onChangeMark
			? [
					{
						key: "lock",
						label: echo.funcValue === 1 ? "Unlock echo" : "Lock echo",
						icon: (
							<EchoMarkIcon mark={echo.funcValue === 1 ? "none" : "locked"} />
						),
						disabled: markDisabled || markPending,
						onClick: () =>
							onChangeMark(echo, echo.funcValue === 1 ? "none" : "locked"),
					},
					{
						key: "discard",
						label:
							echo.funcValue === 2 ? "Remove discard mark" : "Mark as discard",
						icon: <EchoMarkIcon mark="discarded" />,
						disabled: markDisabled || markPending,
						onClick: () =>
							onChangeMark(echo, echo.funcValue === 2 ? "none" : "discarded"),
					},
				]
			: []),
		...(echo.source !== "manual" && echo.equippedBy != null && onUnequip
			? [
					{
						key: "unequip",
						label: unequipPending ? "Unequipping…" : "Unequip echo",
						icon: <HugeiconsIcon icon={Logout01Icon} />,
						disabled: unequipDisabled,
						title: unequipDisabledReason ?? undefined,
						onClick: () => onUnequip(echo),
					},
				]
			: []),
		...(echo.source === "manual"
			? [
					{
						key: "remove",
						label: "Remove manual echo",
						icon: <HugeiconsIcon icon={Delete02Icon} />,
						destructive: true,
						onClick: () => onRemove(echo.incrId),
					},
				]
			: []),
	];
	const equipment =
		echo.source === "manual" ? (
			<Select
				value={echo.equippedBy != null ? String(echo.equippedBy) : "unequipped"}
				onValueChange={(value) => onChangeEquipped(echo, value ?? "unequipped")}
			>
				<SelectTrigger
					size="sm"
					className="w-full min-w-0"
					aria-label={`Equip ${name} to a Resonator`}
					title={character?.character_name ?? "Not equipped"}
				>
					{character ? (
						<img
							src={character.icon_head_256}
							alt=""
							className="size-5 object-contain"
						/>
					) : (
						<HugeiconsIcon icon={UserCircleIcon} />
					)}
					<span className="min-w-0 flex-1 truncate text-left">
						{character?.character_name ??
							(echo.equippedBy != null
								? `Resonator ${echo.equippedBy}`
								: "Not equipped")}
					</span>
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
		) : (
			<div className="flex min-h-7 min-w-0 items-center gap-2">
				{character ? (
					<img
						src={character.icon_head_256}
						alt=""
						className="size-5 shrink-0 object-contain"
					/>
				) : (
					<HugeiconsIcon
						icon={UserCircleIcon}
						className="size-5 shrink-0 text-muted-foreground"
					/>
				)}
				<div className="min-w-0 flex-1">
					{echo.equippedBy != null ? (
						<p
							className="truncate text-xs font-medium"
							title={`Equipped to ${character?.character_name ?? `Resonator ${echo.equippedBy}`}`}
						>
							{character?.character_name ?? `Resonator ${echo.equippedBy}`}
						</p>
					) : (
						<p className="text-xs text-muted-foreground">Not equipped</p>
					)}
				</div>
				{echo.equippedBy != null && (
					<span title={unequipDisabledReason ?? "Unequip this echo in game"}>
						<Button
							variant="outline"
							size="xs"
							aria-label={`Unequip ${name}`}
							disabled={unequipDisabled}
							onClick={() => onUnequip?.(echo)}
						>
							{unequipPending ? "Unequipping…" : "Unequip"}
						</Button>
					</span>
				)}
			</div>
		);
	return (
		<ContextMenu>
			<ContextMenuTrigger className="h-full min-w-0">
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
										equippedCharacter(selectedRoll.character.character_id)
											?.icon_head_256 ?? selectedRoll.character.icon_pile,
								}
							: null
					}
					actions={
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={`Actions for ${name}`}
										title="Echo actions"
									/>
								}
							>
								<HugeiconsIcon icon={MoreHorizontalIcon} />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-52 p-1">
								<DropdownMenuGroup>
									{commands.map((command) => (
										<DropdownMenuItem
											key={command.key}
											disabled={command.disabled}
											title={command.title}
											variant={command.destructive ? "destructive" : "default"}
											onClick={command.onClick}
										>
											{command.icon}
											{command.label}
										</DropdownMenuItem>
									))}
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					}
					equipment={equipment}
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
					{commands.map((command) => (
						<ContextMenuItem
							key={command.key}
							disabled={command.disabled}
							title={command.title}
							variant={command.destructive ? "destructive" : "default"}
							onClick={command.onClick}
						>
							{command.icon}
							{command.label}
						</ContextMenuItem>
					))}
				</ContextMenuGroup>
			</ContextMenuContent>
		</ContextMenu>
	);
}
