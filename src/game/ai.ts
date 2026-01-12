import { GameState, GameAction } from './types';
import { Ctx } from 'boardgame.io';
import { STAGES } from './constants';
import {
    getValidSetupSettlementSpots,
    getValidSetupRoadSpots,
    getValidSettlementSpots,
    getValidCitySpots,
    getValidRoadSpots
} from './rules/validator';
import { getAffordableBuilds } from './mechanics/costs';

// Helper to construct boardgame.io action objects manually.
// We explicitly include `playerID` in the payload. In AI contexts, this ensures
// the move is correctly attributed when generated and played by a bot.
const makeMove = (moveName: string, args: any[], playerID: string): GameAction => ({
    type: 'MAKE_MOVE',
    payload: { type: moveName, args, playerID }
});

/**
 * Enumerates all legally possible moves for the player in the current state.
 * Used by boardgame.io AI framework and Bot implementations.
 */
export const enumerate = (G: GameState, ctx: Ctx, playerID: string): GameAction[] => {
    // Validate playerID using strict object check to prevent prototype pollution or inherited property access
    if (!Object.prototype.hasOwnProperty.call(G.players, playerID)) {
        console.warn('Invalid playerID:', playerID);
        return [];
    }

    const stage = ctx.activePlayers?.[playerID];
    const moves: GameAction[] = [];

    // If no specific stage is active for this player, check if it's their turn generally?
    // In boardgame.io, ctx.activePlayers is authoritative for stages.
    if (!stage) {
        return [];
    }

    switch (stage) {
        case STAGES.PLACE_SETTLEMENT: {
            const validSpots = getValidSetupSettlementSpots(G);
            validSpots.forEach(vId => {
                // Return full MakeMove actions
                moves.push(makeMove('placeSettlement', [vId], playerID));
            });
            break;
        }
        case STAGES.PLACE_ROAD: {
            const validSpots = getValidSetupRoadSpots(G, playerID);
            validSpots.forEach(eId => {
                moves.push(makeMove('placeRoad', [eId], playerID));
            });
            break;
        }
        case STAGES.ROLLING: {
            // Rolling is mandatory if in this stage
            moves.push(makeMove('rollDice', [], playerID));
            break;
        }
        case STAGES.ACTING: {
            // eslint-disable-next-line security/detect-object-injection
            const player = G.players[playerID];

            const affordable = getAffordableBuilds(player.resources);

            // 1. Settlements
            if (affordable.settlement) {
                const validSpots = getValidSettlementSpots(G, playerID);
                validSpots.forEach(vId => {
                    moves.push(makeMove('buildSettlement', [vId], playerID));
                });
            }

            // 2. Cities
            if (affordable.city) {
                const validSpots = getValidCitySpots(G, playerID);
                validSpots.forEach(vId => {
                    moves.push(makeMove('buildCity', [vId], playerID));
                });
            }

            // 3. Roads
            if (affordable.road) {
                const validSpots = getValidRoadSpots(G, playerID);
                validSpots.forEach(eId => {
                    moves.push(makeMove('buildRoad', [eId], playerID));
                });
            }

            // Always allow ending turn in ACTING stage
            moves.push(makeMove('endTurn', [], playerID));
            break;
        }
    }

    return moves;
};
