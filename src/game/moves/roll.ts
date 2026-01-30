import { Move } from 'boardgame.io';
import { GameState, RollStatus, Resources } from '../core/types';
import { RuleEngine } from '../rules/validator';
import { STAGES } from '../core/constants';
import { distributeResources, countResources } from '../mechanics/resources';

export const rollDice: Move<GameState> = ({ G, ctx }) => {
    // Validate the move using the centralized RuleEngine
    RuleEngine.validateMoveOrThrow(G, ctx, 'rollDice', []);

    // Set status to ROLLING. Actual roll happens in resolveRoll.
    G.rollStatus = RollStatus.ROLLING;
    G.notification = null; // Clear previous event
};

export const resolveRoll: Move<GameState> = ({ G, ctx, random, events }) => {
     // Validate the move using the centralized RuleEngine
     RuleEngine.validateMoveOrThrow(G, ctx, 'resolveRoll', []);

     const d1 = random.Die(6);
     const d2 = random.Die(6);
     const rollValue = d1 + d2;

     G.lastRoll = [d1, d2];
     console.info(`[GAME] Dice rolled: ${rollValue}`);
     G.notification = { type: 'production', rewards: distributeResources(G, rollValue), rollValue };
     G.rollStatus = RollStatus.RESOLVED;

     if (rollValue === 7) {
         // Robber Logic
         Object.values(G.players).forEach(player => {
             const total = countResources(player.resources);
             if (total > 7) {
                 const toDiscard = Math.floor(total / 2);
                 const resources: (keyof Resources)[] = [];
                 (Object.entries(player.resources) as [keyof Resources, number][]).forEach(([res, amount]) => {
                     resources.push(...Array(amount).fill(res));
                 });
                 // Randomly discard
                 random.Shuffle(resources).slice(0, toDiscard).forEach(res => player.resources[res]--);
             }
         });
         events.setActivePlayers?.({ currentPlayer: STAGES.ROBBER });
     } else {
         events.setActivePlayers?.({ currentPlayer: STAGES.ACTING });
     }
};
