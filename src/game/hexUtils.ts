import { CubeCoordinates } from './types';

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
    const n1 = neighbors[i];
    const n2 = neighbors[(i + 1) % 6];
    vertices.push(getVertexId(coords, n1, n2));
  }
  return vertices;
};

export const getEdgesForHex = (coords: CubeCoordinates): string[] => {
  const neighbors = getNeighbors(coords);
  return neighbors.map(n => getEdgeId(coords, n));
};

// Helper used in Board.tsx
function parseVertexId(id: string) {
    return id.split('::').map(s => {
        const [q, r, sCoords] = s.split(',').map(Number);
        return { q, r, s: sCoords };
    });
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
