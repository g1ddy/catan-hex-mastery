import { Move } from 'boardgame.io';
import { GameState } from '../types';

export const rollDice: Move<GameState> = ({ G, random }) => {
    // Basic validation
    if (G.rollStatus !== 'IDLE') return 'INVALID_MOVE';

    const d1 = random.Die(6);
    const d2 = random.Die(6);

    G.lastRoll = [d1, d2];
    G.rollStatus = 'ROLLING';
    G.lastRollRewards = {}; // Clear previous rewards

    // Note: Resource distribution and stage transition are now handled
    // in the onEnd lifecycle of the ROLLING stage.
};
