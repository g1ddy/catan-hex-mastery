import { GameState } from '../types';
import { getVerticesForHex, getEdgesForHex } from '../hexUtils';
import { isValidSettlementPlacement, isValidCityPlacement, isValidRoadPlacement, validateSettlementLocation, isValidSetupRoadPlacement } from './placement';
import { getAffordableBuilds } from '../mechanics/costs';
import { Ctx } from 'boardgame.io';
import { PHASES, STAGES } from '../constants';

/**
 * Returns a set of all vertex IDs where the player can legally build a settlement.
 * Scans the entire board.
 *
 * @param checkCost - If true, checks if the player can afford a settlement. Defaults to true.
 */
export const getValidSettlementSpots = (G: GameState, playerID: string, checkCost = true): Set<string> => {
    const validSpots = new Set<string>();

    if (checkCost) {
        const affordable = getAffordableBuilds(G.players[playerID].resources);
        if (!affordable.settlement) {
            return validSpots;
        }
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

    if (checkCost) {
        const affordable = getAffordableBuilds(G.players[playerID].resources);
        if (!affordable.city) {
            return validSpots;
        }
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

    if (checkCost) {
        const affordable = getAffordableBuilds(G.players[playerID].resources);
        if (!affordable.road) {
            return validSpots;
        }
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

/**
 * Returns all valid moves for the current stage, handling both Setup and Gameplay rules.
 * Automatically checks affordability for Gameplay moves unless checkCost is false.
 */
export const getValidMovesForStage = (G: GameState, ctx: Ctx, playerID: string, checkCost = true): ValidMoves => {
    const currentStage = ctx.activePlayers?.[playerID];
    const isSetup = ctx.phase === PHASES.SETUP;

    if (isSetup) {
        if (currentStage === STAGES.PLACE_SETTLEMENT) {
            return {
                validSettlements: getValidSetupSettlementSpots(G),
                validCities: new Set(),
                validRoads: new Set()
            };
        }
        if (currentStage === STAGES.PLACE_ROAD) {
            return {
                validSettlements: new Set(),
                validCities: new Set(),
                validRoads: getValidSetupRoadSpots(G, playerID)
            };
        }
    }

    if (ctx.phase === PHASES.GAMEPLAY && currentStage === STAGES.ACTING) {
        return {
            validSettlements: getValidSettlementSpots(G, playerID, checkCost),
            validCities: getValidCitySpots(G, playerID, checkCost),
            validRoads: getValidRoadSpots(G, playerID, checkCost)
        };
    }

    return {
        validSettlements: new Set(),
        validCities: new Set(),
        validRoads: new Set()
    };
};
