/** Formation portrait placement in game UI units (SpineParam). */
export interface SpinePortraitPlacement {
	x: number;
	y: number;
	scale: number;
}

export interface SpinePortraitSource {
	skeleton: string;
	atlas: string;
	placement: SpinePortraitPlacement;
}

export interface SpinePortraitModel extends SpinePortraitSource {
	/** The idle animation at time zero, with the same framing as the player. */
	poster: string;
}
