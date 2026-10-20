/** Exploration actors outside the chest/casket/resource entity families. */
export interface ExplorationMarker {
	name: string;
	/** Texture basename in the game's world-map atlas. */
	icon: string;
	/** Allow an exact community illustration instead of the atlas sprite. */
	useIconOverride?: boolean;
}

export const CHALLENGE_PROJECT: ExplorationMarker = {
	name: "Challenge Project",
	icon: "SP_IconMap_Task_03_3_UI",
};

const DEGREE_MARKERS: Record<number, ExplorationMarker> = {
	7: { name: "Blobfly", icon: "SP_IconMap_Play_27_UI", useIconOverride: true },
	9: { name: "Viewpoint", icon: "SP_IconMap_Play_28_UI" },
	16: { name: "Windchimer", icon: "SP_IconMap_Play_12_UI" },
	17: { name: "Frostbug", icon: "SP_IconMap_Play_26_UI" },
};

export function explorationMarkerFor(
	entityType: string | undefined,
	blueprint: string,
	degree: number | undefined,
	title: string,
): ExplorationMarker | null {
	if (degree !== undefined && DEGREE_MARKERS[degree])
		return DEGREE_MARKERS[degree];
	// Other FollowTrack actors include moving quest props. The original
	// Mutterfly blueprint identifies the swarm, rather than its destination base.
	if (entityType === "FollowTrack" && blueprint === "Gameplay111")
		return {
			name: "Mutterfly",
			icon: "SP_IconMap_Play_05_UI",
			useIconOverride: true,
		};
	// ChallengeInteract also includes NPC scenery and quest actors. Only expose
	// named challenge devices; unnamed actors are not evidence of a challenge.
	if (
		entityType === "ChallengeInteract" &&
		/^(Simulation Training Device|Echo Challenge:|Tactical Hologram|Overlord Challenge|Resonance Cord|Nightmare Nest's Resonance Cord|Tacet Discord Nest:|Aetherfin Sliding|Trial of Perception)/.test(
			title,
		)
	) {
		if (/^(Nightmare Nest's Resonance Cord|Tacet Discord Nest:)/.test(title))
			return { name: title, icon: "SP_IconMonsterHead_1006_UI" };
		if (/^(Tactical Hologram|Overlord Challenge)/.test(title))
			return { name: title, icon: "SP_IconMap_Play_10_UI" };
		if (title === "Resonance Cord")
			return { name: "Tacet Fields", icon: "SP_IconMap_WYQ_05_UI" };
		if (/^(Echo Challenge:|Aetherfin Sliding|Trial of Perception)/.test(title))
			return { name: title, icon: "SP_IconMap_Play_24_UI" };
		return CHALLENGE_PROJECT;
	}
	return null;
}

interface ChallengePlay {
	LevelPlayId: number;
	Data: { Type: string; LevelId: number; LevelPlayEntityId: number };
}

interface ChallengeStart {
	key: string;
	mapId: number;
	owner: number | null;
}

/** One marker per challenge: prefer its interaction device to its controller. */
export function challengeMarkerKeys(
	plays: ChallengePlay[],
	interactors: ChallengeStart[],
): Set<string> {
	const starts = new Map(
		plays
			.filter((play) => play.Data.Type === "Challenge")
			.map((play) => [
				play.LevelPlayId,
				{
					key: `${play.Data.LevelId}:${play.Data.LevelPlayEntityId}`,
					mapId: play.Data.LevelId,
				},
			]),
	);
	const chosen = new Set<number>();
	for (const interactor of interactors) {
		if (interactor.owner === null || chosen.has(interactor.owner)) continue;
		const start = starts.get(interactor.owner);
		if (!start || start.mapId !== interactor.mapId) continue;
		starts.set(interactor.owner, interactor);
		chosen.add(interactor.owner);
	}
	return new Set([...starts.values()].map((start) => start.key));
}
