import { Move } from 'boardgame.io';
import { GameState, Resources } from '../types';
import { STAGES } from '../constants';
import { RuleEngine } from '../rules/validator';
import { getPotentialVictims } from '../rules/gameplay';

export const dismissRobber: Move<GameState> = ({ G, ctx, events, random }, hexID: string, victimID?: string) => {
    // 1. Validate the move (including victim choice)
    RuleEngine.validateMoveOrThrow(G, ctx, 'dismissRobber', [hexID, victimID]);

    // 2. Update Robber Location
    G.robberLocation = hexID;

    // 3. Resolve Victim (if not provided, pick random from potential victims)
    let targetVictimID = victimID;
    if (!targetVictimID) {
        const potentialVictims = getPotentialVictims(G, hexID, ctx.currentPlayer);
        if (potentialVictims.size > 0) {
            targetVictimID = random.Shuffle(Array.from(potentialVictims))[0];
        }
    }

    // 4. Execute Steal
    if (targetVictimID) {
        const victim = G.players[targetVictimID];
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

            // Record the steal event
            G.lastSteal = {
                thief: ctx.currentPlayer,
                victim: targetVictimID,
                resource: stolenRes
            };
        }
    }

    // 5. Transition to Acting Stage
    if (events && events.setActivePlayers) {
        events.setActivePlayers({ currentPlayer: STAGES.ACTING });
    }
};
