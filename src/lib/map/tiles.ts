/** MapDefine flips world Y for LGUI's upward Y axis; canvas points retain world Y.
 * Tiles use LGUI block indices, hence their top edge is -blockY * tileSize.
 * 850 UI units * 100 world units/UI unit = 85,000 per tile.
 */
export function tileBounds(x: number, y: number, tileSize: number) {
	return { left: (x - 1) * tileSize, top: -y * tileSize, size: tileSize };
}
