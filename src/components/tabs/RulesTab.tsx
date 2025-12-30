import { Store } from "@tauri-apps/plugin-store";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import characterData from "../../../public/character_data.json";
import echoSetsData from "../../../public/echo_sets.json";

interface Character {
	character_id: number;
	character_name: string;
	element: string;
	icon_pile: string;
	rarity: number;
}

interface EchoSet {
	id: number;
	name: string;
	icon: string;
}

interface CharacterConfig {
	enabled: boolean;
	mainEchoes: number[];
	sets: number[];
	stats: {
		"4cost": string[][];
		"3cost": string[][];
		"1cost": string[][];
		subs: string[][];
	};
}

export function RulesTab() {
	const characters = characterData as Character[];
	const echoSets = echoSetsData as EchoSet[];
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null,);
	const [characterConfig, setCharacterConfig] = useState<CharacterConfig | null>(null);
	const [configs, setConfigs] = useState<Record<number, CharacterConfig>>({});
	const [enabledStates, setEnabledStates] = useState<Record<number, boolean>>({},);

	// Filter characters based on search query
	const filteredCharacters = characters.filter((character) =>
		character.character_name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	// Load all character configs on mount
	useEffect(() => {
		const loadAllConfigs = async () => {
			const newConfigs: Record<number, CharacterConfig> = {};
			const store = await Store.load("character-rules.json");
			// Load enabled states from store
			const enabled = (await store.get("enabled")) as Record<number, boolean> || {};
			setEnabledStates(enabled);
			for (const character of characters) {
				try {
					const response = await fetch(
						`/src/configs/characters/${character.character_id}.json`,
					);
					if (response.ok) {
						const config = await response.json();
						config.enabled = enabled[character.character_id] || false;
						newConfigs[character.character_id] = config;
					} else {
						newConfigs[character.character_id] = {
							enabled: enabled[character.character_id] || false,
							mainEchoes: [],
							sets: [],
							stats: {
								"4cost": [],
								"3cost": [],
								"1cost": [],
								subs: [],
							},
						};
					}
				} catch (_error) {
					newConfigs[character.character_id] = {
						enabled: enabled[character.character_id] || false,
						mainEchoes: [],
						sets: [],
						stats: {
							"4cost": [],
							"3cost": [],
							"1cost": [],
							subs: [],
						},
					};
				}
			}
			setConfigs(newConfigs);
		};
		loadAllConfigs();
	}, [characters]);

	// Load character config when character is selected
	useEffect(() => {
		if (selectedCharacter) {
			const config = configs[selectedCharacter.character_id] || {
				enabled: enabledStates[selectedCharacter.character_id] || false,
				mainEchoes: [],
				sets: [],
				stats: {
					"4cost": [],
					"3cost": [],
					"1cost": [],
					subs: [],
				},
			};
			setCharacterConfig(config);
		}
	}, [selectedCharacter, configs, enabledStates]);

	const saveCharacterConfig = async () => {
		if (!selectedCharacter || !characterConfig) return;

		try {
			const store = await Store.load("character-rules.json");
			const newEnabled = { ...enabledStates, [selectedCharacter.character_id]: characterConfig.enabled };
			await store.set("enabled", newEnabled);
			await store.save();
			setEnabledStates(newEnabled);
			setConfigs({
				...configs,
				[selectedCharacter.character_id]: characterConfig,
			});
		} catch (error) {
			console.error("Failed to save character config:", error);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: saveCharacterConfig changes on every re-render and should not be used as a hook dependency.
	useEffect(() => {
		saveCharacterConfig();
	}, [characterConfig]);

	if (selectedCharacter && characterConfig) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setSelectedCharacter(null)}
						className="flex items-center gap-2"
					>
						← Back to Characters
					</Button>
				</div>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-4 mb-6">
							<img
								src={selectedCharacter.icon_pile}
								alt={selectedCharacter.character_name}
								className="w-16 h-16 object-contain"
							/>
							<div>
								<h2 className="text-2xl font-bold">
									{selectedCharacter.character_name}
								</h2>
								<p className="text-muted-foreground">
									Configure echo set preferences
								</p>
							</div>
						</div>

						<div className="space-y-4">
							<div>
								<Label className="text-base font-medium mb-3 block">
									Enable Rules for this Character
								</Label>
								<Switch
									checked={characterConfig.enabled}
									onCheckedChange={(checked) =>
										setCharacterConfig({
											...characterConfig,
											enabled: checked,
										})
									}
								/>
							</div>

							{characterConfig.sets.length > 0 && (
								<div>
									<Label className="text-base font-medium mb-3 block">
										Active Echo Sets
									</Label>
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
										{characterConfig.sets.map((setId) => {
											const set = echoSets.find((s) => s.id === setId);
											return set ? (
												<Card key={setId} className="p-3">
													<div className="flex items-center gap-3">
														<img
															src={set.icon}
															alt={set.name}
															className="w-8 h-8 object-contain"
														/>
														<div className="flex-1">
															<p className="font-medium text-sm">{set.name}</p>
														</div>
													</div>
												</Card>
											) : null;
										})}
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Card className="mb-3">
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label className="text-base font-medium">Character Rules</Label>
						<p className="text-sm text-muted-foreground">
							Configure rules for automatic echo evaluation for each character
						</p>
					</div>
				</CardContent>
			</Card>

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
							onClick={() => setSelectedCharacter(character)}
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
										{configs[character.character_id]?.sets.length || 0} Sets
										Active
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
