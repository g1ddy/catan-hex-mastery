import { isValidSettlementLocation, isValidCityPlacement, isValidRoadPlacement, isValidSetupRoadPlacement } from './placement';
import { GameState } from '../types';

describe('placement rules', () => {
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
        rollStatus: 'IDLE'
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

    describe('isValidCityPlacement', () => {
        const validVertexId = '0,0,0::1,-1,0::1,0,-1';
        it('returns true for own settlement', () => {
            const G = mockG({ [validVertexId]: { owner: 'p1', type: 'settlement' } });
            expect(isValidCityPlacement(G, validVertexId, 'p1')).toBe(true);
        });
        it('returns false for other player settlement', () => {
            const G = mockG({ [validVertexId]: { owner: 'p2', type: 'settlement' } });
            expect(isValidCityPlacement(G, validVertexId, 'p1')).toBe(false);
        });
        it('returns false for city (already upgraded)', () => {
            const G = mockG({ [validVertexId]: { owner: 'p1', type: 'city' } });
            expect(isValidCityPlacement(G, validVertexId, 'p1')).toBe(false);
        });
    });

    describe('isValidRoadPlacement', () => {
        it('returns false if occupied', () => {
            const G = mockG({}, { '0,0,0::1,-1,0': { owner: 'p1' } });
            expect(isValidRoadPlacement(G, '0,0,0::1,-1,0', 'p1')).toBe(false);
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
                expect(isValidCityPlacement(G, input, 'p1')).toBe(false);
            });

            it(`isValidRoadPlacement should return false for malicious input: ${input}`, () => {
                const G = mockG();
                expect(isValidRoadPlacement(G, input, 'p1')).toBe(false);
            });
        });
    });
});
