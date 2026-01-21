import { GameState } from '../types';
import { getVertexNeighbors, getEdgesForVertex, getVerticesForEdge, getHexesForEdge, getHexesForVertex } from '../hexUtils';
import { isValidHexId } from '../../utils/validation';
import { safeCheck, safeGet } from '../../utils/objectUtils';

export interface ValidationResult<T = unknown> {
    isValid: boolean;
    reason?: string;
    data?: T;
}

const hasValidHex = (G: GameState, hexIds: string[]): boolean => {
    return hexIds.some(id => safeCheck(G.board.hexes, id));
};

export const validateSettlementLocation = (G: GameState, vertexId: string): ValidationResult => {
    if (!isValidHexId(vertexId)) {
        return { isValid: false, reason: "Invalid vertex ID format" };
    }
    if (!hasValidHex(G, getHexesForVertex(vertexId))) {
        return { isValid: false, reason: "This location is off the board" };
    }
    if (safeCheck(G.board.vertices, vertexId)) {
        return { isValid: false, reason: "This vertex is already occupied" };
    }

    const neighbors = getVertexNeighbors(vertexId);
    if (neighbors.some(n => safeCheck(G.board.vertices, n))) {
        return { isValid: false, reason: "Settlement is too close to another building" };
    }

    return { isValid: true };
};

/** @deprecated Use validateSettlementLocation for detailed errors. */
export const isValidSettlementLocation = (G: GameState, vertexId: string): boolean => {
    return validateSettlementLocation(G, vertexId).isValid;
};

export const isValidSettlementPlacement = (G: GameState, vertexId: string, playerID: string): ValidationResult => {
    const locationCheck = validateSettlementLocation(G, vertexId);
    if (!locationCheck.isValid) return locationCheck;

    const adjEdges = getEdgesForVertex(vertexId);
    const hasOwnRoad = adjEdges.some(eId => {
        const edge = safeGet(G.board.edges, eId);
        return edge?.owner === playerID;
    });

    if (!hasOwnRoad) {
        return { isValid: false, reason: "Settlement must connect to your own road" };
    }

    return { isValid: true };
};

export const isValidCityPlacement = (G: GameState, vertexId: string, playerID: string): ValidationResult => {
    if (!isValidHexId(vertexId)) {
        return { isValid: false, reason: "Invalid vertex ID format" };
    }
    const vertex = safeGet(G.board.vertices, vertexId);
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

export const isValidRoadPlacement = (G: GameState, edgeId: string, playerID: string): ValidationResult => {
    if (!isValidHexId(edgeId)) {
        return { isValid: false, reason: "Invalid edge ID format" };
    }
    if (!hasValidHex(G, getHexesForEdge(edgeId))) {
        return { isValid: false, reason: "This edge is off the board" };
    }
    if (safeCheck(G.board.edges, edgeId)) {
        return { isValid: false, reason: "This edge is already occupied" };
    }

    const endpoints = getVerticesForEdge(edgeId);
    const hasConnection = endpoints.some(vId => {
        const vertex = safeGet(G.board.vertices, vId);
        if (vertex?.owner === playerID) return true;
        if (vertex && vertex.owner !== playerID) return false;

        const adjEdges = getEdgesForVertex(vId);
        return adjEdges.some(adjEdgeId => {
            if (adjEdgeId === edgeId) return false;
            const adjEdge = safeGet(G.board.edges, adjEdgeId);
            return adjEdge?.owner === playerID;
        });
    });

    if (!hasConnection) {
        return { isValid: false, reason: "Road must connect to your existing road or settlement" };
    }

    return { isValid: true };
};

export const isValidSetupRoadPlacement = (G: GameState, edgeId: string, playerID: string): ValidationResult => {
    if (!isValidHexId(edgeId)) {
        return { isValid: false, reason: "Invalid edge ID format" };
    }
    if (!hasValidHex(G, getHexesForEdge(edgeId))) {
        return { isValid: false, reason: "This edge is off the board" };
    }
    if (safeCheck(G.board.edges, edgeId)) {
        return { isValid: false, reason: "This edge is already occupied" };
    }

    const lastSettlementId = G.players[playerID]?.settlements.at(-1);
    if (!lastSettlementId) {
        return { isValid: false, reason: "No active settlement found to connect to" };
    }

    const connectedEdges = getEdgesForVertex(lastSettlementId);
    if (!connectedEdges.includes(edgeId)) {
        return { isValid: false, reason: "Road must connect to your just-placed settlement" };
    }

    return { isValid: true };
};

export const isValidRobberPlacement = (G: GameState, hexId: string): ValidationResult => {
    if (!isValidHexId(hexId)) {
        return { isValid: false, reason: "Invalid hex ID format" };
    }
    if (!safeCheck(G.board.hexes, hexId)) {
         return { isValid: false, reason: "Invalid hex location" };
    }
    if (G.robberLocation === hexId) {
        return { isValid: false, reason: "You must move the robber to a new location" };
    }

    return { isValid: true };
};
