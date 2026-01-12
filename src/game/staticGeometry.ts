import { hexCornerOffset } from './geometry';

/**
 * Static lookup table for hex corner offsets.
 * Since all hexes have the same size and orientation, these points are constant relative to the hex center.
 * This avoids calculating `Math.cos` and `Math.sin` 6 times per hex on every render.
 */
export const HEX_CORNERS = Array.from({ length: 6 }, (_, i) => hexCornerOffset(i));
