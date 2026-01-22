import { getNeighbors, getDistance, parseVertexId, getVerticesForEdge } from './geometry/hexUtils';

describe('hexUtils', () => {
  test('getNeighbors returns 6 neighbors', () => {
    const neighbors = getNeighbors({ q: 0, r: 0, s: 0 });
    expect(neighbors).toHaveLength(6);
  });

  test('getDistance calculates accurately', () => {
    const d = getDistance({ q: 0, r: 0, s: 0 }, { q: 2, r: -2, s: 0 });
    expect(d).toBe(2);
  });

  test('parseVertexId throws on unsafe integers', () => {
      const unsafe = "9007199254740993,-9007199254740993,0::0,0,0::0,0,0";
      expect(() => parseVertexId(unsafe)).toThrow('unsafe integer');
  });

  test('getVerticesForEdge throws on unsafe integers', () => {
      const unsafe = "9007199254740993,-9007199254740993,0::0,0,0";
      expect(() => getVerticesForEdge(unsafe)).toThrow('unsafe integer');
  });
});
