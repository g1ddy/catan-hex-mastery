import { GameState } from '../types';
import { getVerticesForHex, getEdgesForHex } from '../hexUtils';
import { isValidSettlementPlacement, isValidCityPlacement, isValidRoadPlacement, validateSettlementLocation, isValidSetupRoadPlacement } from './placement';

/**
 * Returns a set of all vertex IDs where the player can legally build a settlement.
 * Scans the entire board.
 */
export const getValidSettlementSpots = (G: GameState, playerID: string): Set<string> => {
    const validSpots = new Set<string>();
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
 */
export const getValidCitySpots = (G: GameState, playerID: string): Set<string> => {
    const validSpots = new Set<string>();

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
 */
export const getValidRoadSpots = (G: GameState, playerID: string): Set<string> => {
    const validSpots = new Set<string>();
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
