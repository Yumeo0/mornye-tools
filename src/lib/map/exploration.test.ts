import { describe, expect, test } from "bun:test";
import {
	challengeMarkerKeys,
	explorationMarkerFor,
} from "../../../scripts/map-exploration";
import { collectionState, itemLabel } from "./collection";
import { isItemVisible, summarizeItems } from "./filters";
import { EMPTY_EXPLORATION, type MapReward } from "./types";

describe("exploration placements", () => {
	test("recognizes exploration progress actors outside collectible entity families", () => {
		expect(explorationMarkerFor("Animal", "Animal032", 7, "")?.name).toBe(
			"Blobfly",
		);
		expect(
			explorationMarkerFor("Destructible", "Gameplay_CXS_4", 16, "Windchimer")
				?.name,
		).toBe("Windchimer");
		expect(
			explorationMarkerFor("PhysicsSwing", "Gameplay_CXS_14", 16, "Windchimer")
				?.name,
		).toBe("Windchimer");
		expect(
			explorationMarkerFor("Monster", "Monster139", 17, "Water Beetle")?.name,
		).toBe("Frostbug");
		expect(
			explorationMarkerFor("SimpleInteract", "SceneObj102", 9, "")?.name,
		).toBe("Viewpoint");
	});

	test("includes the Mutterfly swarm without duplicating its foundation or quest props", () => {
		expect(
			explorationMarkerFor("FollowTrack", "Gameplay111", undefined, "")?.name,
		).toBe("Mutterfly");
		expect(
			explorationMarkerFor(
				"FollowTrackFoundation",
				"Gameplay112",
				undefined,
				"",
			),
		).toBeNull();
		expect(
			explorationMarkerFor(
				"FollowTrack",
				"branch3.5_247_Gameplay1",
				undefined,
				"",
			),
		).toBeNull();
	});

	test("recognizes challenge devices while excluding unnamed scenery", () => {
		expect(
			explorationMarkerFor(
				"ChallengeInteract",
				"Gameplay200",
				undefined,
				"Simulation Training Device",
			)?.name,
		).toBe("Challenge Project");
		expect(
			explorationMarkerFor("ChallengeInteract", "NPC_Scenery", undefined, ""),
		).toBeNull();
	});

	test("uses one interaction device per challenge and keeps other maps separate", () => {
		const plays = [
			{
				LevelPlayId: 1,
				Data: { Type: "Challenge", LevelId: 8, LevelPlayEntityId: 100 },
			},
			{
				LevelPlayId: 2,
				Data: { Type: "Challenge", LevelId: 906, LevelPlayEntityId: 100 },
			},
			{
				LevelPlayId: 3,
				Data: { Type: "Quest", LevelId: 8, LevelPlayEntityId: 101 },
			},
		];
		expect([
			...challengeMarkerKeys(plays, [
				{ key: "8:200", mapId: 8, owner: 1 },
				{ key: "8:201", mapId: 8, owner: 1 },
				{ key: "8:202", mapId: 8, owner: 2 },
				{ key: "8:203", mapId: 8, owner: 3 },
				{ key: "8:204", mapId: 8, owner: null },
			]),
		]).toEqual(["8:200", "906:100"]);
	});

	test("exploration filters start hidden and support per-account completion marks", () => {
		const reward: MapReward = {
			key: "8:123",
			mapId: 8,
			entityId: 123,
			x: 10,
			y: 20,
			z: 30,
			kind: "exploration",
			name: "Windchimer",
			icon: "/map/icons/SP_IconMap_Play_12_UI.webp",
			blueprint: "Gameplay_CXS_4",
			area: "Mt. Firmament",
			owner: null,
			refresh: "Unknown",
			hidden: false,
			underground: null,
		};
		const [row] = summarizeItems([{ reward, state: "remaining" }]);
		expect(row.label).toContain("Bell");
		expect(isItemVisible({}, row)).toBe(false);
		expect(isItemVisible({ [row.type]: true }, row)).toBe(true);
		expect(isItemVisible({ [row.type]: false }, row)).toBe(false);
		expect(itemLabel({ ...reward, name: "Frostbug" })).toContain("Worm");
		expect(collectionState(reward, EMPTY_EXPLORATION, {})).toEqual({
			state: "remaining",
			at: null,
		});
		expect(
			collectionState(reward, EMPTY_EXPLORATION, {
				[reward.key]: { collected: true, updatedAt: 100 },
			}),
		).toEqual({ state: "collected", at: 100 });
	});
});
