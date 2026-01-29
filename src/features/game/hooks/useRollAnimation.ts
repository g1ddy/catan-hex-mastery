import { useEffect } from 'react';
import { GameState, RollStatus, ClientMoves } from '../../../game/core/types';

export const useRollAnimation = (G: GameState, moves: ClientMoves) => {
    useEffect(() => {
        if (G.rollStatus === RollStatus.ROLLING) {
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
    }, [G.rollStatus, moves]);
};
