import { generateBoard } from './generation/boardGen';
import { TerrainType } from './core/types';
import { getEdgesForHex } from './geometry/hexUtils';

describe('boardGen', () => {
  test('generates 19 hexes and 9 ports', () => {
    const { hexes, ports } = generateBoard();
    expect(Object.keys(hexes).length).toBe(19);
    expect(Object.keys(ports).length).toBe(9);
  });

  test('no desert has token', () => {
    const { hexes } = generateBoard();
    const desert = Object.values(hexes).find(h => h.terrain === TerrainType.Desert);
    expect(desert).toBeDefined();
    expect(desert?.tokenValue).toBeNull();
  });

  test('ports are on boundary edges', () => {
    const { hexes, ports } = generateBoard();
    // Count edge occurrences to identify boundaries
    const allEdges: string[] = [];
    Object.values(hexes).forEach(h => allEdges.push(...getEdgesForHex(h.coords)));

    const counts: Record<string, number> = {};
    allEdges.forEach(e => {
        // eslint-disable-next-line security/detect-object-injection
        counts[e] = (counts[e] || 0) + 1;
    });

    Object.values(ports).forEach(port => {
        expect(counts[port.edgeId]).toBe(1);
    });
  });
});
