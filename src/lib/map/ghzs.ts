import { z } from "zod";
import mapDefinitions from "@/configs/ghzs_maps.json";
import { collectionState, type ManualMapMarks } from "./collection";
import type { ExplorationSnapshot, MapCatalog, MapReward } from "./types";

export const GHZS_MAX_FILE_SIZE = 20 * 1024 * 1024;
const id = z.string().min(1).max(128);
const exportSchema = z.object({
	format: z.literal("mornye-ghzs"),
	version: z.literal(1),
	markedIds: z.array(id).max(100_000),
	points: z
		.array(
			z.object({
				id,
				map: z.string().max(128),
				category: z.string().min(1).max(200),
				coordinates: z.tuple([
					z.number().min(-85.05).max(85.05),
					z.number().min(-180).max(180),
				]),
			}),
		)
		.max(200_000),
});
export type GhzsExport = z.infer<typeof exportSchema>;
export type GhzsSkipReason =
	| "Missing marker details"
	| "Unsupported map"
	| "Unsupported category"
	| "No nearby marker"
	| "Ambiguous location";
export interface GhzsImportRow {
	id: string;
	category: string;
	map: string;
	reward?: MapReward;
	distance?: number;
	reason?: GhzsSkipReason;
}

export function parseGhzsExport(text: string): GhzsExport {
	if (text.length > GHZS_MAX_FILE_SIZE)
		throw new Error("The export must be smaller than 20 MB.");
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new Error(
			"This is not valid JSON. Use the GHZS export script below.",
		);
	}
	const parsed = exportSchema.safeParse(value);
	if (!parsed.success)
		throw new Error(
			"Unrecognized or invalid GHZS export. Run the export script again and import its JSON file.",
		);
	return parsed.data;
}

/**
 * A GHZS view can stitch several artwork insets into one image, so one view
 * may carry more than one alignment. `layer` ties an inset to a single game
 * artwork layer: omitted matches every placement, 0 matches surface
 * placements only, and a number matches that underground layer.
 */
interface GhzsAlignment {
	mapId: number;
	transform: [number, number, number, number];
	layer?: number;
}
const namesByView = new Map<string, string>();
const alignmentsByView = new Map<string, GhzsAlignment[]>();
for (const definition of mapDefinitions) {
	if (!namesByView.has(definition.id))
		namesByView.set(definition.id, definition.name);
	if (!definition.transform) continue;
	const alignments = alignmentsByView.get(definition.id) ?? [];
	alignments.push({
		mapId: definition.mapId,
		transform: definition.transform as [number, number, number, number],
		...(definition.layer === undefined ? {} : { layer: definition.layer }),
	});
	alignmentsByView.set(definition.id, alignments);
}

/** GHZS uses Web Mercator over independently cropped map artwork. */
export function ghzsPosition(map: string, coordinates: [number, number]) {
	const alignment = alignmentsByView.get(map)?.[0];
	if (!alignment) return null;
	const [lat, lng] = coordinates;
	return {
		mapId: alignment.mapId,
		x: lng * alignment.transform[0] + alignment.transform[1],
		y: mercatorY(lat) * alignment.transform[2] + alignment.transform[3],
	};
}

/** GHZS uses Web Mercator over independently cropped map artwork. */
function mercatorY(lat: number) {
	return (
		(-Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI
	);
}

/** Ignore types for which this companion does not track completion. */
function categoryPredicate(
	category: string,
): ((reward: MapReward) => boolean) | null {
	const name = category.trim().toLowerCase();
	if (name === "supply chest") return (r) => r.kind === "chest";
	if (name.startsWith("tidal heritage")) {
		const color = name.includes("gold")
			? "yellow"
			: name.includes("purple")
				? "purple"
				: name.includes("blue")
					? "blue"
					: null;
		return (r) =>
			r.kind === "heritage" &&
			(!color ||
				r.icon.includes(color) ||
				(color === "yellow" && r.icon.includes("gold")));
	}
	const aliases: Record<string, string[]> = {
		musicfly: ["Musicfly"],
		"moments scattered to the wind": ["Moments Scattered to the Wind"],
		"dream of cindertides": ["Dream of Cindertides"],
		"dream patrol": ["Dream Patrol"],
		"mimic chest": ["Mimic Chest"],
		"overflowing palette": ["Overflowing Palette"],
		"crab chest": ["Crab Chest"],
		"three brothers": ["Three Brothers"],
		"boat racing": ["Boat Racing"],
		"ace wings": ["Ace Wings"],
		"flash dodge": ["Flash Dodge"],
		"elite monster": ["Elite Monster"],
		"book fragments/records": ["Book fragments/records"],
		"sonance casket": ["Sonance Casket", "Grapple Sonance Casket"],
		tape: ["Tape of Last Words"],
		"unclaimed rafter kite": ["Unclaimed Rafter Kite"],
		blobfly: ["Blobfly"],
		mutterfly: ["Mutterfly"],
		bell: ["Windchimer"],
		worm: ["Frostbug"],
		viewpoint: ["Viewpoint"],
		"challenge project": ["Challenge Project"],
		"tacet field": ["Tacet Fields"],
		"tacet fields": ["Tacet Fields"],
	};
	if (aliases[name])
		return (r) => r.kind !== "collection" && aliases[name].includes(r.name);
	if (name === "nightmare nest")
		return (r) => /^(Nightmare Nest|Tacet Discord Nest:)/.test(r.name);
	if (name.startsWith("tactical hologram"))
		return (r) => /^(Tactical Hologram|Overlord Challenge)/.test(r.name);
	if (name === "echo challenge")
		return (r) =>
			/^(Echo Challenge:|Aetherfin Sliding|Trial of Perception)/.test(r.name);
	return null;
}

const CELL = 1200;
/** Clearance a free alternative needs before an assignment is offered. */
const SEPARATION = 600;

interface GhzsCandidate {
	reward: MapReward;
	distance: number;
}

/** Only the placements of one artwork layer; omitted matches every layer. */
function layerPredicate(layer?: number) {
	if (layer === undefined) return () => true;
	if (layer === 0) return (reward: MapReward) => !reward.underground;
	return (reward: MapReward) => reward.underground?.layer === layer;
}

/**
 * GHZS pins are hand placed, so several placements can sit within the error
 * radius. A globally consistent one-to-one assignment resolves dense clusters
 * while two marked spots can never claim one placement. Assignments that a
 * free alternative contradicts stay ambiguous: only unique, well separated
 * candidates are offered, and floors are never guessed between.
 */
export function matchGhzsExport(
	data: GhzsExport,
	catalog: MapCatalog,
): GhzsImportRow[] {
	const grid = new Map<string, MapReward[]>();
	for (const reward of catalog.rewards) {
		if (reward.kind === "collection") continue;
		const key = `${reward.mapId}:${Math.floor(reward.x / CELL)}:${Math.floor(reward.y / CELL)}`;
		const cell = grid.get(key) ?? [];
		cell.push(reward);
		grid.set(key, cell);
	}
	const points = new Map<string, GhzsExport["points"]>();
	for (const point of data.points) {
		const list = points.get(point.id) ?? [];
		list.push(point);
		points.set(point.id, list);
	}
	const rows: GhzsImportRow[] = [];
	const proposers: { row: GhzsImportRow; candidates: GhzsCandidate[] }[] = [];
	for (const sourceId of new Set(data.markedIds)) {
		const records = points.get(sourceId) ?? [];
		const first = records[0];
		const row: GhzsImportRow = {
			id: sourceId,
			category: first?.category ?? "Unknown marker",
			map: namesByView.get(first?.map ?? "") ?? "Unknown map",
			reason: "Missing marker details",
		};
		rows.push(row);
		if (!records.length) continue;
		let unsupportedMap = false;
		let unsupportedCategory = false;
		let noNearbyMarker = false;
		const perRecord: Map<string, GhzsCandidate>[] = [];
		for (const record of records) {
			const alignments = alignmentsByView.get(record.map) ?? [];
			if (!alignments.length) {
				unsupportedMap = true;
				continue;
			}
			const accepts = categoryPredicate(record.category);
			if (!accepts) {
				unsupportedCategory = true;
				continue;
			}
			const found = new Map<string, GhzsCandidate>();
			for (const alignment of alignments) {
				const tracks = layerPredicate(alignment.layer);
				const x =
					record.coordinates[1] * alignment.transform[0] +
					alignment.transform[1];
				const y =
					mercatorY(record.coordinates[0]) * alignment.transform[2] +
					alignment.transform[3];
				const cellX = Math.floor(x / CELL);
				const cellY = Math.floor(y / CELL);
				// Look farther than the acceptance radius to detect close alternatives.
				for (let cx = cellX - 2; cx <= cellX + 2; cx++)
					for (let cy = cellY - 2; cy <= cellY + 2; cy++)
						for (const reward of grid.get(`${alignment.mapId}:${cx}:${cy}`) ??
							[]) {
							if (!accepts(reward) || !tracks(reward)) continue;
							const distance = Math.hypot(x - reward.x, y - reward.y);
							if (distance > CELL) continue;
							const existing = found.get(reward.key);
							if (!existing || distance < existing.distance)
								found.set(reward.key, { reward, distance });
						}
			}
			if (found.size) perRecord.push(found);
			else noNearbyMarker = true;
		}
		if (!perRecord.length) {
			row.reason = unsupportedMap
				? "Unsupported map"
				: unsupportedCategory
					? "Unsupported category"
					: noNearbyMarker
						? "No nearby marker"
						: "Unsupported map";
			continue;
		}
		// Every record of one mark must agree. A record that cannot match makes
		// the whole mark ambiguous instead of silently keeping the other record.
		if (perRecord.length !== records.length) {
			row.reason = "Ambiguous location";
			continue;
		}
		let candidates: Map<string, GhzsCandidate> | null = null;
		for (const found of perRecord) {
			if (candidates === null) {
				candidates = new Map(found);
				continue;
			}
			for (const [key, candidate] of [...candidates]) {
				const other = found.get(key);
				if (!other) candidates.delete(key);
				else if (other.distance > candidate.distance)
					candidates.set(key, other);
			}
		}
		const list = [
			...(candidates ?? new Map<string, GhzsCandidate>()).values(),
		].sort(
			(a, b) =>
				a.distance - b.distance || a.reward.key.localeCompare(b.reward.key),
		);
		if (!list.length) {
			row.reason = "Ambiguous location";
			continue;
		}
		// Until the assignment survives every check, a candidate list means
		// the mark is close to several placements rather than decided.
		row.reason = "Ambiguous location";
		proposers.push({ row, candidates: list });
	}
	let active = proposers;
	// Every removed proposer releases its claim, so the rounds converge.
	for (let round = 0; round <= proposers.length && active.length; round++) {
		const held = new Map<string, { id: string; distance: number }>();
		const index = new Map<string, number>();
		const result = new Map<string, GhzsCandidate>();
		const byId = new Map(active.map((proposer) => [proposer.row.id, proposer]));
		const queue = active.map((proposer) => proposer.row.id);
		while (queue.length) {
			const sourceId = queue.shift();
			if (sourceId === undefined) break;
			const proposer = byId.get(sourceId);
			if (!proposer) continue;
			let at = index.get(sourceId) ?? 0;
			while (at < proposer.candidates.length) {
				const candidate = proposer.candidates[at++];
				const current = held.get(candidate.reward.key);
				if (current && current.distance <= candidate.distance) continue;
				if (current) {
					result.delete(current.id);
					queue.push(current.id);
				}
				held.set(candidate.reward.key, {
					id: sourceId,
					distance: candidate.distance,
				});
				result.set(sourceId, candidate);
				break;
			}
			index.set(sourceId, at);
		}
		const failures = new Set<string>();
		for (const [sourceId, candidate] of result) {
			const proposer = byId.get(sourceId);
			if (!proposer) continue;
			// Two marked spots cannot claim one placement, and near ties stay
			// unknown instead of silently picking one.
			for (const other of proposers) {
				if (other.row.id === sourceId) continue;
				const edge = other.candidates.find(
					(entry) => entry.reward.key === candidate.reward.key,
				);
				if (!edge || edge.distance > candidate.distance) continue;
				if (result.get(other.row.id)?.reward.key !== candidate.reward.key)
					failures.add(sourceId);
			}
			const free = freeAlternative(proposer, candidate, held);
			if (
				free &&
				(free.distance <= candidate.distance ||
					free.distance < candidate.distance * 2) &&
				free.distance - candidate.distance < SEPARATION
			)
				failures.add(sourceId);
		}
		if (!failures.size) {
			for (const [sourceId, candidate] of result) {
				const row = byId.get(sourceId)?.row;
				if (!row) continue;
				row.reward = candidate.reward;
				row.distance = candidate.distance;
				delete row.reason;
			}
			break;
		}
		const next = active.filter((proposer) => !failures.has(proposer.row.id));
		if (next.length === active.length) break;
		active = next;
	}
	return rows;
}

/** The closest placement this mark could take instead, held placements aside. */
function freeAlternative(
	proposer: { candidates: GhzsCandidate[] },
	candidate: GhzsCandidate,
	held: Map<string, { id: string; distance: number }>,
) {
	let free: GhzsCandidate | undefined;
	for (const other of proposer.candidates) {
		if (other.reward.key === candidate.reward.key) continue;
		if (held.has(other.reward.key)) continue;
		if (!free || other.distance < free.distance) free = other;
	}
	return free;
}

/** Merge found locations, leaving existing progress and timestamps intact otherwise. */
export function mergeImportedMarks(
	marks: ManualMapMarks,
	rewards: MapReward[],
	snapshot: ExplorationSnapshot,
	now = Date.now(),
): ManualMapMarks {
	const next = { ...marks };
	for (const reward of rewards) {
		if (
			reward.kind === "collection" ||
			collectionState(reward, snapshot, next).state === "collected"
		)
			continue;
		next[reward.key] = {
			collected: true,
			updatedAt: Math.max(
				now,
				(marks[reward.key]?.updatedAt ?? 0) + 1,
				(snapshot.rewards[reward.key]?.observedAt ?? 0) + 1,
			),
		};
	}
	return next;
}
