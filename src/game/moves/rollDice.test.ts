import { rollDice } from './roll';
import { GameState } from '../types';

describe('rollDice Move', () => {
    let G: GameState;
    const mockRandom = {
        Die: jest.fn()
    };
    const mockEvents = {
        endPhase: jest.fn()
    };
    const mockCtx = { currentPlayer: '0' } as any;

    beforeEach(() => {
        G = {
            lastRoll: [0, 0],
            hasRolled: false,
            lastRollRewards: { '0': { wood: 5 } } // Pre-existing rewards to verify clearing
        } as unknown as GameState;

        mockRandom.Die.mockReset();
        mockEvents.endPhase.mockReset();
    });

    it('should roll dice and update state', () => {
        mockRandom.Die.mockReturnValueOnce(3).mockReturnValueOnce(4);

        (rollDice as any)({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });

        expect(G.lastRoll).toEqual([3, 4]);
        expect(G.hasRolled).toBe(true);
    });

    it('should trigger endPhase', () => {
        (rollDice as any)({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });
        expect(mockEvents.endPhase).toHaveBeenCalled();
    });

    it('should clear previous rewards but NOT distribute new ones', () => {
        // The move is responsible for clearing, but the phase hook does the distribution.
        // We expect rewards to be empty after the move executes.
        (rollDice as any)({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });
        expect(G.lastRollRewards).toEqual({});
    });

    it('should return INVALID_MOVE if already rolled', () => {
        G.hasRolled = true;
        const result = (rollDice as any)({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });
        expect(result).toBe('INVALID_MOVE');
        expect(mockRandom.Die).not.toHaveBeenCalled();
    });
});
