import { Move } from 'boardgame.io';
import { GameState } from '../types';
import { STAGES } from '../constants';
import { distributeResources } from '../mechanics/resources';

export const startRoll: Move<GameState> = ({ G }) => {
    if (G.hasRolled || G.rollStatus !== 'IDLE') return 'INVALID_MOVE';
    G.rollStatus = 'ROLLING';
};

export const resolveRoll: Move<GameState> = ({ G, random, events }) => {
    // Basic validation: Must be in ROLLING state
    if (G.rollStatus !== 'ROLLING') return 'INVALID_MOVE';

    const d1 = random.Die(6);
    const d2 = random.Die(6);

    G.lastRoll = [d1, d2];
    G.hasRolled = true;
    G.rollStatus = 'RESOLVED';
    G.lastRollRewards = {}; // Clear previous rewards

    // Distribute Resources
    const rollValue = d1 + d2;
    G.lastRollRewards = distributeResources(G, rollValue);

    // End Rolling Stage -> Transition to Acting Stage
    if (events && events.setActivePlayers) {
        events.setActivePlayers({ currentPlayer: STAGES.ACTING });
    }
};

// For backward compatibility or immediate rolls (if needed by bots/tests)
export const rollDice: Move<GameState> = (context) => {
    const { G, random, events } = context;
    if (G.hasRolled) return 'INVALID_MOVE';

    // Immediate execution
    startRoll(context);
    // Force status update (though startRoll does it, we are in same tick)
    G.rollStatus = 'ROLLING';
    return resolveRoll(context);
};
