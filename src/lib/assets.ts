import assetAliases from "@/configs/asset_aliases.json";

const aliases: Record<string, string> = assetAliases;
const slug = (name: string) =>
	name
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/_/g, "-")
		.replace(/-+/g, "-")
		.toLowerCase();
const stem = (path: string) =>
	path
		.split("/")
		.at(-1)!
		.replace(/\.[^.]+$/, "");
const clean = (name: string) =>
	slug(name.replace(/^(?:T_|SP_)/, "").replace(/_UI$/, ""));

const stats: Record<string, string> = {
	greenlife: "hp",
	redattack: "atk",
	greendefense: "def",
	redbaoji: "crit-rate",
	redcrit: "crit-dmg",
	greenenergy: "energy-regen",
	greencure: "healing-bonus",
	redphysics: "basic-attack",
	redfoco: "heavy-attack",
	redspeed: "resonance-skill",
	redskill: "resonance-liberation",
	redice: "glacio",
	redhot: "fusion",
	redmine: "electro",
	redwind: "aero",
	reddark: "havoc",
	redlight: "spectro",
};
const elements: Record<string, string> = {
	Ice: "glacio",
	Fire: "fusion",
	Thunder: "electro",
	Wind: "aero",
	Light: "spectro",
	Dark: "havoc",
};
const regions: Record<string, string> = {
	SP_IconHuanglong: "huanglong",
	SP_IconHeihaian2: "black-shores",
	SP_IconLinaxita: "rinascita",
	SP_IconLahailuo: "roya-frostlands",
};
const mapNames: Record<string, string> = {
	SP_IconMap_Play_23_UI: "echo-flight",
	SP_IconMap_Play_10_UI: "tactical-hologram",
	SP_IconMap_CS_01_UI: "resonance-nexus",
	SP_IconMap_CS_02_UI: "resonance-beacon",
	SP_IconMap_SJ_01_UI: "supply-chest",
	SP_IconMap_Play_05_UI: "sonance-casket",
};

export function mapIconUrl(name: string): string {
	if (regions[name]) return `/images/maps/regions/${regions[name]}.webp`;
	return `/icons/map/${mapNames[name] ?? clean(name.replace(/^SP_IconMap_/, ""))}.webp`;
}

/** Stable, readable publication paths. The game checkout's layout stays private. */
export function assetUrl(path: string, resolveAlias = true): string {
	let url = path;
	const name = stem(path);
	const image = (group: string, filename: string) =>
		`/images/${group}/${filename}.webp`;
	const icon = (group: string, filename: string) =>
		`/icons/${group}/${filename}.webp`;
	if (/^\/images\/items\/weapon80\/weapon80-\d+\.webp$/.test(path))
		url = image("weapons", name.replace("weapon80-", ""));
	else if (path.startsWith("/map/icons/gg/"))
		url = image("map-items", clean(name));
	else if (path.startsWith("/map/icons/"))
		url = path.endsWith(".svg") ? `/icons/map/${name}.svg` : mapIconUrl(name);
	else if (/^\/map\/tiles(?:-low)?\//.test(path)) {
		const folder = path.startsWith("/map/tiles-low/") ? "thumbnails" : "tiles";
		// Keep signed tile coordinates intact; collapsing dashes loses -1 versus 1.
		url = image(
			`maps/${folder}`,
			name.replace(/^T_/, "").replace(/_UI$/, "").toLowerCase(),
		);
	} else if (path.startsWith("/data/weapon-icons/"))
		url = image("weapons", name);
	else if (path.startsWith("/wuwa-assets/")) {
		if (path.includes("/WorldMapIcon/") || path.includes("/UiWorldMap/Image/"))
			url = mapIconUrl(name);
		else if (name.startsWith("T_ComIcon"))
			url = icon("weapon-types", slug(name.slice(9)));
		else if (name.startsWith("T_Quality"))
			url = icon("quality", slug(name.slice(9)));
		else if (name.startsWith("T_Iconproperty"))
			url = icon(
				"stats",
				stats[name.slice(14).replace(/_UI$/, "")] ?? clean(name),
			);
		else if (path.includes("/IconElementRound/")) {
			const element = name.match(/^T_IconElement(.+?)\d*_UI$/)?.[1] ?? name;
			url = icon("elements", elements[element] ?? slug(element));
		} else if (path.includes("/IconDevice/"))
			url = image(
				"resonators/sequences",
				clean(name.replace(/^T_IconDevice_/, "")),
			);
		else if (path.includes("/IconRoleHead256/"))
			url = image(
				"resonators/portraits",
				clean(name.replace(/^T_IconRoleHead256_/, "")),
			);
		else if (path.includes("/IconRolePile/"))
			url = image(
				"resonators/artwork",
				clean(name.replace(/^T_IconRole_Pile_/, "")),
			);
		else if (path.includes("/IconRolePlayerHead256/"))
			url = image(
				"profiles",
				clean(name.replace(/^T_IconRolePlayerHead256_/, "")),
			);
		else if (path.includes("/IconMonsterGoods160/"))
			url = image("echoes", clean(name.replace(/^T_IconMonsterGoods160_/, "")));
		else if (/\/IconElementAttri(?:128)?\//.test(path))
			url = image(
				"echo-sets",
				clean(name.replace(/^T_IconElementAttri(?:128_)?/, "")),
			);
		else if (/\/IconWeapon(?:80|160)\//.test(path))
			url = image(
				"weapons",
				clean(name.replace(/^T_IconWeapon(?:80|160)_/, "")),
			);
		else if (name === "SP_FuncIconAchievement")
			url = icon("navigation", "achievements");
		else if (name === "SP_FuncIconBag") url = icon("navigation", "inventory");
		else if (name === "SP_IconQuest") url = icon("navigation", "quests");
		else if (/^SP_IconAchievement[1-4]$/.test(name))
			url = icon(
				"achievements",
				["exploration", "journey", "battles", "voices"][
					Number(name.at(-1)) - 1
				],
			);
		else if (name === "SP_IconInventoryLock")
			url = icon("echo-marks", "locked");
		else if (name === "SP_IconInventoryLock1")
			url = icon("echo-marks", "unlocked");
		else if (name === "SP_IconInventoryLike")
			url = icon("echo-marks", "discarded");
		else {
			const folder = path.split("/").at(-2)!;
			url = image(
				`items/${slug(folder.replace(/^Icon/, ""))}`,
				clean(name.replace(/^T_Icon/, "")),
			);
		}
	}
	return resolveAlias ? (aliases[url] ?? url) : url;
}

/** Migrate generated catalogues; identity fields intentionally keep their old keys. */
export function mapAssetUrls<T>(value: T, resolveAlias = false): T {
	if (typeof value === "string") return assetUrl(value, resolveAlias) as T;
	if (Array.isArray(value))
		return value.map((v) => mapAssetUrls(v, resolveAlias)) as T;
	if (value && typeof value === "object")
		return Object.fromEntries(
			Object.entries(value).map(([key, child]) => [
				key,
				key === "filterIcon" ? child : mapAssetUrls(child, resolveAlias),
			]),
		) as T;
	return value;
}
