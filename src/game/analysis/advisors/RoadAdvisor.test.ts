import { RoadAdvisor } from './RoadAdvisor';
import { SpatialAdvisor } from './SpatialAdvisor';
import { GameState } from '../../core/types';
import { calculatePlayerPotentialPips } from '../analyst';
import { getVerticesForEdge, getEdgesForVertex } from '../../geometry/hexUtils';

// Mock dependencies
jest.mock('./SpatialAdvisor');
jest.mock('../analyst');
jest.mock('../../geometry/hexUtils', () => ({
    getVerticesForEdge: jest.fn(),
    getEdgesForVertex: jest.fn(),
}));

describe('RoadAdvisor', () => {
    let G: GameState;
    let spatialAdvisor: jest.Mocked<SpatialAdvisor>;
    let roadAdvisor: RoadAdvisor;

    beforeEach(() => {
        G = {
            board: {
                hexes: {},
                edges: {},
                vertices: {
                    'v_owned': { id: 'v_owned', owner: '0' },
                    'v_enemy': { id: 'v_enemy', owner: '1' },
                    'v_empty': { id: 'v_empty', owner: undefined }
                },
                ports: {
                    'p1': { vertices: ['v_port'] as any[], type: 'wood' }
                }
            },
            players: {
                '0': { id: '0' }
            }
        } as any;

        spatialAdvisor = new SpatialAdvisor(G, {} as any) as any;
        spatialAdvisor.scoreVertex = jest.fn().mockReturnValue({ score: 0 });

        (calculatePlayerPotentialPips as jest.Mock).mockReturnValue({
            '0': { wood: 5, brick: 0 }
        });

        roadAdvisor = new RoadAdvisor(G, spatialAdvisor);

        // Reset mocks
        (getVerticesForEdge as jest.Mock).mockImplementation((e) => {
            // Simple graph: e_start -> v1 -> e2 -> v2 -> e3 -> v3
            if (e === 'e_start') return ['v_start', 'v1'];
            if (e === 'e2') return ['v1', 'v2'];
            if (e === 'e3') return ['v2', 'v3'];
            return [];
        });

        (getEdgesForVertex as jest.Mock).mockImplementation((v) => {
            if (v === 'v1') return ['e_start', 'e2'];
            if (v === 'v2') return ['e2', 'e3'];
            if (v === 'v3') return ['e3'];
            return [];
        });
    });

    test('should instantiate', () => {
        expect(roadAdvisor).toBeTruthy();
    });

    test('should return empty recommendations if no roads', () => {
        const result = roadAdvisor.getRoadRecommendations('0', []);
        expect(result).toEqual([]);
    });

    test('should score valuable settlement spots with decay', () => {
        // Setup: v2 is a good settlement spot (distance 2 from e_start)
        (spatialAdvisor.scoreVertex as jest.Mock).mockImplementation((v) => {
            if (v === 'v2') return { score: 10, reason: 'Good Spot' };
            return { score: 0 };
        });

        const result = roadAdvisor.getRoadRecommendations('0', ['e_start']);

        expect(result.length).toBeGreaterThan(0);
        // Distance 1: e_start connects to v1.
        // Distance 2: v1 connects to v2 (via e2).
        // e_start -> v1 (dist 1) -> e2 -> v2 (dist 2).
        // Wait, logic:
        // BFS starts at v1 (dist 1).
        // v1 has no score.
        // Neighbors of v1: v2 (dist 2).
        // v2 score 10.
        // Decayed score: 10 * 0.8^(2-1) = 10 * 0.8 = 8.

        expect(result[0].score).toBeCloseTo(8);
        expect(result[0].edgeId).toBe('e_start');
    });

    test('should score ports needed by player', () => {
        // Setup: v3 is a port (distance 3)
        // e_start -> v1 -> e2 -> v2 -> e3 -> v3
        G.board.ports['p_wood'] = { vertices: ['v3'], type: 'wood' } as any;

        // Player has surplus wood (mocked in beforeEach)

        const result = roadAdvisor.getRoadRecommendations('0', ['e_start']);

        // Port score: 5 (wood prod) * 2.0 (multiplier) = 10.
        // Distance: v3 is dist 3.
        // Decay: 10 * 0.8^(3-1) = 10 * 0.64 = 6.4.

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].score).toBeCloseTo(6.4);
        expect(result[0].reason).toContain('Leads to wood Port');
    });

    test('should be blocked by opponent settlements', () => {
        // Setup: v2 is blocked by opponent
        G.board.vertices['v2'] = { id: 'v2', owner: '1' } as any;

        // Target at v3 (behind v2)
        (spatialAdvisor.scoreVertex as jest.Mock).mockImplementation((v) => {
            if (v === 'v3') return { score: 100 };
            return { score: 0 };
        });

        const result = roadAdvisor.getRoadRecommendations('0', ['e_start']);

        // BFS should hit v2 (opponent), stop, and NOT queue v3.
        // Should find nothing.
        expect(result).toEqual([]);
    });

    test('should NOT be blocked by own settlements', () => {
        // Setup: v2 is owned by us
        G.board.vertices['v2'] = { id: 'v2', owner: '0' } as any;

        // Target at v3 (behind v2)
        (spatialAdvisor.scoreVertex as jest.Mock).mockImplementation((v) => {
            if (v === 'v3') return { score: 10 };
            return { score: 0 };
        });

        const result = roadAdvisor.getRoadRecommendations('0', ['e_start']);

        // Should reach v3.
        // Dist 3. Score 10 * 0.64 = 6.4.
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].score).toBeCloseTo(6.4);
    });

    test('should respect MAX_DEPTH', () => {
        // Create a long chain
        (getEdgesForVertex as jest.Mock).mockImplementation((v) => {
            // v0->e0->v1->e1->v2 ...
            const idx = parseInt(v.replace('v', ''));
            return [`e${idx-1}`, `e${idx}`];
        });
        (getVerticesForEdge as jest.Mock).mockImplementation((e) => {
            // e0 connects v0, v1
            const idx = parseInt(e.replace('e', ''));
            return [`v${idx}`, `v${idx+1}`];
        });

        // Target at v10 (distance 10)
        (spatialAdvisor.scoreVertex as jest.Mock).mockImplementation((v) => {
            if (v === 'v10') return { score: 100 };
            return { score: 0 };
        });

        const result = roadAdvisor.getRoadRecommendations('0', ['e0']);

        // MAX_DEPTH is 6. v10 is too far.
        expect(result).toEqual([]);
    });
});
