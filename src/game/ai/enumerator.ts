import { GameState, GameAction, BotMove } from '../types';
import { Ctx } from 'boardgame.io';
import { STAGE_MOVES } from '../constants';
import { isValidPlayer } from '../../utils/validation';
// Import the helper directly, not from RuleEngine object
import { getValidMovesForStage } from '../rules/validator';

// Helper to construct boardgame.io action objects.
const makeMove = (moveName: string, args: any[]): BotMove => ({
    move: moveName,
    args
});

// Explicit list of moves that require arguments (Spatial or Transactional)
const PARAMETERIZED_MOVES = new Set([
    'placeSettlement', 'buildSettlement',
    'buildCity',
    'placeRoad', 'buildRoad',
    // 'tradeBank' - tradeBank currently handled as 0-arg in some contexts or requires UI args the bot doesn't know.
    // If tradeBank requires args, it should be in here and handled.
    // If it's 0-arg (opening a menu), it falls through.
    // Assuming for now AI doesn't know how to trade effectively with specific args yet,
    // but we want it to at least be enumerated if it's 0-arg valid.
]);

/**
 * Enumerates all legally possible moves for the player in the current state.
 * Uses the RuleEngine to check validity of potential moves.
 */
export const enumerate = (G: GameState, ctx: Ctx, playerID: string): GameAction[] => {
    if (!isValidPlayer(G, playerID)) {
        return [];
    }

    const stage = ctx.activePlayers?.[playerID];
    if (!stage) {
        return [];
    }

    const possibleMoveTypes = STAGE_MOVES[stage as keyof typeof STAGE_MOVES];
    if (!possibleMoveTypes) {
        console.error(`No moves defined for stage: ${stage}`);
        return [];
    }

    // Cast to string array to allow 'includes' checks against arbitrary strings
    const moveTypesList = possibleMoveTypes as readonly string[];
    const moves: GameAction[] = [];

    // Calculate valid spots once if needed (optimization)
    // Only verify if we actually have spatial moves to process
    const hasSpatialMoves = moveTypesList.some(m => PARAMETERIZED_MOVES.has(m));
    const validSpots = hasSpatialMoves
        ? getValidMovesForStage(G, ctx, playerID, true)
        : { validSettlements: new Set(), validCities: new Set(), validRoads: new Set() }; // Empty dummy

    // Iterate through ALL potential moves for this stage
    moveTypesList.forEach(moveName => {
        // 1. Handle Parameterized Moves (Spatial)
        if (PARAMETERIZED_MOVES.has(moveName)) {
            if (moveName === 'placeSettlement') {
                validSpots.validSettlements.forEach(vId => moves.push(makeMove('placeSettlement', [vId])));
            } else if (moveName === 'buildSettlement') {
                validSpots.validSettlements.forEach(vId => moves.push(makeMove('buildSettlement', [vId])));
            } else if (moveName === 'buildCity') {
                validSpots.validCities.forEach(vId => moves.push(makeMove('buildCity', [vId])));
            } else if (moveName === 'placeRoad') {
                validSpots.validRoads.forEach(eId => moves.push(makeMove('placeRoad', [eId])));
            } else if (moveName === 'buildRoad') {
                validSpots.validRoads.forEach(eId => moves.push(makeMove('buildRoad', [eId])));
            }
        }
        // 2. Handle Non-Parameterized Moves (Everything else)
        else {
            // Assume 0-argument validity (e.g., rollDice, endTurn, dismissRobber, tradeBank, regenerateBoard)
            moves.push(makeMove(moveName, []));
        }
    });

    return moves;
};
