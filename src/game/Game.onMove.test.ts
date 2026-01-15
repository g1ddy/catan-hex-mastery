import { CatanGame } from './Game';
import { GameState, RollStatus } from './types';
import { STAGES, PHASES } from './constants';
import { createTestGameState } from './testUtils';

// Mock distributeResources to verify it's called
jest.mock('./mechanics/resources', () => ({
    distributeResources: jest.fn(() => ({ '0': { wood: 1 } })),
}));
import { distributeResources } from './mechanics/resources';

// Define partial interfaces for the mocks we need
interface MockCtx {
    currentPlayer: string;
    activePlayers: Record<string, string>;
}

interface MockEvents {
    setActivePlayers: jest.Mock;
}

// Type for the onMove function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OnMoveFn = (args: { G: GameState; ctx: MockCtx; events: MockEvents }) => void;

describe('Game.onMove Logic', () => {
    let G: GameState;
    let ctx: MockCtx;
    let events: MockEvents;

    // Cast the retrieved function to our typed signature
    const onMove = CatanGame.phases![PHASES.GAMEPLAY].turn!.onMove! as unknown as OnMoveFn;

    beforeEach(() => {
        G = createTestGameState({
            rollStatus: RollStatus.ROLLING,
            lastRoll: [0, 0],
        });
        ctx = {
            currentPlayer: '0',
            activePlayers: { '0': STAGES.ROLLING },
        };
        events = {
            setActivePlayers: jest.fn(),
        };
        (distributeResources as jest.Mock).mockClear();
    });

    it('should handle non-7 roll: distribute resources and transition to ACTING', () => {
        G.lastRoll = [3, 5]; // 8

        onMove({ G, ctx, events });

        // Verify resource distribution
        expect(distributeResources).toHaveBeenCalledWith(G, 8);
        expect(G.lastRollRewards).toEqual({ '0': { wood: 1 } });
        expect(G.rollStatus).toBe(RollStatus.RESOLVED);

        // Verify transition
        expect(events.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: STAGES.ACTING });
    });

    it('should handle 7 roll: distribute resources (mocked to still run) but transition to ROBBER', () => {
        G.lastRoll = [3, 4]; // 7

        onMove({ G, ctx, events });

        // Verify resource distribution is called (distributeResources handles the empty return for 7 internal to itself,
        // but the hook still calls it. The test for empty rewards for 7 is in resources.test.ts or handled by the mock return here)
        expect(distributeResources).toHaveBeenCalledWith(G, 7);
        expect(G.rollStatus).toBe(RollStatus.RESOLVED);

        // Verify transition to ROBBER
        expect(events.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: STAGES.ROBBER });
    });

    it('should do nothing if stage is not ROLLING', () => {
        ctx.activePlayers = { '0': STAGES.ACTING };

        onMove({ G, ctx, events });

        expect(distributeResources).not.toHaveBeenCalled();
        expect(events.setActivePlayers).not.toHaveBeenCalled();
    });
});
