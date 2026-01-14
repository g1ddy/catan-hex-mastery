import { Move } from 'boardgame.io';
import { GameState } from '../types';
import { STAGES } from '../constants';

export const dismissRobber: Move<GameState> = ({ events }) => {
    // Transition to Acting Stage
    if (events && events.setActivePlayers) {
        events.setActivePlayers({ currentPlayer: STAGES.ACTING });
    }
};
