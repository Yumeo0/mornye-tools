import type { CSSProperties } from "react";
import { SubStatRollBar } from "@/components/echo/SubStatRollBar";
import type { CaptureOrigin, PanelRegions } from "@/hooks/useOverlayLayout";
import { parseStatValue } from "@/lib/rating";
import { normalizeStatName } from "@/lib/stats";

/** Tint of the wanted-star overlay (the game's star asset, masked). */
const WANTED_STAR_COLOR = "#f7eba6";
/** Soft glow around the wanted-star, drawn by the wrapper's drop-shadow. */
const WANTED_STAR_GLOW = "rgba(247, 235, 166, 0.8)";
/** Wanted-stars render a bit larger than the game's own stars. */
const WANTED_STAR_SCALE = 1.25;

/**
 * Wanted-stat augmentation drawn over the game's own stat rows: a tinted star
 * in the gutter left of each wanted row and a roll bar under each substat.
 * Name, level and values are the game's to render.
 */
export function StatAugmentation({
	mainStats,
	subStats,
	regions,
	origin,
	displayScale,
	preferredMainStats,
	preferredSubStats,
}: {
	mainStats: string[];
	subStats: string[];
	regions: PanelRegions | null;
	origin: CaptureOrigin | null;
	displayScale: number;
	preferredMainStats: ReadonlySet<string>;
	preferredSubStats: ReadonlySet<string>;
}) {
	const mainRegion = regions?.main_stats ?? null;
	const subRegion = regions?.sub_stats ?? null;
	if (!mainRegion || !subRegion) return null;

	const starsRegion = regions?.stat_stars ?? null;
	const subStarsRegion = regions?.sub_stat_stars ?? null;
	const originX = origin?.x ?? 0;
	const originY = origin?.y ?? 0;
	// The game draws two main-stat rows and five substat row slots from the
	// top of each region, so per-row geometry follows from the region height.
	const mainRowHeight = mainRegion.height / 2;
	const subRowHeight = subRegion.height / 5;
	const starSize = Math.min(starsRegion?.width ?? 26, 26);
	const starX = starsRegion ? starsRegion.x : mainRegion.x - 40;
	// The substat-star region encapsulates the game's five star icons exactly,
	// so the stars tile it: container width per star, an even pitch with the
	// first star flush against the top and the last against the bottom.
	const subStarSize = subStarsRegion?.width ?? 0;
	const subStarPitch = subStarsRegion
		? (subStarsRegion.height - subStarsRegion.width) / 4
		: subRowHeight;

	// Positioned by center so the enlarged star stays centered on the game's
	// own. The glow sits on this wrapper: masking happens after filtering, so
	// a drop-shadow on the masked element itself would be clipped away by the
	// star mask and never show.
	const starStyle = (cx: number, cy: number, size: number): CSSProperties => ({
		position: "absolute",
		left: (originX + cx - size / 2) * displayScale,
		top: (originY + cy - size / 2) * displayScale,
		width: size * displayScale,
		height: size * displayScale,
		filter: `drop-shadow(0 0 ${2 * displayScale}px ${WANTED_STAR_GLOW}) drop-shadow(0 0 ${6 * displayScale}px ${WANTED_STAR_GLOW})`,
	});
	const starMaskStyle: CSSProperties = {
		position: "absolute",
		inset: 0,
		backgroundColor: WANTED_STAR_COLOR,
		maskImage: "url(/star.png)",
		maskSize: "100% 100%",
		maskRepeat: "no-repeat",
		WebkitMaskImage: "url(/star.png)",
		WebkitMaskSize: "100% 100%",
		WebkitMaskRepeat: "no-repeat",
	};

	return (
		<div style={{ pointerEvents: "none" }}>
			{mainStats.map((stat, index) => {
				const parsed = parseStatValue(stat);
				const statName = parsed ? normalizeStatName(parsed.name) : "";
				if (!preferredMainStats.has(statName)) return null;
				return (
					<div
						key={`main-star-${stat}`}
						style={starStyle(
							starX + starSize / 2,
							mainRegion.y + index * mainRowHeight + mainRowHeight / 2,
							starSize * WANTED_STAR_SCALE,
						)}
					>
						<div style={starMaskStyle} />
					</div>
				);
			})}
			{subStats.map((stat, index) => {
				const parsed = parseStatValue(stat);
				if (!parsed) return null;
				const statName = normalizeStatName(parsed.name);
				const wanted = preferredSubStats.has(statName);
				const rowTop = subRegion.y + index * subRowHeight;
				return (
					<div key={`sub-${stat}`}>
						{wanted && subStarsRegion && (
							<div
								style={starStyle(
									subStarsRegion.x + subStarsRegion.width / 2,
									subStarsRegion.y +
										index * subStarPitch +
										subStarsRegion.width / 2,
									subStarSize * WANTED_STAR_SCALE,
								)}
							>
								<div style={starMaskStyle} />
							</div>
						)}
						<div
							style={{
								position: "absolute",
								left: (originX + subRegion.x) * displayScale,
								top: (originY + rowTop + subRowHeight - 8) * displayScale,
								width: subRegion.width * displayScale,
								height: 5 * displayScale,
							}}
						>
							<SubStatRollBar
								statName={parsed.name}
								value={parsed.value}
								className="h-full"
								dimmed={!wanted}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
}
