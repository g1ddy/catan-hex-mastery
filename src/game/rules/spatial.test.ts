import {
    isValidSettlementLocation,
    isValidCityPlacement,
    isValidRoadPlacement,
    isValidSetupRoadPlacement,
    isValidSettlementPlacement
} from './spatial';
import { GameState } from '../types';

describe('spatial rules', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockG = (vertices: any = {}, edges: any = {}): GameState => ({
        board: {
            vertices,
            edges,
            hexes: {
                // Central Hex
                '0,0,0': { id: '0,0,0', coords: {q:0,r:0,s:0}, terrain: 'Forest', tokenValue: 6 } as any,
                // Neighbors
                '1,-1,0': { id: '1,-1,0', coords: {q:1,r:-1,s:0}, terrain: 'Hills', tokenValue: 5 } as any,
                '1,0,-1': { id: '1,0,-1', coords: {q:1,r:0,s:-1}, terrain: 'Pasture', tokenValue: 9 } as any,
                '0,1,-1': { id: '0,1,-1', coords: {q:0,r:1,s:-1}, terrain: 'Fields', tokenValue: 4 } as any,
                '-1,1,0': { id: '-1,1,0', coords: {q:-1,r:1,s:0}, terrain: 'Mountains', tokenValue: 8 } as any,
                '-1,0,1': { id: '-1,0,1', coords: {q:-1,r:0,s:1}, terrain: 'Forest', tokenValue: 3 } as any,
                '0,-1,1': { id: '0,-1,1', coords: {q:0,r:-1,s:1}, terrain: 'Hills', tokenValue: 10 } as any,
            }
        },
        players: {
            '0': { settlements: [], roads: [] },
            '1': { settlements: [], roads: [] },
            'p1': { settlements: [], roads: [] },
            'p2': { settlements: [], roads: [] }
        },
        setupPhase: { activeRound: 1 },
        setupOrder: [],
        lastRoll: [0, 0],
        lastRollRewards: {},
        boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
        hasRolled: false
    } as unknown as GameState);

    describe('isValidSettlementLocation', () => {
        it('returns false if occupied', () => {
            const G = mockG({ '0,0,0::1,0,-1::0,1,-1': { owner: '0', type: 'settlement' } });
            expect(isValidSettlementLocation(G, '0,0,0::1,0,-1::0,1,-1')).toBe(false);
        });

        it('returns false if too close (distance rule)', () => {
            const targetVertex = '0,0,0::1,-1,0::1,0,-1';
            const neighborVertex = '0,-1,1::0,0,0::1,-1,0';
            const G = mockG({ [neighborVertex]: { owner: '1', type: 'settlement' } });
            expect(isValidSettlementLocation(G, targetVertex)).toBe(false);
        });

        it('returns true if valid location', () => {
            const G = mockG();
            const targetVertex = '0,0,0::1,-1,0::1,0,-1';
            expect(isValidSettlementLocation(G, targetVertex)).toBe(true);
        });

        it('returns false if off-board', () => {
            const G = mockG();
            // A vertex composed entirely of off-board hexes
            const offBoardVertex = '10,10,-20::11,10,-21::10,11,-21';
            const result = isValidSettlementLocation(G, offBoardVertex);
            expect(result).toBe(false);
        });
    });

    describe('isValidSettlementPlacement', () => {
        it('returns false if not connected to own road', () => {
            const G = mockG();
            const targetVertex = '0,0,0::1,-1,0::1,0,-1';
            // No roads
            const result = isValidSettlementPlacement(G, targetVertex, 'p1');
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('connect to your own road');
        });

        it('returns true if connected to own road', () => {
             const targetVertex = '0,0,0::1,-1,0::1,0,-1';
             const connectedEdge = '0,0,0::1,-1,0';
             const G = mockG({}, { [connectedEdge]: { owner: 'p1' } }); // Mock road
             const result = isValidSettlementPlacement(G, targetVertex, 'p1');
             expect(result.isValid).toBe(true);
        });

        it('returns false if occupied (delegates to location check)', () => {
             const vertexId = '0,0,0::1,0,-1::0,1,-1';
             const edgeId = '0,0,0::1,0,-1';
             const G = mockG({ [vertexId]: { owner: 'p1', type: 'settlement' } }, { [edgeId]: { owner: 'p1' } });
             const result = isValidSettlementPlacement(G, vertexId, 'p1');
             expect(result.isValid).toBe(false);
        });
    });

    describe('isValidCityPlacement', () => {
        const validVertexId = '0,0,0::1,-1,0::1,0,-1';
        it('returns true for own settlement', () => {
            const G = mockG({ [validVertexId]: { owner: 'p1', type: 'settlement' } });
            expect(isValidCityPlacement(G, validVertexId, 'p1').isValid).toBe(true);
        });
        it('returns false for other player settlement', () => {
            const G = mockG({ [validVertexId]: { owner: 'p2', type: 'settlement' } });
            const result = isValidCityPlacement(G, validVertexId, 'p1');
            expect(result.isValid).toBe(false);
            expect(result.reason).toBe("You can only upgrade your own settlements");
        });
        it('returns false for city (already upgraded)', () => {
            const G = mockG({ [validVertexId]: { owner: 'p1', type: 'city' } });
            const result = isValidCityPlacement(G, validVertexId, 'p1');
            expect(result.isValid).toBe(false);
            expect(result.reason).toBe("Only settlements can be upgraded to cities");
        });
    });

    describe('isValidRoadPlacement', () => {
        it('returns false if occupied', () => {
            const G = mockG({}, { '0,0,0::1,-1,0': { owner: 'p1' } });
            const result = isValidRoadPlacement(G, '0,0,0::1,-1,0', 'p1');
            expect(result.isValid).toBe(false);
            expect(result.reason).toBe("This edge is already occupied");
        });

        it('returns false if off-board', () => {
            const G = mockG();
            // Edge between two hexes not in G.board.hexes
            const offBoardEdge = '10,10,-20::11,10,-21';
            const result = isValidRoadPlacement(G, offBoardEdge, 'p1');
            expect(result.isValid).toBe(false);
            expect(result.reason).toBe("This edge is off the board");
        });
    });

    describe('isValidSetupRoadPlacement', () => {
        it('returns a valid result if connected to the last placed settlement', () => {
            const settlementId = '0,0,0::1,-1,0::1,0,-1';
            const connectedEdge = '0,0,0::1,-1,0';
            const G = mockG();
            G.players['0'].settlements = ['some_other_settlement', settlementId];
            const result = isValidSetupRoadPlacement(G, connectedEdge, '0');
            expect(result.isValid).toBe(true);
        });

        it('returns false if off-board', () => {
            const G = mockG();
            const settlementId = '0,0,0::1,-1,0::1,0,-1'; // Valid settlement
            G.players['0'].settlements = [settlementId];

            // Edge radiating out from 0,0,0 but not on board?
            // Wait, we need to construct an edge that connects to the settlement but is off board.
            // Settlement is at intersection of (0,0,0), (1,-1,0), (1,0,-1). All are on board.
            // So all edges connected to it are between valid hexes.

            // Let's pick a settlement on the edge of the board.
            // Hex (0,0,0) is on board. (10,10,-20) is NOT.
            // Imagine a vertex at boundary.
            // Since we mocked a cluster around 0,0,0, let's find a boundary vertex.
            // (1,-1,0) is in board.
            // (2,-2,0) is NOT in board.
            // (2,-1,-1) is NOT in board.
            // Vertex V = (1,-1,0), (2,-2,0), (2,-1,-1).
            // This vertex is on the corner of (1,-1,0).
            // Edge E = (2,-2,0)::(2,-1,-1) is incident to V but touches NO valid hexes.

            const boundaryVertex = '1,-1,0::2,-2,0::2,-1,-1';
            const offBoardEdge = '2,-2,0::2,-1,-1';

            // We need to validly place the settlement there first.
            // Is boundaryVertex valid? It touches (1,-1,0) which is on board. Yes.

            G.players['0'].settlements = [boundaryVertex];

            const result = isValidSetupRoadPlacement(G, offBoardEdge, '0');
            expect(result.isValid).toBe(false);
            expect(result.reason).toBe("This edge is off the board");
        });
    });

    describe('security validation', () => {
        const maliciousInputs = ['__proto__', 'constructor', 'prototype'];

        maliciousInputs.forEach(input => {
            it(`isValidSettlementLocation should return false for malicious input: ${input}`, () => {
                const G = mockG();
                expect(isValidSettlementLocation(G, input)).toBe(false);
            });

            it(`isValidCityPlacement should return false for malicious input: ${input}`, () => {
                const G = mockG();
                expect(isValidCityPlacement(G, input, 'p1').isValid).toBe(false);
            });

            it(`isValidRoadPlacement should return false for malicious input: ${input}`, () => {
                const G = mockG();
                expect(isValidRoadPlacement(G, input, 'p1').isValid).toBe(false);
            });
        });
    });
});
