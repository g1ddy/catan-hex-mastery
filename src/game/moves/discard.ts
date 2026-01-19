import { Move } from 'boardgame.io';
import { GameState, Resources } from '../types';
import { RuleEngine } from '../rules/validator';
import { STAGES } from '../constants';

export const discardResources: Move<GameState> = ({ G, ctx, events }, resources: Resources) => {
    // 1. Delegate Validation
    RuleEngine.validateMoveOrThrow(G, ctx, 'discardResources', [resources]);

    // 2. Execute
    // ctx.playerID is available when a move is made by a player.
    // Typescript definition for Ctx might be missing it in some versions or configurations.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let playerID = (ctx as any).playerID;

    if (!playerID) {
        // Fallback for simulation tests where playerID might be missing in Local client
        // This is unsafe for simultaneous moves but prevents crashes in single-client simulations
        console.warn("discardResources: ctx.playerID missing. Falling back to ctx.currentPlayer.");
        playerID = ctx.currentPlayer;
    }

    const player = G.players[playerID];

    // Remove resources
    player.resources.wood -= resources.wood;
    player.resources.brick -= resources.brick;
    player.resources.sheep -= resources.sheep;
    player.resources.wheat -= resources.wheat;
    player.resources.ore -= resources.ore;

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
