import { Move } from 'boardgame.io';
import { GameState } from '../types';

export const rollDice: Move<GameState> = ({ G, random, events }) => {
    // Basic validation
    if (G.hasRolled) return 'INVALID_MOVE';

    const d1 = random.Die(6);
    const d2 = random.Die(6);

    G.lastRoll = [d1, d2];
    G.hasRolled = true;
    G.lastRollRewards = {}; // Clear previous rewards

    // Trigger Phase Transition
    if (events && events.endPhase) {
        events.endPhase();
    }
};
