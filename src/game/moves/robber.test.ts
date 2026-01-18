import { dismissRobber } from './robber';
import { STAGES } from '../constants';
import { createMockGameState } from '../testUtils';
import { RuleEngine } from '../rules/validator';

jest.mock('../rules/validator', () => ({
    RuleEngine: {
        validateMoveOrThrow: jest.fn(),
    },
}));

describe('Robber Moves', () => {
    test('dismissRobber transitions to ACTING stage and updates location', () => {
        const G = createMockGameState({ robberLocation: 'A' });
        const events = {
            setActivePlayers: jest.fn()
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx: any = { currentPlayer: '0' };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const move = dismissRobber as any;

        // Execute
        move({ G, ctx, events }, 'B');

        // Verify Validation called
        expect(RuleEngine.validateMoveOrThrow).toHaveBeenCalledWith(G, ctx, 'dismissRobber', ['B']);

        // Verify State Update
        expect(G.robberLocation).toBe('B');

        // Verify Transition
        expect(events.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: STAGES.ACTING });
    });
});
