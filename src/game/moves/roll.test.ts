import { rollDice, resolveRoll } from './roll';
import { GameState, RollStatus } from '../core/types';
import { createTestGameState } from '../testUtils';
import { STAGES } from '../core/constants';
import { RuleEngine } from '../rules/validator';

// Define strict interfaces for mocks to avoid 'any'
interface MockRandom {
    Die: jest.Mock;
    Shuffle: jest.Mock;
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

// Mock Mechanics
jest.mock('../mechanics/resources', () => ({
    distributeResources: jest.fn(() => ({})),
    countResources: jest.fn(() => 0)
}));

type MoveFunction = (args: { G: GameState; random: MockRandom; events: MockEvents; ctx: MockCtx }) => void | 'INVALID_MOVE';

describe('Dice Moves', () => {
    let G: GameState;
    const mockRandom: MockRandom = {
        Die: jest.fn(),
        Shuffle: jest.fn(arr => arr)
    };
    const mockEvents: MockEvents = {
        endStage: jest.fn(),
        setActivePlayers: jest.fn()
    };
    const mockCtx: MockCtx = { currentPlayer: '0' };

    const rollDiceMove = rollDice as unknown as MoveFunction;
    const resolveRollMove = resolveRoll as unknown as MoveFunction;

    beforeEach(() => {
        G = createTestGameState({
            lastRoll: [0, 0],
            rollStatus: RollStatus.IDLE,
            notification: { type: 'production', rewards: { '0': { wood: 5 } }, rollValue: 10 }
        });

        mockRandom.Die.mockReturnValue(3);
        mockRandom.Die.mockClear();
        mockRandom.Shuffle.mockClear();
        mockEvents.endStage.mockReset();
        mockEvents.setActivePlayers.mockReset();
        (RuleEngine.validateMoveOrThrow as jest.Mock).mockReset();
    });

    describe('rollDice', () => {
        it('should set status to ROLLING and clear notification', () => {
            rollDiceMove({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });

            expect(G.rollStatus).toBe(RollStatus.ROLLING);
            expect(G.notification).toBeNull();
            // Should NOT roll dice yet
            expect(mockRandom.Die).not.toHaveBeenCalled();
        });
    });

    describe('resolveRoll', () => {
        it('should resolve roll, update lastRoll, and transition to ACTING on non-7', () => {
            G.rollStatus = RollStatus.ROLLING;
            mockRandom.Die.mockReturnValueOnce(2).mockReturnValueOnce(3); // Sum 5

            resolveRollMove({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });

            expect(G.lastRoll).toEqual([2, 3]);
            expect(G.rollStatus).toBe(RollStatus.RESOLVED);
            expect(G.notification).not.toBeNull();
            expect(G.notification?.type).toBe('production');

            expect(mockEvents.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: STAGES.ACTING });
        });

        it('should resolve roll 7 and transition to ROBBER', () => {
            G.rollStatus = RollStatus.ROLLING;
            mockRandom.Die.mockReturnValueOnce(3).mockReturnValueOnce(4); // Sum 7

            resolveRollMove({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });

            expect(G.lastRoll).toEqual([3, 4]);
            expect(mockEvents.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: STAGES.ROBBER });
        });

        it('should throw if RuleEngine rejects the move', () => {
            (RuleEngine.validateMoveOrThrow as jest.Mock).mockImplementation(() => {
                throw new Error("Game is not in ROLLING status.");
            });
            G.rollStatus = RollStatus.IDLE;
            expect(() => {
                resolveRollMove({ G, random: mockRandom, events: mockEvents, ctx: mockCtx });
            }).toThrow("Game is not in ROLLING status.");
        });
    });
});
