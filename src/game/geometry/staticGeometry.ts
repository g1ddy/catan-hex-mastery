import { hexCornerOffset, RAD_TO_DEG } from './math';
import { Hex } from '../core/types';
import { getVerticesForHex, getEdgesForHex, getHexesForVertex, getHexesForEdge } from './hexUtils';

/**
 * Static lookup table for hex corner offsets.
 * Since all hexes have the same size and orientation, these points are constant relative to the hex center.
 * This avoids calculating `Math.cos` and `Math.sin` 6 times per hex on every render.
 */
export const HEX_CORNERS = Array.from({ length: 6 }, (_, i) => hexCornerOffset(i));

/**
 * Static lookup table for hex edge geometry (midpoint and angle).
 * Since all hexes have the same size and orientation, these values are constant relative to the hex center.
 * This avoids calculating `Math.atan2`, `midpoint` etc. 6 times per hex on every render.
 */
export const HEX_EDGE_GEOMETRY = HEX_CORNERS.map((corner, i) => {
    const nextCorner = HEX_CORNERS[(i + 1) % 6];
    return {
        x: (corner.x + nextCorner.x) / 2,
        y: (corner.y + nextCorner.y) / 2,
        angle: Math.atan2(nextCorner.y - corner.y, nextCorner.x - corner.x) * RAD_TO_DEG
    };
});

export interface CachedHexGeometry {
    vertices: { id: string; parts: string[]; x: number; y: number }[];
    edges: { id: string; parts: string[]; x: number; y: number }[];
    currentHexIdStr: string;
}

const geometryCache = new Map<string, CachedHexGeometry>();
const MAX_CACHE_SIZE = 100;

export const getHexGeometry = (hex: Hex): CachedHexGeometry => {
    const idStr = `${hex.coords.q},${hex.coords.r},${hex.coords.s}`;

    const cached = geometryCache.get(idStr);
    if (cached) {
        // LRU: Refresh the key by deleting and re-setting
        geometryCache.delete(idStr);
        geometryCache.set(idStr, cached);
        return cached;
    }

    // Cache Eviction Policy: LRU (remove first inserted/oldest)
    if (geometryCache.size >= MAX_CACHE_SIZE) {
        const firstKey = geometryCache.keys().next().value;
        if (firstKey) {
            geometryCache.delete(firstKey);
        }
    }

    const rawVertexIds = getVerticesForHex(hex.coords);
    const rawEdgeIds = getEdgesForHex(hex.coords);

    const verticesWithParts = rawVertexIds.map((id, i) => ({
        id,
        parts: getHexesForVertex(id),
        x: HEX_CORNERS[i].x,
        y: HEX_CORNERS[i].y
    }));

    const edgesWithParts = rawEdgeIds.map((id, i) => ({
        id,
        parts: getHexesForEdge(id),
        x: HEX_CORNERS[i].x,
        y: HEX_CORNERS[i].y
    }));

    const geometry: CachedHexGeometry = {
        vertices: verticesWithParts,
        edges: edgesWithParts,
        currentHexIdStr: idStr
    };

    geometryCache.set(idStr, geometry);
    return geometry;
};
