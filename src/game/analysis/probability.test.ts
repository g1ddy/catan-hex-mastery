import {
  get2d6RollStats,
  get2d6Probability,
  get2d6Combinations,
  get2d6PipWeight,
  getHexExpectedProduction,
  getVertexExpectedProduction,
  getPlayerExpectedProduction,
} from './probability';
import { TerrainType } from '../core/types';
import { createMockGameState, createTestPlayer } from '../testUtils';

describe('probability domain primitives', () => {
  it('verifies exact 2d6 combinations, probabilities, and pip weights', () => {
    const expectedData: Array<[number, number, number, number]> = [
      [2, 1, 1 / 36, 1],
      [3, 2, 2 / 36, 2],
      [4, 3, 3 / 36, 3],
      [5, 4, 4 / 36, 4],
      [6, 5, 5 / 36, 5],
      [7, 6, 6 / 36, 0],
      [8, 5, 5 / 36, 5],
      [9, 4, 4 / 36, 4],
      [10, 3, 3 / 36, 3],
      [11, 2, 2 / 36, 2],
      [12, 1, 1 / 36, 1],
    ];

    for (const [roll, combos, prob, pip] of expectedData) {
      const stats = get2d6RollStats(roll);
      expect(stats.roll).toBe(roll);
      expect(stats.combinations).toBe(combos);
      expect(stats.probability).toBeCloseTo(prob, 8);
      expect(stats.pipWeight).toBe(pip);

      expect(get2d6Combinations(roll)).toBe(combos);
      expect(get2d6Probability(roll)).toBeCloseTo(prob, 8);
      expect(get2d6PipWeight(roll)).toBe(pip);
    }
  });

  it('verifies that total 2d6 probability sums exactly to 1', () => {
    let totalProb = 0;
    for (let roll = 2; roll <= 12; roll++) {
      totalProb += get2d6Probability(roll);
    }
    expect(totalProb).toBeCloseTo(1.0, 10);
  });

  it('verifies hex expected production for resource tiles vs desert/sea', () => {
    const forestHex = {
      id: '0,0,0',
      coords: { q: 0, r: 0, s: 0 },
      terrain: TerrainType.Forest,
      tokenValue: 6,
    };
    expect(getHexExpectedProduction(forestHex)).toBeCloseTo(5 / 36, 8);

    const desertHex = {
      id: '0,0,0',
      coords: { q: 0, r: 0, s: 0 },
      terrain: TerrainType.Desert,
      tokenValue: null,
    };
    expect(getHexExpectedProduction(desertHex)).toBe(0);

    const seaHex = {
      id: '0,0,0',
      coords: { q: 0, r: 0, s: 0 },
      terrain: TerrainType.Sea,
      tokenValue: null,
    };
    expect(getHexExpectedProduction(seaHex)).toBe(0);

    expect(getHexExpectedProduction(null)).toBe(0);
  });

  it('distinguishes settlement (1x) vs city (2x) vertex expected production', () => {
    const G = createMockGameState();
    G.board.hexes['0,0,0'] = {
      id: '0,0,0',
      coords: { q: 0, r: 0, s: 0 },
      terrain: TerrainType.Forest,
      tokenValue: 6, // prob 5/36
    };
    G.board.hexes['1,-1,0'] = {
      id: '1,-1,0',
      coords: { q: 1, r: -1, s: 0 },
      terrain: TerrainType.Fields,
      tokenValue: 8, // prob 5/36
    };
    G.board.hexes['1,0,-1'] = {
      id: '1,0,-1',
      coords: { q: 1, r: 0, s: -1 },
      terrain: TerrainType.Mountains,
      tokenValue: 3, // prob 2/36
    };

    const vertexId = '0,0,0::1,-1,0::1,0,-1';

    // 1x settlement yield = (5 + 5 + 2) / 36 = 12/36 = 1/3
    const settlementYield = getVertexExpectedProduction(G, vertexId, { structureType: 'settlement' });
    expect(settlementYield).toBeCloseTo(12 / 36, 8);

    // 2x city yield = 2 * (12/36) = 24/36 = 2/3
    const cityYield = getVertexExpectedProduction(G, vertexId, { structureType: 'city' });
    expect(cityYield).toBeCloseTo(24 / 36, 8);
  });

  it('calculates player resource-level expected production summaries', () => {
    const G = createMockGameState();
    G.board.hexes['0,0,0'] = {
      id: '0,0,0',
      coords: { q: 0, r: 0, s: 0 },
      terrain: TerrainType.Forest,
      tokenValue: 6, // wood, prob 5/36, pips 5
    };
    G.board.hexes['1,-1,0'] = {
      id: '1,-1,0',
      coords: { q: 1, r: -1, s: 0 },
      terrain: TerrainType.Hills,
      tokenValue: 5, // brick, prob 4/36, pips 4
    };
    G.board.hexes['1,0,-1'] = {
      id: '1,0,-1',
      coords: { q: 1, r: 0, s: -1 },
      terrain: TerrainType.Mountains,
      tokenValue: 8, // ore, prob 5/36, pips 5
    };

    const vertexId = '0,0,0::1,-1,0::1,0,-1';
    G.board.vertices[vertexId] = { owner: '0', type: 'city' }; // 2x multiplier

    const p0 = createTestPlayer('0');
    p0.settlements = [vertexId];
    G.players['0'] = p0;

    const summary = getPlayerExpectedProduction(G, '0');
    expect(summary.byResource.wood).toBeCloseTo(10 / 36, 8);
    expect(summary.byResource.brick).toBeCloseTo(8 / 36, 8);
    expect(summary.byResource.ore).toBeCloseTo(10 / 36, 8);
    expect(summary.byResource.sheep).toBe(0);
    expect(summary.byResource.wheat).toBe(0);

    expect(summary.totalExpectedProduction).toBeCloseTo(28 / 36, 8);
    expect(summary.totalPips).toBe(2 * (5 + 4 + 5)); // 28 pips
  });
});
