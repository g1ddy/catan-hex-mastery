import { GameState } from '../types';
import { canAffordRoad, canAffordSettlement, canAffordCity } from './common';
import { isValidRoadPlacement, isValidCityPlacement, validateSettlementLocation, ValidationResult } from './spatial';
import { getEdgesForVertex } from '../hexUtils';

/**
 * Validates the "Build Road" move during the Gameplay Phase.
 * Checks:
 * 1. Affordability
 * 2. Geometric Validity (Occupancy + Connectivity)
 */
export const validateBuildRoad = (G: GameState, playerID: string, edgeId: string): ValidationResult => {
    if (!canAffordRoad(G, playerID)) {
        return { isValid: false, reason: "Not enough resources to build a road (requires Wood, Brick)" };
    }

    if (!isValidRoadPlacement(G, edgeId, playerID)) {
        // eslint-disable-next-line security/detect-object-injection
        if (G.board.edges[edgeId]) {
            return { isValid: false, reason: "This edge is already occupied" };
        }
        return { isValid: false, reason: "Road must connect to your existing road or settlement" };
    }

    return { isValid: true };
};

/**
 * Validates the "Build Settlement" move during the Gameplay Phase.
 * Checks:
 * 1. Affordability
 * 2. Geometric Validity (Occupancy + Distance Rule + Connectivity)
 */
export const validateBuildSettlement = (G: GameState, playerID: string, vertexId: string): ValidationResult => {
    if (!canAffordSettlement(G, playerID)) {
        return { isValid: false, reason: "Not enough resources to build a settlement (requires Wood, Brick, Wheat, Sheep)" };
    }

    // 1. Check for geometric validity (occupancy, distance rule)
    const locationValidation = validateSettlementLocation(G, vertexId);
    if (!locationValidation.isValid) {
        return locationValidation;
    }

    // 2. Check for road connectivity
    const adjEdges = getEdgesForVertex(vertexId);
    const hasOwnRoad = adjEdges.some(eId => {
        // eslint-disable-next-line security/detect-object-injection
        const edge = G.board.edges[eId];
        return edge && edge.owner === playerID;
    });

    if (!hasOwnRoad) {
        return { isValid: false, reason: "Settlement must connect to your own road" };
    }

    return { isValid: true };
};

/**
 * Validates the "Build City" move during the Gameplay Phase.
 * Checks:
 * 1. Affordability
 * 2. Validity (Must be own settlement)
 */
export const validateBuildCity = (G: GameState, playerID: string, vertexId: string): ValidationResult => {
    if (!canAffordCity(G, playerID)) {
        return { isValid: false, reason: "Not enough resources to build a city (requires 3 Ore, 2 Wheat)" };
    }

    if (!isValidCityPlacement(G, vertexId, playerID)) {
         return { isValid: false, reason: "You can only upgrade your own settlements to cities" };
    }

    return { isValid: true };
};
