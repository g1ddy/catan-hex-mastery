import { GameState } from './types';
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

export interface BotMove {
    move: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args?: any[];
}

/**
 * Enumerates all legally possible moves for the player in the current state.
 * Used by boardgame.io AI framework and Bot implementations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const enumerate = (G: GameState, ctx: Ctx, playerID: string): BotMove[] => {
    // Validate playerID to prevent prototype pollution
    if (playerID === '__proto__' || playerID === 'constructor' || playerID === 'prototype') {
        console.warn('Invalid playerID:', playerID);
        return [];
    }

    const stage = ctx.activePlayers?.[playerID];
    const moves: BotMove[] = [];

    // If no specific stage is active for this player, check if it's their turn generally?
    // In boardgame.io, ctx.activePlayers is authoritative for stages.
    if (!stage) return [];

    switch (stage) {
        case STAGES.PLACE_SETTLEMENT: {
            const validSpots = getValidSetupSettlementSpots(G);
            validSpots.forEach(vId => {
                moves.push({ move: 'placeSettlement', args: [vId] });
            });
            break;
        }
        case STAGES.PLACE_ROAD: {
            const validSpots = getValidSetupRoadSpots(G, playerID);
            validSpots.forEach(eId => {
                moves.push({ move: 'placeRoad', args: [eId] });
            });
            break;
        }
        case STAGES.ROLLING: {
            // Rolling is mandatory if in this stage
            moves.push({ move: 'rollDice', args: [] });
            break;
        }
        case STAGES.ACTING: {
            // eslint-disable-next-line security/detect-object-injection
            const player = G.players[playerID];
            if (!player) return [];

            const affordable = getAffordableBuilds(player.resources);

            // 1. Settlements
            if (affordable.settlement) {
                const validSpots = getValidSettlementSpots(G, playerID);
                validSpots.forEach(vId => {
                    moves.push({ move: 'buildSettlement', args: [vId] });
                });
            }

            // 2. Cities
            if (affordable.city) {
                const validSpots = getValidCitySpots(G, playerID);
                validSpots.forEach(vId => {
                    moves.push({ move: 'buildCity', args: [vId] });
                });
            }

            // 3. Roads
            if (affordable.road) {
                const validSpots = getValidRoadSpots(G, playerID);
                validSpots.forEach(eId => {
                    moves.push({ move: 'buildRoad', args: [eId] });
                });
            }

            // Always allow ending turn in ACTING stage
            moves.push({ move: 'endTurn', args: [] });
            break;
        }
    }

    return moves;
};
