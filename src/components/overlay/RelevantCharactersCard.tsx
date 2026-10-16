import type { CSSProperties, Ref } from "react";
import type { CaptureOrigin, PanelRegions } from "@/hooks/useOverlayLayout";
import type { CharacterInfo } from "@/lib/rating";
import { cn } from "@/lib/utils";

export interface RankedCharacter {
	character: CharacterInfo;
	rating: number;
}

/**
 * Echo-relevant characters ranked by roll value, shown beside the stats panel
 * or centered up top while the panel regions are unknown. Styled after the
 * game's own pills: fully rounded, translucent white/gray over the screen,
 * gold accent on the active pick.
 */
export function RelevantCharactersCard({
	ref,
	rankedCharacters,
	activeCharacterId,
	selectedCharacterId,
	onSelect,
	regions,
	origin,
	displayScale,
}: {
	ref?: Ref<HTMLDivElement>;
	rankedCharacters: RankedCharacter[];
	activeCharacterId: number | null;
	selectedCharacterId: number | null;
	onSelect: (characterId: number | null) => void;
	regions: PanelRegions | null;
	origin: CaptureOrigin | null;
	displayScale: number;
}) {
	const mainRegion = regions?.main_stats ?? null;
	const subRegion = regions?.sub_stats ?? null;
	const panelRegion = regions?.echo_panel ?? null;
	const anchored = mainRegion !== null && subRegion !== null;
	const originX = origin?.x ?? 0;
	const originY = origin?.y ?? 0;
	const anchorLeft = panelRegion
		? panelRegion.x + panelRegion.width
		: (mainRegion?.x ?? 0) + (mainRegion?.width ?? 0);
	const anchorTop = panelRegion?.y ?? mainRegion?.y ?? 0;
	const style: CSSProperties = anchored
		? {
				pointerEvents: "auto",
				position: "absolute",
				left: (originX + anchorLeft + 20) * displayScale,
				top: (originY + anchorTop) * displayScale,
				width: 280 * displayScale,
			}
		: {
				pointerEvents: "auto",
				position: "absolute",
				left: "50%",
				top: 40,
				transform: "translateX(-50%)",
				width: 450,
			};

	return (
		<div
			ref={ref}
			style={style}
			className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-black/35 p-2 shadow-2xl backdrop-blur-sm"
		>
			<h3 className="px-2 pt-0.5 text-lg font-bold text-white">
				Relevant Characters
			</h3>
			<div className="flex flex-col gap-1.5">
				{rankedCharacters.map(({ character, rating }) => {
					const isActive = character.character_id === activeCharacterId;
					return (
						<button
							type="button"
							key={character.character_id}
							onClick={() =>
								onSelect(
									isActive && selectedCharacterId !== null
										? null
										: character.character_id,
								)
							}
							className={cn(
								"flex h-11 w-full items-center gap-2.5 rounded-full border pr-3.5 pl-0 text-left transition-colors",
								isActive
									? "border-[#f7eba6]/70 bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_10px_rgba(247,235,166,0.35)]"
									: "border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_3px_rgba(0,0,0,0.4)] hover:border-white/25 hover:bg-white/15",
							)}
						>
							<img
								src={character.icon_pile}
								alt={character.character_name}
								className="h-full aspect-square shrink-0 rounded-full object-contain"
							/>
							<span className="flex-1 truncate text-sm font-medium text-white">
								{character.character_name}
							</span>
							<span
								className={cn(
									"text-sm font-bold",
									isActive ? "text-[#f7eba6]" : "text-white/90",
								)}
							>
								{rating}%
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
