import { regenerateBoard } from './setup';
import { GameState, TerrainType } from '../types';
import { Ctx } from 'boardgame.io';
import { createMockGameState } from '../testUtils';

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

describe('regenerateBoard Move', () => {
    it('should allow regeneration when no pieces are placed', () => {
        const G = createMockGameState();
        // Ensure hexes are empty initially so we can see them populate if they weren't
        G.board.hexes = {};

        const result = (regenerateBoard as MoveFn)({ G, ctx: mockCtx });

        expect(result).not.toBe('INVALID_MOVE');
        expect(Object.keys(G.board.hexes).length).toBeGreaterThan(0);
    });

    it('should update robberLocation to the new desert hex', () => {
        const G = createMockGameState();

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
        // Initialize player 1 explicitly
        const G = createMockGameState({
            players: {
                '1': { id: '1', color: 'blue' }
            }
        });
        G.players['1'].roads.push('0,0,0::1,-1,0'); // Player 1 placed a road

        const result = (regenerateBoard as MoveFn)({ G, ctx: mockCtx });

        expect(result).toBe('INVALID_MOVE');
    });

    it('should preserve player names/configuration after regeneration', () => {
        const G = createMockGameState({
            players: {
                '0': { name: 'Bot 1' },
                '1': { name: 'Bot 2' }
            }
        });

        // Verify initial state
        expect(G.players['0'].name).toBe('Bot 1');
        expect(G.players['1'].name).toBe('Bot 2');

        (regenerateBoard as MoveFn)({ G, ctx: mockCtx });

        // Verify state after regeneration
        expect(G.players['0'].name).toBe('Bot 1');
        expect(G.players['1'].name).toBe('Bot 2');
    });
});
