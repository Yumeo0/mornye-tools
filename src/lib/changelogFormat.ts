export interface ChangelogEntry {
	version: string;
	date?: string;
	body: string;
}

/** Only level-two version headings delimit entries; feature headings use ###. */
export function changelogEntries(markdown: string): ChangelogEntry[] {
	const text = markdown.replaceAll("\r\n", "\n");
	const headings = [
		...text.matchAll(/^## \[([^\]\n]+)\](?: - (\d{4}-\d{2}-\d{2}))?\s*$/gm),
	];
	return headings.map((heading, index) => ({
		version: heading[1],
		date: heading[2],
		body: text
			.slice(heading.index + heading[0].length, headings[index + 1]?.index)
			.trim(),
	}));
}

export function changelogEntry(
	markdown: string,
	version: string,
): ChangelogEntry | undefined {
	return changelogEntries(markdown).find(
		(entry) => entry.version === version.replace(/^v/, ""),
	);
}

/** Freeze the reviewed draft with the release, leaving a fresh Unreleased section. */
export function prepareChangelogRelease(
	markdown: string,
	version: string,
	date: string,
): string {
	if (changelogEntry(markdown, version)) {
		throw new Error(`CHANGELOG.md already contains version ${version}.`);
	}
	if (!changelogEntry(markdown, "Unreleased")?.body.trim()) {
		throw new Error(
			"Write user-facing release notes under ## [Unreleased] in CHANGELOG.md first.",
		);
	}
	return markdown
		.replaceAll("\r\n", "\n")
		.replace(
			/^## \[Unreleased\][ \t]*$/m,
			`## [Unreleased]\n\n## [${version}] - ${date}`,
		);
}
