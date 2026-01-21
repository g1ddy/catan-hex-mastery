import { rollDice } from './roll';
import { GameState, RollStatus } from '../types';
import { createTestGameState } from '../testUtils';

// Define strict interfaces for mocks to avoid 'any'
interface MockRandom {
    Die: jest.Mock;
}

interface MockEvents {
    endStage: jest.Mock;
    setActivePlayers: jest.Mock;
}

interface MockCtx {
    currentPlayer: string;
}

// Mock RuleEngine to isolate rollDice logic
jest.mock('../rules/validator', () => ({
    RuleEngine: {
        validateMoveOrThrow: jest.fn()
    }
}));

// Type definitions for move calls
type RollDiceMove = (args: { G: GameState; random: MockRandom; events: MockEvents; ctx: MockCtx }) => void | 'INVALID_MOVE';

describe('rollDice', () => {
    let G: GameState;
    const mockRandom: MockRandom = {
        Die: jest.fn()
    };
    const mockEvents: MockEvents = {
        endStage: jest.fn(),
        setActivePlayers: jest.fn()
    };
    const mockCtx: MockCtx = { currentPlayer: '0' };

    const rollMove = rollDice as unknown as RollDiceMove;

    beforeEach(() => {
        G = createTestGameState({
            lastRoll: [0, 0],
            rollStatus: RollStatus.IDLE,
            notification: { type: 'production', rewards: { '0': { wood: 5 } }, rollValue: 10 } // Pre-existing
        });

        mockRandom.Die.mockReturnValue(3);
        mockRandom.Die.mockClear();
        mockEvents.endStage.mockReset();
        mockEvents.setActivePlayers.mockReset();
    });

    it('should generate numbers, set ROLLING status, and clear rewards', () => {
        mockRandom.Die.mockReturnValueOnce(3).mockReturnValueOnce(4);

        rollMove({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });

        expect(G.lastRoll).toEqual([3, 4]);
        expect(G.rollStatus).toBe(RollStatus.ROLLING);
        expect(G.notification).toBeNull(); // Cleared

        // rollDice itself does NOT handle stage transitions or resource distribution anymore.
        // That is handled by Game.ts:onMove.
        expect(mockEvents.setActivePlayers).not.toHaveBeenCalled();
    });
});
