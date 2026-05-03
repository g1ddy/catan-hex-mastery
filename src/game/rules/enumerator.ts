import { GameState, GameAction, BotMove, MoveArguments } from '../core/types';
import { Ctx } from 'boardgame.io';
import { STAGE_MOVES } from '../core/constants';
import { isValidPlayer } from '../core/validation';
// Import the helper directly, not from RuleEngine object
import { RuleEngine } from './validator';
import { getValidMovesForStage, getValidRobberSpots, getValidRobberVictims } from './queries';

// Helper to construct boardgame.io action objects.
const makeMove = <K extends keyof MoveArguments>(moveName: K, args: MoveArguments[K]): BotMove => ({
    move: moveName,
    args
} as BotMove);

// Explicit list of moves that require arguments OR specific validation logic
const PARAMETERIZED_MOVES = new Set([
    'placeSettlement', 'buildSettlement',
    'buildCity',
    'placeRoad', 'buildRoad',
    'tradeBank', // Requires validation even if 0-arg
    'dismissRobber' // Requires target hex AND victim
]);

/**
 * Enumerates all legally possible moves for the player in the current state.
 * Uses the RuleEngine to check validity of potential moves.
 */
export const enumerate = (G: GameState, ctx: Ctx, playerID: string): GameAction[] => {
    if (!isValidPlayer(playerID, G)) {
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
    const hasSpatialMoves = moveTypesList.some(m => PARAMETERIZED_MOVES.has(m) && m !== 'tradeBank' && m !== 'dismissRobber');
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

    function handleRobberMoves(movesArray: GameAction[]) {
         const validRobberSpots = getValidRobberSpots(G);
         validRobberSpots.forEach(hexID => {
             const potentialVictims = getValidRobberVictims(G, hexID, playerID);
             if (potentialVictims.size > 0) {
                 potentialVictims.forEach(victimID => {
                     movesArray.push(makeMove('dismissRobber', [hexID, victimID]));
                 });
             } else {
                 movesArray.push(makeMove('dismissRobber', [hexID]));
             }
         });
    }

    // Iterate through ALL potential moves for this stage
    moveTypesList.forEach(moveName => {
        // eslint-disable-next-line security/detect-object-injection
        const spots = moveSpotMapping[moveName];

        function isSpatialMove(name: string): name is 'placeSettlement' | 'buildSettlement' | 'buildCity' | 'placeRoad' | 'buildRoad' {
            return name === 'placeSettlement' || name === 'buildSettlement' || name === 'buildCity' || name === 'placeRoad' || name === 'buildRoad';
        }

        if (spots) {
            // Handle Spatial Parameterized Moves (Simple args: [id])
            if (isSpatialMove(moveName)) {
                spots.forEach(id => moves.push(makeMove(moveName, [id])));
            }
        } else if (moveName === 'dismissRobber') {
            handleRobberMoves(moves);
        } else if (moveName === 'tradeBank') {
            // Special Case: Transactional Move (0-arg but conditional)
            if (RuleEngine.validateMove(G, ctx, 'tradeBank', []).isValid) {
                moves.push(makeMove('tradeBank', []));
            }
        } else {
            // Handle Non-Parameterized Moves (Everything else)
            const moveKey = moveName as keyof MoveArguments;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (RuleEngine.validateMove(G, ctx, moveKey, [] as any).isValid) {
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 moves.push(makeMove(moveKey, [] as any));
            }
        }
    });

    return moves;
};
