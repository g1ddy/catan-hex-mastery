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

    // Use the scanning helper to get valid spots for spatial moves
    const validSpots = getValidMovesForStage(G, ctx, playerID, true);

    // Map the sets to actions based on what's allowed in this stage

    // Spatial Moves: Settlements
    if (moveTypesList.includes('placeSettlement')) {
        validSpots.validSettlements.forEach(vId => {
            moves.push(makeMove('placeSettlement', [vId]));
        });
    }
    if (moveTypesList.includes('buildSettlement')) {
        validSpots.validSettlements.forEach(vId => {
            moves.push(makeMove('buildSettlement', [vId]));
        });
    }

    // Spatial Moves: Cities
    if (moveTypesList.includes('buildCity')) {
        validSpots.validCities.forEach(vId => {
            moves.push(makeMove('buildCity', [vId]));
        });
    }

    // Spatial Moves: Roads
    if (moveTypesList.includes('placeRoad')) {
        validSpots.validRoads.forEach(eId => {
            moves.push(makeMove('placeRoad', [eId]));
        });
    }
    if (moveTypesList.includes('buildRoad')) {
        validSpots.validRoads.forEach(eId => {
            moves.push(makeMove('buildRoad', [eId]));
        });
    }

    // Non-Spatial Moves (Explicitly check stage constants)
    if (moveTypesList.includes('rollDice')) moves.push(makeMove('rollDice', []));
    if (moveTypesList.includes('endTurn')) moves.push(makeMove('endTurn', []));
    if (moveTypesList.includes('dismissRobber')) moves.push(makeMove('dismissRobber', []));

    // Fallback for any other 0-arg moves in the stage (Data Driven)
    // This covers things like 'regenerateBoard' if added.
    moveTypesList.forEach(m => {
        if (!['buildRoad', 'placeRoad', 'buildSettlement', 'placeSettlement', 'buildCity', 'rollDice', 'endTurn', 'dismissRobber', 'tradeBank'].includes(m)) {
             // If it's a simple move we haven't explicitly handled, assume 0 args and add it.
             // Avoid duplicates if we already added it above (unlikely given the list, but safety first)
             // Actually, the above list is exhaustive of what we handled.
             moves.push(makeMove(m, []));
        }
    });

    return moves;
};
