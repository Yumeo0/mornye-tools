import { describe, expect, test } from "bun:test";
import { createUpdateChangelog } from "./updateChangelog";

function fixture() {
	const disk = new Map<string, unknown>();
	const deps = {
		read: async (key: string) => disk.get(key),
		write: async (key: string, value: string) => {
			disk.set(key, value);
		},
	};
	return { disk, deps, tracker: createUpdateChangelog(deps) };
}

describe("post-update changelog", () => {
	test("a fresh installation and ordinary restarts do not open a modal", async () => {
		const f = fixture();
		expect(await f.tracker.pending("0.3.6")).toBeNull();
		expect(await createUpdateChangelog(f.deps).pending("0.3.6")).toBeNull();
	});

	test("shows the installed release across restarts until dismissed, then only for another update", async () => {
		const f = fixture();
		await f.tracker.acknowledge("0.3.6");
		const restarted = createUpdateChangelog(f.deps);
		expect(await restarted.pending("0.3.7")).toBe("0.3.7");
		// Merely checking must not consume the dialog, including Strict Mode remounts.
		expect(await createUpdateChangelog(f.deps).pending("0.3.7")).toBe("0.3.7");
		await restarted.acknowledge("0.3.7");
		expect(await createUpdateChangelog(f.deps).pending("0.3.7")).toBeNull();
		expect(await createUpdateChangelog(f.deps).pending("0.3.8")).toBe("0.3.8");
	});

	test("a failed installation or checking a newer release does not announce that release", async () => {
		const f = fixture();
		await f.tracker.acknowledge("0.3.6");
		f.disk.set("releaseNotes:0.3.7", {
			version: "0.3.7",
			body: "New features",
		});
		expect(await createUpdateChangelog(f.deps).pending("0.3.6")).toBeNull();
		expect(await createUpdateChangelog(f.deps).pending("0.3.7")).toBe("0.3.7");
	});

	test("recognizes the first update from older builds using their saved release notes", async () => {
		const f = fixture();
		f.disk.set("releaseNotes:0.3.7", {
			version: "0.3.7",
			body: "New features",
		});
		expect(await f.tracker.pending("0.3.7")).toBe("0.3.7");
		await f.tracker.acknowledge("0.3.7");
		expect(await createUpdateChangelog(f.deps).pending("0.3.7")).toBeNull();
	});

	test("ignores invalid or mismatched legacy release notes", async () => {
		for (const cached of [
			null,
			"invalid",
			{ version: "0.3.8", body: "Another release" },
			{ version: "0.3.7", body: "  " },
			{ version: "0.3.7", body: 123 },
		]) {
			const f = fixture();
			f.disk.set("releaseNotes:0.3.7", cached);
			expect(await f.tracker.pending("0.3.7")).toBeNull();
			expect(await createUpdateChangelog(f.deps).pending("0.3.7")).toBeNull();
		}
	});

	test("normalizes version prefixes and retains pending notes if dismissal cannot be saved", async () => {
		const f = fixture();
		await f.tracker.acknowledge("v0.3.6");
		expect(await f.tracker.pending("0.3.6")).toBeNull();
		expect(await f.tracker.pending("v0.3.7")).toBe("0.3.7");
		const readOnly = createUpdateChangelog({
			...f.deps,
			write: async () => {
				throw new Error("Disk unavailable");
			},
		});
		await expect(readOnly.acknowledge("0.3.7")).rejects.toThrow(
			"Disk unavailable",
		);
		expect(await createUpdateChangelog(f.deps).pending("0.3.7")).toBe("0.3.7");
	});
});
