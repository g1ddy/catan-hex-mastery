import { RoadAdvisor } from './RoadAdvisor';
import { SpatialAdvisor } from './SpatialAdvisor';
import { GameState, BoardState, Player } from '../../core/types';
import { safeSet } from '../../../game/core/utils/objectUtils';

// Mock SpatialAdvisor
const mockScoreVertex = jest.fn();
const mockSpatialAdvisor = {
    scoreVertex: mockScoreVertex
} as unknown as SpatialAdvisor;

// Mock Geometry Utils
jest.mock('../../geometry/hexUtils', () => ({
    getVerticesForEdge: (edgeId: string) => {
        // Simple linear graph: v0 --e0--> v1 --e1--> v2 --e2--> v3 --e3--> v4
        if (edgeId === 'e0') return ['v0', 'v1'];
        if (edgeId === 'e1') return ['v1', 'v2'];
        if (edgeId === 'e2') return ['v2', 'v3'];
        if (edgeId === 'e3') return ['v3', 'v4'];
        return [];
    },
    getEdgesForVertex: (vertexId: string) => {
        if (vertexId === 'v0') return ['e0'];
        if (vertexId === 'v1') return ['e0', 'e1'];
        if (vertexId === 'v2') return ['e1', 'e2'];
        if (vertexId === 'v3') return ['e2', 'e3'];
        if (vertexId === 'v4') return ['e3'];
        return [];
    }
}));

// Mock Validation
jest.mock('../../rules/spatial', () => ({
    validateSettlementLocation: (G: any, vertexId: string) => {
        const v = G.board.vertices[vertexId];
        // Allow flagging a vertex as invalid via the mock state
        if (v && (v as any)._isInvalidMock) return { isValid: false };
        return { isValid: true };
    }
}));

// Mock Analyst
jest.mock('../analyst', () => ({
    calculatePlayerPotentialPips: () => ({
        '0': { wood: 5, ore: 7.5 } // Wood=Near(10pts), Ore=Far(15pts)
    })
}));

describe('RoadAdvisor', () => {
    let G: GameState;
    let roadAdvisor: RoadAdvisor;

    beforeEach(() => {
        // Setup minimal GameState
        const board: BoardState = {
            hexes: {},
            vertices: {
                'v0': { id: 'v0' },
                'v1': { id: 'v1' },
                'v2': { id: 'v2' },
                'v3': { id: 'v3' },
                'v4': { id: 'v4' },
            },
            edges: {
                // e0 is candidate, so it is NOT in board.edges (unoccupied)
            },
            ports: {
                // Near Port at v2. Path: e0(v1) -> e1 -> v2.
                'p_near': { type: 'wood', vertices: ['v2'] },
                // Far Port at v4. Path: ... v2(dist 2) -> e2 -> v3(dist 3) -> e3 -> v4(dist 4).
                'p_far': { type: 'ore', vertices: ['v4'] }
            }
        } as unknown as BoardState;

        const player: Player = {
            id: '0',
            resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            settlements: [],
            roads: [],
            victoryPoints: 0
        } as unknown as Player;

        G = {
            board,
            players: { '0': player },
            boardStats: { totalPips: {} }
        } as unknown as GameState;

        mockScoreVertex.mockReturnValue({ score: 0, reason: '' });

        roadAdvisor = new RoadAdvisor(G, mockSpatialAdvisor);
    });

    test('Defensive profile should favor Near target (Wood)', () => {
        const recs = roadAdvisor.getRoadRecommendations('0', ['e0'], 0.1);
        expect(recs.length).toBeGreaterThan(0);
        expect(recs[0].reason).toContain('wood');
    });

    test('Aggressive profile should favor Far target (Ore)', () => {
        const recs = roadAdvisor.getRoadRecommendations('0', ['e0'], 0.9);
        expect(recs.length).toBeGreaterThan(0);
        expect(recs[0].reason).toContain('ore');
    });

    test('Should not pass through or build on opponent vertices', () => {
        // Opponent '1' owns v2 (the intermediate vertex)
        safeSet(G.board.vertices, 'v2', { owner: '1', type: 'settlement' });

        const recs = roadAdvisor.getRoadRecommendations('0', ['e0']);

        // v2 blocked -> cannot reach v4 (Ore)
        // v2 occupied -> cannot build on v2 (Wood)

        const oreRec = recs.find(r => r.reason.toLowerCase().includes('ore'));
        const woodRec = recs.find(r => r.reason.toLowerCase().includes('wood'));

        expect(oreRec).toBeUndefined();
        expect(woodRec).toBeUndefined();
    });

    test('Should skip invalid settlement locations', () => {
        // Flag v2 as invalid location
        (G.board.vertices['v2'] as any)._isInvalidMock = true;

        const recs = roadAdvisor.getRoadRecommendations('0', ['e0']);

        // v2 is invalid -> No Wood recommendation
        // But path through v2 is still valid (unless blocked by owner), so v4 (Ore) should be reachable?
        // validateSettlementLocation checks if we can BUILD there. It doesn't block passage.
        // So Ore should still be found.

        const oreRec = recs.find(r => r.reason.toLowerCase().includes('ore'));
        const woodRec = recs.find(r => r.reason.toLowerCase().includes('wood'));

        expect(woodRec).toBeUndefined();
        expect(oreRec).toBeDefined();
        expect(oreRec?.score).toBeGreaterThan(0);
    });
});
