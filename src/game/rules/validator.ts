import { GameState } from '../types';
import { Ctx } from 'boardgame.io';
import { validateBuildRoad, validateBuildSettlement, validateBuildCity } from './gameplay';
import {
    validateSettlementLocation,
    isValidSetupRoadPlacement,
    isValidSettlementPlacement,
    isValidCityPlacement,
    isValidRoadPlacement,
    ValidationResult
} from './spatial';
import { getVerticesForHex, getVerticesForEdge, getEdgesForVertex } from '../hexUtils';
import { getAffordableBuilds } from '../mechanics/costs';
import { PHASES, STAGES } from '../constants';
import { isValidPlayer } from '../../utils/validation';

/**
 * The Rule Engine Facade.
 * Centralizes validation for all moves.
 */
export const RuleEngine = {
    /**
     * Validates a move and returns a result object.
     */
    validateMove: (G: GameState, ctx: Ctx, moveName: string, args: any[]): ValidationResult => {
        const playerID = ctx.currentPlayer;

        switch (moveName) {
            // Gameplay Moves
            case 'buildRoad':
                return validateBuildRoad(G, playerID, args[0]);
            case 'buildSettlement':
                return validateBuildSettlement(G, playerID, args[0]);
            case 'buildCity':
                return validateBuildCity(G, playerID, args[0]);

            // Setup Moves
            case 'placeSettlement':
                // In Setup, "placeSettlement" checks geometric rules but ignores cost/connectivity to road
                return validateSettlementLocation(G, args[0]);
            case 'placeRoad':
                // In Setup, "placeRoad" must connect to the just-placed settlement
                return isValidSetupRoadPlacement(G, args[0], playerID);

            default:
                return { isValid: false, reason: `Unknown move: ${moveName}` };
        }
    },

    /**
     * Validates a move and throws an error if invalid.
     * Used by move handlers to abort execution.
     */
    validateMoveOrThrow: (G: GameState, ctx: Ctx, moveName: string, args: any[]): void => {
        const result = RuleEngine.validateMove(G, ctx, moveName, args);
        if (!result.isValid) {
            throw new Error(result.reason || "Invalid move");
        }
    }
};

/**
 * Internal helper to validate player and check affordability.
 * Returns true if the player is valid AND (if checkCost is true) can afford the build type.
 */
const _canBuild = (G: GameState, playerID: string, type: 'settlement' | 'city' | 'road', checkCost: boolean): boolean => {
    if (!isValidPlayer(G, playerID)) {
        return false;
    }

    if (checkCost) {
        const affordable = getAffordableBuilds(G.players[playerID].resources);
        if (!affordable[type]) {
            return false;
        }
    }
    return true;
};

/**
 * Returns a set of all vertex IDs where the player can legally build a settlement.
 * Scans the entire board.
 *
 * @param checkCost - If true, checks if the player can afford a settlement. Defaults to true.
 */
export const getValidSettlementSpots = (G: GameState, playerID: string, checkCost = true): Set<string> => {
    const validSpots = new Set<string>();

    if (!_canBuild(G, playerID, 'settlement', checkCost)) {
        return validSpots;
    }

    const checked = new Set<string>();

    // Optimization: Instead of scanning all possible vertices, we only scan vertices adjacent
    // to the player's existing roads. A new settlement MUST connect to an existing road.
    const playerRoads = G.players[playerID]?.roads || [];
    playerRoads.forEach(roadId => {
        // 'roadId' is an edge ID. Get its endpoints (vertices).
        const endpoints = getVerticesForEdge(roadId);
        endpoints.forEach(vId => {
            if (checked.has(vId)) return;
            checked.add(vId);

            if (isValidSettlementPlacement(G, vId, playerID).isValid) {
                validSpots.add(vId);
            }
        });
    });

    return validSpots;
};

/**
 * Returns a set of all vertex IDs where the player can legally build a city.
 *
 * @param checkCost - If true, checks if the player can afford a city. Defaults to true.
 */
export const getValidCitySpots = (G: GameState, playerID: string, checkCost = true): Set<string> => {
    const validSpots = new Set<string>();

    if (!_canBuild(G, playerID, 'city', checkCost)) {
        return validSpots;
    }

    // Cities can only be built on existing settlements
    G.players[playerID].settlements.forEach(vId => {
        if (isValidCityPlacement(G, vId, playerID).isValid) {
            validSpots.add(vId);
        }
    });

    return validSpots;
};

/**
 * Returns a set of all edge IDs where the player can legally build a road.
 *
 * @param checkCost - If true, checks if the player can afford a road. Defaults to true.
 */
export const getValidRoadSpots = (G: GameState, playerID: string, checkCost = true): Set<string> => {
    const validSpots = new Set<string>();

    if (!_canBuild(G, playerID, 'road', checkCost)) {
        return validSpots;
    }

    const checked = new Set<string>();

    // Optimization: Instead of scanning all possible edges, we only scan edges adjacent
    // to the player's network (roads, settlements, cities).
    const player = G.players[playerID];
    if (!player) return validSpots;

    // 1. Check edges adjacent to existing roads
    player.roads.forEach(roadId => {
        const endpoints = getVerticesForEdge(roadId);
        endpoints.forEach(vId => {
            const adjEdges = getEdgesForVertex(vId);
            adjEdges.forEach(eId => {
                 if (checked.has(eId)) return;
                 checked.add(eId);
                 if (isValidRoadPlacement(G, eId, playerID).isValid) {
                     validSpots.add(eId);
                 }
            });
        });
    });

    // 2. Check edges adjacent to settlements/cities (for new branches)
    player.settlements.forEach(vId => {
         const adjEdges = getEdgesForVertex(vId);
         adjEdges.forEach(eId => {
             if (checked.has(eId)) return;
             checked.add(eId);
             if (isValidRoadPlacement(G, eId, playerID).isValid) {
                 validSpots.add(eId);
             }
         });
    });

    return validSpots;
};

/**
 * Returns a set of all vertex IDs valid for INITIAL settlement placement (Setup Phase).
 * Valid = Empty + Distance Rule (no connectivity required).
 */
export const getValidSetupSettlementSpots = (G: GameState): Set<string> => {
    const validSpots = new Set<string>();
    const checked = new Set<string>();

    Object.values(G.board.hexes).forEach(hex => {
        const vertices = getVerticesForHex(hex.coords);
        vertices.forEach(vId => {
            if (checked.has(vId)) return;
            checked.add(vId);

            if (validateSettlementLocation(G, vId).isValid) {
                validSpots.add(vId);
            }
        });
    });

    return validSpots;
};

/**
 * Returns a set of all edge IDs valid for INITIAL road placement (Setup Phase).
 * Valid = Empty + Connected to last settlement.
 */
export const getValidSetupRoadSpots = (G: GameState, playerID: string): Set<string> => {
    const validSpots = new Set<string>();

    // This function also accesses G.players, so we should valid the playerID
    if (!isValidPlayer(G, playerID)) {
        return validSpots;
    }

    // Optimization: In Setup, a road MUST attach to the last placed settlement.
    // So we only need to check edges adjacent to that single settlement.
    const lastSettlementId = G.players[playerID]?.settlements.at(-1);

    if (lastSettlementId) {
        const adjEdges = getEdgesForVertex(lastSettlementId);
        adjEdges.forEach(eId => {
             // No need for 'checked' set as we iterate a small, unique list once
             if (isValidSetupRoadPlacement(G, eId, playerID).isValid) {
                 validSpots.add(eId);
             }
        });
    }

    return validSpots;
};

export interface ValidMoves {
    validSettlements: Set<string>;
    validCities: Set<string>;
    validRoads: Set<string>;
}

const EMPTY_VALID_MOVES: ValidMoves = {
    validSettlements: new Set(),
    validCities: new Set(),
    validRoads: new Set()
};

/**
 * Returns all valid moves for the current stage, handling both Setup and Gameplay rules.
 * Automatically checks affordability for Gameplay moves unless checkCost is false.
 */
export const getValidMovesForStage = (G: GameState, ctx: Ctx, playerID: string, checkCost = true): ValidMoves => {
    // Validate playerID before any other checks
    if (!isValidPlayer(G, playerID)) {
        return EMPTY_VALID_MOVES;
    }

    const currentStage = ctx.activePlayers?.[playerID];
    const currentPhase = ctx.phase;

    if (currentPhase === PHASES.SETUP) {
        if (currentStage === STAGES.PLACE_SETTLEMENT) {
            return {
                ...EMPTY_VALID_MOVES,
                validSettlements: getValidSetupSettlementSpots(G)
            };
        }
        if (currentStage === STAGES.PLACE_ROAD) {
            return {
                ...EMPTY_VALID_MOVES,
                validRoads: getValidSetupRoadSpots(G, playerID)
            };
        }
    } else if (currentPhase === PHASES.GAMEPLAY) {
        if (currentStage === STAGES.ACTING) {
            return {
                validSettlements: getValidSettlementSpots(G, playerID, checkCost),
                validCities: getValidCitySpots(G, playerID, checkCost),
                validRoads: getValidRoadSpots(G, playerID, checkCost)
            };
        }
    }

    return EMPTY_VALID_MOVES;
};
