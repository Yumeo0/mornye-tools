import type { CaptureOrigin, ScanRegion } from "@/hooks/useOverlayLayout";

/**
 * Scan-region outline (settings "show scan region"). The region is relative
 * to the game window; the window's capture origin is added to place the
 * outline on screen.
 */
export function ScanRegionOutline({
	region,
	origin,
	displayScale,
}: {
	region: ScanRegion;
	origin: CaptureOrigin | null;
	displayScale: number;
}) {
	return (
		<div
			style={{
				position: "absolute",
				left: `${((origin?.x ?? 0) + region.x) * displayScale}px`,
				top: `${((origin?.y ?? 0) + region.y) * displayScale}px`,
				width: `${region.width * displayScale}px`,
				height: `${region.height * displayScale}px`,
				border: "3px solid rgba(147, 51, 234, 0.9)",
				backgroundColor: "rgba(147, 51, 234, 0.1)",
				pointerEvents: "none",
				boxShadow: "0 0 20px rgba(147, 51, 234, 0.5)",
				zIndex: 1,
			}}
		/>
	);
}
