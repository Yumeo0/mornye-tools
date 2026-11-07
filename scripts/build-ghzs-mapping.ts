/** Build an offline GHZS -> TH.GL destination lookup from public catalog IDs.
 *
 * TH.GL returns destination sets, not pairs. Complementary bit partitions
 * recover only destinations attributable to exactly one source ID; collisions
 * and sources with multiple destinations are omitted. No player data is sent.
 */
import { z } from "zod";

const ghzs = "https://api-wiki-game.ghzs.com/v1d0/web/kurogame-mc/map";
const thgl = "https://api.th.gl/api/import?source=ghzs&game=wuthering-waves";

async function readArray(url: string): Promise<unknown[]> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`GHZS request failed: ${response.status}`);
	const value: unknown = await response.json();
	if (!Array.isArray(value)) throw new Error("Invalid GHZS catalog response");
	return value;
}

const maps = [
	{ _id: "" },
	...z
		.array(z.object({ _id: z.string() }))
		.parse(await readArray(`${ghzs}/maps`)),
];
const sourceIds = new Set<string>();
for (const map of maps) {
	if (typeof map._id !== "string") throw new Error("Invalid GHZS map ID");
	const groups = z
		.array(
			z.object({
				resources: z
					.array(
						z.object({
							points: z.array(z.object({ _id: z.string().min(1) })).optional(),
						}),
					)
					.optional(),
			}),
		)
		.parse(await readArray(`${ghzs}?map_id=${encodeURIComponent(map._id)}`));
	for (const group of groups)
		for (const resource of group.resources ?? [])
			for (const point of resource.points ?? []) {
				if (typeof point._id !== "string" || !point._id)
					throw new Error("Invalid GHZS marker ID");
				sourceIds.add(point._id);
			}
}
const ids = [...sourceIds].sort();
if (!ids.length || ids.length > 100_000)
	throw new Error("Unexpected GHZS catalog size");

async function lookup(input: string[]): Promise<Set<string>> {
	const response = await fetch(thgl, {
		method: "POST",
		headers: { "Content-Type": "text/plain" },
		body: JSON.stringify(input),
	});
	if (!response.ok) throw new Error(`TH.GL request failed: ${response.status}`);
	const result = await response.json();
	if (
		result.summary?.input !== input.length ||
		!Array.isArray(result.discoveredNodeIds) ||
		!result.discoveredNodeIds.every((id: unknown) => typeof id === "string")
	)
		throw new Error("Invalid TH.GL response");
	return new Set(result.discoveredNodeIds);
}

const all = await lookup(ids);
if (!all.size) throw new Error("TH.GL returned no matches");
const decoded = new Map([...all].map((destination) => [destination, 0]));
const ambiguous = new Set<string>();
for (let bit = 0; bit < Math.ceil(Math.log2(ids.length)); bit++) {
	const zero: string[] = [],
		one: string[] = [];
	for (let i = 0; i < ids.length; i++)
		(i & (1 << bit) ? one : zero).push(ids[i]);
	const [a, b] = await Promise.all([lookup(zero), lookup(one)]);
	for (const destination of [...a, ...b])
		if (!all.has(destination)) throw new Error("Inconsistent TH.GL responses");
	for (const destination of all) {
		if (a.has(destination) === b.has(destination)) ambiguous.add(destination);
		else if (b.has(destination))
			decoded.set(destination, (decoded.get(destination) ?? 0) | (1 << bit));
	}
	console.log(
		`Partition ${bit + 1}: ${ambiguous.size} shared or inconsistent destinations`,
	);
}
const candidates = new Map<string, string | null>();
for (const [destination, index] of decoded) {
	if (ambiguous.has(destination) || index >= ids.length) continue;
	const id = ids[index];
	if (candidates.has(id)) candidates.set(id, null);
	else candidates.set(id, destination);
}
const entries = [...candidates]
	.filter((entry): entry is [string, string] => entry[1] !== null)
	.sort(([a], [b]) => a.localeCompare(b));
if (!entries.length) throw new Error("No unambiguous mappings found");
// Check individual IDs before replacing the previous mapping.
const stride = Math.max(1, Math.floor(entries.length / 25));
for (const [id, destination] of entries
	.filter((_, index) => index % stride === 0)
	.slice(0, 25)) {
	const actual = await lookup([id]);
	if (actual.size !== 1 || !actual.has(destination))
		throw new Error(`TH.GL verification failed for ${id}`);
}
await Bun.write(
	"src/configs/ghzs_thgl_mapping.json",
	`${JSON.stringify(Object.fromEntries(entries))}\n`,
);
console.log(
	`Saved ${entries.length} unambiguous mappings from ${ids.length} public IDs.`,
);
