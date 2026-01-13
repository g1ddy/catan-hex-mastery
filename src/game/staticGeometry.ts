import { hexCornerOffset } from './geometry';
import { Hex } from './types';
import { getVerticesForHex, getEdgesForHex, getHexesForVertex, getHexesForEdge } from './hexUtils';

/**
 * Static lookup table for hex corner offsets.
 * Since all hexes have the same size and orientation, these points are constant relative to the hex center.
 * This avoids calculating `Math.cos` and `Math.sin` 6 times per hex on every render.
 */
export const HEX_CORNERS = Array.from({ length: 6 }, (_, i) => hexCornerOffset(i));

export interface CachedHexGeometry {
    vertices: { id: string; parts: string[] }[];
    edges: { id: string; parts: string[] }[];
    currentHexIdStr: string;
}

const geometryCache = new Map<string, CachedHexGeometry>();

export const getHexGeometry = (hex: Hex): CachedHexGeometry => {
    const idStr = `${hex.coords.q},${hex.coords.r},${hex.coords.s}`;

    if (geometryCache.has(idStr)) {
        return geometryCache.get(idStr)!;
    }

    const rawVertexIds = getVerticesForHex(hex.coords);
    const rawEdgeIds = getEdgesForHex(hex.coords);

    const verticesWithParts = rawVertexIds.map(id => ({ id, parts: getHexesForVertex(id) }));
    const edgesWithParts = rawEdgeIds.map(id => ({ id, parts: getHexesForEdge(id) }));

    const geometry = {
        vertices: verticesWithParts,
        edges: edgesWithParts,
        currentHexIdStr: idStr
    };

    geometryCache.set(idStr, geometry);
    return geometry;
};
