import { CubeCoordinates } from './types';
import { getVertexNeighborIndices } from './geometry';

const DIFF_TO_DIR: Record<string, number> = {
  "1,-1,0": 0,
  "1,0,-1": 1,
  "0,1,-1": 2,
  "-1,1,0": 3,
  "-1,0,1": 4,
  "0,-1,1": 5
};

export const getNeighbors = (coords: CubeCoordinates): CubeCoordinates[] => {
  const directions = [
    { q: 1, r: -1, s: 0 },
    { q: 1, r: 0, s: -1 },
    { q: 0, r: 1, s: -1 },
    { q: -1, r: 1, s: 0 },
    { q: -1, r: 0, s: 1 },
    { q: 0, r: -1, s: 1 },
  ];
  return directions.map(d => ({
    q: coords.q + d.q,
    r: coords.r + d.r,
    s: coords.s + d.s
  }));
};

export const getDistance = (a: CubeCoordinates, b: CubeCoordinates): number => {
  return Math.max(
    Math.abs(a.q - b.q),
    Math.abs(a.r - b.r),
    Math.abs(a.s - b.s)
  );
};

export const compareCoords = (a: CubeCoordinates, b: CubeCoordinates): boolean => {
  return a.q === b.q && a.r === b.r && a.s === b.s;
};

export const getVertexId = (h1: CubeCoordinates, h2: CubeCoordinates, h3: CubeCoordinates): string => {
  const sorted = [h1, h2, h3].sort((a, b) => {
    if (a.q !== b.q) return a.q - b.q;
    if (a.r !== b.r) return a.r - b.r;
    return a.s - b.s;
  });
  return sorted.map(c => `${c.q},${c.r},${c.s}`).join('::');
};

export const getEdgeId = (h1: CubeCoordinates, h2: CubeCoordinates): string => {
  const sorted = [h1, h2].sort((a, b) => {
     if (a.q !== b.q) return a.q - b.q;
     if (a.r !== b.r) return a.r - b.r;
     return a.s - b.s;
  });
  return sorted.map(c => `${c.q},${c.r},${c.s}`).join('::');
};

export const getVerticesForHex = (coords: CubeCoordinates): string[] => {
  const neighbors = getNeighbors(coords);
  const vertices: string[] = [];
  for (let i = 0; i < 6; i++) {
    const [n1Index, n2Index] = getVertexNeighborIndices(i);
    const n1 = neighbors[n1Index];
    const n2 = neighbors[n2Index];
    vertices.push(getVertexId(coords, n1, n2));
  }
  return vertices;
};

export const getEdgesForHex = (coords: CubeCoordinates): string[] => {
  const neighbors = getNeighbors(coords);
  return neighbors.map(n => getEdgeId(coords, n));
};

// Helper used in Board.tsx
export function parseVertexId(id: string) {
    return id.split('::').map(s => {
        const [q, r, sCoords] = s.split(',').map(Number);
        return { q, r, s: sCoords };
    });
}

export const getVerticesForEdge = (edgeId: string): string[] => {
    // Edge between H1, H2. Vertices are (H1, H2, N1) and (H1, H2, N2) where N1, N2 are common neighbors.
    // Easier: Just find common neighbors of H1 and H2.
    const [h1, h2] = edgeId.split('::').map(s => {
         const [q, r, sCoords] = s.split(',').map(Number);
         return { q, r, s: sCoords };
    });

    // We need to find the two hexes that share this edge.
    // Neighbors of h1 that are also neighbors of h2.
    const n1 = getNeighbors(h1);
    const n2 = getNeighbors(h2);

    // Find intersection
    const common = n1.filter(a => n2.some(b => compareCoords(a, b)));

    // Should be exactly 2 for internal edges, or fewer for boundary?
    // In a full grid, always 2. If boundary, maybe 1?
    // But getVertexId sorts them, so we just construct the IDs.

    return common.map(c => getVertexId(h1, h2, c));
}

export const getEdgesForVertex = (vertexId: string): string[] => {
    // Edges connected to a vertex (H1, H2, H3) are (H1,H2), (H2,H3), (H3,H1).
    const hexes = parseVertexId(vertexId);
    return [
        getEdgeId(hexes[0], hexes[1]),
        getEdgeId(hexes[1], hexes[2]),
        getEdgeId(hexes[2], hexes[0])
    ];
};

export const getHexesForVertex = (vertexId: string): string[] => {
    const hexes = parseVertexId(vertexId);
    return hexes.map(h => `${h.q},${h.r},${h.s}`);
}

/**
 * Returns the IDs of the 3 vertices adjacent to the given vertex.
 * Uses geometric calculation (O(1)) rather than string scanning (O(N)).
 */
export const getVertexNeighbors = (vertexId: string): string[] => {
    const hexes = parseVertexId(vertexId);
    const neighbors: string[] = [];

    // For each pair of hexes (h1, h2) forming an edge radiating from the vertex,
    // find the OTHER common neighbor that is not the 3rd hex of the current vertex.
    const pairs = [
      { a: hexes[0], b: hexes[1], other: hexes[2] },
      { a: hexes[1], b: hexes[2], other: hexes[0] },
      { a: hexes[2], b: hexes[0], other: hexes[1] }
    ];

    for (const { a, b, other } of pairs) {
      const dq = b.q - a.q;
      const dr = b.r - a.r;
      const ds = b.s - a.s;
      const dirKey = `${dq},${dr},${ds}`;
      const dir = DIFF_TO_DIR[dirKey];

      if (dir === undefined) {
        continue;
      }

      // Common neighbors of A and B (where B is at dir relative to A) are at (dir - 1) and (dir + 1).
      // Since we use modulo 6, we handle negative numbers.
      const n1Index = (dir + 5) % 6; // -1
      const n2Index = (dir + 1) % 6; // +1

      const allNeighborsOfA = getNeighbors(a);
      const n1 = allNeighborsOfA[n1Index];
      const n2 = allNeighborsOfA[n2Index];

      // One of n1/n2 is 'other'. The other one is the new neighbor.
      let target: CubeCoordinates | null = null;
      if (compareCoords(n1, other)) {
        target = n2;
      } else if (compareCoords(n2, other)) {
        target = n1;
      }

      if (target) {
        neighbors.push(getVertexId(a, b, target));
      }
    }

    return neighbors;
  };
