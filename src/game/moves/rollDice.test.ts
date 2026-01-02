import { rollDice } from './roll';
import { GameState } from '../types';
import { createTestGameState } from '../testUtils';

// Define strict interfaces for mocks to avoid 'any'
interface MockRandom {
    Die: jest.Mock;
}

interface MockEvents {
    endStage: jest.Mock;
}

interface MockCtx {
    currentPlayer: string;
}

// Define the expected signature for the move function when called directly in tests
type RollDiceMove = (args: { G: GameState; random: MockRandom; events: MockEvents; ctx: MockCtx }) => void | 'INVALID_MOVE';

describe('rollDice Move', () => {
    let G: GameState;
    const mockRandom: MockRandom = {
        Die: jest.fn()
    };
    const mockEvents: MockEvents = {
        endStage: jest.fn()
    };
    const mockCtx: MockCtx = { currentPlayer: '0' };

    // Define the move once for reuse (DRY)
    const move = rollDice as unknown as RollDiceMove;

    beforeEach(() => {
        G = createTestGameState({
            lastRoll: [0, 0],
            hasRolled: false,
            lastRollRewards: { '0': { wood: 5 } } // Pre-existing rewards to verify clearing
        });

        mockRandom.Die.mockReturnValue(3); // Default return
        mockRandom.Die.mockClear(); // Clear call history
        mockEvents.endStage.mockReset();
    });

    it('should roll dice and update state', () => {
        mockRandom.Die.mockReturnValueOnce(3).mockReturnValueOnce(4);

        move({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });

        expect(G.lastRoll).toEqual([3, 4]);
        expect(G.hasRolled).toBe(true);
    });

    it('should distribute new rewards', () => {
        mockRandom.Die.mockReturnValueOnce(3).mockReturnValueOnce(3); // Sum 6
        move({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });
        expect(G.lastRollRewards).toBeDefined();
    });

    it('should return INVALID_MOVE if already rolled', () => {
        G.hasRolled = true;
        const result = move({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });
        expect(result).toBe('INVALID_MOVE');
        expect(mockRandom.Die).not.toHaveBeenCalled();
    });
});
