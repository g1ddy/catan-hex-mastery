import { Move } from 'boardgame.io';
import { GameState } from '../types';
import { STAGES } from '../constants';
import { RuleEngine } from '../rules/validator';

export const dismissRobber: Move<GameState> = ({ G, ctx, events }, hexID: string) => {
    // Validate the move
    RuleEngine.validateMoveOrThrow(G, ctx, 'dismissRobber', [hexID]);

    // Update Robber Location
    G.robberLocation = hexID;

    // Transition to Acting Stage
    if (events && events.setActivePlayers) {
        events.setActivePlayers({ currentPlayer: STAGES.ACTING });
    }
};
