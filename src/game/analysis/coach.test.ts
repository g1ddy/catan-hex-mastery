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
        const hexes = new Map<string, Hex>();
        hexConfig.forEach(h => {
            const [q, r, s] = h.id.split(',').map(Number);
            hexes.set(h.id, {
                id: h.id,
                coords: { q, r, s },
                terrain: h.terrain,
                tokenValue: h.value
            } as Hex);
        });

        const boardStats = boardStatsOverride || {
            totalPips: {
                wood: 100, brick: 100, sheep: 100, wheat: 100, ore: 100
            }
        };

        const player: Player = {
            id: '0',
            name: 'Player 1',
            color: 'red',
            resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            settlements: [],
            roads: [],
            victoryPoints: 0
        };

        if (settlementCount > 0) {
            const s1Id = '10,10,-20::11,9,-20::10,9,-19';
            player.settlements.push(s1Id);

            const s1HexIds = s1Id.split('::');
            const terrainMap: Record<string, TerrainType> = {
                'wood': TerrainType.Forest, 'brick': TerrainType.Hills, 'sheep': TerrainType.Pasture,
                'wheat': TerrainType.Fields, 'ore': TerrainType.Mountains
            };

            s1HexIds.forEach((hid, idx) => {
                const res = firstSettlementResources[idx];
                const terrain = res && terrainMap[res] ? terrainMap[res] : TerrainType.Desert;
                hexes.set(hid, {
                    id: hid, coords: { q: 10 + idx, r: 10, s: -20 - idx },
                    terrain, tokenValue: terrain === TerrainType.Desert ? 0 : 2
                } as Hex);
            });
        }

        return {
            board: {
                hexes,
                vertices: new Map(),
                edges: new Map(),
                ports: new Map()
            } as BoardState,
            players: { '0': player },
            boardStats
        } as unknown as GameState;
    };

    describe('Pip Calculation', () => {
        test('Should correctly sum pips (6=5, 5=4, 9=4)', () => {
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 },
                { id: HEX_B_ID, terrain: TerrainType.Hills, value: 5 },
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
            ];
            const G = createMockState(hexes);
            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);
            expect(target?.score).toBeCloseTo(17.6);
            expect(target?.details.pips).toBe(13);
        });
    });

    describe('Scarcity Multiplier', () => {
        test('Should apply 1.2x multiplier when resource is scarce (<10%)', () => {
            const stats = { totalPips: { wood: 5, brick: 30, sheep: 30, wheat: 30, ore: 5 } };
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
        });
    });

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
        });
    });

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
        });
    });

    describe('Need Bonus (2nd Settlement)', () => {
        test('Should add +5 for each NEW resource type', () => {
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Mountains, value: 6 },
                { id: HEX_B_ID, terrain: TerrainType.Fields, value: 5 },
                { id: HEX_C_ID, terrain: TerrainType.Pasture, value: 9 }
            ];
            const G = createMockState(hexes, 1, ['wood', 'brick']);
            const results = getBestSettlementSpots(G, '0', mockCtx);
            const target = results.find(r => r.vertexId === TARGET_VERTEX_ID);
            expect(target?.score).toBeCloseTo(30.6);
        });
    });

    describe('Validity Checks', () => {
        test('Should exclude occupied spots', () => {
            const hexes = [
                { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 }
            ];
            const G = createMockState(hexes);
            G.board.vertices.set(TARGET_VERTEX_ID, { owner: '1', type: 'settlement' });

            const results = getBestSettlementSpots(G, '0', mockCtx);
            expect(results.find(r => r.vertexId === TARGET_VERTEX_ID)).toBeUndefined();
        });

        test('Should exclude spots too close to existing settlement', () => {
            const hexes = [ { id: HEX_A_ID, terrain: TerrainType.Forest, value: 6 }];
            const G = createMockState(hexes);
            const neighborID = `${HEX_A_ID}::${HEX_B_ID}::some_other_hex`;
            G.board.vertices.set(neighborID, { owner: '1', type: 'settlement' });

            const results = getBestSettlementSpots(G, '0', mockCtx);
            expect(results.find(r => r.vertexId === TARGET_VERTEX_ID)).toBeUndefined();
        });
    });

    describe('getStrategicAdvice', () => {
        test('Should return invalid player error for suspicious playerID', () => {
            const G = createMockState([]);
            const coach = new Coach(G);
            const suspiciousId = '__proto__';
            const ctxWithSuspicious = { ...mockCtx, currentPlayer: suspiciousId };
            const advice = coach.getStrategicAdvice(suspiciousId, ctxWithSuspicious);
            expect(advice.text).toBe(STRATEGIC_ADVICE.ERROR.INVALID_PLAYER);
        });
    });
});
