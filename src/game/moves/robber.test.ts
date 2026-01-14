import { dismissRobber } from './robber';
import { STAGES } from '../constants';

describe('Robber Moves', () => {
    test('dismissRobber transitions to ACTING stage', () => {
        const events = {
            setActivePlayers: jest.fn()
        };

        dismissRobber({ events } as any);

        expect(events.setActivePlayers).toHaveBeenCalledWith({ currentPlayer: STAGES.ACTING });
    });
});
