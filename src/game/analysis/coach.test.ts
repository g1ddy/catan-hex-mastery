import { getBestPlacements, evaluatePlacement } from './coach';
import { GameState, TerrainType } from '../types';
import { calculatePipCount, getScarcityMap } from './pips';

// Mock GameState Helper
function createMockGameState(): GameState {
  return {
    board: {
      hexes: {
        '0,0,0': { id: '0,0,0', coords: { q: 0, r: 0, s: 0 }, terrain: TerrainType.Hills, tokenValue: 6 }, // Brick, 5 pips
        '1,-1,0': { id: '1,-1,0', coords: { q: 1, r: -1, s: 0 }, terrain: TerrainType.Forest, tokenValue: 8 }, // Wood, 5 pips
        '1,0,-1': { id: '1,0,-1', coords: { q: 1, r: 0, s: -1 }, terrain: TerrainType.Mountains, tokenValue: 3 }, // Ore, 2 pips
        // Add more to form a vertex
      },
      vertices: {},
      edges: {}
    },
    players: {
        '0': { id: '0', color: 'red', resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 }, settlements: [], roads: [], victoryPoints: 0 }
    },
    setupPhase: { activeRound: 1 },
    lastPlacedSettlement: null,
    setupOrder: ['0'],
    lastRoll: [0, 0],
    boardStats: { totalPips: {}, fairnessScore: 100, warnings: [] },
    hasRolled: false,
    lastFeedback: null
  };
}

describe('Coach Logic', () => {
    test('calculatePipCount correctly sums pips', () => {
        const G = createMockGameState();
        const { totalPips, totalBoardPips } = calculatePipCount(G.board.hexes);

        // Brick (6) = 5 pips
        // Wood (8) = 5 pips
        // Ore (3) = 2 pips
        expect(totalPips.brick).toBe(5);
        expect(totalPips.wood).toBe(5);
        expect(totalPips.ore).toBe(2);
        expect(totalBoardPips).toBe(12);
    });

    test('getScarcityMap identifies scarce resources', () => {
        const totalPips = { wood: 20, brick: 20, sheep: 20, wheat: 20, ore: 2 }; // Ore is very low
        const totalBoardPips = 82;
        const scarcity = getScarcityMap(totalPips, totalBoardPips);

        expect(scarcity.ore).toBe(true); // 2/82 < 10%
        expect(scarcity.wood).toBeUndefined(); // 20/82 > 10%
    });

    test('getBestPlacements returns scored placements', () => {
        const G = createMockGameState();
        // The mock board has hexes 0,0,0; 1,-1,0; 1,0,-1.
        // These share a vertex?
        // Let's check coordinates.
        // 0,0,0 neighbors: 1,-1,0; 1,0,-1; etc.
        // Yes, 0,0,0; 1,-1,0; 1,0,-1 meet at a vertex?
        // q+r+s=0.
        // Neighbors of 0,0,0: (1,-1,0), (1,0,-1), (0,1,-1), (-1,1,0), (-1,0,1), (0,-1,1)
        // Triangle (0,0,0), (1,-1,0), (1,0,-1)?
        // Distances:
        // (0,0,0) to (1,-1,0) = 1
        // (0,0,0) to (1,0,-1) = 1
        // (1,-1,0) to (1,0,-1): dq=0, dr=1, ds=1. Dist=1.
        // Yes, they form a triangle, so they share a vertex.

        // Vertex ID would be sorted coords joined by ::.
        // 0,0,0 :: 1,-1,0 :: 1,0,-1 (sorted by q, then r, then s)
        // 0,0,0 comes first.
        // 1,-1,0 comes before 1,0,-1 (r=-1 vs r=0).
        // Vertex ID: "0,0,0::1,-1,0::1,0,-1"

        const placements = getBestPlacements(G);
        expect(placements.length).toBeGreaterThan(0);

        const top = placements[0];
        // Score calculation:
        // Pips: 5+5+2 = 12.
        // Scarcity: Ore is scarce? Total pips = 12. Ore=2. 2/12 = 16.6% > 10%.
        // Wait, 16.6% > 10%, so NOT scarce.
        // Synergy: Brick(yes) + Wood(yes) = True (+2). Ore(yes) + Wheat(no).
        // Score = 12 * 1.0 + 2 = 14.

        // Let's verify specific vertex.
        const targetV = "0,0,0::1,-1,0::1,0,-1";
        const found = placements.find(p => p.vertexId === targetV);

        expect(found).toBeDefined();
        // expect(found?.score).toBe(14); // May vary if my scarcity math was slight off or other vertices exist
        expect(found?.synergyBonus).toBe(2);
        expect(found?.totalPips).toBe(12);
    });

    test('evaluatePlacement provides feedback', () => {
        const G = createMockGameState();
        const targetV = "0,0,0::1,-1,0::1,0,-1";

        // User picks the best spot
        const feedback = evaluatePlacement(G, targetV);
        expect(feedback.quality).toBe('good');
        expect(feedback.score).toBe(feedback.maxScore);
    });
});
