import type { ExplorationCategoryLookup } from "./map-categories";
import type { ChallengeGraphEvidence } from "./map-challenge-evidence";

/** Exploration actors outside the chest/casket/resource entity families. */
export interface ExplorationMarker {
	name: string;
	/** Individual localized challenge/objective, when the category is broader. */
	title?: string;
	/** Native texture basename, or mesh basename when iconUrl supplies its silhouette. */
	icon: string;
	/** Static public artwork derived from a world-space mesh rather than a UI texture. */
	iconUrl?: string;
	/** Allow an exact community illustration instead of the atlas sprite. */
	useIconOverride?: boolean;
}

export const CHALLENGE_PROJECT: ExplorationMarker = {
	name: "Challenge Project",
	icon: "SP_IconMap_Task_03_3_UI",
};

export const TRAINING_DUMMIES: ExplorationMarker = {
	name: "Training Dummies",
	icon: "SP_IconMap_Activity_Navigation_10_UI",
};

export const CHALLENGE_TOWER: ExplorationMarker = {
	name: "Challenge Tower",
	icon: "SP_IconMap_Activity_08_UI",
};

export const COMBAT_CHALLENGE: ExplorationMarker = {
	name: "Combat Challenge",
	icon: "Mod_Logo_18003",
	iconUrl: "/map/icons/combat-challenge.svg",
};

export const RACE_CHALLENGE: ExplorationMarker = {
	name: "Race Challenge",
	icon: "Mod_Logo_18001",
	iconUrl: "/map/icons/race-challenge.svg",
};

export const SKI_CHALLENGE: ExplorationMarker = {
	name: "Ski Challenge",
	icon: "Mod_Logo_18004",
	iconUrl: "/map/icons/ski-challenge.svg",
};

export const SHOOTING_CHALLENGE: ExplorationMarker = {
	name: "Shooting Challenge",
	icon: "Mod_Logo_18002",
	iconUrl: "/map/icons/shooting-challenge.svg",
};

export function explorationMarkerFor(
	entityType: string | undefined,
	blueprint: string,
	degree: number | undefined,
	title: string,
	categoryFor?: ExplorationCategoryLookup,
): ExplorationMarker | null {
	if (
		entityType === "ChallengeInteract" &&
		["Gameplay_LNXT_Daoling", "branch2.4_143_Gameplay_2_4QQ15"].includes(
			blueprint,
		)
	)
		return {
			name: "Tactical Hologram: Vitreum Dancer",
			icon: "SP_IconMap_Play_17_UI",
		};
	if (entityType === "ChallengeInteract" && blueprint === "Gameplay204")
		return SHOOTING_CHALLENGE;
	if (
		entityType === "ChallengeInteract" &&
		["Gameplay200", "branch2.4_143_Gameplay_2_4QQ4"].includes(blueprint)
	)
		return RACE_CHALLENGE;
	if (entityType === "ChallengeInteract" && blueprint === "Gameplay207")
		return SKI_CHALLENGE;
	if (entityType === "ChallengeInteract" && blueprint === "Gameplay205")
		return COMBAT_CHALLENGE;
	const category = categoryFor?.(degree);
	if (
		category &&
		["Blobfly", "Viewpoint", "Windchimer", "Frostbug"].includes(category.name)
	)
		return { ...category, useIconOverride: category.name === "Blobfly" };
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

export interface ChallengeMapMark {
	mapId: number;
	entityId: number;
	/** Only RelativeType 1 refers to a level play. */
	playId: number;
	title: string;
	icon: string;
}

/** Native map metadata can live on a separate display entity from the device. */
export function challengeMapMarkers(marks: ChallengeMapMark[]) {
	const entities = new Map<string, ExplorationMarker>();
	const plays = new Map<string, ExplorationMarker>();
	for (const mark of marks) {
		const name = mark.title
			.trim()
			.replace(/^\[(.*)\]$/, "$1")
			.trim();
		if (!name || !mark.icon) continue;
		const marker = { name, icon: mark.icon };
		if (mark.entityId > 0)
			entities.set(`${mark.mapId}:${mark.entityId}`, marker);
		if (mark.playId > 0) plays.set(`${mark.mapId}:${mark.playId}`, marker);
	}
	return (mapId: number, entityId: number, owner: number | null) =>
		entities.get(`${mapId}:${entityId}`) ??
		(owner === null ? undefined : plays.get(`${mapId}:${owner}`));
}

/** Some challenge devices lack EntityOwnerData; only trust a unique native graph reference. */
export function referencedChallengeOwners(
	plays: { id: number; mapId: number; type: string; references: string[] }[],
) {
	const candidates = new Map<string, number | null>();
	for (const play of plays) {
		if (!["Challenge", "HighSpeedMovement", "Riddle"].includes(play.type))
			continue;
		for (const reference of play.references) {
			const match = /^e_(\d+)_(\d+)$/.exec(reference);
			if (!match || Number(match[1]) !== play.mapId) continue;
			const key = `${match[1]}:${match[2]}`;
			if (!candidates.has(key)) candidates.set(key, play.id);
			else if (candidates.get(key) !== play.id) candidates.set(key, null);
		}
	}
	return new Map(
		[...candidates].filter(
			(entry): entry is [string, number] => entry[1] !== null,
		),
	);
}

/** Classify generic graph controllers without replacing named device/map metadata. */
export function graphChallengeMarker(
	title: string,
	childBlueprints: string[],
	referencedBlueprints: string[] = [],
	evidence: ChallengeGraphEvidence = { texts: [], timed: false },
	internalName = "",
): ExplorationMarker | null {
	const blueprints = new Set([...childBlueprints, ...referencedBlueprints]);
	const objective = (pattern: RegExp) =>
		evidence.texts.find((value) => pattern.test(value));
	const generic = (name: string, individual?: string): ExplorationMarker => ({
		name,
		icon: CHALLENGE_PROJECT.icon,
		...(individual && individual !== name ? { title: individual } : {}),
	});
	if (title === "Rift Runner") return generic(title);
	if (/^Let's Play Hide and Seek - [IVX]+$/.test(title))
		return generic("Hide and Seek", title);
	if (
		/^Backflip Challenge/.test(title) ||
		objective(/Complete (?:as many|\d+) backflips/)
	)
		return generic("Backflip Challenge", title);
	if (/^Yhoran's Tactical Trial/.test(title))
		return { name: "Yhoran's Tactical Trial", icon: "SP_IconMap_WYQ_06_UI" };
	if (title === 'Time-limited "Moon Shooter"')
		return { ...SHOOTING_CHALLENGE, name: "Moon Shooter" };
	if (title === "Rider Echo") return generic("Inferno Rider Challenge", title);
	if (title === "Dangerous Censure Cage") return generic("Censure Cage", title);
	if (title === "Protect Lenie") return generic(title);
	if (
		title === "Explore Hanakage Underground Street and investigate the anomaly"
	)
		return generic("Hanakage Investigation", title);
	const dreamNode = objective(/^(?:Dreamscape|Nightmare) Node:/);
	if (dreamNode && objective(/^Dream Patrol:/))
		return {
			name: "Dream Patrol",
			title: dreamNode,
			icon: "SP_IconMap_Play_19_UI",
		};
	if (objective(/Flying Eaves Dash/))
		return { ...RACE_CHALLENGE, name: "Flying Eaves Dash" };
	if (objective(/Reach the top of the building without climbing/))
		return { ...RACE_CHALLENGE, name: "No-Climbing Challenge" };
	if (objective(/^Explosive Spear Challenge$/))
		return generic("Explosive Spear Challenge");
	if (
		objective(/^Ski to the finishing line$/) ||
		(internalName.includes("滑雪") &&
			blueprints.has("Gameplay293") &&
			blueprints.has("Gameplay097"))
	)
		return SKI_CHALLENGE;
	if (objective(/"Swim, Gulpuff, Swim" completed/))
		return generic("Swim, Gulpuff, Swim");
	if (objective(/^Find and free the trapped people$/))
		return generic("Rescue Challenge");
	if (
		objective(
			/Provide 5 pieces of fish to participate in the "Lucky Draw" event/,
		)
	)
		return generic("Treasure Store Lucky Draw");
	if (objective(/Defeat Hua Lielang or let him touch the wreath/))
		return generic("Hua Lielang Duel");
	if (blueprints.has("Gameplay626") && objective(/^Head to the finish line$/))
		return { name: "Boat Racing", icon: "SP_IconMap_Play_36_UI" };
	if (
		blueprints.has("branch3.0_13_Motorcycle_SimRacing") &&
		objective(/^Head to the finish line$/)
	)
		return generic("Motorcycle Race");
	if (
		objective(/^Head to the finish line$/) &&
		objective(/Ranking Points|Position Points/)
	)
		return RACE_CHALLENGE;
	if (objective(/^Collect all light dots within the time limit$/))
		return { ...RACE_CHALLENGE, name: "Light Collection Challenge" };
	if (
		objective(/^Achieve 100% activation progress for the device$/) &&
		blueprints.has("Gameplay522")
	)
		return generic("Device Activation Challenge");
	if (
		title.toLowerCase() === "timed shooting challenge" ||
		(title === "Shooting Target - Desorock Highland" &&
			childBlueprints.includes("Gameplay059"))
	)
		return { ...SHOOTING_CHALLENGE, name: "Timed Shooting Challenge" };
	if (blueprints.has("Gameplay055") || blueprints.has("Gameplay059"))
		return evidence.timed ||
			objective(
				/(?:shoot|target).*(?:within \d+s|within the time limit)|within the time limit.*shoot/i,
			)
			? { ...SHOOTING_CHALLENGE, name: "Timed Shooting Challenge" }
			: SHOOTING_CHALLENGE;
	if (blueprints.has("Gameplay_CXS13"))
		return {
			name: "Echo Challenge: Clang Bang",
			icon: "SP_IconMap_Play_24_UI",
		};
	if (
		(blueprints.has("Gameplay613") && blueprints.has("Gameplay614")) ||
		(blueprints.has("Gameplay611") && blueprints.has("Gameplay612"))
	)
		return generic("Light Beam Puzzle");
	if (blueprints.has("Gameplay020") && blueprints.has("Gameplay541"))
		return generic("Pressure Plate Puzzle");
	if (
		title === "Objective Defense Challenge" ||
		(!title && childBlueprints.includes("Gameplay081"))
	)
		return CHALLENGE_TOWER;
	// Graphs can reference a status-matching group or its strike mechanisms directly.
	if (
		[...childBlueprints, ...referencedBlueprints].some((blueprint) =>
			["Gameplay050", "Gameplay051"].includes(blueprint),
		)
	)
		return TRAINING_DUMMIES;
	return null;
}
