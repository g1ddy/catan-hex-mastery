/**
 * @jest-environment jsdom
 */
import { CatanGame } from './Game';
import { Ctx } from 'boardgame.io';

// Mock the full Setup Context required by boardgame.io
// This avoids using 'as any' and satisfies the type requirements for the setup function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockSetupContext = (ctx: Ctx): any => ({
    ctx,
    events: {} as any,
    random: {} as any,
    log: {} as any,
    playerID: undefined
});

describe('CatanGame.setup', () => {
    const mockCtx: Ctx = {
        numPlayers: 3,
        playOrder: ['0', '1', '2'],
        playOrderPos: 0,
        activePlayers: null,
        currentPlayer: '0',
        turn: 1,
        phase: 'setup',
    } as Ctx;

    it('should initialize with default player names if no setupData provided', () => {
        const G = CatanGame.setup!(createMockSetupContext(mockCtx));

        expect(G.players['0'].name).toBe('Player 1');
        expect(G.players['1'].name).toBe('Player 2');
        expect(G.players['2'].name).toBe('Player 3');
    });

    it('should initialize with bot names if setupData provided', () => {
        const setupData = {
            botNames: {
                '0': 'Alice (Bot)',
                '1': 'Bob (Bot)',
                '2': 'Charlie (Bot)',
            }
        };

        const G = CatanGame.setup!(createMockSetupContext(mockCtx), setupData);

        expect(G.players['0'].name).toBe('Alice (Bot)');
        expect(G.players['1'].name).toBe('Bob (Bot)');
        expect(G.players['2'].name).toBe('Charlie (Bot)');
    });

    it('should handle partial bot names (fallback to default)', () => {
        const setupData = {
            botNames: {
                '0': 'Alice (Bot)',
                // '1' missing
                '2': 'Charlie (Bot)',
            }
        };

        const G = CatanGame.setup!(createMockSetupContext(mockCtx), setupData);

        expect(G.players['0'].name).toBe('Alice (Bot)');
        expect(G.players['1'].name).toBe('Player 2'); // Fallback
        expect(G.players['2'].name).toBe('Charlie (Bot)');
    });

    it('should throw error if numPlayers is invalid', () => {
        const invalidCtx = { ...mockCtx, numPlayers: 1 };
        expect(() => CatanGame.setup!(createMockSetupContext(invalidCtx))).toThrow("Number of players must be between 2 and 4");
    });
});
