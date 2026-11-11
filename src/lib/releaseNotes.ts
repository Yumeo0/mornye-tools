import { isTauri } from "@tauri-apps/api/core";
import { bundledReleaseNotes } from "./changelog";
import { readSetting, writeSetting } from "./settings";

export interface ReleaseNotes {
	version: string;
	body?: string;
	date?: string;
}

const REPOSITORY = "Yumeo0/mornye-tools";

/** Always link to the requested version, even after a newer release appears. */
export function releaseNotesUrl(version: string): string {
	return `https://github.com/${REPOSITORY}/releases/tag/v${encodeURIComponent(version.replace(/^v/, ""))}`;
}

interface ReleaseNotesDependencies {
	bundled?: (version: string) => ReleaseNotes | undefined;
	read: (key: string) => Promise<unknown>;
	write: (key: string, notes: ReleaseNotes) => Promise<void>;
	fetch: (url: string, init: RequestInit) => Promise<Response>;
}

function parseCachedNotes(
	value: unknown,
	version: string,
): ReleaseNotes | null {
	if (!value || typeof value !== "object") return null;
	const saved = value as Partial<ReleaseNotes>;
	if (
		typeof saved.version !== "string" ||
		saved.version.replace(/^v/, "") !== version ||
		typeof saved.body !== "string" ||
		!saved.body.trim()
	)
		return null;
	return {
		version,
		body: saved.body,
		date:
			typeof saved.date === "string" && Number.isFinite(Date.parse(saved.date))
				? saved.date
				: undefined,
	};
}

/** Cache notes independently of the updater handle so they survive a restart. */
export function createReleaseNotesStore(deps: ReleaseNotesDependencies) {
	const cache = new Map<string, ReleaseNotes>();
	const key = (version: string) => `releaseNotes:${version}`;

	async function save(release: ReleaseNotes): Promise<void> {
		const version = release.version.replace(/^v/, "");
		// A manifest without notes must not hide published or previously cached notes.
		const notes = parseCachedNotes(release, version);
		if (!notes) return;
		cache.set(version, notes);
		await deps.write(key(version), notes);
	}

	async function load(requestedVersion: string): Promise<ReleaseNotes> {
		const version = requestedVersion.replace(/^v/, "");
		const bundled = deps.bundled?.(version);
		if (bundled) return bundled;
		const cached = cache.get(version);
		if (cached) return cached;
		const saved = await deps.read(key(version)).catch(() => undefined);
		const persisted = parseCachedNotes(saved, version);
		if (persisted) {
			cache.set(version, persisted);
			return persisted;
		}

		const response = await deps.fetch(
			`https://api.github.com/repos/${REPOSITORY}/releases/tags/v${encodeURIComponent(version)}`,
			{
				headers: { Accept: "application/vnd.github+json" },
				signal: AbortSignal.timeout(15_000),
			},
		);
		if (!response.ok)
			throw new Error(`Release notes unavailable (${response.status})`);
		const raw = (await response.json()) as {
			tag_name?: unknown;
			body?: unknown;
			published_at?: unknown;
		} | null;
		if (raw?.tag_name !== `v${version}`) {
			throw new Error("Release notes do not match the requested version");
		}
		const notes: ReleaseNotes = {
			version,
			body: typeof raw.body === "string" ? raw.body : "",
			date:
				typeof raw.published_at === "string" &&
				Number.isFinite(Date.parse(raw.published_at))
					? raw.published_at
					: undefined,
		};
		// A disk error must not prevent reading successfully fetched notes.
		await save(notes).catch(() => undefined);
		return notes;
	}

	return { load, save };
}

const store = createReleaseNotesStore({
	bundled: bundledReleaseNotes,
	read: (key) => (isTauri() ? readSetting(key) : Promise.resolve(undefined)),
	write: (key, notes) =>
		isTauri() ? writeSetting(key, notes) : Promise.resolve(),
	fetch: (url, init) => fetch(url, init),
});

export const loadReleaseNotes = store.load;
export const cacheReleaseNotes = store.save;
