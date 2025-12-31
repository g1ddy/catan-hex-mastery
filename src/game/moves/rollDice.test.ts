import { rollDice } from './roll';
import { GameState } from '../types';
import { createTestGameState } from '../testUtils';

// Define strict interfaces for mocks to avoid 'any'
interface MockRandom {
    Die: jest.Mock;
}

interface MockEvents {
    endPhase: jest.Mock;
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
        endPhase: jest.fn()
    };
    const mockCtx: MockCtx = { currentPlayer: '0' };

    beforeEach(() => {
        G = createTestGameState({
            lastRoll: [0, 0],
            hasRolled: false,
            lastRollRewards: { '0': { wood: 5 } } // Pre-existing rewards to verify clearing
        });

        mockRandom.Die.mockReset();
        mockEvents.endPhase.mockReset();
    });

    it('should roll dice and update state', () => {
        mockRandom.Die.mockReturnValueOnce(3).mockReturnValueOnce(4);

        // Cast rollDice to the specific function signature we use in tests
        const move = rollDice as unknown as RollDiceMove;
        move({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });

        expect(G.lastRoll).toEqual([3, 4]);
        expect(G.hasRolled).toBe(true);
    });

    it('should trigger endPhase', () => {
        const move = rollDice as unknown as RollDiceMove;
        move({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });
        expect(mockEvents.endPhase).toHaveBeenCalled();
    });

    it('should clear previous rewards but NOT distribute new ones', () => {
        // The move is responsible for clearing, but the phase hook does the distribution.
        // We expect rewards to be empty after the move executes.
        const move = rollDice as unknown as RollDiceMove;
        move({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });
        expect(G.lastRollRewards).toEqual({});
    });

    it('should return INVALID_MOVE if already rolled', () => {
        G.hasRolled = true;
        const move = rollDice as unknown as RollDiceMove;
        const result = move({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });
        expect(result).toBe('INVALID_MOVE');
        expect(mockRandom.Die).not.toHaveBeenCalled();
    });
});
