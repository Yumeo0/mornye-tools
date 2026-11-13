import { isTauri } from "@tauri-apps/api/core";
import { readSetting, writeSetting } from "./settings";

const seenVersionKey = "changelog:lastSeenVersion";

interface UpdateChangelogDependencies {
	read: (key: string) => Promise<unknown>;
	write: (key: string, value: string) => Promise<void>;
}

/** Track the installed version separately from releases available to download. */
export function createUpdateChangelog(deps: UpdateChangelogDependencies) {
	async function acknowledge(version: string): Promise<void> {
		await deps.write(seenVersionKey, version.replace(/^v/, ""));
	}

	async function pending(installedVersion: string): Promise<string | null> {
		const version = installedVersion.replace(/^v/, "");
		const seen = await deps.read(seenVersionKey);
		if (typeof seen === "string" && seen.trim()) {
			return seen.replace(/^v/, "") === version ? null : version;
		}

		// Older builds already saved the target's notes before installing. This
		// also recognizes the update that first introduces this automatic dialog.
		const cached = await deps.read(`releaseNotes:${version}`);
		if (cached && typeof cached === "object") {
			const notes = cached as { version?: unknown; body?: unknown };
			if (
				typeof notes.version === "string" &&
				notes.version.replace(/^v/, "") === version &&
				typeof notes.body === "string" &&
				notes.body.trim()
			) {
				return version;
			}
		}

		// A fresh installation establishes its baseline without a welcome modal.
		await acknowledge(version);
		return null;
	}

	return { pending, acknowledge };
}

export const updateChangelog = createUpdateChangelog({
	read: (key) => (isTauri() ? readSetting(key) : Promise.resolve(undefined)),
	write: (key, value) =>
		isTauri() ? writeSetting(key, value) : Promise.resolve(),
});
