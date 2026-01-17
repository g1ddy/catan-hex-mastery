import { regenerateBoard } from './setup';
import { GameState, RollStatus, TerrainType } from '../types';
import { Ctx } from 'boardgame.io';

type MoveFn = (args: { G: GameState; ctx: Ctx }) => unknown;

// Mock context
const mockCtx: Ctx = {
    currentPlayer: '0',
    numPlayers: 2,
    playOrder: ['0', '1'],
    playOrderPos: 0,
    activePlayers: null,
    turn: 1,
    phase: 'setup',
} as Ctx;

const createMockGameState = (overrides?: Partial<GameState>): GameState => ({
    board: {
        hexes: {},
        vertices: {},
        edges: {},
    },
    players: {
        '0': {
            id: '0',
            color: 'red',
            resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            settlements: [],
            roads: [],
            victoryPoints: 0
        },
        '1': {
            id: '1',
            color: 'blue',
            resources: { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
            settlements: [],
            roads: [],
            victoryPoints: 0
        }
    },
    setupPhase: { activeRound: 1 },
    setupOrder: ['0', '1'],
    lastRoll: [0, 0],
    lastRollRewards: {},
    boardStats: { totalPips: {}, fairnessScore: 0, warnings: [] },
    rollStatus: RollStatus.IDLE,
    robberLocation: 'original-desert-id',
    ...overrides
});

describe('regenerateBoard Move', () => {
    it('should allow regeneration when no pieces are placed', () => {
        const G = createMockGameState();
        // Ensure hexes are empty initially so we can see them populate
        G.board.hexes = {};

        const result = (regenerateBoard as MoveFn)({ G, ctx: mockCtx });

        expect(result).not.toBe('INVALID_MOVE');
        expect(Object.keys(G.board.hexes).length).toBeGreaterThan(0);
    });

    it('should update robberLocation to the new desert hex', () => {
        const G = createMockGameState();

        // Mock generateBoard is called internally, but we can't easily spy on it without module mocking.
        // Instead, we verify that AFTER regeneration, G.robberLocation matches the desert hex in G.board.hexes

        (regenerateBoard as MoveFn)({ G, ctx: mockCtx });

        const desertHex = Object.values(G.board.hexes).find(h => h.terrain === TerrainType.Desert);
        expect(desertHex).toBeDefined();
        expect(G.robberLocation).toBe(desertHex!.id);
    });

    it('should REJECT regeneration if a player has placed a settlement', () => {
        const G = createMockGameState();
        G.players['0'].settlements.push('0,0,0'); // Player 0 placed a settlement

        const result = (regenerateBoard as MoveFn)({ G, ctx: mockCtx });

        expect(result).toBe('INVALID_MOVE');
    });

    it('should REJECT regeneration if a player has placed a road', () => {
        const G = createMockGameState();
        G.players['1'].roads.push('0,0,0::1,-1,0'); // Player 1 placed a road

        const result = (regenerateBoard as MoveFn)({ G, ctx: mockCtx });

        expect(result).toBe('INVALID_MOVE');
    });
});
