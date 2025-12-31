import { Move } from 'boardgame.io';
import { GameState } from '../types';
import { distributeResources } from '../mechanics/resources';

export const rollDice: Move<GameState> = ({ G, random, events }) => {
    // Basic validation
    if (G.hasRolled) return 'INVALID_MOVE';

    const d1 = random.Die(6);
    const d2 = random.Die(6);

    G.lastRoll = [d1, d2];
    G.hasRolled = true;
    G.lastRollRewards = {}; // Clear previous rewards

    // Distribute Resources
    const rollValue = d1 + d2;
    G.lastRollRewards = distributeResources(G, rollValue);

    // End Rolling Stage -> Transition to Acting Stage (via next: STAGES.ACTING)
    if (events && events.endStage) {
        events.endStage();
    }
};
