// Compile map placements and texture URLs from the data/ checkouts.
// Asset conversion and publishing live in copy_assets.ts.
import { join, resolve } from "node:path";
import type {
	GameMap,
	MapCatalog,
	MapReward,
	RewardKind,
} from "../src/lib/map/types";
import { mapAssetSources } from "./lib/map-assets";
import { additionalActivityMarkers } from "./map-activities";
import {
	CHALLENGE_PROJECT,
	challengeMarkerKeys,
	explorationMarkerFor,
} from "./map-exploration";
import {
	compileMapRegions,
	type RegionArea,
	type RegionCountry,
	type RegionPlacement,
} from "./map-regions";

/**
 * Level entities the client never exposes as open-world collectibles: activity
 * chests, the 2.4 flag-placement "trophy" chests, gameplay flag drops, a quest
 * gift box and backpack pickups. Community-site icon matches are wrong or
 * missing for them (a monster head, the generic map pin), which is how they
 * surfaced in the first place. Every entity in these blueprints is such a prop,
 * so the family filter is exact.
 */
const PROP_BLUEPRINTS = new Set([
	"Treasure026", // activity supply chests
	"QuestObj1", // quest gift box
	"Treasure031", // backpack pickup
	"branch2.4_122_Treasure_2_4_01", // 2.4 trophy chests (flag placements)
	"branch2.4_122_Treasure_2_4_02",
	"branch2.4_122_Treasure_2_4_04",
	"branch2.4_122_Treasure_2_4_05",
	"branch2.4_143_Gameplay_2_4QQ36", // 2.4 gameplay flag drops
	"branch2.4_143_Gameplay_2_4QQ37",
]);

/**
 * Individual props whose blueprints are shared with real chests, keyed like
 * catalogue rewards: a standard chest whose string entry reads "Advanced
 * Supply Chest", and a hidden sea-chest the client gates.
 */
const PROP_ENTITIES = new Set(["8:136003236", "8:222700001"]);

/**
 * Chest rows read type-first: the game names lead with the tier ("Advanced
 * Supply Pack"), which makes the list sort into rarity blocks. Only the
 * display name changes; icon lookups keep the game's own wording.
 */
function chestLabel(name: string): string {
	const match =
		/^(\w+) (Supply Chest|Supply Pack|Trophy Chest|Sea Chest)$/.exec(name);
	return match ? `${match[2]} · ${match[1]}` : name;
}

/**
 * Display names (per reward kind) that mark props or unnamed pickup nodes.
 * Caskets and resources mix real and prop entities inside shared blueprints,
 * so those rows are matched by the name the catalogue gives them; the fallback
 * labels cover every entity whose name the text tables never resolve.
 */
const PROP_NAMES = new Set([
	"casket|Drone Grapple",
	"casket|Exploration collectible",
	"casket|Fixed Grapple",
	"casket|???",
	"casket|Hoo",
	"casket|Lulu",
	"casket|Shee",
	"collection|Acceleration Ring",
	"collection|Dauntless Evernight",
	"collection|Destructible Wooden Crate",
	"collection|Drifting Treasures",
	"collection|Energy Depletion Circle",
	"collection|Explore the Area",
	"collection|Feed",
	"collection|Floating Container",
	"collection|Frostbiter",
	"collection|Gameplay Center",
	"collection|Gathering resource",
	"collection|In the point circle",
	"collection|Inspect",
	"collection|Laurus Sprouts",
	"collection|Pick up",
	"collection|Read",
	"collection|Reverberations of Nimbus Sanctum",
	"collection|Rotor",
	"collection|Rotor 1",
	"collection|Score Ring",
	"collection|Sea Bunny",
	"collection|Spacetrek Convoy Supplies",
	"collection|Spacetrek Convoy Transport Report",
	"collection|Parts package",
	"collection|Journal from the Grand Commander",
	"collection|Research Records",
]);

export async function compileMapData(): Promise<void> {
	const root = resolve(import.meta.dirname, "..");
	const bin = join(root, "data/wuwa-data/BinData");
	const assets = join(root, "data/wuwa-assets");
	const out = join(root, "public/map");
	const versions = await Bun.file(join(assets, "VERSION.json")).json();
	const json = async (path: string) => Bun.file(join(bin, path)).json();
	// The game tables are heterogeneous and their fields are intentionally preserved until projected below.
	// biome-ignore lint/suspicious/noExplicitAny: Versioned heterogeneous raw tables are projected into the typed public catalogue below.
	type Row = Record<string, any>;
	const byName = mapAssetSources(assets);
	if (!byName.size)
		throw new Error(
			`No map textures in ${assets}. Update or extract the wuwa-assets checkout first.`,
		);
	const hasTile = (name: string) => byName.has(name);
	function textureUrl(
		name: string,
		kind: "tiles" | "tiles-low" | "icons",
	): string {
		if (!byName.has(name))
			throw new Error(`Missing ${kind} texture in wuwa-assets: ${name}`);
		return `/map/${kind}/${name}.webp`;
	}
	const icons: string[] = [];
	for (const [name, path] of byName) {
		if (
			path.includes("WorldMapIcon") &&
			!name.startsWith("T_TPI_") &&
			!name.startsWith("TPI_")
		)
			icons.push(textureUrl(name, "icons"));
	}
	const collectibleIcon = textureUrl("SP_IconMap_Play_05_UI", "icons");
	const iconFor: Record<RewardKind, string> = {
		chest: textureUrl("SP_IconMap_SJ_01_UI", "icons"),
		heritage: collectibleIcon,
		casket: collectibleIcon,
		exploration: textureUrl(CHALLENGE_PROJECT.icon, "icons"),
		collection: textureUrl("SP_IconMap_Play_113_UI", "icons"),
	};
	// Icon and name overrides from the wuthering.gg join (see scripts/fetch-map-icons.ts).
	// Their data carries per-item artwork that the game tables do not map by blueprint.
	const iconOverrides: {
		names?: Record<string, string>;
		icons?: Record<string, string>;
		types?: Record<string, string>;
		heritage?: Record<string, string>;
	} = await Bun.file(join(root, "src/configs/map_icons.json"))
		.json()
		.catch(() => ({}));
	const overrideIcons = [
		...Object.values(iconOverrides.icons ?? {}),
		...Object.values(iconOverrides.types ?? {}),
		...Object.values(iconOverrides.heritage ?? {}),
	];
	for (const path of new Set(overrideIcons))
		if (typeof path === "string" && !icons.includes(path)) icons.push(path);
	const mapNames: Record<number, string> = {
		8: "Overworld",
		900: "Black Shores",
		902: "Vault Underground",
		903: "Avinoleum",
		905: "Fabricatorium of the Deep",
		906: "Lahai-Roi",
		907: "Honami",
		909: "Solisia Landing",
		910: "Chronorift Metropolis",
		912: "Simulacrum Nexus of Mengzhou",
	};
	const maps = new Map<number, GameMap>();
	const missingTiles: { mapId: number; name: string }[] = [];
	for (const tile of (await json("mapfog/fogtextureconfig.json")) as Row[]) {
		if (!tile.MapTilePath) continue;
		const [x, y] = tile.Block.split("_").map(Number);
		if (!Number.isFinite(x) || !Number.isFinite(y))
			throw new Error(`Invalid tile block ${tile.Block}`);
		let map = maps.get(tile.MapId);
		if (!map) {
			map = {
				id: tile.MapId,
				name: mapNames[tile.MapId] ?? `Map ${tile.MapId}`,
				tiles: [],
			};
			maps.set(tile.MapId, map);
		}
		// Map 902's table still uses JKMapTiles; the extracted surface textures are JKTiles.
		const surfaceName =
			tile.MapId === 902 && !hasTile(tile.MapTilePath)
				? tile.MapTilePath.replace(/^T_JKMapTiles_/, "T_JKTiles_")
				: tile.MapTilePath;
		if (!hasTile(surfaceName)) {
			missingTiles.push({ mapId: tile.MapId, name: tile.MapTilePath });
			continue;
		}
		map.tiles.push({
			x,
			y,
			image: textureUrl(surfaceName, "tiles"),
			thumbnail: textureUrl(surfaceName, "tiles-low"),
			layer: 0,
		});
	}
	const mapLayers = (await json("map/multimap.json")) as Row[];
	for (const layer of mapLayers) {
		const map = maps.get(layer.MapId);
		if (!map) continue;
		for (const name of layer.MapTilePath ?? []) {
			if (!hasTile(name)) {
				missingTiles.push({ mapId: layer.MapId, name });
				continue;
			}
			const pos = name.match(/Tiles_(-?\d+)_(-?\d+)/);
			if (pos)
				map.tiles.push({
					x: Number(pos[1]),
					y: Number(pos[2]),
					image: textureUrl(name, "tiles"),
					thumbnail: textureUrl(name, "tiles-low"),
					layer: layer.Id,
				});
		}
	}
	if (missingTiles.length)
		console.warn(
			`${missingTiles.length} tile references are unavailable in the installed game. Recorded in catalog.missingTiles; their placements remain visible.`,
		);

	const blueprints = new Map<string, Row>(
		(await json("blueprint/blueprintconfig.json")).map((x: Row) => [
			x.BlueprintType,
			x,
		]),
	);
	const templates = new Map<string, Row>(
		(await json("template/templateconfig.json")).map((x: Row) => [
			x.BlueprintType,
			x.ComponentsData,
		]),
	);
	const plays = new Map<number, Row>(
		(await json("LevelPlayData/levelplaydata.json")).map((x: Row) => [
			x.LevelPlayId,
			x.Data,
		]),
	);
	const owners = new Map<string, number>();
	for (const row of (await json(
		"EntityOwnerData/entityownerdata.json",
	)) as Row[]) {
		const owner = JSON.parse(row.Owner).find(
			(x: Row) => x.Type === "LevelPlay",
		);
		if (owner) owners.set(row.Guid.replace("_", ":"), owner.LevelPlayId);
	}
	// Underground artwork layers keyed by map and area; floor 0 rows carry no areas.
	const undergroundByArea = new Map<string, { floor: number; layer: number }>();
	for (const row of mapLayers) {
		if (!(row.Floor < 0)) continue;
		for (const areaId of row.Area ?? [])
			undergroundByArea.set(`${row.MapId}:${areaId}`, {
				floor: row.Floor,
				layer: row.Id,
			});
	}
	const text = new Map<string, string>(
		(
			await Bun.file(
				join(root, "data/wuwa-data/Textmaps/en/multi_text/MultiText.json"),
			).json()
		).map((x: Row) => [x.Id, x.Content]),
	);
	const areaRows = (await json("area/area.json")) as RegionArea[];
	const countries = (await json("influence/country.json")) as RegionCountry[];
	for (const name of new Set(
		countries
			.filter((country) => country.Icon)
			.map((country) => country.Icon.split("/").at(-1)?.split(".")[0]),
	)) {
		if (name) icons.push(textureUrl(name, "icons"));
	}
	const areas = new Map<number, string>(
		areaRows.map((x) => [
			x.AreaId,
			text.get(x.Title) || x.AreaName || `Area ${x.AreaId}`,
		]),
	);
	const kindFor = (type: string): RewardKind | null => {
		if (type === "VisionTreasureBox") return "heritage";
		if (["TreasureBox", "HookTreasureBox"].includes(type)) return "chest";
		if (
			[
				"SoundBox",
				"HookSoundBox",
				"HookPullSoundBox",
				"HookPullSoundBoxWithSplineMove",
				"SunSpiritCollectUnit",
			].includes(type)
		)
			return "casket";
		if (
			[
				"Collect",
				"Collect2",
				"Collect3",
				"WaterCollection",
				"CollectWithHook",
				"CollectWithListener",
				"CollectAnimal",
				"CollectAnimalPart",
			].includes(type)
		)
			return "collection";
		return null;
	};
	const rewards: MapReward[] = [];
	const regionPlacements: RegionPlacement[] = [];
	const rewardKeys = new Set<string>();
	const entityRows = (await json(
		"level_entity/levelentityconfig.json",
	)) as Row[];
	const titleFor = (row: Row): string =>
		text.get(
			row.ComponentsData?.BaseInfoComponent?.TidName ??
				templates.get(row.BlueprintType)?.BaseInfoComponent?.TidName,
		) ?? "";
	const degreeFor = (row: Row): number | undefined =>
		row.ComponentsData?.BaseInfoComponent?.Category?.ExploratoryDegree ??
		templates.get(row.BlueprintType)?.BaseInfoComponent?.Category
			?.ExploratoryDegree;
	const explorationFor = (row: Row) =>
		explorationMarkerFor(
			blueprints.get(row.BlueprintType)?.EntityType,
			row.BlueprintType,
			degreeFor(row),
			titleFor(row),
		);
	const validEntities = entityRows.filter((row) => {
		const transform = row.Transform?.[0];
		return (
			maps.has(row.MapId) &&
			transform &&
			[transform.X, transform.Y, transform.Z].every(Number.isFinite)
		);
	});
	const challengeKeys = challengeMarkerKeys(
		[...plays].map(([LevelPlayId, Data]) => ({
			LevelPlayId,
			Data: {
				Type: Data.Type,
				LevelId: Data.LevelId,
				LevelPlayEntityId: Data.LevelPlayEntityId,
			},
		})),
		validEntities
			.filter(
				(row) =>
					blueprints.get(row.BlueprintType)?.EntityType ===
						"ChallengeInteract" && explorationFor(row),
			)
			.map((row) => ({
				key: `${row.MapId}:${row.EntityId}`,
				mapId: row.MapId,
				owner: owners.get(`${row.MapId}:${row.EntityId}`) ?? null,
			})),
	);
	const activities = additionalActivityMarkers(
		validEntities.map((row) => ({
			key: `${row.MapId}:${row.EntityId}`,
			mapId: row.MapId,
			entityId: row.EntityId,
			type: blueprints.get(row.BlueprintType)?.EntityType ?? "",
			blueprint: row.BlueprintType,
			title: titleFor(row),
			rewardId:
				row.ComponentsData?.RewardComponent?.RewardId ??
				templates.get(row.BlueprintType)?.RewardComponent?.RewardId ??
				0,
			owner: owners.get(`${row.MapId}:${row.EntityId}`) ?? null,
			packId:
				row.ComponentsData?.BaseInfoComponent?.PackId ??
				templates.get(row.BlueprintType)?.BaseInfoComponent?.PackId ??
				0,
		})),
		[...plays].map(([id, play]) => ({
			id,
			mapId: play.LevelId,
			entityId: play.LevelPlayEntityId,
			type: play.Type,
			internalName: play.Key ?? "",
			title: text.get(play.TidName) ?? "",
			degree: play.ExploratoryConfig?.AddType,
			children: play.Children ?? [],
			packId: play.PackId ?? 0,
		})),
		((await json("map_mark/mapmark.json")) as Row[]).map((mark) => ({
			mapId: mark.MapId,
			entityId: mark.EntityConfigId,
			playId: mark.RelativeType === 1 ? mark.RelativeId : 0,
			title: text.get(mark.MarkTitle) ?? "",
		})),
	);
	for (const row of validEntities) {
		const blueprint = blueprints.get(row.BlueprintType);
		const key = `${row.MapId}:${row.EntityId}`;
		const owner = owners.get(key) ?? null;
		const ownerType = owner === null ? null : plays.get(owner)?.Type;
		const activity = activities.markers.get(key);
		let exploration = activity ?? explorationFor(row);
		if (!activity && blueprint?.EntityType === "ChallengeInteract") {
			// A graph's controller and devices describe one challenge, not several.
			if (
				ownerType === "Quest" ||
				(ownerType === "Challenge" && !challengeKeys.has(key))
			)
				exploration = null;
		}
		// Specialized graph markers replace their generic Challenge Project device.
		if (!activity && owner !== null && activities.playIds.has(owner))
			exploration = null;
		if (
			challengeKeys.has(key) &&
			(owner === null || !activities.playIds.has(owner))
		)
			exploration ??= CHALLENGE_PROJECT;
		const kind = exploration ? "exploration" : kindFor(blueprint?.EntityType);
		if (!kind) continue;
		const transform = row.Transform[0];
		if (rewardKeys.has(key)) continue;
		rewardKeys.add(key);
		regionPlacements.push({
			mapId: row.MapId,
			areaId: row.AreaId,
			x: transform.X * 0.01,
			y: transform.Y * 0.01,
		});
		const refresh = owner
			? (plays.get(owner)?.LevelPlayRefreshConfig?.Type ?? "Unknown")
			: "Unknown";
		const degree = degreeFor(row);
		const resolvedTitle =
			exploration?.name ||
			titleFor(row) ||
			(kind === "heritage"
				? "Tidal Heritage"
				: kind === "casket"
					? "Exploration collectible"
					: kind === "collection"
						? "Gathering resource"
						: ((
								{
									1: "Basic Supply Chest",
									2: "Standard Supply Chest",
									3: "Advanced Supply Chest",
									4: "Premium Supply Chest",
								} as Record<number, string>
							)[degree ?? 0] ?? "Supply Chest"));
		// Overrides correct missing English text and internal pickup labels.
		const name = activity
			? activity.name
			: (iconOverrides.names?.[row.BlueprintType] ?? resolvedTitle);
		// Props that are not collectibles: geometry above may still frame an
		// area, but the placement is neither a marker nor a claim to track.
		if (
			PROP_BLUEPRINTS.has(row.BlueprintType) ||
			PROP_ENTITIES.has(key) ||
			PROP_NAMES.has(`${kind}|${name}`)
		) {
			rewardKeys.delete(key);
			continue;
		}
		const label = kind === "chest" ? chestLabel(String(name)) : String(name);
		const explorationIcon = exploration
			? ((exploration.useIconOverride
					? iconOverrides.types?.[`${kind}|${name}`]
					: undefined) ?? textureUrl(exploration.icon, "icons"))
			: null;
		if (explorationIcon) icons.push(explorationIcon);
		rewards.push({
			key,
			mapId: row.MapId,
			entityId: row.EntityId,
			x: transform.X * 0.01,
			y: transform.Y * 0.01,
			z: transform.Z * 0.01,
			kind,
			name: label,
			...(activity?.title && activity.title !== label
				? { title: activity.title }
				: {}),
			blueprint: row.BlueprintType,
			area: areas.get(row.AreaId) ?? `Area ${row.AreaId}`,
			// A row is one name, so a named override decides the icon: several
			// blueprint overrides disagree with their row's name (a "Tidal
			// Supply Chest" carrying the advanced icon), which used to split
			// one chest type into a second, smaller row.
			icon:
				explorationIcon ??
				(kind === "heritage"
					? (iconOverrides.heritage?.[String(degree)] ??
						iconOverrides.icons?.[row.BlueprintType] ??
						iconOverrides.types?.[`${kind}|${name}`] ??
						iconOverrides.heritage?.["13"] ??
						iconFor.casket)
					: (iconOverrides.types?.[`${kind}|${name}`] ??
						iconOverrides.icons?.[row.BlueprintType] ??
						iconFor[kind])),
			owner,
			refresh,
			hidden: Boolean(row.IsHidden),
			underground: undergroundByArea.get(`${row.MapId}:${row.AreaId}`) ?? null,
		});
	}

	const claimChecks: Record<string, string[]> = {};
	for (const node of (await json(
		"LevelPlayNodeData/levelplaynodedata.json",
	)) as Row[]) {
		const split = node.Key.lastIndexOf("_");
		const graphId = Number(node.Key.slice(0, split));
		const condition = node.Data?.Condition?.Condition;
		// Accept only an unambiguous, positive singleton check. Never flatten OR groups.
		if (
			node.Data?.Type !== "ChildQuest" ||
			!condition ||
			condition.Conditions?.length !== 1
		)
			continue;
		const check = condition.Conditions[0];
		if (
			check.Type !== "CheckTreasureBeenClaimed" ||
			!Number.isInteger(check.EntityId)
		)
			continue;
		const play = plays.get(graphId);
		if (!play) continue;
		const key = `${play.LevelId}:${check.EntityId}`;
		if (!rewardKeys.has(key)) continue;
		// Refreshing gameplay can have obsolete historical completion; leave its claims unknown.
		if (play.LevelPlayRefreshConfig?.Type !== "None") continue;
		claimChecks[node.Key] = [key];
	}
	const catalog: MapCatalog = {
		version: String(versions.game ?? "unknown"),
		tileSize: 85000,
		maps: [...maps.values()].sort((a, b) => a.id - b.id),
		regions: compileMapRegions(areaRows, countries, regionPlacements, text),
		rewards,
		icons: [...new Set(icons)].sort(),
		missingTiles,
	};
	await Bun.write(join(out, "catalog.json"), JSON.stringify(catalog));
	await Bun.write(
		join(root, "src/configs/map_rules.json"),
		JSON.stringify({
			rewardKeys: [...rewardKeys],
			claimChecks,
		}),
	);
	console.log(
		`Map: ${catalog.maps.length} maps, ${catalog.maps.reduce((n, m) => n + m.tiles.length, 0)} tiles, ${catalog.icons.length} icons, ${rewards.length} placements, ${Object.keys(claimChecks).length} exact claim checks.`,
	);
}

if (import.meta.main) await compileMapData();
