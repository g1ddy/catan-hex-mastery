import { CatanGame } from './Game';
import { GameState, RollStatus } from './types';
import { STAGES, PHASES } from './constants';
import { createTestGameState, createTestPlayer } from './testUtils';

// Mock distributeResources to verify it's called, but keep countResources actual
jest.mock('./mechanics/resources', () => {
    const original = jest.requireActual('./mechanics/resources');
    return {
        ...original,
        distributeResources: jest.fn(() => ({ '0': { wood: 1 } })),
    };
});
import { distributeResources } from './mechanics/resources';

// Define partial interfaces for the mocks we need
interface MockCtx {
    currentPlayer: string;
    activePlayers: Record<string, string>;
}

interface MockEvents {
    setActivePlayers: jest.Mock;
}

interface MockRandom {
    Shuffle: jest.Mock;
}

// Type for the onMove function
type OnMoveFn = (args: { G: GameState; ctx: MockCtx; events: MockEvents; random: MockRandom }) => void;

describe('Game.onMove Logic', () => {
    let G: GameState;
    let ctx: MockCtx;
    let events: MockEvents;
    let random: MockRandom;

    // Cast the retrieved function to our typed signature
    const onMove = CatanGame.phases![PHASES.GAMEPLAY].turn!.onMove! as unknown as OnMoveFn;

    beforeEach(() => {
        G = createTestGameState({
            rollStatus: RollStatus.ROLLING,
            lastRoll: [0, 0],
            players: {
                '0': createTestPlayer('0'),
            }
        });
        ctx = {
            currentPlayer: '0',
            activePlayers: { '0': STAGES.ROLLING },
        };
        events = {
            setActivePlayers: jest.fn(),
        };
        random = {
            Shuffle: jest.fn((arr) => arr),
        };
        (distributeResources as jest.Mock).mockClear();
    });

    it('should handle non-7 roll: distribute resources and transition to ACTING', () => {
        G.lastRoll = [3, 5]; // 8

        onMove({ G, ctx, events, random });

        // Verify resource distribution
        expect(distributeResources).toHaveBeenCalledWith(G, 8);
        expect(G.notification).toEqual({ type: 'production', rewards: { '0': { wood: 1 } }, rollValue: 8 });
        expect(G.rollStatus).toBe(RollStatus.RESOLVED);

        // Verify transition
        expect(events.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: STAGES.ACTING });
    });

    it('should handle 7 roll: transition to ROBBER (no discard if resources <= 7)', () => {
        G.lastRoll = [3, 4]; // 7
        // Ensure <= 7 resources (default is 0)

        onMove({ G, ctx, events, random });

        expect(distributeResources).toHaveBeenCalledWith(G, 7);
        expect(G.rollStatus).toBe(RollStatus.RESOLVED);

        // Verify transition to ROBBER
        expect(events.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: STAGES.ROBBER });
        expect(random.Shuffle).not.toHaveBeenCalled(); // No shuffle needed if no discard
    });

    it('should handle 7 roll with > 7 resources: discard half and transition to ROBBER', () => {
        G.lastRoll = [3, 4];
        // Give player 0 8 cards (8 wood)
        G.players['0'].resources = { wood: 8, brick: 0, sheep: 0, wheat: 0, ore: 0 };

        // Mock Shuffle to ensure deterministic discard.
        // Logic: creates array of 8 'wood'. Slices first 4.
        // Since all are 'wood', shuffle doesn't matter for the outcome value,
        // but we verify logic execution.
        random.Shuffle.mockImplementation((arr) => arr);

        onMove({ G, ctx, events, random });

        // Verify transition
        expect(events.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: STAGES.ROBBER });

        // Verify resources reduced
        // 8 wood -> 4 discarded -> 4 remaining
        expect(G.players['0'].resources.wood).toBe(4);

        expect(random.Shuffle).toHaveBeenCalled();
    });

    it('should do nothing if stage is not ROLLING', () => {
        ctx.activePlayers = { '0': STAGES.ACTING };

        onMove({ G, ctx, events, random });

        expect(distributeResources).not.toHaveBeenCalled();
        expect(events.setActivePlayers).not.toHaveBeenCalled();
    });
});
