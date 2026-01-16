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
            hexes: {}
        },
        players: {
            '0': { settlements: [], roads: [] },
            '1': { settlements: [], roads: [] }
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
