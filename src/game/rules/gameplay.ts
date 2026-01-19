import { GameState, Resources } from '../types';
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
 * Validates the "Discard Resources" move.
 * Checks:
 * 1. Player is in the discard list.
 * 2. Discard amount is correct (half rounded down).
 * 3. Player actually has the resources they are trying to discard.
 */
export const validateDiscardResources = (G: GameState, playerID: string, resources: Resources): ValidationResult => {
    // 0. Security Check: Prevent negative resource discard (exploit)
    for (const resource of Object.values(resources)) {
        if (resource < 0) {
            return { isValid: false, reason: "Cannot discard negative amounts of resources." };
        }
    }

    if (!isValidPlayer(G, playerID)) {
        return { isValid: false, reason: "Invalid player" };
    }

    if (!G.playersToDiscard.includes(playerID)) {
         return { isValid: false, reason: "You do not need to discard resources." };
    }

    // eslint-disable-next-line security/detect-object-injection
    const player = G.players[playerID];
    const totalResources = countResources(player.resources);
    const requiredDiscard = Math.floor(totalResources / 2);

    const discardAmount = countResources(resources);

    if (discardAmount !== requiredDiscard) {
        return { isValid: false, reason: `You must discard exactly ${requiredDiscard} resources.` };
    }

    // Check if player has the specific resources
    const hasEnough = (Object.keys(resources) as (keyof Resources)[]).every(r => player.resources[r] >= resources[r]);

    if (!hasEnough) {
        return { isValid: false, reason: "You do not have these resources to discard." };
    }

    return { isValid: true };
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
    const potentialVictims = new Set<string>();
    const vertices = getVerticesForHex(G.board.hexes[hexID].coords);

    vertices.forEach(vId => {
        const vertex = G.board.vertices[vId];
        if (vertex && vertex.owner !== playerID) {
            // Only consider victims with resources
            if (countResources(G.players[vertex.owner].resources) > 0) {
                 potentialVictims.add(vertex.owner);
            }
        }
    });

    // 3. Validate Victim Choice
    if (victimID) {
        if (!potentialVictims.has(victimID)) {
            // Distinguish between "Not on hex" and "No resources" is nice but strict
            // Simple check: Is this player a valid target?
            const vertex = vertices.find(vId => G.board.vertices[vId]?.owner === victimID);
            if (!vertex) {
                 return { isValid: false, reason: "The chosen victim does not have a settlement on this hex." };
            }
            if (countResources(G.players[victimID].resources) === 0) {
                return { isValid: false, reason: "The chosen victim has no resources to steal." };
            }
            return { isValid: false, reason: "Invalid victim selected." }; // Should not happen if logic is sound
        }
    } else {
        // No victim selected. Ensure no victims were available.
        if (potentialVictims.size > 0) {
            return { isValid: false, reason: "You must choose a player to steal from." };
        }
    }

    return { isValid: true };
};
