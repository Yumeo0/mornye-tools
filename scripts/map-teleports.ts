interface Teleporter {
	Id: number;
	MapId: number;
	Type: number;
	TeleportEntityConfigId: number;
}

interface TeleportMapMark {
	MarkId: number;
	MapId: number;
	InstanceDungeonId: number;
	EntityConfigId: number;
	MapShow: number;
	MarkTitle: string;
	UnlockMarkPic: string;
}

// Permanent domain entrances, interiors and transport destinations. Teleporter
// Type 3 also contains event replays and challenge shortcuts, so it is not enough
// on its own to identify a permanent travel location.
const DESTINATION_ICONS = new Set([
	"SP_IconMap_Play_01_UI", // Training and Forgery Challenges
	"SP_IconMap_Play_03_UI", // Libraries, archives and other interiors
	"SP_IconMap_Play_04_UI", // Exploration domains
	"SP_IconMap_Play_06_1_UI", // Tower of Adversity
	"SP_IconMap_Play_38_UI", // Leonidas Hotel
	"SP_IconMap_Play_39_UI", // Central Hub
	"SP_IconMap_Play_60_UI", // Academy Dormitory
	"SP_IconMap_Play_67_UI", // Keystone
	"SP_IconMap_Play_77_UI", // Mind Dive Arcade
	"SP_IconMap_Play_78_UI", // Somnoire: Night City
	"SP_IconMap_Play_84_UI", // Fogveil Pagoda
	"SP_IconMap_Play_93_UI", // Qingxiao's Training Hall
	"SP_IconMap_Play_99_UI", // Heart of Appearance
	"SP_IconMap_Ocean_UI", // Gondola platforms
	"SP_IconMap_Activity_Navigation_2_UI", // Port of Riccioli Dock
	"SP_IconMap_Activity_Navigation_3_UI", // Other permanent docks
]);

/** Use canonical teleport IDs to avoid quest-only copies of the same entrance. */
export function teleportMarkers(
	teleporters: Teleporter[],
	marks: TeleportMapMark[],
	weeklyDomainMarks: ReadonlySet<number>,
	text: ReadonlyMap<string, string>,
) {
	const marksById = new Map(marks.map((mark) => [mark.MarkId, mark]));
	const markers = new Map<
		string,
		{
			mapId: number;
			entityId: number;
			name: string;
			title?: string;
			icon: string;
		}
	>();
	for (const teleporter of teleporters) {
		const mark = marksById.get(teleporter.Id);
		if (
			!mark ||
			mark.MapId !== teleporter.MapId ||
			mark.InstanceDungeonId !== 0 ||
			mark.MapShow === 0 ||
			mark.MarkTitle.startsWith("Activity_") ||
			mark.EntityConfigId !== teleporter.TeleportEntityConfigId
		)
			continue;
		const icon = mark.UnlockMarkPic.split("/").at(-1)?.split(".")[0] ?? "";
		const title = text
			.get(mark.MarkTitle)
			?.trim()
			.replace(/^\[(.*)\]$/, "$1");
		if (!icon || !title) continue;
		let name: string;
		if (teleporter.Type === 1) name = title;
		else if (teleporter.Type === 2) name = "Resonance Beacon";
		else if (
			teleporter.Type === 3 &&
			(DESTINATION_ICONS.has(icon) || weeklyDomainMarks.has(mark.MarkId))
		)
			name = title;
		else continue;
		markers.set(`${teleporter.MapId}:${teleporter.TeleportEntityConfigId}`, {
			mapId: teleporter.MapId,
			entityId: teleporter.TeleportEntityConfigId,
			name,
			...(title !== name ? { title } : {}),
			icon,
		});
	}
	return markers;
}
