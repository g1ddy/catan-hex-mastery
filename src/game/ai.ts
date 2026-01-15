import { GameState, GameAction, BotMove, RollStatus } from './types';
import { Ctx } from 'boardgame.io';
import { STAGES } from './constants';
import { isValidPlayer } from '../utils/validation';
import {
    getValidSetupSettlementSpots,
    getValidSetupRoadSpots,
    getValidSettlementSpots,
    getValidCitySpots,
    getValidRoadSpots
} from './rules/validator';
import { getAffordableBuilds } from './mechanics/costs';

// Helper to construct boardgame.io action objects.
// Previously returned Redux-style actions, now returns simpler BotMove objects ({ move, args }).
// This ensures compatibility with boardgame.io's built-in bots (RandomBot, MCTSBot)
// while still being usable by our custom bots.
const makeMove = (moveName: string, args: any[]): BotMove => ({
    move: moveName,
    args
});

/**
 * Enumerates all legally possible moves for the player in the current state.
 * Used by boardgame.io AI framework and Bot implementations.
 */
export const enumerate = (G: GameState, ctx: Ctx, playerID: string): GameAction[] => {
    // Validate playerID using strict object check to prevent prototype pollution or inherited property access
    if (!isValidPlayer(G, playerID)) {
        console.warn('Invalid playerID:', playerID);
        return [];
    }

    const stage = ctx.activePlayers?.[playerID];
    const moves: GameAction[] = [];

    // If no specific stage is active for this player, check if it's their turn generally?
    // In boardgame.io, ctx.activePlayers is authoritative for stages.
    if (!stage) {
        // Fallback: Check if it is generally the player's turn (e.g. no stages used, or stage is null)
        // But in this game, stages are always used, so this indicates a potential issue.
        console.error(`Player ${playerID} has no active stage, but one was expected.`);
        return [];
    }

    switch (stage) {
        case STAGES.PLACE_SETTLEMENT: {
            const validSpots = getValidSetupSettlementSpots(G);
            validSpots.forEach(vId => {
                moves.push(makeMove('placeSettlement', [vId]));
            });
            break;
        }
        case STAGES.PLACE_ROAD: {
            const validSpots = getValidSetupRoadSpots(G, playerID);
            validSpots.forEach(eId => {
                moves.push(makeMove('placeRoad', [eId]));
            });
            break;
        }
        case STAGES.ROLLING: {
            // Rolling is mandatory if in this stage
            if (G.rollStatus === RollStatus.ROLLING) {
                moves.push(makeMove('resolveRoll', []));
            } else {
                moves.push(makeMove('rollDice', []));
            }
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
                    moves.push(makeMove('buildSettlement', [vId]));
                });
            }

            // 2. Cities
            if (affordable.city) {
                const validSpots = getValidCitySpots(G, playerID);
                validSpots.forEach(vId => {
                    moves.push(makeMove('buildCity', [vId]));
                });
            }

            // 3. Roads
            if (affordable.road) {
                const validSpots = getValidRoadSpots(G, playerID);
                validSpots.forEach(eId => {
                    moves.push(makeMove('buildRoad', [eId]));
                });
            }

            // Always allow ending turn in ACTING stage
            moves.push(makeMove('endTurn', []));
            break;
        }
    }

    return moves;
};
