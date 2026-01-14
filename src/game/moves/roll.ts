import { Move } from 'boardgame.io';
import { GameState } from '../types';
import { STAGES } from '../constants';
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

    // Check for Robber Trigger (Option B: Robber activates if its hex number is rolled)
    // eslint-disable-next-line security/detect-object-injection
    const robberHex = G.board.hexes[G.robberLocation];
    const isRobberTriggered = robberHex && robberHex.tokenValue === rollValue;

    if (isRobberTriggered) {
        if (events && events.setActivePlayers) {
            events.setActivePlayers({ currentPlayer: STAGES.ROBBER });
        }
        return;
    }

    // End Rolling Stage -> Transition to Acting Stage
    if (events && events.setActivePlayers) {
        events.setActivePlayers({ currentPlayer: STAGES.ACTING });
    }
};
