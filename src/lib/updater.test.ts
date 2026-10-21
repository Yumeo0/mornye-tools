// Shared updater state: a release found by the startup check stays available
// after the banner is dismissed, so Settings -> Updates can still install it.

import { describe, expect, test } from "bun:test";

import type { Update } from "@tauri-apps/plugin-updater";
import {
	dismissUpdateBanner,
	downloadPercent,
	readUpdateState,
	setAvailableUpdate,
} from "@/lib/updater";

/** A stand-in for the plugin's update handle (only the fields we read). */
function fakeUpdate(version: string): Update {
	return { version, close: async () => {} } as unknown as Update;
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
});
