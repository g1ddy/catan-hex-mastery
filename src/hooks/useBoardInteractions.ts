import { useMemo } from 'react';
import { BoardProps } from 'boardgame.io/react';
import { GameState } from '../game/types';
import { PHASES, STAGES } from '../game/constants';
import {
    getValidSettlementSpots,
    getValidCitySpots,
    getValidRoadSpots,
    getValidSetupSettlementSpots,
    getValidSetupRoadSpots
} from '../game/rules/validator';

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
        const isSetup = ctx.phase === PHASES.SETUP;
        const currentStage = ctx.activePlayers?.[playerID];
        const isMyTurn = ctx.currentPlayer === playerID;

        // Default: No valid moves
        if (!isMyTurn) {
            return {
                validSettlements: new Set(),
                validCities: new Set(),
                validRoads: new Set()
            };
        }

        if (isSetup) {
            if (currentStage === STAGES.PLACE_SETTLEMENT) {
                return {
                    validSettlements: getValidSetupSettlementSpots(G),
                    validCities: new Set(),
                    validRoads: new Set()
                };
            }
            if (currentStage === STAGES.PLACE_ROAD) {
                return {
                    validSettlements: new Set(),
                    validCities: new Set(),
                    validRoads: getValidSetupRoadSpots(G, playerID)
                };
            }
        }

        if (ctx.phase === PHASES.GAMEPLAY && currentStage === STAGES.ACTING) {
             // In gameplay, we might calculate all, or only based on current UI mode?
             // However, the prompt says "return { validSettlements, validRoads, validCities }"
             // Calculating all allows the UI to show hints or ghosts even if not in that specific mode yet.
             return {
                 validSettlements: getValidSettlementSpots(G, playerID),
                 validCities: getValidCitySpots(G, playerID),
                 validRoads: getValidRoadSpots(G, playerID)
             };
        }

        return {
            validSettlements: new Set(),
            validCities: new Set(),
            validRoads: new Set()
        };

    }, [G.board, G.players, ctx.phase, ctx.activePlayers, ctx.currentPlayer, playerID]);
}
