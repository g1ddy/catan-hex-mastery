import { useEffect } from 'react';
import { Ctx } from 'boardgame.io';
import { GameState, RollStatus, ClientMoves } from '../../../game/core/types';

/**
 * Automatically triggers the 'resolveRoll' move after a delay when the game is in the ROLLING state.
 * This is strictly for the ACTIVE LOCAL PLAYER to allow for a visual dice roll animation.
 *
 * Bots or server-side logic should handle this transition immediately/independently.
 * Spectators or other players should NOT trigger this move.
 */
export const useAutoResolveRoll = (G: GameState, ctx: Ctx, moves: ClientMoves, playerID: string | null) => {
    useEffect(() => {
        // strict check: ensure we are in the correct state
        if (G.rollStatus === RollStatus.ROLLING) {

            // strict check: only the active player (who initiated the roll) is responsible for resolving it
            // This prevents:
            // 1. Spectators (playerID === null) from triggering moves
            // 2. Non-active players from triggering moves out of turn
            // 3. Double-firing if multiple clients are open for the same player (though less critical here)
            if (playerID !== null && playerID === ctx.currentPlayer) {

                // The duration of the visual dice roll animation
                const ROLL_ANIMATION_DURATION = 1000;

                const timer = setTimeout(() => {
                    // Safety check: ensure the move exists before calling
                    if (moves.resolveRoll) {
                        moves.resolveRoll();
                    } else {
                        console.error("resolveRoll move not found in moves object!");
                    }
                }, ROLL_ANIMATION_DURATION);

                return () => clearTimeout(timer);
            }
        }
    }, [G.rollStatus, moves, ctx.currentPlayer, playerID]);
};
