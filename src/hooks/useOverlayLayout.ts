// Overlay geometry: the backend's scan regions and the captured game window's
// origin, kept in sync with live edits, plus the scale that converts the
// backend's physical pixels into the overlay window's CSS pixel space.

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { currentMonitor } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import type { PanelRegions, ScanRegion } from "@/lib/scanRegions";

// Overlay consumers import the geometry types from this hook.
export type { PanelRegions, ScanRegion };

/** Top-left corner of the captured game window, in physical screen pixels. */
export interface CaptureOrigin {
	x: number;
	y: number;
}

export function useOverlayLayout(): {
	scanRegion: ScanRegion | null;
	showScanRegion: boolean;
	captureOrigin: CaptureOrigin | null;
	panelRegions: PanelRegions | null;
	displayScale: number;
} {
	const [scanRegion, setScanRegion] = useState<ScanRegion | null>(null);
	const [showScanRegion, setShowScanRegion] = useState(false);
	const [captureOrigin, setCaptureOrigin] = useState<CaptureOrigin | null>(
		null,
	);
	const [panelRegions, setPanelRegions] = useState<PanelRegions | null>(null);
	const [displayScale, setDisplayScale] = useState(1);

	useEffect(() => {
		const unlistenScanRegion = listen<ScanRegion>(
			"scan-region-changed",
			(event) => setScanRegion(event.payload),
		);
		const unlistenScanRegions = listen<PanelRegions | null>(
			"scan-regions-changed",
			(event) => setPanelRegions(event.payload),
		);
		const unlistenCaptureOrigin = listen<CaptureOrigin | null>(
			"capture-origin-changed",
			(event) => setCaptureOrigin(event.payload),
		);
		const unlistenShowRegion = listen<boolean>(
			"show-scan-region-changed",
			(event) => {
				setShowScanRegion(event.payload);
				// Re-read the region; the overlay may have started before any
				// region was set.
				invoke<ScanRegion | null>("get_scan_region")
					.then(setScanRegion)
					.catch(console.error);
			},
		);

		invoke<ScanRegion | null>("get_scan_region")
			.then(setScanRegion)
			.catch(console.error);
		invoke<PanelRegions | null>("get_scan_regions")
			.then(setPanelRegions)
			.catch(console.error);
		invoke<CaptureOrigin | null>("get_capture_origin")
			.then(setCaptureOrigin)
			.catch(console.error);
		invoke<boolean>("get_show_scan_region")
			.then(setShowScanRegion)
			.catch(console.error);

		return () => {
			unlistenScanRegion.then((fn) => fn());
			unlistenScanRegions.then((fn) => fn());
			unlistenCaptureOrigin.then((fn) => fn());
			unlistenShowRegion.then((fn) => fn());
		};
	}, []);

	// Measuring the actual monitor width against the viewport covers both DPI
	// scaling and a fullscreen window that did not cover the whole monitor.
	useEffect(() => {
		const update = () => {
			currentMonitor()
				.then((monitor) => {
					if (monitor && window.innerWidth > 0) {
						setDisplayScale(monitor.size.width / window.innerWidth);
					}
				})
				.catch(console.error);
		};
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

	return {
		scanRegion,
		showScanRegion,
		captureOrigin,
		panelRegions,
		displayScale,
	};
}
