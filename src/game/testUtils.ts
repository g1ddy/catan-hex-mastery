import { GameState, Player, Resources, RollStatus, Hex, Port } from './types';
import { PLAYER_COLORS } from '../components/uiConfig';

// Legacy exports for existing tests
export const createTestPlayer = (id: string, overrides: Partial<Player> = {}): Player => ({
    id,
    name: `Player ${parseInt(id) + 1}`,
    color: 'red',
    resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    settlements: [],
    roads: [],
    victoryPoints: 0,
    ...overrides
});

export const createTestGameState = (overrides: Partial<GameState> = {}): GameState => ({
    board: { hexes: new Map(), vertices: new Map(), edges: new Map(), ports: new Map() },
    players: {},
    setupPhase: { activeRound: 1 },
    setupOrder: [],
    lastRoll: [0, 0],
    boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
    rollStatus: RollStatus.IDLE,
    robberLocation: '0',
    playersToDiscard: [],
    notification: null,
    ...overrides
});

/**
 * Creates a mock GameState object with sensible defaults for testing.
 * @param overrides Partial GameState to override defaults.
 * @returns A complete GameState object
 */
export const createMockGameState = (overrides: Partial<GameState> = {}): GameState => {
    const defaultResources: Resources = {
        wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0,
    };

    const defaultPlayer: Player = {
        id: '0',
        name: 'Player 1',
        color: PLAYER_COLORS[0],
        resources: { ...defaultResources },
        settlements: [],
        roads: [],
        victoryPoints: 0,
    };

    const defaults: GameState = {
        board: {
            hexes: new Map<string, Hex>(),
            vertices: new Map(),
            edges: new Map(),
            ports: new Map<string, Port>(),
        },
        players: {
            '0': defaultPlayer,
        },
        setupPhase: { activeRound: 1 },
        setupOrder: ['0'],
        lastRoll: [0, 0],
        boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
        rollStatus: RollStatus.IDLE,
        robberLocation: '0',
        playersToDiscard: [],
        notification: null,
    };

    // Deep merge overrides
    const mergedState = {
        ...defaults,
        ...overrides,
        board: { ...defaults.board, ...overrides.board },
        players: { ...defaults.players, ...overrides.players },
    };

    // Ensure nested player resources are merged correctly
    if (overrides.players) {
        Object.keys(overrides.players).forEach(pId => {
            if (mergedState.players[pId]) {
                mergedState.players[pId] = {
                    ...defaultPlayer,
                    id: pId,
                    ...overrides.players?.[pId],
                    resources: {
                        ...defaultResources,
                        ...overrides.players?.[pId]?.resources,
                    },
                };
            }
        });
    }

    return mergedState;
};
