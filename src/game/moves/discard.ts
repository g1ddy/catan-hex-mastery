import { Move } from 'boardgame.io';
import { GameState, Resources } from '../types';
import { RuleEngine } from '../rules/validator';
import { STAGES } from '../constants';

export const discardResources: Move<GameState> = ({ G, ctx, events }, resources: Resources, playerIDArg?: string) => {
    // 1. Resolve Actor
    // ctx.playerID is available when a move is made by a player via the client.
    // However, in some Local/Bot contexts, it might be missing.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let playerID = (ctx as any).playerID;

    // Fallback if missing (e.g. Local Bots) and explicit argument provided
    if (!playerID && playerIDArg) {
        playerID = playerIDArg;
    }

    if (!playerID) {
         // If we are in a context where we expect ctx.playerID but it's missing, this is a fatal error.
         console.error('discardResources: ctx.playerID is missing and no argument provided!', Object.keys(ctx));
         throw new Error('discardResources move was called without a valid playerID.');
    }

    // 2. Delegate Validation (Now with resolved playerID)
    RuleEngine.validateMoveOrThrow(G, ctx, 'discardResources', [resources, playerID]);

    const player = G.players[playerID];
    if (!player) {
        throw new Error(`discardResources: Player ${playerID} not found.`);
    }

    // Remove resources
    for (const [resource, amount] of Object.entries(resources)) {
        player.resources[resource as keyof Resources] -= amount;
    }

    // 3. Update State
    G.playersToDiscard = G.playersToDiscard.filter(id => id !== playerID);

    // 4. Check if all players have discarded
    if (G.playersToDiscard.length === 0) {
        // Transition to Robber Placement (back to current turn player)
        if (events && events.setActivePlayers) {
            events.setActivePlayers({
                value: { [ctx.currentPlayer]: STAGES.ROBBER }
            });
        }
    } else {
        // Remove current player from active players
        if (events && events.setActivePlayers) {
            // We need to keep the other players active.
            // boardgame.io's setActivePlayers replaces the object.
            // So we reconstruct the object for remaining players.
            const remaining = G.playersToDiscard.reduce((acc, pid) => {
                acc[pid] = STAGES.DISCARD;
                return acc;
            }, {} as Record<string, string>);

            events.setActivePlayers({ value: remaining });
        }
    }
};
