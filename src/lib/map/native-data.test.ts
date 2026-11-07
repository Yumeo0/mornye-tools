import { expect, test } from "bun:test";
import { explorationCategoryLookup } from "../../../scripts/map-categories";
import { rewardItemLookup } from "../../../scripts/map-items";
import {
	type ObeliskEntity,
	obeliskMarkers,
} from "../../../scripts/map-obelisks";
import { mergeRequirementComponents } from "../../../scripts/map-requirements";
import { heritageTier, itemLabel, itemType } from "./collection";
import { matchGhzsExport } from "./ghzs";
import { obtainedThrough } from "./links";
import type { MapCatalog, MapReward } from "./types";

test("exploration degrees resolve through area ancestry, with no guess for conflicts", () => {
	const lookup = explorationCategoryLookup(
		[
			{ Area: 1, ExploreType: 10, SubTypeScore: [{ Key: 999 }] },
			{ Area: 2, ExploreType: 11, SubTypeScore: [{ Key: 999 }] },
			{ Area: 4, ExploreType: 10, SubTypeScore: [{ Key: 999 }] },
			{ Area: 4, ExploreType: 11, SubTypeScore: [{ Key: 999 }] },
			{ Area: 1, ExploreType: 12, SubTypeScore: [{ Key: 888 }] },
			{ Area: 1, ExploreType: 10, SubTypeScore: [{ Key: 777 }] },
		],
		[
			{ ExploreTypeKey: 10, Name: "a", Icon: "/Game/Aki/UI/IconA.IconA" },
			{ ExploreTypeKey: 11, Name: "b", Icon: "/Game/Aki/UI/IconB.IconB" },
			{ ExploreTypeKey: 12, Name: "missing", Icon: "/Game/Aki/UI/IconC.IconC" },
		],
		new Map([
			["a", "Blobfly"],
			["b", "Windchimer"],
		]),
		[
			{ AreaId: 3, Father: 1 },
			{ AreaId: 5, Father: 5 },
		],
	);
	expect(lookup(999, 3)).toEqual({ name: "Blobfly", icon: "IconA" });
	expect(lookup(999, 2)?.name).toBe("Windchimer");
	expect(lookup(999)).toBeUndefined();
	expect(lookup(999, 4)).toBeUndefined();
	expect(lookup(999, 5)).toBeUndefined();
	expect(lookup(888)).toBeUndefined();
	expect(lookup(undefined)).toBeUndefined();
	expect(lookup(777)?.name).toBe("Blobfly");
});

test("reward item identity requires one distinct known preview item and a recognized reward type", () => {
	const lookup = rewardItemLookup(
		[
			{ Id: 1, Name: "petal", Icon: "/Game/Aki/UI/Petal.Petal" },
			{ Id: 2, Name: "untranslated", Icon: "other" },
		],
		[
			{ Id: 10, DropPreview: [{ Key: 1 }, { Key: 1 }] },
			{ Id: 11, DropPreview: [{ Key: 1 }, { Key: 2 }] },
			{ Id: 12, DropPreview: [] },
			{ Id: 13, DropPreview: [{ Key: 3 }] },
			{ Id: 14, DropPreview: [{ Key: 2 }] },
		],
		new Map([["petal", "<b>Budding Petals</b>"]]),
	);
	const item = {
		id: 1,
		name: "Budding Petals",
		icon: "/Game/Aki/UI/Petal.Petal",
	};
	expect(lookup({ RewardId: 10, RewardType: 1 })).toEqual(item);
	expect(lookup({ RewardId: 10, RewardType: 2, Disabled: true })).toEqual(item);
	for (const RewardId of [11, 12, 13, 99])
		expect(lookup({ RewardId, RewardType: 2 })).toBeUndefined();
	expect(lookup({ RewardId: 10, RewardType: 3 })).toBeUndefined();
	expect(lookup()).toBeUndefined();
	expect(lookup({ RewardId: 14, RewardType: 2 })?.name).toBeUndefined();
});

const obelisk = (
	id: number,
	overrides: Partial<ObeliskEntity> = {},
): ObeliskEntity => ({
	key: `8:${id}`,
	mapId: 8,
	blueprint: "Gameplay050",
	components: {},
	excluded: false,
	...overrides,
});
const group = (action = "UnlockEntity", state = "关卡.Common.状态.完成") =>
	obelisk(1, {
		blueprint: "group",
		components: mergeRequirementComponents(
			{
				TargetGearGroupComponent: {
					GroupConfigs: [
						{
							Entitys: [2, 3],
							SuccessCondition: {
								Type: "SameSpecificState",
								State: "required",
							},
						},
					],
				},
			},
			{
				EntityStateComponent: {
					StateChangeBehaviors: [
						{
							State: state,
							Action: [{ Name: action, Params: { EntityIds: [4, 4] } }],
						},
					],
				},
			},
		),
	});

test("standalone obelisks inherit group metadata and link only explicit completion rewards", () => {
	const entities = [
		group(),
		obelisk(2),
		obelisk(3),
		obelisk(4, { blueprint: "chest" }),
	];
	const compile = (entries: ObeliskEntity[]) =>
		obeliskMarkers(entries, new Set(["8:4"]));
	expect(compile(entities).get("8:1")).toMatchObject({
		name: "Training Dummies",
		chestKeys: ["8:4"],
	});
	expect(compile([group("AwakeEntity"), ...entities.slice(1)]).size).toBe(1);
	expect(
		compile([group("CheckTreasureBeenClaimed"), ...entities.slice(1)]).size,
	).toBe(0);
	expect(
		compile([group("UnlockEntity", "other"), ...entities.slice(1)]).size,
	).toBe(0);
	expect(compile(entities.filter((entity) => entity.key !== "8:3")).size).toBe(
		0,
	);
	expect(
		compile(
			entities.map((entity) =>
				entity.key === "8:3" ? { ...entity, mapId: 9, key: "9:3" } : entity,
			),
		).size,
	).toBe(0);
	for (const excluded of ["8:1", "8:2", "8:4"])
		expect(
			compile(
				entities.map((entity) =>
					entity.key === excluded ? { ...entity, excluded: true } : entity,
				),
			).size,
		).toBe(0);
});

test("heritage labels and GHZS matching use native tiers even with misleading artwork", () => {
	const reward = {
		key: "8:1",
		mapId: 8,
		entityId: 1,
		kind: "heritage",
		name: "Tidal Heritage",
		heritageTier: "gold",
		icon: "/blue.png",
		x: 42558.21765097,
		y: 127212.32632484,
		underground: null,
	} as MapReward;
	expect(itemLabel(reward)).toBe("Tidal Heritage · Gold");
	expect(heritageTier(reward)).toBe("gold");
	const point = {
		id: "tier-test",
		map: "",
		category: "Tidal Heritage (Gold)",
		coordinates: [0, 0] as [number, number],
	};
	const catalog = { rewards: [reward] } as MapCatalog;
	expect(
		matchGhzsExport(
			{
				format: "mornye-ghzs",
				version: 1,
				markedIds: [point.id],
				points: [point],
			},
			catalog,
			{},
		)[0].reward?.key,
	).toBe(reward.key);
	expect(
		matchGhzsExport(
			{
				format: "mornye-ghzs",
				version: 1,
				markedIds: [point.id],
				points: [{ ...point, category: "Tidal Heritage (Blue)" }],
			},
			catalog,
			{},
		)[0].reward,
	).toBeUndefined();
});

test("publishing native item artwork preserves existing saved filter keys", () => {
	const texture = "Grass";
	const reward = {
		kind: "collection",
		name: "Lemongrass",
		icon: "/map/icons/gg/Grass.png",
	} as MapReward;
	expect(
		itemType({
			...reward,
			itemId: 1,
			icon: `/wuwa-assets/UI/Image/${texture}.webp`,
		}),
	).toBe(itemType(reward));
});

test("published native inference preserves named pickups and adds linked obelisks with valid artwork", async () => {
	const catalog: MapCatalog = await Bun.file(
		new URL("../../../public/map/catalog.json", import.meta.url),
	).json();
	const byKey = new Map(catalog.rewards.map((reward) => [reward.key, reward]));
	for (const [key, chestKey] of [
		["8:118001239", "8:118001243"],
		["8:118004465", "8:146000314"],
		["8:102002537", "8:102002519"],
	]) {
		const challenge = byKey.get(key),
			chest = byKey.get(chestKey);
		if (!challenge || !chest) throw new Error(`Missing ${key} or ${chestKey}`);
		expect(challenge).toMatchObject({
			name: "Training Dummies",
			chestKeys: [chestKey],
		});
		expect(obtainedThrough(chest, [challenge])).toEqual([
			{ kind: "challenge", reward: challenge },
		]);
	}
	for (const name of [
		"Sonance Casket",
		"Grapple Sonance Casket",
		"Tape of Last Words",
		"Unclaimed Rafter Kite",
		"Creeping Torchpine",
		"Twin Lotus Seed",
	])
		expect(catalog.rewards.some((reward) => reward.name === name)).toBe(true);
	const petals = catalog.rewards.filter((reward) =>
		reward.blueprint.includes("/GhostTitan"),
	);
	expect(new Set(petals.map((reward) => reward.name)).size).toBe(9);
	expect(
		petals.every(
			(reward) => reward.itemId && reward.name.includes("Thousandfold Petals"),
		),
	).toBe(true);
	expect(
		catalog.rewards.filter((reward) => reward.itemId).length,
	).toBeGreaterThan(15_000);
	for (const icon of new Set(
		catalog.rewards
			.filter((reward) => reward.itemId)
			.map((reward) => reward.icon),
	))
		expect(
			await Bun.file(
				new URL(`../../../public${icon}`, import.meta.url),
			).exists(),
		).toBe(true);
});
