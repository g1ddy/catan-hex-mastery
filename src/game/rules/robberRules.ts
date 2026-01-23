import { GameState } from '../core/types';
import { safeGet } from '../../game/core/utils/objectUtils';
import { getVerticesForHex } from '../geometry/hexUtils';
import { countResources } from '../mechanics/resources';

/**
 * Returns all valid hex IDs for the Robber (all except current location).
 */
export const getValidRobberLocations = (G: GameState): Set<string> => {
    return new Set(Object.keys(G.board.hexes).filter(id => id !== G.robberLocation));
};

/**
 * Returns a set of all valid Robber destinations (Hex IDs).
 * Alias for getValidRobberLocations to maintain API consistency if needed.
 */
export const getValidRobberSpots = (G: GameState): Set<string> => {
    return getValidRobberLocations(G);
};

/**
 * Helper to identify valid victims on a target hex.
 */
export const getPotentialVictims = (G: GameState, hexID: string, playerID: string): Set<string> => {
    const potentialVictims = new Set<string>();
    const hex = safeGet(G.board.hexes, hexID);
    if (!hex) return potentialVictims;

    const vertices = getVerticesForHex(hex.coords);

    vertices.forEach(vId => {
        const vertex = safeGet(G.board.vertices, vId);
        if (vertex && vertex.owner !== playerID) {
            const victim = G.players[vertex.owner];
            if (victim && countResources(victim.resources) > 0) {
                 potentialVictims.add(vertex.owner);
            }
        }
    });

    return potentialVictims;
};

/**
 * Returns a set of all valid victims for a given robber hex.
 * Alias for getPotentialVictims.
 */
export const getValidRobberVictims = (G: GameState, hexID: string, playerID: string): Set<string> => {
    return getPotentialVictims(G, hexID, playerID);
};
