import { getNeighbors, getDistance } from '../src/game/hexUtils';

describe('hexUtils', () => {
  test('getNeighbors returns 6 neighbors', () => {
    const n = getNeighbors({q:0, r:0, s:0});
    expect(n.length).toBe(6);
    // Check one neighbor
    expect(n).toContainEqual({q:1, r:-1, s:0});
  });

  test('getDistance calculates accurately', () => {
    const d = getDistance({q:0, r:0, s:0}, {q:2, r:-2, s:0});
    expect(d).toBe(2);
  });
});
