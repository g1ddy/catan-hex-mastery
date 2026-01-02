import { GameState, Player, BoardState, BoardStats } from './types';

export const createTestPlayer = (id: string, overrides: Partial<Player> = {}): Player => ({
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

export const createTestGameState = (overrides: Partial<GameState> = {}): GameState => ({
    board: {
        hexes: {},
        vertices: {},
        edges: {},
        ...(overrides.board || {})
    } as BoardState,
    players: {},
    setupOrder: [],
    lastRoll: [0, 0],
    lastRollRewards: {},
    boardStats: {} as BoardStats,
    hasRolled: false,
    ...overrides
});
