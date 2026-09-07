/**
 * @jest-environment jsdom
 */
import { CatanGame } from './Game';
import { GameContext } from '../game/core/types';
import { GameState } from './core/types';

// Mock the full Setup Context required by boardgame.io
// This avoids using 'as any' and satisfies the type requirements for the setup function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockSetupContext = (ctx: GameContext): any => ({
    ctx,
    events: {} as any,
    random: {} as any,
    log: {} as any,
    playerID: undefined
});

describe('CatanGame.setup', () => {
    const mockGameContext: GameContext = {
        numPlayers: 3,
        stagesByPlayer: {},
        currentPlayer: '0',
        turn: 1,
        phase: 'setup',
    } as GameContext;

    it('should initialize with default player names if no setupData provided', () => {
        const G = CatanGame.setup!(createMockSetupContext(mockGameContext)) as GameState;

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

        const G = CatanGame.setup!(createMockSetupContext(mockGameContext), setupData) as GameState;

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

        const G = CatanGame.setup!(createMockSetupContext(mockGameContext), setupData) as GameState;

        expect(G.players['0'].name).toBe('Alice (Bot)');
        expect(G.players['1'].name).toBe('Player 2'); // Fallback
        expect(G.players['2'].name).toBe('Charlie (Bot)');
    });

    it('should throw error if numPlayers is invalid', () => {
        const invalidGameContext = { ...mockGameContext, numPlayers: 1 };
        expect(() => CatanGame.setup!(createMockSetupContext(invalidGameContext))).toThrow("Number of players must be between 2 and 4");
    });
});
