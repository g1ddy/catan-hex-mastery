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
        hasRolled: false
    } as unknown as GameState);

    describe('isValidSettlementLocation', () => {
        it('returns false if occupied', () => {
            const G = mockG({ '0,0,0::1,0,-1::0,1,-1': { owner: '0', type: 'settlement' } });
            expect(isValidSettlementLocation(G, '0,0,0::1,0,-1::0,1,-1')).toBe(false);
        });

        it('returns false if too close (distance rule)', () => {
            // Test Distance Rule
            // Center: 0,0,0 (center of map)
            // Vertex: 0,0,0::1,-1,0::1,0,-1
            // One real neighbor based on hex geometry:
            // Hexes (0,0,0) and (1,-1,0) share edge. Common neighbors are (1,0,-1) [current] and (0,-1,1) [neighbor].
            // Sorted ID for neighbor: (0,-1,1), (0,0,0), (1,-1,0) -> "0,-1,1::0,0,0::1,-1,0"

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
        it('returns true for own settlement', () => {
            const G = mockG({ 'v1': { owner: 'p1', type: 'settlement' } });
            expect(isValidCityPlacement(G, 'v1', 'p1')).toBe(true);
        });
        it('returns false for other player settlement', () => {
            const G = mockG({ 'v1': { owner: 'p2', type: 'settlement' } });
            expect(isValidCityPlacement(G, 'v1', 'p1')).toBe(false);
        });
        it('returns false for city (already upgraded)', () => {
            const G = mockG({ 'v1': { owner: 'p1', type: 'city' } });
            expect(isValidCityPlacement(G, 'v1', 'p1')).toBe(false);
        });
    });

    describe('isValidRoadPlacement', () => {
        it('returns false if occupied', () => {
            const G = mockG({}, { 'e1': { owner: 'p1' } });
            expect(isValidRoadPlacement(G, 'e1', 'p1')).toBe(false);
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
            expect(result.reason).toBeUndefined();
        });

        it('returns an invalid result if not connected to the last settlement', () => {
            const settlementId = '0,0,0::1,-1,0::1,0,-1';
            const disconnectedEdge = '9,9,9::8,8,8';
            const G = mockG();
            G.players['0'].settlements = [settlementId];

            const result = isValidSetupRoadPlacement(G, disconnectedEdge, '0');
            expect(result.isValid).toBe(false);
            expect(result.reason).toBe("Road must connect to your just-placed settlement");
        });

        it('returns an invalid result if the edge is occupied', () => {
            const settlementId = '0,0,0::1,-1,0::1,0,-1';
            const connectedEdge = '0,0,0::1,-1,0';
            const G = mockG({}, { [connectedEdge]: { owner: '1' } });
            G.players['0'].settlements = [settlementId];

            const result = isValidSetupRoadPlacement(G, connectedEdge, '0');
            expect(result.isValid).toBe(false);
            expect(result.reason).toBe("This edge is already occupied");
        });

        it('returns an invalid result if the player has no settlements', () => {
            const G = mockG();
            G.players['0'].settlements = [];

            const result = isValidSetupRoadPlacement(G, '0,0,0::1,-1,0', '0');
            expect(result.isValid).toBe(false);
            expect(result.reason).toBe("No active settlement found to connect to");
        });
    });
});
