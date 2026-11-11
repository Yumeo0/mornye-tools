import markdown from "../../CHANGELOG.md?raw";
import { changelogEntry } from "./changelogFormat";
import type { ReleaseNotes } from "./releaseNotes";

/** Bundled editorial corrections take precedence over older manifest/cache text. */
export function bundledReleaseNotes(version: string) {
	return changelogEntry(markdown, version);
}

export function preferredReleaseNotes(release: ReleaseNotes): ReleaseNotes {
	const curated = bundledReleaseNotes(release.version);
	return curated
		? { ...release, body: curated.body, date: release.date ?? curated.date }
		: release;
}
