import { expect, spyOn, test } from "bun:test";
import { bundledReleaseNotes } from "../src/lib/changelog";
import { ensureRelease, releaseNotes } from "./github-release";

test("GitHub publishing uses the same curated entry as the in-app changelog", () => {
	const curated = bundledReleaseNotes("0.3.3");
	if (!curated) throw new Error("Missing shipped changelog");
	expect(releaseNotes("0.3.3")).toBe(curated.body);
	expect(releaseNotes("0.3.3")).not.toMatch(/chore:|feat:|Release v0/);
	expect(() => releaseNotes("9.9.9")).toThrow("Missing user-facing changelog");
});

async function withReleaseApi(
	responses: Response[],
	check: (calls: { url: string; init?: RequestInit }[]) => Promise<void>,
) {
	const calls: { url: string; init?: RequestInit }[] = [];
	const fetchMock = spyOn(globalThis, "fetch").mockImplementation(
		Object.assign(
			async (...[url, init]: Parameters<typeof fetch>) => {
				calls.push({
					url: String(url),
					init: init && { method: init.method, body: init.body },
				});
				const response = responses.shift();
				if (!response) throw new Error("Unexpected release API request");
				return response;
			},
			{ preconnect: fetch.preconnect },
		),
	);
	try {
		await check(calls);
	} finally {
		fetchMock.mockRestore();
	}
}

test("a publish retry replaces an existing commit log with curated release notes", async () => {
	const body = releaseNotes("0.3.3");
	const existing = {
		id: 123,
		tag_name: "v0.3.3",
		body: "- chore: release v0.3.3",
		assets: [],
	};
	await withReleaseApi(
		[Response.json(existing), Response.json({ ...existing, body })],
		async (calls) => {
			const release = await ensureRelease("v0.3.3", body);
			expect(release.body).toBe(body);
			expect(calls).toHaveLength(2);
			expect(calls[1].url).toEndWith("/releases/123");
			expect(calls[1].init?.method).toBe("PATCH");
			expect(JSON.parse(String(calls[1].init?.body))).toEqual({ body });
		},
	);
});

test("unchanged curated releases do not need another write", async () => {
	const body = releaseNotes("0.3.3");
	await withReleaseApi(
		[Response.json({ id: 123, tag_name: "v0.3.3", body })],
		async (calls) => {
			expect((await ensureRelease("v0.3.3", body)).body).toBe(body);
			expect(calls).toHaveLength(1);
		},
	);
});

test("new releases publish end-user notes as their description", async () => {
	const body = releaseNotes("0.3.3");
	await withReleaseApi(
		[
			new Response(null, { status: 404 }),
			Response.json({ id: 123, tag_name: "v0.3.3", body }),
		],
		async (calls) => {
			await ensureRelease("v0.3.3", body);
			expect(calls[1].init?.method).toBe("POST");
			expect(JSON.parse(String(calls[1].init?.body))).toEqual({
				tag_name: "v0.3.3",
				name: "v0.3.3",
				body,
				draft: false,
				prerelease: false,
			});
		},
	);
});
