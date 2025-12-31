import { distributeResources } from './resources';
import { GameState, TerrainType, Player, Resources, BoardState, BoardStats } from '../types';

// Mock getVerticesForHex
jest.mock('../hexUtils', () => ({
    getVerticesForHex: (coords: { q: number, r: number, s: number }) => {
        // Return predictable vertex IDs based on coords
        return [`${coords.q},${coords.r},${coords.s}`];
    }
}));

// --- Test Helpers ---

const createTestPlayer = (id: string, overrides: Partial<Player> = {}): Player => ({
    id,
    color: 'red',
    resources: {
        wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0,
        ...overrides.resources
    },
    settlements: [],
    roads: [],
    victoryPoints: 0,
    ...overrides,
});

const createTestGameState = (overrides: Partial<GameState> = {}): GameState => ({
    board: {
        hexes: {},
        vertices: {},
        edges: {},
        ...(overrides.board || {})
    } as BoardState,
    players: {},
    setupPhase: { activeRound: 1, activeSettlement: null },
    setupOrder: [],
    lastRoll: [0, 0],
    lastRollRewards: {},
    boardStats: {} as BoardStats,
    hasRolled: false,
    ...overrides
});

// --- Tests ---

describe('distributeResources', () => {
    let G: GameState;

    beforeEach(() => {
        G = createTestGameState({
            board: {
                hexes: {
                    '0,0,0': {
                        id: '0,0,0',
                        coords: { q: 0, r: 0, s: 0 },
                        terrain: TerrainType.Forest,
                        tokenValue: 6
                    },
                    '1,0,-1': {
                        id: '1,0,-1',
                        coords: { q: 1, r: 0, s: -1 },
                        terrain: TerrainType.Mountains,
                        tokenValue: 8
                    }
                },
                vertices: {
                    '0,0,0': { owner: '0', type: 'settlement' },
                    '1,0,-1': { owner: '1', type: 'city' }
                },
                edges: {}
            },
            players: {
                '0': createTestPlayer('0', { resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } }),
                '1': createTestPlayer('1', { resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 } })
            }
        });
    });

    test('Should distribute resources for settlements (1x)', () => {
        distributeResources(G, 6);
        expect(G.players['0'].resources.wood).toBe(1);
        expect(G.players['1'].resources.ore).toBe(0);
    });

    test('Should distribute resources for cities (2x)', () => {
        distributeResources(G, 8);
        expect(G.players['0'].resources.wood).toBe(0);
        expect(G.players['1'].resources.ore).toBe(2);
    });

    test('Should return correct rewards map', () => {
        const rewards = distributeResources(G, 6);
        expect(rewards['0']).toEqual({ wood: 1 });
        expect(rewards['1']).toBeUndefined();
    });

    test('Should handle 7 (Robber) gracefully', () => {
        const rewards = distributeResources(G, 7);
        expect(rewards).toEqual({});
        expect(G.players['0'].resources.wood).toBe(0);
    });

    test('Should ignore non-producing rolls', () => {
        distributeResources(G, 2);
        expect(G.players['0'].resources.wood).toBe(0);
        expect(G.players['1'].resources.ore).toBe(0);
    });
});
