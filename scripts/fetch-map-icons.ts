// Build `src/configs/map_icons.json` and download item icons from wuthering.gg.
//
// The game tables do not map a placement's blueprint to a specific UI icon, so
// our catalogue falls back to one icon per reward kind. wuthering.gg already
// solved that mapping for its interactive map: a placement appears there with
// the same raw Transform coordinates and a per-item icon. This script joins
// our placements to theirs by coordinates, falls back to unambiguous name
// matches against their marker and item databases, downloads the icons it can
// prove, and writes the mapping for `scripts/compile-map-data.ts` to apply.
//
// The output is committed; the site is only contacted when this script runs.
//
//   bun scripts/fetch-map-icons.ts
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { MapReward } from "../src/lib/map/types";

const root = resolve(import.meta.dirname, "..");
const outDir = join(root, "public/map/icons/gg");
const site = "https://wuthering.gg";
const backtick = String.fromCharCode(96);
const CHUNK_LIMIT = 600;

interface SiteGroup {
	MarkTitle: string;
	UnlockMarkPic?: string;
	Monster?: boolean;
	Locations?: [number, number][];
}
interface IconRef {
	folder: "items" | "mapicons";
	file: string;
}
interface Tally {
	[stamp: string]: number;
}

/** Blueprints whose pickups ship without English text resolve to a known name. */
const NAME_OVERRIDES: Record<string, string> = {
	"branch3.5_21_Gameplay_3_0/Common4": "Unclaimed Rafter Kite",
	"branch3.0_41_Gameplay_3_0/Common1": "Tape of Last Words",
};

const words = (value: string) =>
	value
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean)
		.sort()
		.join(" ");
const wordSet = (value: string) =>
	new Set(words(value).split(" ").filter(Boolean));
const containsWords = (outer: Set<string>, inner: Set<string>) =>
	[...inner].every((word) => outer.has(word));

const iconRef = (pic: string, monster: boolean): IconRef => ({
	folder:
		monster ||
		pic.startsWith("SP_IconMonsterHead") ||
		pic.startsWith("SP_IconMap_")
			? "mapicons"
			: "items",
	file: pic,
});
const iconUrl = ({ folder, file }: IconRef) =>
	`${site}/images/${folder}/${file}`;

/** Parse every `JSON.parse(`...`)` payload in a chunk into marker groups. */
function parseGroups(source: string): SiteGroup[] {
	const groups: SiteGroup[] = [];
	let from = 0;
	while (true) {
		const start = source.indexOf(`JSON.parse(${backtick}`, from);
		if (start < 0) break;
		const dataStart = start + `JSON.parse(${backtick}`.length;
		const end = source.indexOf(`${backtick})`, dataStart);
		if (end < 0) break;
		from = end;
		try {
			const parsed = JSON.parse(source.slice(dataStart, end));
			if (!Array.isArray(parsed)) continue;
			for (const entry of parsed)
				if (entry && typeof entry.MarkTitle === "string")
					groups.push(entry as SiteGroup);
		} catch {}
	}
	return groups;
}

console.log("Scanning wuthering.gg for marker datasets and item icons…");
const known = new Set<string>();
const queue = ["/", "/map"];
const groups: SiteGroup[] = [];
const items: { name: string; icon: string }[] = [];
while (queue.length && known.size < CHUNK_LIMIT) {
	const path = queue.shift() as string;
	if (known.has(path)) continue;
	known.add(path);
	let source: string;
	try {
		const response = await fetch(site + path);
		if (!response.ok) continue;
		source = await response.text();
	} catch {
		continue;
	}
	if (source.includes("JSON.parse(")) groups.push(...parseGroups(source));
	// Only the English item database is useful for name matching.
	if (
		source.includes('"AttributesDescription"') &&
		source.includes('"Sonance Casket"')
	) {
		for (const match of source.matchAll(
			/\{"Id":\d+,"Name":"((?:[^"\\]|\\.)+)",[\s\S]{0,800}?"Icon":"([A-Za-z0-9_-]{5,}\.(?:png|webp))"/g,
		)) {
			try {
				items.push({ name: JSON.parse(`"${match[1]}"`), icon: match[2] });
			} catch {}
		}
	}
	for (const ref of source.matchAll(
		/["'(]\.\/([A-Za-z0-9_.-]+\.js)["')]|\/(_nuxt\/[A-Za-z0-9_.-]+\.js)/g,
	)) {
		const next = ref[1] ? `/_nuxt/${ref[1]}` : `/${ref[2]}`;
		if (!known.has(next)) queue.push(next);
	}
}
console.log(
	`  ${known.size} chunks scanned, ${groups.length} marker groups, ${items.length} item icons`,
);

// --- Coordinate join -------------------------------------------------------
// Several groups can share a coordinate (landmarks overlay collectibles), so
// keep them all and prefer real item/monster icons over generic map pins.
const isPin = (pic: string) => pic.startsWith("SP_IconMap_");
const rankOf = (group: SiteGroup) => {
	const pic = group.UnlockMarkPic ?? "";
	if (group.Monster || !isPin(pic)) return 0;
	return pic.startsWith("SP_IconMap_Task_") ? 2 : 1;
};
const pickGroup = (list: SiteGroup[]) =>
	[...list].sort((a, b) => rankOf(a) - rankOf(b))[0];

const byPair = new Map<string, SiteGroup[]>();
for (const group of groups)
	for (const [x, y] of group.Locations ?? []) {
		const key = `${x},${y}`;
		const list = byPair.get(key) ?? [];
		list.push(group);
		byPair.set(key, list);
	}

const catalog = (await Bun.file(
	join(root, "public/map/catalog.json"),
).json()) as {
	rewards: MapReward[];
};
const nameOf = (reward: MapReward) =>
	NAME_OVERRIDES[reward.blueprint] ?? reward.name;
const tallyInto = <K>(map: Map<K, Tally>, key: K, stamp: string) => {
	const tally = map.get(key) ?? {};
	tally[stamp] = (tally[stamp] ?? 0) + 1;
	map.set(key, tally);
};
const majority = (tally: Tally | undefined) =>
	tally ? Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0] : undefined;

const byBlueprint = new Map<string, Tally>();
const byType = new Map<string, Tally>();
const byHeritage = new Map<number, Tally>();
let matched = 0;
for (const reward of catalog.rewards) {
	const point = `${Math.round(reward.x * 100)},${Math.round(reward.y * 100)}`;
	const group = pickGroup(byPair.get(point) ?? []);
	if (!group?.UnlockMarkPic) continue;
	matched++;
	const stamp = `${group.UnlockMarkPic}|${group.Monster ? "1" : "0"}`;
	tallyInto(byBlueprint, reward.blueprint, stamp);
	tallyInto(byType, `${reward.kind}|${nameOf(reward)}`, stamp);
	if (reward.kind === "heritage")
		tallyInto(
			byHeritage,
			reward.icon.includes("blue")
				? 12
				: reward.icon.includes("gold") || reward.icon.includes("yellow")
					? 14
					: 13,
			stamp,
		);
}
console.log(
	`  ${matched}/${catalog.rewards.length} placements matched by coordinates`,
);

// --- Name fallbacks --------------------------------------------------------
// Their marker titles, but only where a single icon is unambiguous.
const titleIcons = new Map<string, Set<string>>();
for (const group of groups) {
	if (!group.UnlockMarkPic) continue;
	const key = words(group.MarkTitle);
	if (!key) continue;
	const stamp = `${group.UnlockMarkPic}|${group.Monster ? "1" : "0"}`;
	const set = titleIcons.get(key) ?? new Set<string>();
	set.add(stamp);
	titleIcons.set(key, set);
}
const itemIcons = new Map<string, Set<string>>();
for (const item of items) {
	const key = words(item.name);
	if (!key) continue;
	const set = itemIcons.get(key) ?? new Set<string>();
	set.add(`${item.icon}|0`);
	itemIcons.set(key, set);
}

/** Their catch-all "task" pin carries no item information; prefer our fallback. */
const acceptable = (stamp: string | undefined) =>
	stamp && !stamp.startsWith("SP_IconMap_Task_") ? stamp : undefined;

/** Prefer an item icon when a title has both a pin and an item icon. */
const soleStamp = (stamps: Set<string> | undefined) => {
	if (!stamps || stamps.size === 0) return undefined;
	const items = [...stamps].filter((stamp) => !stamp.startsWith("SP_IconMap_"));
	if (items.length === 1) return items[0];
	return stamps.size === 1 ? [...stamps][0] : undefined;
};

const titleMatch = (name: Set<string>) => {
	for (const [key, icons] of titleIcons) {
		const title = new Set(key.split(" ").filter(Boolean));
		if (containsWords(name, title) || containsWords(title, name)) {
			const stamp = soleStamp(icons);
			if (stamp) return stamp;
		}
	}
	return undefined;
};
const itemMatch = (name: Set<string>) => {
	const exact = soleStamp(itemIcons.get([...name].sort().join(" ")));
	if (exact) return exact;
	for (const [key, icons] of itemIcons) {
		const itemName = new Set(key.split(" ").filter(Boolean));
		if (containsWords(name, itemName)) {
			const stamp = soleStamp(icons);
			if (stamp) return stamp;
		}
	}
	return undefined;
};

/** First acceptable icon for a reward: coordinates, then names. */
const resolveFor = (reward: MapReward): string | undefined => {
	const byCoordinates = acceptable(majority(byBlueprint.get(reward.blueprint)));
	if (byCoordinates) return byCoordinates;
	const byKind = acceptable(
		majority(byType.get(`${reward.kind}|${nameOf(reward)}`)),
	);
	if (byKind) return byKind;
	const name = wordSet(nameOf(reward));
	if (!name.size || reward.kind === "heritage") return undefined;
	return acceptable(titleMatch(name)) ?? acceptable(itemMatch(name));
};

// --- Resolve, download, write ---------------------------------------------
mkdirSync(outDir, { recursive: true });
const downloaded = new Map<string, string | undefined>();
let unavailable = 0;
const publishIcon = async (stamp: string | undefined) => {
	if (!stamp) return undefined;
	const [pic, monster] = stamp.split("|");
	const ref = iconRef(pic, monster === "1");
	if (downloaded.has(ref.file)) return downloaded.get(ref.file);
	const destination = join(outDir, ref.file);
	if (existsSync(destination)) {
		const path = `/map/icons/gg/${ref.file}`;
		downloaded.set(ref.file, path);
		return path;
	}
	let path: string | undefined;
	try {
		const response = await fetch(iconUrl(ref));
		if (
			response.ok &&
			response.headers.get("content-type")?.startsWith("image/")
		) {
			await Bun.write(join(outDir, ref.file), await response.arrayBuffer());
			path = `/map/icons/gg/${ref.file}`;
		} else {
			unavailable++;
			console.warn(`  unavailable: ${iconUrl(ref)} (${response.status})`);
		}
	} catch {
		unavailable++;
	}
	downloaded.set(ref.file, path);
	return downloaded.get(ref.file);
};

const config: {
	source: string;
	names: Record<string, string>;
	icons: Record<string, string>;
	types: Record<string, string>;
	heritage: Record<string, string>;
} = {
	source: `${site} (marker datasets and item database)`,
	names: NAME_OVERRIDES,
	icons: {},
	types: {},
	heritage: {},
};

for (const reward of catalog.rewards) {
	if (config.icons[reward.blueprint]) continue;
	const icon = await publishIcon(
		acceptable(majority(byBlueprint.get(reward.blueprint))),
	);
	if (icon) config.icons[reward.blueprint] = icon;
}
const sampleByType = new Map<string, MapReward>();
for (const reward of catalog.rewards) {
	const type = `${reward.kind}|${nameOf(reward)}`;
	if (!sampleByType.has(type)) sampleByType.set(type, reward);
}
for (const [type, sample] of sampleByType) {
	const icon = await publishIcon(resolveFor(sample));
	if (icon) config.types[type] = icon;
}

for (const [degree, tally] of byHeritage) {
	const icon = await publishIcon(majority(tally));
	if (icon) config.heritage[String(degree)] = icon;
}

await Bun.write(
	join(root, "src/configs/map_icons.json"),
	`${JSON.stringify(config, null, "\t")}\n`,
);
const covered = catalog.rewards.filter(
	(r) => config.icons[r.blueprint] || config.types[`${r.kind}|${nameOf(r)}`],
).length;
console.log(
	`Wrote src/configs/map_icons.json: ${Object.keys(config.icons).length} blueprint icons, ${Object.keys(config.types).length} type icons, ${Object.keys(config.heritage).length} heritage colors, ${downloaded.size} files${unavailable ? `, ${unavailable} unavailable` : ""}.`,
);
console.log(
	`  ${covered}/${catalog.rewards.length} placements now resolve to a wuthering.gg icon (${((covered / catalog.rewards.length) * 100).toFixed(1)}%).`,
);
const missingTypes = [
	...new Set(catalog.rewards.map((r) => `${r.kind}|${nameOf(r)}`)),
].filter(
	(type) =>
		!config.types[type] &&
		!catalog.rewards.some(
			(r) => `${r.kind}|${nameOf(r)}` === type && config.icons[r.blueprint],
		),
);
if (missingTypes.length)
	console.log(
		`  ${missingTypes.length} item types keep their built-in icon:\n    ${missingTypes.join("\n    ")}`,
	);
