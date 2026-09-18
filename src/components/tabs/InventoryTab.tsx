import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Trash2, UserRound } from "lucide-react";
import characterData from "../../configs/character_data.json";
import echoData from "../../configs/echo_data.json";
import { parseStatLines, statIconAsset } from "@/lib/stats";

interface InventoryEcho {
	echo_name: string;
	level: string;
	main_stats: string;
	sub_stats: string;
	equippedBy?: string;
}

interface InventoryProgress {
	scanned: number;
	echo: InventoryEcho;
}

interface CharacterEntry {
	character_id: number;
	character_name: string;
	icon_head_256: string;
}

interface EchoEntry {
	echo_name: string;
	icon_middle?: string;
	echo_sets?: { name: string; icon: string }[];
}

// Deduplicate characters while keeping the data file order
const allCharacters: CharacterEntry[] = [
	...new Map(
		(characterData as CharacterEntry[]).map((character) => [
			character.character_id,
			character,
		]),
	).values(),
];

const charactersByLowerName = new Map(
	allCharacters.map((character) => [
		character.character_name.toLowerCase(),
		character,
	]),
);

const echoesByLowerName = new Map<string, EchoEntry>(
	(echoData as EchoEntry[]).map((echo) => [
		echo.echo_name.toLowerCase(),
		echo,
	]),
);

// The sonata icon assets only ship in the IconElementAttri128 resolution
function sonataIcon128(icon: string): string {
	return icon.replace(
		"IconElementAttri/T_IconElementAttri",
		"IconElementAttri128/T_IconElementAttri128_",
	);
}

function echoImage(name: string): string | undefined {
	return echoesByLowerName.get(name.toLowerCase())?.icon_middle;
}

function echoSet(name: string) {
	return echoesByLowerName.get(name.toLowerCase())?.echo_sets?.[0];
}

// "Equipped by Phrolova" -> character entry
function equippedCharacter(equippedBy: string | undefined) {
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
	return (
		<div className="flex items-center gap-1.5 min-w-0" title={name}>
			{icon && <img src={icon} alt="" className="size-3 shrink-0" />}
			<span
				className={`flex-1 truncate text-[11px] ${muted ? "text-muted-foreground" : ""}`}
			>
				{name}
			</span>
			{value && <span className="text-[11px] font-semibold">{value}</span>}
		</div>
	);
}

function echoKey(echo: InventoryEcho): string {
	return [
		echo.echo_name,
		echo.level,
		echo.main_stats,
		echo.sub_stats,
		echo.equippedBy ?? "",
	].join("|");
}

export function InventoryTab({
	onOpenScanner,
}: {
	onOpenScanner: () => void;
}) {
	const [error, setError] = useState<string | null>(null);
	const [echoes, setEchoes] = useState<InventoryEcho[]>([]);
	const [confirmingClear, setConfirmingClear] = useState(false);

	useEffect(() => {
		invoke<InventoryEcho[]>("get_saved_echoes")
			.then(setEchoes)
			.catch(console.error);

		const unlistenProgress = listen<InventoryProgress>(
			"inventory-progress",
			(event) => {
				setEchoes((prev) => {
					const key = echoKey(event.payload.echo);
					if (prev.some((echo) => echoKey(echo) === key)) {
						return prev;
					}
					return [event.payload.echo, ...prev];
				});
			},
		);

		return () => {
			unlistenProgress.then((fn) => fn());
		};
	}, []);

	const clearSaved = async () => {
		try {
			await invoke("clear_saved_echoes");
			setEchoes([]);
		} catch (e) {
			setError(String(e));
		} finally {
			setConfirmingClear(false);
		}
	};

	const deleteEcho = async (echo: InventoryEcho) => {
		try {
			await invoke("delete_saved_echo", { echo });
			setEchoes((prev) => prev.filter((e) => echoKey(e) !== echoKey(echo)));
		} catch (e) {
			setError(String(e));
		}
	};

	const changeEquippedBy = async (echo: InventoryEcho, value: string) => {
		const equippedBy =
			value === "unequipped"
				? ""
				: `Equipped by ${
						allCharacters.find(
							(character) => String(character.character_id) === value,
						)?.character_name ?? ""
					}`;
		try {
			await invoke("set_echo_equipped_by", { echo, equippedBy });
			setEchoes((prev) =>
				prev.map((e) => (echoKey(e) === echoKey(echo) ? { ...e, equippedBy } : e)),
			);
		} catch (e) {
			setError(String(e));
		}
	};

	const equippedValue = (echo: InventoryEcho): string => {
		const character = equippedCharacter(echo.equippedBy);
		return character ? String(character.character_id) : "unequipped";
	};

	return (
		<Card>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between">
					<Label className="text-base font-medium">Echo Inventory</Label>
					{echoes.length > 0 &&
						(confirmingClear ? (
							<div className="flex items-center gap-2">
								<span className="text-xs text-destructive">
									Delete all {echoes.length} echoes?
								</span>
								<Button variant="destructive" size="sm" onClick={clearSaved}>
									Confirm
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setConfirmingClear(false)}
								>
									Cancel
								</Button>
							</div>
						) : (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setConfirmingClear(true)}
							>
								Clear Saved
							</Button>
						))}
				</div>

				{echoes.length === 0 ? (
					<div className="space-y-3 py-8 text-center">
						<p className="text-sm text-muted-foreground">
							No echoes scanned yet. Head to the scanner to capture your
							echoes.
						</p>
						<Button onClick={onOpenScanner}>Open Scanner</Button>
					</div>
				) : (
					<>
						<p className="text-xs text-muted-foreground">
							Saved echoes: {echoes.length}
						</p>
						<div className="max-h-[60vh] overflow-y-auto pr-1">
							<div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
								{echoes.map((echo) => {
									const image = echoImage(echo.echo_name);
									const set = echoSet(echo.echo_name);
									const character = equippedCharacter(echo.equippedBy);
									const mainLines = parseStatLines(echo.main_stats);
									const subLines = parseStatLines(echo.sub_stats);
									return (
										<div
											key={echoKey(echo)}
											className="bg-muted/50 p-2.5 text-sm"
										>
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
														<span
															className="truncate font-medium"
															title={echo.echo_name}
														>
															{echo.echo_name}
														</span>
														<span className="text-xs text-yellow-400 font-bold">
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
												<div className="flex shrink-0 items-start gap-1">
													<Select
														value={equippedValue(echo)}
														onValueChange={(value) =>
															changeEquippedBy(echo, value ?? "unequipped")
														}
													>
														<SelectTrigger
															title={echo.equippedBy || "Not equipped"}
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
															<SelectItem value="unequipped">
																Not equipped
															</SelectItem>
															{allCharacters.map((character) => (
																<SelectItem
																	key={character.character_id}
																	value={String(character.character_id)}
																>
																	<img
																		src={character.icon_head_256}
																		alt=""
																		className="size-5 object-contain"
																	/>
																	{character.character_name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<Button
														variant="ghost"
														size="sm"
														title="Delete echo"
														className="size-8 p-0 text-muted-foreground hover:text-destructive"
														onClick={() => deleteEcho(echo)}
													>
														<Trash2 className="size-3.5" />
													</Button>
												</div>
											</div>
											<div className="mt-2 space-y-0.5">
												{mainLines.map((line) => (
													<StatRow key={line.name} {...line} />
												))}
											</div>
											{subLines.length > 0 && (
												<div className="mt-1 space-y-0.5 border-t pt-1">
													{subLines.map((line, index) => (
														<StatRow
															key={`${line.name}-${index}`}
															{...line}
															muted
														/>
													))}
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					</>
				)}

				{error && <p className="text-sm text-destructive">{error}</p>}
			</CardContent>
		</Card>
	);
}
