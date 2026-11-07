// Static definitions only; account state comes exclusively from captured packets.
import { join, resolve } from "node:path";
import type {
	ProgressionCatalog,
	QuestDefinition,
	QuestPoint,
	SideQuest,
} from "../src/lib/progression/types";
import { unrealPathToRelative } from "./lib/compile-data-util";

interface QuestConfig {
	Id: number;
	Type: number;
	TidName: string;
	TidDesc: string;
	DungeonId: number;
	IsHideInTaskList?: boolean;
	IsHideAcceptMarkOnNpc?: boolean;
	AddInteractOption?: { EntityId: number };
	ProvideType: {
		Conditions?: { Type: string; PreQuest?: number; ExploreLevel?: number }[];
	};
}
interface Entity {
	MapId: number;
	EntityId: number;
	AreaId: number;
	Transform: { X: number; Y: number; Z: number }[];
}
interface Track {
	Type: string;
	Locations?: { X: number; Y: number; Z: number }[];
	EntityIds?: number[];
	OutOfRangeTrackPos?: { X: number; Y: number; Z: number };
}
interface QuestNode {
	Key: string;
	Data: {
		Id: number;
		Type: string;
		TidTip?: string;
		DungeonId?: number;
		TrackTarget?: { TrackType: Track };
	};
}

export async function compileProgressionData(): Promise<void> {
	const root = resolve(import.meta.dirname, "..");
	const bin = join(root, "data/wuwa-data/BinData");
	const read = <T>(path: string): Promise<T> =>
		Bun.file(join(bin, path)).json();
	const textRows: { Id: string; Content: string }[] = await Bun.file(
		join(root, "data/wuwa-data/Textmaps/en/multi_text/MultiText.json"),
	).json();
	const text = new Map(textRows.map((row) => [row.Id, row.Content]));
	const label = (key: string) =>
		(text.get(key) ?? "").replace(/<[^>]*>/g, "").trim();
	const questRows = await read<{ QuestId: number; Data: QuestConfig }[]>(
		"QuestData/questdata.json",
	);
	const questById = new Map(questRows.map((row) => [row.QuestId, row.Data]));
	const questTypes = new Map(
		(
			await read<{ Id: number; MainId: number; QuestTypeName: string }[]>(
				"questtype/questtype.json",
			)
		).map((row) => [row.Id, row]),
	);
	const mainTypes = new Map(
		(
			await read<{ Id: number; MainTypeName: string; TrackIconId: number }[]>(
				"questtype/questmaintype.json",
			)
		).map((row) => [row.Id, row]),
	);
	const marks = new Map(
		(
			await read<{ MarkId: number; MarkPic: string }[]>(
				"map_mark/taskmark.json",
			)
		).map((row) => [row.MarkId, row]),
	);
	const presentations = new Map<
		number,
		Pick<QuestDefinition, "typeName" | "icon">
	>();
	const fallbackPresentation = {
		typeName: "Quest",
		icon: "/wuwa-assets/UI/UIResources/Common/Atlas/WorldMapIcon/SP_IconMap_Task_01_UI.webp",
	};
	for (const [type, subtype] of questTypes) {
		const main = mainTypes.get(subtype.MainId) ?? mainTypes.get(0);
		const mark = marks.get(main?.TrackIconId ?? 2);
		let icon = unrealPathToRelative(mark?.MarkPic);
		if (
			!icon ||
			!(await Bun.file(
				join(
					root,
					"data",
					icon
						.replace("/wuwa-assets/", "wuwa-assets/")
						.replace(/\.webp$/, ".png"),
				),
			).exists())
		)
			icon = fallbackPresentation.icon;
		const typeName =
			label(subtype.QuestTypeName) || label(main?.MainTypeName ?? "");
		presentations.set(type, {
			typeName: typeName && typeName !== "None" ? typeName : "Quest",
			icon,
		});
	}
	const allQuests: QuestDefinition[] = questRows.flatMap(({ Data: config }) => {
		const name = label(config.TidName);
		if (config.Type === 100 || config.IsHideInTaskList || !name) return [];
		const presentation = presentations.get(config.Type) ?? fallbackPresentation;
		return [
			{
				id: config.Id,
				name,
				description: label(config.TidDesc),
				type: config.Type,
				...presentation,
			},
		];
	});
	const instances = new Map(
		(
			await read<{ Id: number; MapConfigId: number }[]>(
				"instance_dungeon/instancedungeon.json",
			)
		).map((row) => [row.Id, row.MapConfigId]),
	);
	const areas = new Map(
		(await read<{ AreaId: number; Title: string }[]>("area/area.json")).map(
			(row) => [row.AreaId, label(row.Title)],
		),
	);
	const entities = new Map(
		(await read<Entity[]>("level_entity/levelentityconfig.json")).map((row) => [
			`${row.MapId}:${row.EntityId}`,
			row,
		]),
	);
	const mapId = (dungeon: number) => instances.get(dungeon) ?? dungeon;
	const point = (
		map: number,
		pos: { X: number; Y: number; Z: number },
		area = "",
		scale = 1,
	): QuestPoint | null =>
		[pos.X, pos.Y, pos.Z].every(Number.isFinite)
			? {
					mapId: map,
					x: pos.X * scale,
					y: pos.Y * scale,
					z: pos.Z * scale,
					area,
				}
			: null;
	const entityPoint = (map: number, id: number): QuestPoint | null => {
		const entity = entities.get(`${map}:${id}`);
		const position = entity?.Transform[0];
		if (!entity || !position) return null;
		const result = point(map, position, areas.get(entity.AreaId), 0.01);
		return result ? { ...result, entityId: id } : null;
	};
	const quests = new Map<number, SideQuest>();
	for (const { Data: config } of questRows) {
		const name = label(config.TidName);
		if (![2, 8].includes(config.Type) || config.IsHideInTaskList || !name)
			continue;
		quests.set(config.Id, {
			id: config.Id,
			name,
			description: label(config.TidDesc),
			start: config.AddInteractOption
				? entityPoint(
						mapId(config.DungeonId),
						config.AddInteractOption.EntityId,
					)
				: null,
			objectives: [],
			prerequisites: (config.ProvideType.Conditions ?? []).map((condition) => {
				if (condition.Type === "PreQuest") {
					const previous = questById.get(condition.PreQuest ?? 0);
					return `Complete ${previous ? label(previous.TidName) || "the prerequisite quest" : "the prerequisite quest"}`;
				}
				if (condition.Type === "ExploreLevel")
					return `Union Level ${condition.ExploreLevel}`;
				return (
					{
						PreLevelPlay: "Complete the required world event",
						PreChildQuest: "Reach the required quest step",
						OpenDate: "Available during its scheduled period",
						Item: "Requires a quest item",
						SystemState: "Unlock the required feature",
						PreDungeon: "Complete the required challenge",
					}[condition.Type] ?? "Additional quest condition"
				);
			}),
			hiddenAccept: config.IsHideAcceptMarkOnNpc ?? false,
		});
	}
	for (const { Key, Data: node } of await read<QuestNode[]>(
		"QuestNodeData/questnodedata.json",
	)) {
		const questId = Number(Key.slice(0, Key.lastIndexOf("_")));
		const quest = quests.get(questId);
		const config = questById.get(questId);
		if (!quest || !config || node.Type !== "ChildQuest") continue;
		const map = mapId(node.DungeonId ?? config.DungeonId);
		const track = node.TrackTarget?.TrackType;
		let points: (QuestPoint | null)[] = [];
		if (track?.Type === "Locations")
			points = (track.Locations ?? []).map((pos) => point(map, pos));
		if (track?.Type === "Entities")
			points = (track.EntityIds ?? []).map((id) => entityPoint(map, id));
		if (track?.Type === "LevelPlay" && track.OutOfRangeTrackPos)
			points = [point(map, track.OutOfRangeTrackPos)];
		quest.objectives.push({
			id: node.Id,
			text: node.TidTip ? label(node.TidTip) : "",
			points: points.filter((p): p is QuestPoint => p !== null),
		});
	}
	const categories = (
		await read<
			{ Id: number; Name: string; FunctionType: number; SpritePath: string }[]
		>("achievement/achievementcategory.json")
	)
		.filter((row) => row.FunctionType === 1)
		.map((row) => ({
			id: row.Id,
			name: label(row.Name),
			icon: unrealPathToRelative(row.SpritePath) ?? "",
		}));
	const categoryIds = new Set(categories.map((row) => row.id));
	const groups = (
		await read<
			{
				Id: number;
				Category: number;
				Name: string;
				Enable: boolean;
				Sort: number;
			}[]
		>("achievement/achievementgroup.json")
	)
		.filter((row) => row.Enable && categoryIds.has(row.Category))
		.sort((a, b) => a.Category - b.Category || a.Sort - b.Sort)
		.map((row) => ({
			id: row.Id,
			categoryId: row.Category,
			name: label(row.Name),
		}));
	const groupIds = new Set(groups.map((row) => row.id));
	const achievements = (
		await read<
			{
				Id: number;
				GroupId: number;
				Name: string;
				Desc: string;
				Hidden: boolean;
				NextLink: number;
			}[]
		>("achievement/achievement.json")
	)
		.filter((row) => groupIds.has(row.GroupId) && label(row.Name))
		.map((row) => ({
			id: row.Id,
			groupId: row.GroupId,
			name: label(row.Name),
			description: label(row.Desc),
			hidden: row.Hidden,
		}));
	const catalog: ProgressionCatalog = {
		allQuests,
		quests: [...quests.values()],
		achievements,
		categories,
		groups,
	};
	await Bun.write(
		join(root, "src/configs/progression.json"),
		`${JSON.stringify(catalog)}\n`,
	);
	console.log(
		`Progression: ${allQuests.length} quests, ${catalog.quests.length} side quests (${catalog.quests.filter((quest) => quest.start).length} acceptance locations), ${achievements.length} achievements.`,
	);
}

if (import.meta.main) await compileProgressionData();
