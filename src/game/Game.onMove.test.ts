import { CatanGame } from './Game';
import { GameState, RollStatus } from './types';
import { STAGES, PHASES } from './constants';
import { createTestGameState } from './testUtils';

// Mock distributeResources to verify it's called
jest.mock('./mechanics/resources', () => ({
    distributeResources: jest.fn(() => ({ '0': { wood: 1 } })),
}));
import { distributeResources } from './mechanics/resources';

describe('Game.onMove Logic', () => {
    let G: GameState;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let events: any;

    const onMove = CatanGame.phases![PHASES.GAMEPLAY].turn!.onMove!;

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

        onMove({ G, ctx, events } as any);

        // Verify resource distribution
        expect(distributeResources).toHaveBeenCalledWith(G, 8);
        expect(G.lastRollRewards).toEqual({ '0': { wood: 1 } });
        expect(G.rollStatus).toBe(RollStatus.RESOLVED);

        // Verify transition
        expect(events.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: STAGES.ACTING });
    });

    it('should handle 7 roll: distribute resources (mocked to still run) but transition to ROBBER', () => {
        G.lastRoll = [3, 4]; // 7

        onMove({ G, ctx, events } as any);

        // Verify resource distribution is called (distributeResources handles the empty return for 7 internal to itself,
        // but the hook still calls it. The test for empty rewards for 7 is in resources.test.ts or handled by the mock return here)
        expect(distributeResources).toHaveBeenCalledWith(G, 7);
        expect(G.rollStatus).toBe(RollStatus.RESOLVED);

        // Verify transition to ROBBER
        expect(events.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: STAGES.ROBBER });
    });

    it('should do nothing if stage is not ROLLING', () => {
        ctx.activePlayers = { '0': STAGES.ACTING };

        onMove({ G, ctx, events } as any);

        expect(distributeResources).not.toHaveBeenCalled();
        expect(events.setActivePlayers).not.toHaveBeenCalled();
    });
});
