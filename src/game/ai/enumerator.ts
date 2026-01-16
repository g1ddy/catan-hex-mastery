import { GameState, GameAction, BotMove } from '../types';
import { Ctx } from 'boardgame.io';
import { STAGE_MOVES } from '../constants';
import { isValidPlayer } from '../../utils/validation';
// Import the helper directly, not from RuleEngine object
import { getValidMovesForStage } from '../rules/validator';
import { calculateTrade } from '../moves/trade';

// Helper to construct boardgame.io action objects.
const makeMove = (moveName: string, args: any[]): BotMove => ({
    move: moveName,
    args
});

// Explicit list of moves that require arguments OR specific validation logic
const PARAMETERIZED_MOVES = new Set([
    'placeSettlement', 'buildSettlement',
    'buildCity',
    'placeRoad', 'buildRoad',
    'tradeBank' // Requires validation even if 0-arg
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
    const hasSpatialMoves = moveTypesList.some(m => ['placeSettlement', 'buildSettlement', 'buildCity', 'placeRoad', 'buildRoad'].includes(m));
    const validSpots = hasSpatialMoves
        ? getValidMovesForStage(G, ctx, playerID, true)
        : { validSettlements: new Set(), validCities: new Set(), validRoads: new Set() }; // Empty dummy

    // Iterate through ALL potential moves for this stage
    moveTypesList.forEach(moveName => {
        // 1. Handle Parameterized/Special Moves
        if (PARAMETERIZED_MOVES.has(moveName)) {
            switch (moveName) {
                case 'placeSettlement':
                case 'buildSettlement':
                    validSpots.validSettlements.forEach(vId => moves.push(makeMove(moveName, [vId])));
                    break;
                case 'buildCity':
                    validSpots.validCities.forEach(vId => moves.push(makeMove(moveName, [vId])));
                    break;
                case 'placeRoad':
                case 'buildRoad':
                    validSpots.validRoads.forEach(eId => moves.push(makeMove(moveName, [eId])));
                    break;
                case 'tradeBank': {
                    // Check if trade is actually possible before enumerating
                    // eslint-disable-next-line security/detect-object-injection
                    const player = G.players[playerID];
                    if (player && calculateTrade(player.resources).canTrade) {
                        moves.push(makeMove(moveName, []));
                    }
                    break;
                }
            }
        }
        // 2. Handle Non-Parameterized Moves (Everything else)
        else {
            // Assume 0-argument validity (e.g., rollDice, endTurn, dismissRobber, regenerateBoard)
            moves.push(makeMove(moveName, []));
        }
    });

    return moves;
};
