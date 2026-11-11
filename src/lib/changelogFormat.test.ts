import { describe, expect, test } from "bun:test";
import { bundledReleaseNotes, preferredReleaseNotes } from "./changelog";
import {
	changelogEntries,
	changelogEntry,
	prepareChangelogRelease,
} from "./changelogFormat";

const draft = `# Changelog

## [Unreleased]

### Added

- Read release notes before installing.

## [0.3.3] - 2026-11-10

Plan team rotations.

### Improved

- Find Echo builds for a rotation.
`;

describe("curated changelog", () => {
	test("selects an exact version without including the draft or adjacent versions", () => {
		expect(changelogEntry(draft, "v0.3.3")).toEqual({
			version: "0.3.3",
			date: "2026-11-10",
			body: "Plan team rotations.\n\n### Improved\n\n- Find Echo builds for a rotation.",
		});
		expect(changelogEntry(draft, "0.3.30")).toBeUndefined();
		expect(changelogEntry(draft, "Unreleased")?.body).not.toContain(
			"Plan team",
		);
		expect(changelogEntries(draft.replaceAll("\n", "\r\n"))).toEqual(
			changelogEntries(draft),
		);
	});

	test("dates the draft and leaves an empty Unreleased section for the next release", () => {
		const released = prepareChangelogRelease(draft, "0.3.4", "2026-11-11");
		expect(changelogEntry(released, "0.3.4")).toEqual({
			version: "0.3.4",
			date: "2026-11-11",
			body: "### Added\n\n- Read release notes before installing.",
		});
		expect(changelogEntry(released, "Unreleased")?.body).toBe("");
		expect(changelogEntry(released, "0.3.3")).toEqual(
			changelogEntry(draft, "0.3.3"),
		);
		expect(released.startsWith("# Changelog\n")).toBe(true);
	});

	test("requires notes and rejects duplicate versions before preparing a release", () => {
		for (const empty of ["# Changelog", "## [Unreleased]\n\n"]) {
			expect(() =>
				prepareChangelogRelease(empty, "0.3.4", "2026-11-11"),
			).toThrow("Write user-facing release notes");
		}
		expect(() => prepareChangelogRelease(draft, "0.3.3", "2026-11-11")).toThrow(
			"already contains version",
		);
	});

	test("bundles end-user notes for v0.3.3 without leaking Unreleased changes", () => {
		const notes = bundledReleaseNotes("0.3.3");
		expect(notes?.body).toContain("**Rotation Builder.**");
		expect(notes?.body).toContain("Energy Regen");
		expect(notes?.body).not.toMatch(/chore:|feat:|Bulk upgrades/);
		expect(bundledReleaseNotes("9.9.9")).toBeUndefined();
	});

	test("corrects old available-update text while keeping its release timestamp", () => {
		const release = {
			version: "0.3.3",
			body: "Release v0.3.3\n\n## Changes\n- chore: release v0.3.3",
			date: "2026-11-10T23:58:49Z",
		};
		expect(preferredReleaseNotes(release)).toEqual({
			...release,
			body: bundledReleaseNotes("0.3.3")?.body,
		});
		const future = { ...release, version: "9.9.9" };
		expect(preferredReleaseNotes(future)).toBe(future);
	});
});
