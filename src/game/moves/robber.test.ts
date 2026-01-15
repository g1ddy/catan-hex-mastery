import { dismissRobber } from './robber';
import { STAGES } from '../constants';

describe('Robber Moves', () => {
    test('dismissRobber transitions to ACTING stage', () => {
        const events = {
            setActivePlayers: jest.fn()
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const move = dismissRobber as any;
        move({ events });

        expect(events.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: STAGES.ACTING });
    });
});
