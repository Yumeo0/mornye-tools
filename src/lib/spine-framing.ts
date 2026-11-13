import type { SpinePortraitPlacement } from "./spine-types";

// One shared formation coordinate system: do not fit individual export bounds.
// Decorative meshes, umbrellas and wide poses must not change a character's zoom.
const portraitHeight = 1800 / 1.24;
const portraitTop = 500;

export function portraitFrame(
	placement: SpinePortraitPlacement,
	width: number,
	height: number,
) {
	const { x, y, scale } = placement;
	if (
		![x, y, scale, width, height].every(Number.isFinite) ||
		scale <= 0 ||
		width <= 0 ||
		height <= 0
	)
		throw new Error("Portrait has invalid placement or viewport");
	const viewportHeight = portraitHeight / scale;
	// Invert the game's translation and scale in the camera, leaving animation
	// tracks untouched. Both the LGUI formation offsets and Spine use Y-up here.
	return {
		x: -x / scale,
		y: (portraitTop - portraitHeight / 2 - y) / scale,
		width: viewportHeight * (width / height),
		height: viewportHeight,
	};
}
