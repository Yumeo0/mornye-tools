// Shared updater state: a release found by the startup check stays available
// after the banner is dismissed, so Settings -> Updates can still install it.

import { describe, expect, spyOn, test } from "bun:test";

import type { Update } from "@tauri-apps/plugin-updater";
import { loadReleaseNotes } from "@/lib/releaseNotes";
import { updateChangelog } from "@/lib/updateChangelog";
import {
	dismissUpdateBanner,
	downloadPercent,
	installAvailableUpdate,
	readUpdateState,
	setAvailableUpdate,
} from "@/lib/updater";

/** A stand-in for the plugin's update handle (only the fields we read). */
function fakeUpdate(version: string): Update {
	return {
		version,
		currentVersion: "0.3.6",
		close: async () => {},
	} as unknown as Update;
}

describe("downloadPercent", () => {
	test("rounds the downloaded share of a known size", () => {
		expect(downloadPercent({ downloaded: 512, total: 1024 })).toBe(50);
		expect(downloadPercent({ downloaded: 1, total: 3 })).toBe(33);
	});

	test("is unknown while the total size is unknown", () => {
		expect(downloadPercent({ downloaded: 512, total: null })).toBeNull();
		expect(downloadPercent({ downloaded: 0, total: 0 })).toBeNull();
	});

	test("never exceeds 100", () => {
		expect(downloadPercent({ downloaded: 2048, total: 1024 })).toBe(100);
	});
});

describe("available update", () => {
	test("survives dismissing the banner", () => {
		setAvailableUpdate(fakeUpdate("9.9.9"));
		dismissUpdateBanner();

		expect(readUpdateState().dismissed).toBe(true);
		expect(readUpdateState().update?.version).toBe("9.9.9");

		// A new check shows the banner again.
		setAvailableUpdate(fakeUpdate("9.9.10"));
		expect(readUpdateState().dismissed).toBe(false);
	});

	test("clears when a check finds nothing newer", () => {
		setAvailableUpdate(null);
		expect(readUpdateState().update).toBeNull();
	});

	test("saves changelog notes and the old version before the installer can exit the app", async () => {
		const notes = {
			version: "9.9.11",
			body: "## Changes\n- A new feature",
			date: "2026-11-11T12:00:00Z",
		};
		const failure = new Error("Fixture stops before installation");
		let downloads = 0;
		const recorded = spyOn(updateChangelog, "acknowledge").mockResolvedValue();
		const update = {
			...fakeUpdate(notes.version),
			...notes,
			downloadAndInstall: async () => {
				downloads++;
				// No changelog was opened first, and no network request is needed.
				expect(await loadReleaseNotes(notes.version)).toEqual(notes);
				expect(recorded).toHaveBeenCalledWith(update.currentVersion);
				throw failure;
			},
		} as unknown as Update;
		const log = spyOn(console, "error").mockImplementation(() => {});
		setAvailableUpdate(update);
		try {
			await expect(installAvailableUpdate()).rejects.toThrow(failure.message);
			expect(downloads).toBe(1);
			expect(readUpdateState().installing).toBe(false);
			expect(readUpdateState().update).toBe(update);
		} finally {
			setAvailableUpdate(null);
			recorded.mockRestore();
			log.mockRestore();
		}
	});

	test("a version-tracking write failure does not prevent installation", async () => {
		const recorded = spyOn(updateChangelog, "acknowledge").mockRejectedValue(
			new Error("Disk unavailable"),
		);
		const warn = spyOn(console, "warn").mockImplementation(() => {});
		const log = spyOn(console, "error").mockImplementation(() => {});
		let downloads = 0;
		setAvailableUpdate({
			...fakeUpdate("9.9.12"),
			downloadAndInstall: async () => {
				downloads++;
				throw new Error("Fixture stops before installation");
			},
		} as unknown as Update);
		try {
			await expect(installAvailableUpdate()).rejects.toThrow(
				"Fixture stops before installation",
			);
			expect(downloads).toBe(1);
			expect(warn).toHaveBeenCalled();
		} finally {
			setAvailableUpdate(null);
			recorded.mockRestore();
			warn.mockRestore();
			log.mockRestore();
		}
	});
});
