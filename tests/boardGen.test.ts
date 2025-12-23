import { generateBoard } from '../src/game/boardGen';

describe('boardGen', () => {
  test('generates 19 hexes', () => {
    const hexes = generateBoard();
    expect(hexes.length).toBe(19);
  });

  test('no desert has token', () => {
    const hexes = generateBoard();
    const desert = hexes.find(h => h.terrain === 'Desert');
    if (desert) {
        expect(desert.tokenValue).toBeNull();
    }
  });
});
