import { Move } from 'boardgame.io';
import { GameState, Resources } from '../types';
import { STAGES } from '../constants';
import { RuleEngine } from '../rules/validator';

export const dismissRobber: Move<GameState> = ({ G, ctx, events, random }, hexID: string, victimID?: string) => {
    // 1. Validate the move (including victim choice)
    RuleEngine.validateMoveOrThrow(G, ctx, 'dismissRobber', [hexID, victimID]);

    // 2. Update Robber Location
    G.robberLocation = hexID;

    // 3. Execute Steal (if victim provided)
    if (victimID) {
        const victim = G.players[victimID];
        const thief = G.players[ctx.currentPlayer];

        // Collect victim's resources
        const availableResources: (keyof Resources)[] = [];
        (Object.keys(victim.resources) as (keyof Resources)[]).forEach(res => {
            if (victim.resources[res] > 0) {
                // Add resource type N times where N is the amount held
                for (let i = 0; i < victim.resources[res]; i++) {
                    availableResources.push(res);
                }
            }
        });

        // Pick random resource
        if (availableResources.length > 0) {
            const stolenRes = random.Shuffle(availableResources)[0];

            // Execute transfer
            victim.resources[stolenRes]--;
            thief.resources[stolenRes]++;
        }
    }

    // 4. Transition to Acting Stage
    if (events && events.setActivePlayers) {
        events.setActivePlayers({ currentPlayer: STAGES.ACTING });
    }
};
