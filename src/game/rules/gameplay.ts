import { GameState } from '../types';
import { canAffordRoad, canAffordSettlement, canAffordCity } from './common';
import { isValidRoadPlacement, isValidCityPlacement, isValidSettlementPlacement, ValidationResult, isValidRobberPlacement } from './spatial';
import { calculateTrade, TradeResult } from '../mechanics/trade';
import { isValidPlayer } from '../../utils/validation';
import { BANK_TRADE_GIVE_AMOUNT } from '../config';
import { countResources } from '../mechanics/resources';
import { getVerticesForHex } from '../hexUtils';

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

    // Uses ValidationResult from spatial directly, no need for redundant checks
    return isValidRoadPlacement(G, edgeId, playerID);
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

    // 1. Check for geometric validity (occupancy, distance rule) AND connectivity
    return isValidSettlementPlacement(G, vertexId, playerID);
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

    return isValidCityPlacement(G, vertexId, playerID);
};

/**
 * Validates the "Trade Bank" move.
 * Checks:
 * 1. Resource sufficiency for at least one trade.
 */
export const validateTradeBank = (G: GameState, playerID: string): ValidationResult<TradeResult> => {
    if (!isValidPlayer(G, playerID)) {
        return { isValid: false, reason: "Invalid player" };
    }

    // eslint-disable-next-line security/detect-object-injection
    const player = G.players[playerID];
    const tradeResult = calculateTrade(player.resources);

    if (!tradeResult.canTrade) {
        return { isValid: false, reason: `You need at least ${BANK_TRADE_GIVE_AMOUNT} of a resource to trade.` };
    }

    return { isValid: true, data: tradeResult };
};


/**
 * Helper to identify valid victims on a target hex.
 * A valid victim is an opponent with a settlement/city on the hex AND resources > 0.
 */
export const getPotentialVictims = (G: GameState, hexID: string, playerID: string): Set<string> => {
    const potentialVictims = new Set<string>();
    // eslint-disable-next-line security/detect-object-injection
    const hex = G.board.hexes[hexID];
    if (!hex) return potentialVictims;

    const vertices = getVerticesForHex(hex.coords);

    vertices.forEach(vId => {
        const vertex = G.board.vertices[vId];
        if (vertex && vertex.owner !== playerID) {
            // Only consider victims with resources
            if (countResources(G.players[vertex.owner].resources) > 0) {
                 potentialVictims.add(vertex.owner);
            }
        }
    });

    return potentialVictims;
};

/**
 * Validates the "Dismiss Robber" move (Move Robber + Steal).
 */
export const validateRobberMove = (G: GameState, playerID: string, hexID: string, victimID?: string): ValidationResult => {
    // 1. Validate Geometric Placement
    const spatialCheck = isValidRobberPlacement(G, hexID);
    if (!spatialCheck.isValid) {
        return spatialCheck;
    }

    // 2. Identify Potential Victims on the Target Hex
    const potentialVictims = getPotentialVictims(G, hexID, playerID);

    // 3. Validate Victim Choice
    if (victimID) {
        if (!potentialVictims.has(victimID)) {
            const vertices = getVerticesForHex(G.board.hexes[hexID].coords);
            const isOnHex = vertices.some(vId => G.board.vertices[vId]?.owner === victimID);
            if (!isOnHex) {
                 return { isValid: false, reason: "The chosen victim does not have a settlement on this hex." };
            }
            // If the player is on the hex but not in potentialVictims, it must be because they have no resources.
            return { isValid: false, reason: "The chosen victim has no resources to steal." };
        }
    }
    // If no victimID provided, we allow it (game will pick randomly if victims exist)

    return { isValid: true };
};
