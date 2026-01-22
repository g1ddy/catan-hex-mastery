export const HEX_SIZE = 8;

// Pointy Top Angles: Top, Top-Right, Bottom-Right, Bottom, Bottom-Left, Top-Left
// 270 (-90), 330 (-30), 30, 90, 150, 210
export const POINTY_TOP_ANGLES = [270, 330, 30, 90, 150, 210];

export const hexCornerOffset = (index: number, size: number = HEX_SIZE) => {
    const angleDeg = POINTY_TOP_ANGLES[index % 6];
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
        x: size * Math.cos(angleRad),
        y: size * Math.sin(angleRad)
    };
};

/**
 * Returns the indices of the two neighbors that share the vertex at the given index.
 * Based on the standard neighbor order from `hexUtils.getNeighbors`:
 * 0: Top-Right
 * 1: Right
 * 2: Bottom-Right
 * 3: Bottom-Left
 * 4: Left
 * 5: Top-Left
 *
 * Vertex 0 (Top, 270 deg) is between Top-Left (5) and Top-Right (0).
 * Vertex 1 (Top-Right, 330 deg) is between Top-Right (0) and Right (1).
 */
export const getVertexNeighborIndices = (vertexIndex: number): [number, number] => {
    const i = vertexIndex % 6;
    // Vertex 0 -> [5, 0]
    // Vertex 1 -> [0, 1]
    // Vertex i -> [(i + 5) % 6, i]
    return [(i + 5) % 6, i];
};
