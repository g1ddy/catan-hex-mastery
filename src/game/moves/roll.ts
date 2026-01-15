import { Move } from 'boardgame.io';
import { GameState, RollStatus } from '../types';
import { STAGES } from '../constants';
import { distributeResources } from '../mechanics/resources';

export const rollDice: Move<GameState> = ({ G, random }) => {
    // Basic validation
    if (G.rollStatus !== RollStatus.IDLE) return 'INVALID_MOVE';

    const d1 = random.Die(6);
    const d2 = random.Die(6);

    G.lastRoll = [d1, d2];
    G.rollStatus = RollStatus.ROLLING;
    G.lastRollRewards = {}; // Clear previous rewards
};

export const resolveRoll: Move<GameState> = ({ G, events }) => {
    if (G.rollStatus !== RollStatus.ROLLING) return 'INVALID_MOVE';

    const [d1, d2] = G.lastRoll;
    const rollValue = d1 + d2;

    // Distribute Resources
    G.lastRollRewards = distributeResources(G, rollValue);
    G.rollStatus = RollStatus.RESOLVED;

    // Check for Robber Trigger (Standard Rules: 7)
    // User requested: "We can either land on 7 and and enter robber stage"
    if (rollValue === 7) {
        if (events && events.setActivePlayers) {
            events.setActivePlayers({ currentPlayer: STAGES.ROBBER });
        }
    } else {
        // Transition to Acting Stage
        if (events && events.setActivePlayers) {
            events.setActivePlayers({ currentPlayer: STAGES.ACTING });
        }
    }
};
