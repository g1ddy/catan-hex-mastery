import { useMemo } from 'react';
import { BoardProps } from 'boardgame.io/react';
import { GameState } from '../game/types';
import { getValidMovesForStage } from '../game/rules/validator';

export interface BoardInteractions {
    validSettlements: Set<string>;
    validCities: Set<string>;
    validRoads: Set<string>;
}

export function useBoardInteractions(
    G: GameState,
    ctx: BoardProps<GameState>['ctx'],
    playerID: string
): BoardInteractions {
    return useMemo(() => {
        const isMyTurn = ctx.currentPlayer === playerID;

        // Default: No valid moves if it's not my turn
        if (!isMyTurn) {
            return {
                validSettlements: new Set(),
                validCities: new Set(),
                validRoads: new Set()
            };
        }

        // Delegate to the logic layer to determine valid moves for the current stage/phase.
        // We pass checkCost=true to ensure users can only interact with spots they can afford.
        return getValidMovesForStage(G, ctx, playerID, true);

    }, [G.board, G.players, ctx.phase, ctx.activePlayers, ctx.currentPlayer, playerID]);
}
