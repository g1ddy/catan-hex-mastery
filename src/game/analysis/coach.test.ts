import { Ctx } from 'boardgame.io';
import { getBestSettlementSpots, Coach } from './coach';
import { GameState, TerrainType, Player, BoardState, Hex, BoardStats } from '../types';
import { STRATEGIC_ADVICE } from './adviceConstants';

// Mock getVerticesForHex so we don't depend on actual geometry/imports
// but ensure it returns the vertex ID we expect for our tests.
jest.mock('../hexUtils', () => ({
    getVerticesForHex: (coords: { q: number, r: number, s: number }) => {
        const id = `${coords.q},${coords.r},${coords.s}`;
        const targetHexes = ['0,0,0', '1,-1,0', '1,0,-1'];
        if (targetHexes.includes(id)) {
            return ['0,0,0::1,-1,0::1,0,-1', `dummy_${id}_1`, `dummy_${id}_2`];
        }
        return [`v_${id}_1`, `v_${id}_2`];
    },
    // Mock getVertexNeighbors to just return the mocked neighbor from the test case if it matches
    getVertexNeighbors: (vertexId: string) => {
        if (vertexId === '0,0,0::1,-1,0::1,0,-1') { // TARGET_VERTEX_ID
            return ['0,0,0::1,-1,0::some_other_hex'];
        }
        return [];
    },
    // Mock getHexesForVertex
    getHexesForVertex: (vertexId: string) => vertexId.split('::')
}));

describe('Coach Analysis', () => {
    const mockCtx: Ctx = {
        numPlayers: 1,
        turn: 1,
        currentPlayer: '0',
        playOrder: ['0'],
        playOrderPos: 0,
        activePlayers: null,
        phase: ''
    };

    const HEX_A_ID = '0,0,0';
    const HEX_B_ID = '1,-1,0';
    const HEX_C_ID = '1,0,-1';
    const TARGET_VERTEX_ID = `${HEX_A_ID}::${HEX_B_ID}::${HEX_C_ID}`;

    const createMockState = (
        hexConfig: { id: string, terrain: TerrainType, value: number }[],
        settlementCount: number = 0,
        firstSettlementResources: string[] = [],
        boardStatsOverride?: Partial<BoardStats>
    ): GameState => {
        const hexes: Record<string, Hex> = {};
        hexConfig.forEach(h => {
            const [q, r, s] = h.id.split(',').map(Number);
            hexes[h.id] = {
                id: h.id,
                coords: { q, r, s },
                terrain: h.terrain,
                tokenValue: h.value
            } as Hex;
        });

        // Default stats: ample pips for everything so no scarcity
        const boardStats = boardStatsOverride || {
            totalPips: {
                wood: 100, brick: 100, sheep: 100, wheat: 100, ore: 100
            }
        };

        const player: Player = {
            id: '0',
            color: 'red',
            resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            settlements: [],
            roads: [],
            victoryPoints: 0
        };

        if (settlementCount > 0) {
            // Create a dummy settlement far away
            const s1Id = '10,10,-20::11,9,-20::10,9,-19';
            player.settlements.push(s1Id);

            const s1HexIds = s1Id.split('::');
            const terrainMap: Record<string, TerrainType> = {
                'wood': TerrainType.Forest,
                'brick': TerrainType.Hills,
                'sheep': TerrainType.Pasture,
                'wheat': TerrainType.Fields,
                'ore': TerrainType.Mountains
            };

            s1HexIds.forEach((hid, idx) => {
                const res = firstSettlementResources[idx];
                if (res && terrainMap[res]) {
                   hexes[hid] = {
                       id: hid,
                       coords: { q: 10+idx, r: 10, s: -20-idx },
                       terrain: terrainMap[res],
                       tokenValue: 2 // 1 pip
                   } as Hex;
                } else {
                   hexes[hid] = {
                       id: hid,
                       coords: { q: 10+idx, r: 10, s: -20-idx },
                       terrain: TerrainType.Desert,
                       tokenValue: 0
                   } as Hex;
                }
            });
        }

        return {
            board: {
                hexes,
                vertices: {},
                edges: {}
            } as BoardState,
            players: { '0': player },
            boardStats
        } as unknown as GameState;
    };

    // --- PIP TESTS ---
    describe('Pip Calculation', () => {
        test('Should correctly sum pips (6=5, 5=4, 9=4)', () => {
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 }, // 5 pips
                { id: HEX_B_ID, terrain: TerrainType.Hills, value: 5 },  // 4 pips
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 } // 4 pips
            ];
            // Total = 13. Unique=3 => Diversity=1.2x. Synergy(Wood+Brick)=+2.
            // Expected: (13 * 1.2) + 2 = 15.6 + 2 = 17.6
            const G = createMockState(hexes);
            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);
            expect(target?.score).toBeCloseTo(17.6);
            expect(target?.details.pips).toBe(13);
        });

        test('Should handle low pips (2=1, 3=2, 12=1)', () => {
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Forest, value: 2 },  // 1 pip
                { id: HEX_B_ID, terrain: TerrainType.Hills, value: 3 },   // 2 pips
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 12 } // 1 pip
            ];
            // Total = 4. Diversity=1.2. Synergy=+2.
            // Expected: (4 * 1.2) + 2 = 4.8 + 2 = 6.8
            const G = createMockState(hexes);
            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);
            expect(target?.score).toBeCloseTo(6.8);
            expect(target?.details.pips).toBe(4);
        });
    });

    // --- SCARCITY TESTS ---
    describe('Scarcity Multiplier', () => {
        test('Should apply 1.2x multiplier when resource is scarce (<10%)', () => {
            // Setup: Wood is scarce. Total pips 100, Wood 5.
            const stats = {
                totalPips: { wood: 5, brick: 30, sheep: 30, wheat: 30, ore: 5 } // Wood & Ore scarce
            };
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
                { id: HEX_B_ID, terrain: TerrainType.Hills, value: 5 },
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
            ];
            const G = createMockState(hexes, 0, [], stats);
            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);

            expect(target?.score).toBeCloseTo(20.7);
            expect(target?.details.scarcityBonus).toBe(true);
            expect(target?.details.scarceResources).toContain('wood');
        });

        test('Should NOT apply scarcity multiplier if resource is abundant', () => {
             const stats = {
                totalPips: { wood: 50, brick: 10, sheep: 10, wheat: 10, ore: 20 }
            };
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
                { id: HEX_B_ID, terrain: TerrainType.Hills, value: 5 },
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
            ];
            const G = createMockState(hexes, 0, [], stats);
            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);

            expect(target?.score).toBeCloseTo(17.6);
            expect(target?.details.scarcityBonus).toBe(false);
        });
    });

    // --- DIVERSITY TESTS ---
    describe('Diversity Multiplier', () => {
        test('Should apply +20% for 3 unique resources', () => {
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
                { id: HEX_B_ID, terrain: TerrainType.Hills, value: 5 },
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
            ];
            const G = createMockState(hexes);
            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);

            expect(target?.details.diversityBonus).toBe(true);
            expect(target?.score).toBeCloseTo(17.6);
        });

        test('Should NOT apply for duplicate resources', () => {
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
                { id: HEX_B_ID, terrain: TerrainType.Forest, value: 5 }, // 2nd Forest
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
            ];
            const G = createMockState(hexes);
            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);

            expect(target?.details.diversityBonus).toBe(false);
            expect(target?.score).toBeCloseTo(13.0);
        });
    });

    // --- SYNERGY TESTS (1st Settlement) ---
    describe('Synergy Bonus (1st Settlement)', () => {
        test('Should apply +2 for Wood + Brick', () => {
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
                { id: HEX_B_ID, terrain: TerrainType.Hills, value: 5 },
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
            ];
            const G = createMockState(hexes);
            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);
            expect(target?.details.synergyBonus).toBe(true);
            expect(target?.score).toBeCloseTo(17.6);
        });

        test('Should apply +2 for Ore + Wheat', () => {
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Mountains, value: 6 },
                { id: HEX_B_ID, terrain: TerrainType.Fields, value: 5 },
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
            ];
            const G = createMockState(hexes);
            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);
            expect(target?.details.synergyBonus).toBe(true);
            expect(target?.score).toBeCloseTo(17.6);
        });

        test('Should NOT apply Synergy for incomplete pairs (Wood + Ore)', () => {
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
                { id: HEX_B_ID, terrain: TerrainType.Mountains, value: 5 },
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
            ];
            const G = createMockState(hexes);
            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);
            expect(target?.details.synergyBonus).toBe(false);
            expect(target?.score).toBeCloseTo(15.6);
        });
    });

    // --- NEED BONUS (2nd Settlement) ---
    describe('Need Bonus (2nd Settlement)', () => {
        test('Should add +5 for each NEW resource type', () => {
            // Player has Wood, Brick.
            // Spot offers Ore, Wheat, Sheep.
            // Bonus = 5+5+5 = 15.
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Mountains, value: 6 },
                { id: HEX_B_ID, terrain: TerrainType.Fields, value: 5 },
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
            ];
            const G = createMockState(hexes, 1, ['wood', 'brick']);
            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);

            // Base 13 * 1.2 = 15.6. Bonus +15. Total 30.6.
            expect(target?.score).toBeCloseTo(30.6);
            expect(target?.details.neededResources.length).toBe(3);
        });

        test('Should NOT add bonus for EXISTING resource types', () => {
            // Player has Wood.
            // Spot offers Wood, Brick, Sheep.
            // New: Brick, Sheep. (+10). Wood is duplicate (+0).
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
                { id: HEX_B_ID, terrain: TerrainType.Hills, value: 5 },
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
            ];
            const G = createMockState(hexes, 1, ['wood']);
            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);

            // Base 13 * 1.2 = 15.6. Bonus +10. Total 25.6.
            expect(target?.score).toBeCloseTo(25.6);
            expect(target?.details.neededResources).not.toContain('wood');
            expect(target?.details.neededResources).toContain('brick');
        });
    });

    // --- INVALID SPOT TESTS ---
    describe('Validity Checks', () => {
        test('Should exclude occupied spots', () => {
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
                { id: HEX_B_ID, terrain: TerrainType.Hills, value: 5 },
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
            ];
            const G = createMockState(hexes);
            // Occupy the target
            G.board.vertices[TARGET_VERTEX_ID] = { owner: '1', type: 'settlement' };

            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);
            expect(target).toBeUndefined();
        });

        test('Should exclude spots too close to existing settlement', () => {
             const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
                { id: HEX_B_ID, terrain: TerrainType.Hills, value: 5 },
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
            ];
            const G = createMockState(hexes);
            const neighborID = `${HEX_A_ID}::${HEX_B_ID}::some_other_hex`;
            G.board.vertices[neighborID] = { owner: '1', type: 'settlement' };

            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);
            expect(target).toBeUndefined();
        });

        test('Should return no results if playerID is not currentPlayer', () => {
            const hexes = [{ id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 }];
            const G = createMockState(hexes);
            const results = getBestSettlementSpots(G, '1', mockCtx); // '1' is not current
            expect(results).toHaveLength(0);
        });
    });

    describe('getStrategicAdvice', () => {
        test('Should return invalid player error for suspicious playerID', () => {
            const hexes = [{ id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 }];
            const G = createMockState(hexes);
            const coach = new Coach(G);

            // Even if ctx says it's this player's turn, if the ID is suspicious/invalid in G, it should fail
            const suspiciousId = '__proto__';
            // Force context to match suspicious ID so the first check passes
            const ctxWithSuspicious = { ...mockCtx, currentPlayer: suspiciousId };

            const advice = coach.getStrategicAdvice(suspiciousId, ctxWithSuspicious);
            expect(advice).toBe(STRATEGIC_ADVICE.ERROR.INVALID_PLAYER);
        });
    });
});
