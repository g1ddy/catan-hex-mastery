import { Ctx } from 'boardgame.io';
import { Coach } from './coach';
import { GameState, TerrainType, Player, BoardState, Hex } from '../core/types';

// Mock getEdgesForHex to ensure we have edges
jest.mock('../geometry/hexUtils', () => ({
    getEdgesForHex: (coords: { q: number, r: number, s: number }) => {
        const id = `${coords.q},${coords.r},${coords.s}`;
        return [`e_${id}_1`, `e_${id}_2`, `e_${id}_3`, `e_${id}_4`, `e_${id}_5`, `e_${id}_6`];
    },
    getVerticesForEdge: () => ['v1', 'v2'],
    getVerticesForHex: () => [],
    getVertexNeighbors: () => [],
    getHexesForVertex: () => []
}));

// Mock RoadAdvisor to return dummy data if called
jest.mock('./advisors/RoadAdvisor', () => {
    return {
        RoadAdvisor: jest.fn().mockImplementation(() => ({
            getRoadRecommendations: jest.fn().mockReturnValue([{ edgeId: 'e_0,0,0_1', score: 10 }])
        }))
    };
});

// Mock SpatialAdvisor
jest.mock('./advisors/SpatialAdvisor', () => {
    return {
        SpatialAdvisor: jest.fn().mockImplementation(() => ({
             // ...
        }))
    };
});

describe('Coach Security', () => {
    const mockCtx: Ctx = {
        numPlayers: 2,
        turn: 1,
        currentPlayer: '0',
        playOrder: ['0', '1'],
        playOrderPos: 0,
        activePlayers: null,
        phase: 'gameplay'
    };

    const createMockState = (): GameState => {
        const hexes: Record<string, Hex> = {
            '0,0,0': {
                id: '0,0,0',
                coords: { q: 0, r: 0, s: 0 },
                terrain: TerrainType.Forest,
                tokenValue: 6
            } as Hex
        };

        const players: Record<string, Player> = {
            '0': { id: '0', name: 'Player 0', color: 'red', resources: {}, settlements: [], roads: [], victoryPoints: 0 } as unknown as Player,
            '1': { id: '1', name: 'Player 1', color: 'blue', resources: {}, settlements: [], roads: [], victoryPoints: 0 } as unknown as Player,
        };

        const board: BoardState = {
            hexes,
            vertices: {},
            edges: {},
            ports: {}
        };

        return {
            board,
            players,
            boardStats: { totalPips: {} }
        } as unknown as GameState;
    };

    test('getAllRoadScores should NOT return data for other players', () => {
        const G = createMockState();
        const coach = new Coach(G);

        // Player 0 asks for Player 1's road scores
        // Vulnerability: If this returns data, Player 0 can spy on Player 1
        const results = coach.getAllRoadScores('1', mockCtx);

        // Expectation: Should be empty array if secure
        expect(results).toEqual([]);
    });
});
