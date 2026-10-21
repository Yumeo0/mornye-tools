// Self-updating bridge: checks the release manifest for a build newer than this
// one, then downloads, installs and relaunches into it.
//
// The discovered release lives in a module-level store so the settings card,
// the startup banner and the sidebar dot all read one state; the Tauri updater
// is a desktop-only plugin, so everything degrades to "unsupported" in the
// plain browser dev server.

import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useSyncExternalStore } from "react";

/**
 * Whether the in-app updater can run here. It is a desktop-only plugin: in the
 * plain browser dev server (and the overlay webview) there is nothing to
 * update, so the UI says so instead of offering a dead button.
 */
export function updaterSupported(): boolean {
	return isTauri();
}

/** This build's version, as stamped into the bundle by the release workflow. */
export async function currentVersion(): Promise<string | null> {
	if (!updaterSupported()) return null;
	try {
		return await getVersion();
	} catch {
		return null;
	}
}

/** Checks the configured endpoint for a release newer than this build. */
export async function checkForUpdate(): Promise<Update | null> {
	if (!updaterSupported()) return null;
	return check({ timeout: 30_000 });
}

export interface DownloadProgress {
	downloaded: number;
	total: number | null;
}

/** Download completion percentage, or null while the total size is unknown. */
export function downloadPercent({
	downloaded,
	total,
}: DownloadProgress): number | null {
	if (!total) return null;
	return Math.min(100, Math.round((downloaded / total) * 100));
}

/**
 * Downloads and installs an update, reporting byte progress, then relaunches
 * the app into the new build. On Windows the installer may restart the app on
 * its own, in which case the relaunch below never runs.
 */
async function downloadAndInstall(
	update: Update,
	onProgress: (progress: DownloadProgress) => void,
): Promise<void> {
	let downloaded = 0;
	let total: number | null = null;
	await update.downloadAndInstall((event) => {
		if (event.event === "Started") {
			total = event.data.contentLength ?? null;
		} else if (event.event === "Progress") {
			downloaded += event.data.chunkLength;
		}
		onProgress({ downloaded, total });
	});
	await relaunch();
}

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

export interface UpdateState {
	/** The release the last check found, if any. */
	update: Update | null;
	/** The startup banner was dismissed for this session. */
	dismissed: boolean;
	/** A download/install is running right now. */
	installing: boolean;
	progress: DownloadProgress;
}

const IDLE: UpdateState = {
	update: null,
	dismissed: false,
	installing: false,
	progress: { downloaded: 0, total: null },
};

let state: UpdateState = IDLE;
const listeners = new Set<() => void>();

function setState(patch: Partial<UpdateState>): void {
	state = { ...state, ...patch };
	for (const listener of [...listeners]) listener();
}

/** Current update state outside React. */
export function readUpdateState(): UpdateState {
	return state;
}

export function subscribeUpdateState(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Shared update state for React components. */
export function useUpdateState(): UpdateState {
	return useSyncExternalStore(
		subscribeUpdateState,
		readUpdateState,
		readUpdateState,
	);
}

/**
 * Records the release a check found; `null` means this build is the latest.
 * A release replaced by a newer check is closed so its handle does not linger.
 */
export function setAvailableUpdate(update: Update | null): void {
	const previous = state.update;
	if (previous && previous !== update) {
		void previous.close().catch(() => undefined);
	}
	setState({ update, dismissed: false });
}

/** Hides the startup banner; the settings card keeps offering the release. */
export function dismissUpdateBanner(): void {
	setState({ dismissed: true });
}

/**
 * Silent startup check for release builds: a newer release lights the Settings
 * tab dot and the update banner. Failures (offline, no release published yet)
 * stay silent - the settings card reports them when asked.
 */
export async function checkForUpdateOnStartup(): Promise<void> {
	if (!import.meta.env.PROD || !updaterSupported()) return;
	try {
		const update = await checkForUpdate();
		if (update) setAvailableUpdate(update);
	} catch {
		// Startup checks are best-effort.
	}
}

/**
 * Downloads and installs the discovered release and relaunches into it. Every
 * subscriber follows the same download, so the banner and the settings card
 * show one progress. Throws on failure, leaving the release for a retry.
 */
export async function installAvailableUpdate(): Promise<void> {
	const { update, installing } = state;
	if (!update || installing) return;
	setState({ installing: true, progress: { downloaded: 0, total: null } });
	try {
		await downloadAndInstall(update, (progress) => setState({ progress }));
	} catch (error) {
		console.error("[updater] install failed:", error);
		setState({ installing: false });
		throw error;
	}
}
