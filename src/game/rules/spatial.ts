import { GameState } from '../types';
import { getVertexNeighbors, getEdgesForVertex, getVerticesForEdge } from '../hexUtils';
import { isValidHexId } from '../../utils/validation';

/* eslint-disable security/detect-object-injection */

/**
 * Represents the result of a validation check.
 */
export interface ValidationResult {
    isValid: boolean;
    reason?: string;
}

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
 * @returns A ValidationResult object.
 */
export const validateSettlementLocation = (G: GameState, vertexId: string): ValidationResult => {
    // 0. Security Validation
    if (!isValidHexId(vertexId)) {
        return { isValid: false, reason: "Invalid vertex ID format" };
    }

    // 1. Check if occupied
    if (G.board.vertices[vertexId]) {
        return { isValid: false, reason: "This vertex is already occupied" };
    }

    // 2. Check Distance Rule
    const neighbors = getVertexNeighbors(vertexId);
    if (neighbors.some(n => G.board.vertices[n])) {
        return { isValid: false, reason: "Settlement is too close to another building" };
    }

    return { isValid: true };
};

/**
 * Backwards compatibility wrapper for boolean checks.
 * @deprecated Use validateSettlementLocation for detailed errors.
 */
export const isValidSettlementLocation = (G: GameState, vertexId: string): boolean => {
    return validateSettlementLocation(G, vertexId).isValid;
};

/**
 * Checks if a settlement allows placement by a specific player, including connectivity.
 * Use this for the "Build Settlement" action during Gameplay.
 *
 * @param G The game state.
 * @param vertexId The ID of the vertex.
 * @param playerID The player ID.
 * @returns ValidationResult
 */
export const isValidSettlementPlacement = (G: GameState, vertexId: string, playerID: string): ValidationResult => {
    const locationCheck = validateSettlementLocation(G, vertexId);
    if (!locationCheck.isValid) return locationCheck;

    // Check connectivity to own road
    const adjEdges = getEdgesForVertex(vertexId);
    const hasOwnRoad = adjEdges.some(eId => {
        const edge = G.board.edges[eId];
        return edge && edge.owner === playerID;
    });

    if (!hasOwnRoad) {
        return { isValid: false, reason: "Settlement must connect to your own road" };
    }

    return { isValid: true };
};

/**
 * Checks if a city can be placed at the given vertex.
 * Enforces:
 * 1. Must be an existing settlement owned by the player.
 *
 * @param G The game state.
 * @param vertexId The ID of the vertex to check.
 * @param playerID The ID of the player attempting to build.
 * @returns ValidationResult
 */
export const isValidCityPlacement = (G: GameState, vertexId: string, playerID: string): ValidationResult => {
    // 0. Security Validation
    if (!isValidHexId(vertexId)) {
        return { isValid: false, reason: "Invalid vertex ID format" };
    }
    const vertex = G.board.vertices[vertexId];
    if (!vertex) {
        return { isValid: false, reason: "No settlement exists at this location" };
    }
    if (vertex.type !== 'settlement') {
        return { isValid: false, reason: "Only settlements can be upgraded to cities" };
    }
    if (vertex.owner !== playerID) {
        return { isValid: false, reason: "You can only upgrade your own settlements" };
    }
    return { isValid: true };
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
 * @returns A ValidationResult object.
 */
export const isValidRoadPlacement = (G: GameState, edgeId: string, playerID: string): ValidationResult => {
    // 0. Security Validation
    if (!isValidHexId(edgeId)) {
        return { isValid: false, reason: "Invalid edge ID format" };
    }

    // 1. Check if occupied
    if (G.board.edges[edgeId]) {
        return { isValid: false, reason: "This edge is already occupied" };
    }

    // 2. Connectivity & Blocking
    const endpoints = getVerticesForEdge(edgeId);

    const hasConnection = endpoints.some(vId => {
        const vertex = G.board.vertices[vId];

        // A. Direct connection to own.
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

    if (!hasConnection) {
        return { isValid: false, reason: "Road must connect to your existing road or settlement" };
    }

    return { isValid: true };
};

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
    // 0. Security Validation
    if (!isValidHexId(edgeId)) {
        return { isValid: false, reason: "Invalid edge ID format" };
    }

    // Check Occupancy
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
