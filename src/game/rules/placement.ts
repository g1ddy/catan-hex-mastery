import { GameState } from '../types';
import { getVertexNeighbors, getEdgesForVertex, getVerticesForEdge } from '../hexUtils';
import { isValidHexId } from '../../utils/validation';

/* eslint-disable security/detect-object-injection */

/**
 * Checks if a settlement can be placed at the given vertex based on physical rules.
 * Enforces:
 * 1. Spot is not already occupied.
 * 2. Distance Rule: No other building is adjacent.
 *
 * This does NOT check for road connectivity (which is not required in Setup, but is in Gameplay).
 *
 * @param G The game state.
 * @param vertexId The ID of the vertex to check.
 * @returns True if the location is physically valid for a settlement.
 */
export const isValidSettlementLocation = (G: GameState, vertexId: string): boolean => {
    // 1. Check if occupied
    if (G.board.vertices[vertexId]) {
        return false;
    }

    // 2. Check Distance Rule
    const neighbors = getVertexNeighbors(vertexId);
    if (neighbors.some(n => G.board.vertices[n])) {
        return false;
    }

    return true;
};

/**
 * Checks if a settlement allows placement by a specific player, including connectivity.
 * Use this for the "Build Settlement" action during Gameplay.
 *
 * @param G The game state.
 * @param vertexId The ID of the vertex.
 * @param playerID The player ID.
 * @returns True if valid and connected.
 */
export const isValidSettlementPlacement = (G: GameState, vertexId: string, playerID: string): boolean => {
    if (!isValidSettlementLocation(G, vertexId)) return false;

    // Check connectivity to own road
    const adjEdges = getEdgesForVertex(vertexId);
    return adjEdges.some(eId => {
        const edge = G.board.edges[eId];
        return edge && edge.owner === playerID;
    });
};

/**
 * Checks if a city can be placed at the given vertex.
 * Enforces:
 * 1. Must be an existing settlement owned by the player.
 *
 * @param G The game state.
 * @param vertexId The ID of the vertex to check.
 * @param playerID The ID of the player attempting to build.
 * @returns True if valid.
 */
export const isValidCityPlacement = (G: GameState, vertexId: string, playerID: string): boolean => {
    const vertex = G.board.vertices[vertexId];
    if (!vertex) return false;
    return vertex.type === 'settlement' && vertex.owner === playerID;
};

/**
 * Checks if a road can be placed at the given edge.
 * Enforces:
 * 1. Edge is not already occupied.
 * 2. Connectivity: Must connect to an existing road or building owned by the player.
 * 3. Blocking: Cannot connect through an opponent's settlement/city.
 *
 * @param G The game state.
 * @param edgeId The ID of the edge to check.
 * @param playerID The ID of the player attempting to build.
 * @returns True if valid.
 */
export const isValidRoadPlacement = (G: GameState, edgeId: string, playerID: string): boolean => {
    // 1. Check if occupied
    if (G.board.edges[edgeId]) {
        return false;
    }

    // 2. Connectivity & Blocking
    const endpoints = getVerticesForEdge(edgeId);

    return endpoints.some(vId => {
        const vertex = G.board.vertices[vId];

        // A. Direct connection to own building
        if (vertex && vertex.owner === playerID) return true;

        // B. Connection to own road (IF not blocked by opponent building)
        if (vertex && vertex.owner !== playerID) return false; // Blocked by opponent or just opponent's building

        // If vertex is empty (or technically shouldn't happen if we returned above, but for safety: vertex is undefined or null)
        // Check for incoming roads
        const adjEdges = getEdgesForVertex(vId);
        return adjEdges.some(adjEdgeId => {
            if (adjEdgeId === edgeId) return false;
            const adjEdge = G.board.edges[adjEdgeId];
            return adjEdge && adjEdge.owner === playerID;
        });
    });
};


/**
 * Represents the result of a validation check.
 */
export interface ValidationResult {
    isValid: boolean;
    reason?: string;
}

/**
 * Checks if a road can be placed during the Setup Phase.
 * Special Setup Rule: Must be attached to the player's last placed settlement.
 *
 * @param G The game state
 * @param edgeId The edge ID
 * @param playerID The player ID
 * @returns A ValidationResult object.
 */
export const isValidSetupRoadPlacement = (G: GameState, edgeId: string, playerID: string): ValidationResult => {
    // Check Occupancy
    // eslint-disable-next-line security/detect-object-injection
    if (G.board.edges[edgeId]) {
        return { isValid: false, reason: "This edge is already occupied" };
    }

    // Check for active settlement
    const lastSettlementId = G.players[playerID].settlements.at(-1);
    if (!lastSettlementId) {
        return { isValid: false, reason: "No active settlement found to connect to" };
    }

    // Check Connectivity
    const connectedEdges = getEdgesForVertex(lastSettlementId);
    if (!connectedEdges.includes(edgeId)) {
        return { isValid: false, reason: "Road must connect to your just-placed settlement" };
    }

    return { isValid: true };
};
