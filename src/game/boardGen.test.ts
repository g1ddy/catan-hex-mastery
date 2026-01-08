import { generateBoard } from './boardGen';
import { TerrainType } from './types';

describe('boardGen', () => {
  test('generates 19 hexes', () => {
    const hexes = generateBoard();
    expect(hexes.length).toBe(19);
  });

  test('no desert has token', () => {
    const hexes = generateBoard();
    const desert = hexes.find(h => h.terrain === TerrainType.Desert);
    expect(desert).toBeDefined();
    expect(desert?.tokenValue).toBeNull();
  });
});
