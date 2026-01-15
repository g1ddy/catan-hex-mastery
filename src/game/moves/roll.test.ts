import { rollDice, resolveRoll } from './roll';
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

// Type definitions for move calls
type RollDiceMove = (args: { G: GameState; random: MockRandom; events: MockEvents; ctx: MockCtx }) => void | 'INVALID_MOVE';
type ResolveRollMove = (args: { G: GameState; random: MockRandom; events: MockEvents; ctx: MockCtx }) => void | 'INVALID_MOVE';

describe('rollDice Flow', () => {
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
    const resolveMove = resolveRoll as unknown as ResolveRollMove;

    beforeEach(() => {
        G = createTestGameState({
            lastRoll: [0, 0],
            rollStatus: RollStatus.IDLE,
            lastRollRewards: { '0': { wood: 5 } } // Pre-existing
        });

        mockRandom.Die.mockReturnValue(3);
        mockRandom.Die.mockClear();
        mockEvents.endStage.mockReset();
        mockEvents.setActivePlayers.mockReset();
    });

    it('step 1: rollDice should set ROLLING status and generate numbers', () => {
        mockRandom.Die.mockReturnValueOnce(3).mockReturnValueOnce(4);

        rollMove({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });

        expect(G.lastRoll).toEqual([3, 4]);
        expect(G.rollStatus).toBe(RollStatus.ROLLING);
        expect(G.lastRollRewards).toEqual({}); // Cleared
        // Ensure no stage transition yet
        expect(mockEvents.setActivePlayers).not.toHaveBeenCalled();
    });

    it('step 2: resolveRoll should transition to ACTING if not 7', () => {
        // Setup state as if step 1 finished
        G.lastRoll = [3, 3]; // 6
        G.rollStatus = RollStatus.ROLLING;

        resolveMove({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });

        expect(G.rollStatus).toBe(RollStatus.RESOLVED);
        expect(G.lastRollRewards).toBeDefined(); // Distributed
        expect(mockEvents.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: 'acting' });
    });

    it('step 2: resolveRoll should transition to ROBBER if 7', () => {
        G.lastRoll = [3, 4]; // 7
        G.rollStatus = RollStatus.ROLLING;

        resolveMove({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });

        expect(mockEvents.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: 'robber' });
    });

    it('invalid: rollDice fails if not IDLE', () => {
        G.rollStatus = RollStatus.ROLLING;
        const result = rollMove({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });
        expect(result).toBe('INVALID_MOVE');
    });

    it('invalid: resolveRoll fails if not ROLLING', () => {
        G.rollStatus = RollStatus.IDLE;
        const result = resolveMove({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });
        expect(result).toBe('INVALID_MOVE');
    });
});
