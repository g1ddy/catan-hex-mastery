import { GameState, Player, Resources } from './types';
import { PLAYER_COLORS } from '../components/uiConfig';

// Legacy exports for existing tests
export const createTestPlayer = (id: string, overrides: Partial<Player> = {}): Player => ({
    id,
    color: 'red',
    resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
    settlements: [],
    roads: [],
    victoryPoints: 0,
    ...overrides
});

export const createTestGameState = (overrides: Partial<GameState> = {}): GameState => ({
    board: { hexes: {}, vertices: {}, edges: {} },
    players: {},
    setupPhase: { activeRound: 1 },
    setupOrder: [],
    lastRoll: [0, 0],
    lastRollRewards: {},
    boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
    hasRolled: false,
    ...overrides
});

/**
 * Creates a mock GameState object with sensible defaults for testing.
 * @param overrides Partial GameState to override defaults.
 * @returns A complete GameState object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createMockGameState = (overrides: any = {}): GameState => {
    const defaultResources: Resources = {
        wood: 0,
        brick: 0,
        sheep: 0,
        wheat: 0,
        ore: 0,
    };

    const defaultPlayer: Player = {
        id: '0',
        color: PLAYER_COLORS[0],
        resources: { ...defaultResources },
        settlements: [],
        roads: [],
        victoryPoints: 0,
    };

    const defaults: GameState = {
        board: {
            hexes: {},
            vertices: {},
            edges: {},
        },
        players: {
            '0': defaultPlayer,
        },
        setupPhase: {
            activeRound: 1,
        },
        setupOrder: ['0'],
        lastRoll: [0, 0],
        lastRollRewards: {},
        boardStats: {
            totalPips: {},
            fairnessScore: 0,
            warnings: [],
        },
        hasRolled: false,
    };

    const mergedState = { ...defaults, ...overrides };

    if (overrides.players) {
        // Ensure player defaults are preserved if only partial player data is provided
        const mergedPlayers: Record<string, Player> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const [id, p] of Object.entries(overrides.players as Record<string, any>)) {
            mergedPlayers[id] = {
                ...defaultPlayer,
                id, // Ensure ID matches key if not provided
                ...p,
                resources: { ...defaultResources, ...(p?.resources || {}) }
            } as Player;
        }
        mergedState.players = mergedPlayers;
    }

    return mergedState as GameState;
};
