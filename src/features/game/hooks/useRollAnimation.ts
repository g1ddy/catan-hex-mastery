import { useEffect } from 'react';
import { Ctx } from 'boardgame.io';
import { GameState, RollStatus, ClientMoves } from '../../../game/core/types';

export const useRollAnimation = (G: GameState, moves: ClientMoves, playerID: string | null, ctx: Ctx) => {
    useEffect(() => {
        if (G.rollStatus === RollStatus.ROLLING) {
            // ONLY trigger if this client is the current player.
            // This prevents spectators and non-active players from attempting to resolve the roll,
            // which causes "player not active" console errors.
            if (playerID !== ctx.currentPlayer) {
                return;
            }

            // Wait 1 second for the animation to complete
            const timer = setTimeout(() => {
                // Trigger the resolution move
                // We use 'resolveRoll' which must exist in moves
                if (moves.resolveRoll) {
                    moves.resolveRoll();
                } else {
                    console.error("resolveRoll move not found!");
                }
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [G.rollStatus, moves, playerID, ctx.currentPlayer]);
};
