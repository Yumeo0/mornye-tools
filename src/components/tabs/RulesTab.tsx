import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import characterData from "../../../public/character_data.json";

interface Character {
	character_id: number;
	character_name: string;
	element: string;
	icon_pile: string;
	rarity: number;
}

export function RulesTab() {
	const characters = characterData as Character[];
	const [searchQuery, setSearchQuery] = useState("");

	// Filter characters based on search query
	const filteredCharacters = characters.filter((character) =>
		character.character_name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

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
									0 rules active
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
