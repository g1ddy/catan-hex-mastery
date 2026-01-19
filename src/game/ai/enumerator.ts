import { GameState, GameAction, BotMove, MoveArguments, Resources } from '../types';
import { Ctx } from 'boardgame.io';
import { STAGE_MOVES } from '../constants';
import { isValidPlayer } from '../../utils/validation';
// Import the helper directly, not from RuleEngine object
import { getValidMovesForStage, RuleEngine } from '../rules/validator';
import { getVerticesForHex } from '../hexUtils';
import { countResources } from '../mechanics/resources';

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
    'dismissRobber', // Requires target hex AND victim
    'discardResources'
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
    const hasSpatialMoves = moveTypesList.some(m => PARAMETERIZED_MOVES.has(m) && m !== 'tradeBank' && m !== 'dismissRobber' && m !== 'discardResources');
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
            // Handle Spatial Parameterized Moves (Simple args: [id])
            if (moveName === 'placeSettlement' || moveName === 'buildSettlement' || moveName === 'buildCity' ||
                moveName === 'placeRoad' || moveName === 'buildRoad') {
                spots.forEach(id => moves.push(makeMove(moveName, [id])));
            }
        } else if (moveName === 'dismissRobber') {
            // Handle Robber: Enumerate Hexes AND Victims
             const validRobberSpots = Object.keys(G.board.hexes).filter(id => id !== G.robberLocation);

             validRobberSpots.forEach(hexID => {
                 // Find potential victims on this hex
                 const potentialVictims = new Set<string>();
                 const vertices = getVerticesForHex(G.board.hexes[hexID].coords);

                 vertices.forEach(vId => {
                     const vertex = G.board.vertices[vId];
                     if (vertex && vertex.owner !== playerID) {
                         // Only consider victims with resources
                         if (countResources(G.players[vertex.owner].resources) > 0) {
                              potentialVictims.add(vertex.owner);
                         }
                     }
                 });

                 if (potentialVictims.size > 0) {
                     // Must choose a victim
                     potentialVictims.forEach(victimID => {
                         moves.push(makeMove('dismissRobber', [hexID, victimID]));
                     });
                 } else {
                     // No victims available, just move robber
                     moves.push(makeMove('dismissRobber', [hexID]));
                 }
             });

        } else if (moveName === 'discardResources') {
            // Handle Discard: Generate ONE valid discard option to prevent bot lock-up.
            // (Enumerating all combinations is too expensive and unnecessary for MCTS in this phase usually)
            const player = G.players[playerID];
            const total = countResources(player.resources);
            if (total > 7) {
                const toDiscardCount = Math.floor(total / 2);

                // Simple greedy strategy: Discard from largest piles first
                const resourcesToDiscard: Resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };
                let remaining = toDiscardCount;
                const tempRes = { ...player.resources };

                // Sort resource types by amount descending
                const sortedTypes = (Object.keys(tempRes) as (keyof Resources)[])
                    .sort((a, b) => tempRes[b] - tempRes[a]);

                for (const type of sortedTypes) {
                    const take = Math.min(remaining, tempRes[type]);
                    resourcesToDiscard[type] += take;
                    remaining -= take;
                    if (remaining === 0) break;
                }

                if (remaining === 0) {
                     moves.push(makeMove('discardResources', [resourcesToDiscard]));
                }
            }

        } else if (moveName === 'tradeBank') {
            // Special Case: Transactional Move (0-arg but conditional)
            // Delegate to RuleEngine for consistency
            if (RuleEngine.validateMove(G, ctx, 'tradeBank', []).isValid) {
                moves.push(makeMove('tradeBank', []));
            }
        } else {
            // Handle Non-Parameterized Moves (Everything else)
            // Assume 0-argument validity (e.g., rollDice, endTurn, regenerateBoard)
            if (moveName === 'rollDice' || moveName === 'endTurn' || moveName === 'regenerateBoard') {
                 moves.push(makeMove(moveName, []));
            }
        }
    });

    return moves;
};
