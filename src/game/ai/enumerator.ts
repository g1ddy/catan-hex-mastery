import { GameState, GameAction, BotMove } from '../types';
import { Ctx } from 'boardgame.io';
import { STAGE_MOVES } from '../constants';
import { isValidPlayer } from '../../utils/validation';
// Import the helper directly, not from RuleEngine object
import { getValidMovesForStage } from '../rules/validator';
import { calculateTrade } from '../mechanics/trade';

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
    const hasSpatialMoves = moveTypesList.some(m => PARAMETERIZED_MOVES.has(m) && m !== 'tradeBank');
    const validSpots = hasSpatialMoves
        ? getValidMovesForStage(G, ctx, playerID, true)
        : { validSettlements: new Set<string>(), validCities: new Set<string>(), validRoads: new Set<string>() };

    // A mapping from parameterized move names to their corresponding valid spot sets.
    const moveSpotMapping: Record<string, Set<string> | undefined> = {
        'placeSettlement': validSpots.validSettlements,
        'buildSettlement': validSpots.validSettlements,
        'buildCity': validSpots.validCities,
        'placeRoad': validSpots.validRoads,
        'buildRoad': validSpots.validRoads,
    };

    // Iterate through ALL potential moves for this stage
    moveTypesList.forEach(moveName => {
        const spots = moveSpotMapping[moveName];

        if (spots) {
            // Handle Spatial Parameterized Moves
            spots.forEach(id => moves.push(makeMove(moveName, [id])));
        } else if (moveName === 'tradeBank') {
            // Special Case: Transactional Move (0-arg but conditional)
            // eslint-disable-next-line security/detect-object-injection
            const player = G.players[playerID];
            if (player && calculateTrade(player.resources).canTrade) {
                moves.push(makeMove(moveName, []));
            }
        } else {
            // Handle Non-Parameterized Moves (Everything else)
            // Assume 0-argument validity (e.g., rollDice, endTurn, dismissRobber, regenerateBoard)
            moves.push(makeMove(moveName, []));
        }
    });

    return moves;
};
