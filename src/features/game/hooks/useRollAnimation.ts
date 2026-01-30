import { useEffect } from 'react';
import { Ctx } from 'boardgame.io';
import { GameState, RollStatus, ClientMoves } from '../../../game/core/types';

export const useRollAnimation = (G: GameState, ctx: Ctx, moves: ClientMoves, playerID: string | null) => {
    useEffect(() => {
        if (G.rollStatus === RollStatus.ROLLING) {
            // Only the current player should trigger the resolution
            // This prevents spectators or non-active players from attempting to resolve,
            // which causes "player not active" errors.
            // Also prevents "invalid move object" errors if the bot has already resolved it.
            if (playerID === ctx.currentPlayer) {
                // Wait 1 second for the animation to complete
                const ROLL_ANIMATION_DURATION = 1000;
                const timer = setTimeout(() => {
                    // Trigger the resolution move
                    // We use 'resolveRoll' which must exist in moves
                    if (moves.resolveRoll) {
                        moves.resolveRoll();
                    } else {
                        console.error("resolveRoll move not found!");
                    }
                }, ROLL_ANIMATION_DURATION);

                return () => clearTimeout(timer);
            }
        }
    }, [G.rollStatus, moves, ctx.currentPlayer, playerID]);
};
