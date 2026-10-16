// Shared scan-region geometry: the types mirroring the backend's
// `ScanRegions` (src-tauri/src/scan_region.rs) and the one place that maps an
// OCR resolution config entry onto them.

import { invoke } from "@tauri-apps/api/core";
import OCR_CONFIG from "@/configs/ocr.json";

/** A rectangle in game-window pixels. */
export interface ScanRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** All regions the backend's panel scan reads; optional ones may be absent. */
export interface ScanRegions {
	echo_upgrade: ScanRegion;
	tuning_successful?: ScanRegion | null;
	sort_icon?: ScanRegion | null;
	high_rarity_notice?: ScanRegion | null;
	echoes_text?: ScanRegion | null;
	cost_text?: ScanRegion | null;
	echo_panel?: ScanRegion | null;
	main_stats?: ScanRegion | null;
	sub_stats?: ScanRegion | null;
	stat_stars?: ScanRegion | null;
	sub_stat_stars?: ScanRegion | null;
}

/** Panel geometry the overlay's augmentation layer aligns to. */
export type PanelRegions = Pick<
	ScanRegions,
	"echo_panel" | "main_stats" | "sub_stats" | "stat_stars" | "sub_stat_stars"
>;

type ResolutionConfig =
	(typeof OCR_CONFIG)["resolutions"][keyof (typeof OCR_CONFIG)["resolutions"]];

/** The OCR config entry of one resolution, if known. */
export function resolutionConfig(
	resolution: string,
): ResolutionConfig | undefined {
	return OCR_CONFIG.resolutions[
		resolution as keyof typeof OCR_CONFIG.resolutions
	];
}

function toScanRegions(config: ResolutionConfig): ScanRegions {
	return {
		echo_upgrade: config.echoUpgrade,
		tuning_successful: config.tuningSuccessful ?? null,
		sort_icon: config.sortIcon ?? null,
		high_rarity_notice: config.highRarityNotice ?? null,
		echoes_text: config.echoesText ?? null,
		cost_text: config.costText ?? null,
		echo_panel: config.echoPanel ?? null,
		main_stats: config.mainStats ?? null,
		sub_stats: config.subStats ?? null,
		stat_stars: config.statStars ?? null,
		sub_stat_stars: config.subStatStars ?? null,
	};
}

/**
 * Apply one resolution's scan regions to the backend. Returns `false` (and
 * changes nothing) for an unknown resolution.
 */
export async function applyResolutionRegions(
	resolution: string,
): Promise<boolean> {
	const config = resolutionConfig(resolution);
	if (!config?.echoUpgrade) return false;
	// The echo-upgrade region stays set on its own for backward compatibility
	// and the debug outline; the full set drives the panel scan.
	await invoke("set_scan_region", { region: config.echoUpgrade });
	await invoke("set_scan_regions", { regions: toScanRegions(config) });
	return true;
}
