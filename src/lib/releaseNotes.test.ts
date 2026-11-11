import { describe, expect, test } from "bun:test";
import {
	createReleaseNotesStore,
	type ReleaseNotes,
	releaseNotesUrl,
} from "./releaseNotes";

const notes: ReleaseNotes = {
	version: "0.3.3",
	body: "## Changes\n- Improved echo upgrades",
	date: "2026-11-10T23:58:49Z",
};

function fixture() {
	const disk = new Map<string, unknown>();
	const requests: string[] = [];
	let response = () =>
		Response.json({
			tag_name: `v${notes.version}`,
			body: notes.body,
			published_at: notes.date,
		});
	let writable = true;
	const deps = {
		read: async (key: string) => disk.get(key),
		write: async (key: string, value: ReleaseNotes) => {
			if (!writable) throw new Error("Disk unavailable");
			disk.set(key, structuredClone(value));
		},
		fetch: async (url: string, init: RequestInit) => {
			requests.push(url);
			expect(init.signal).toBeInstanceOf(AbortSignal);
			return response();
		},
	};
	return {
		deps,
		disk,
		requests,
		store: createReleaseNotesStore(deps),
		respond: (next: () => Response) => {
			response = next;
		},
		makeReadOnly: () => {
			writable = false;
		},
	};
}

describe("release changelogs", () => {
	test("bundled corrections override cached commit logs without needing the network", async () => {
		const f = fixture();
		const curated = { ...notes, body: "Create and save team rotations." };
		f.disk.set("releaseNotes:0.3.3", {
			...notes,
			body: "- chore: release v0.3.3",
		});
		const store = createReleaseNotesStore({
			...f.deps,
			bundled: (version) => (version === "0.3.3" ? curated : undefined),
		});
		expect(await store.load("v0.3.3")).toEqual(curated);
		expect(f.requests).toHaveLength(0);
	});

	test("loads the exact installed tag rather than the latest release and caches it", async () => {
		const f = fixture();
		expect(await f.store.load("v0.3.3")).toEqual(notes);
		expect(f.requests).toEqual([
			"https://api.github.com/repos/Yumeo0/mornye-tools/releases/tags/v0.3.3",
		]);
		expect(await f.store.load("0.3.3")).toEqual(notes);
		expect(f.requests).toHaveLength(1);
		expect(releaseNotesUrl("v0.3.3")).toBe(
			"https://github.com/Yumeo0/mornye-tools/releases/tag/v0.3.3",
		);
	});

	test("manifest notes survive a restart offline without persisting the updater handle", async () => {
		const f = fixture();
		await f.store.save({ ...notes, resource: 123 } as ReleaseNotes);
		expect(f.disk.get("releaseNotes:0.3.3")).toEqual(notes);
		f.respond(() => {
			throw new Error("Offline");
		});
		const afterRestart = createReleaseNotesStore(f.deps);
		expect(await afterRestart.load("0.3.3")).toEqual(notes);
		expect(f.requests).toHaveLength(0);
	});

	test("fetched notes also remain available after restarting offline", async () => {
		const f = fixture();
		await f.store.load("0.3.3");
		f.respond(() => {
			throw new Error("Offline");
		});
		expect(await createReleaseNotesStore(f.deps).load("0.3.3")).toEqual(notes);
		expect(f.requests).toHaveLength(1);
	});

	test("keeps installed and available versions separate", async () => {
		const f = fixture();
		await f.store.save(notes);
		const next = { ...notes, version: "0.3.4", body: "Next release" };
		await f.store.save(next);
		const afterRestart = createReleaseNotesStore(f.deps);
		expect(await afterRestart.load("0.3.3")).toEqual(notes);
		expect(await afterRestart.load("0.3.4")).toEqual(next);
		expect(f.requests).toHaveLength(0);
	});

	test("ignores malformed, empty, and mismatched cached notes", async () => {
		for (const saved of [
			null,
			"invalid",
			{ ...notes, body: 123 },
			{ ...notes, body: "  " },
			{ ...notes, version: "0.3.4" },
		]) {
			const f = fixture();
			f.disk.set("releaseNotes:0.3.3", saved);
			expect(await f.store.load("0.3.3")).toEqual(notes);
			expect(f.requests).toHaveLength(1);
		}
	});

	test("missing manifest notes do not overwrite cached or published notes", async () => {
		const f = fixture();
		await f.store.save(notes);
		await f.store.save({ version: "0.3.3" });
		expect(await createReleaseNotesStore(f.deps).load("0.3.3")).toEqual(notes);
		await f.store.save({ version: "0.3.4" });
		expect(f.disk.has("releaseNotes:0.3.4")).toBe(false);
	});

	test("network and HTTP failures can be retried without caching the failure", async () => {
		for (const fail of [
			() => {
				throw new Error("Offline");
			},
			() => new Response(null, { status: 403 }),
			() => new Response(null, { status: 404 }),
		]) {
			const f = fixture();
			f.respond(fail);
			await expect(f.store.load("0.3.3")).rejects.toThrow();
			f.respond(() => Response.json({ tag_name: "v0.3.3", body: notes.body }));
			expect((await f.store.load("0.3.3")).body).toBe(notes.body);
			expect(f.requests).toHaveLength(2);
		}
	});

	test("rejects a different release in the response", async () => {
		const f = fixture();
		f.respond(() =>
			Response.json({ tag_name: "v0.3.4", body: "Wrong release" }),
		);
		await expect(f.store.load("0.3.3")).rejects.toThrow("do not match");
		expect(f.disk.size).toBe(0);
	});

	test("empty published notes allow a later retry and invalid dates are omitted", async () => {
		const f = fixture();
		f.respond(() =>
			Response.json({
				tag_name: "v0.3.3",
				body: null,
				published_at: "invalid",
			}),
		);
		expect(await f.store.load("0.3.3")).toEqual({
			version: "0.3.3",
			body: "",
			date: undefined,
		});
		f.respond(() => Response.json({ tag_name: "v0.3.3", body: notes.body }));
		expect((await f.store.load("0.3.3")).body).toBe(notes.body);
		expect(f.requests).toHaveLength(2);
	});

	test("a cache write failure does not hide fetched notes", async () => {
		const f = fixture();
		f.makeReadOnly();
		expect(await f.store.load("0.3.3")).toEqual(notes);
		expect(await f.store.load("0.3.3")).toEqual(notes);
		expect(f.requests).toHaveLength(1);
	});
});
