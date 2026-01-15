import { GameState } from '../types';
import { getVerticesForHex, getEdgesForHex } from '../hexUtils';
import { isValidSettlementPlacement, isValidCityPlacement, isValidRoadPlacement, validateSettlementLocation, isValidSetupRoadPlacement } from './placement';
import { getAffordableBuilds } from '../mechanics/costs';
import { Ctx } from 'boardgame.io';
import { PHASES, STAGES } from '../constants';
import { isValidPlayer } from '../../utils/validation';

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

    // Optimization: Instead of scanning all possible vertices, we could scan near player's roads.
    // However, for total correctness (and because the board is small), scanning hexes is acceptable.
    Object.values(G.board.hexes).forEach(hex => {
        const vertices = getVerticesForHex(hex.coords);
        vertices.forEach(vId => {
            if (checked.has(vId)) return;
            checked.add(vId);

            if (isValidSettlementPlacement(G, vId, playerID)) {
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
        if (isValidCityPlacement(G, vId, playerID)) {
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

    Object.values(G.board.hexes).forEach(hex => {
        const edges = getEdgesForHex(hex.coords);
        edges.forEach(eId => {
            if (checked.has(eId)) return;
            checked.add(eId);

            if (isValidRoadPlacement(G, eId, playerID)) {
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
    const checked = new Set<string>();

    // This function also accesses G.players, so we should valid the playerID
    if (!isValidPlayer(G, playerID)) {
        return validSpots;
    }

    Object.values(G.board.hexes).forEach(hex => {
        const edges = getEdgesForHex(hex.coords);
        edges.forEach(eId => {
            if (checked.has(eId)) return;
            checked.add(eId);

            if (isValidSetupRoadPlacement(G, eId, playerID).isValid) {
                validSpots.add(eId);
            }
        });
    });

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
