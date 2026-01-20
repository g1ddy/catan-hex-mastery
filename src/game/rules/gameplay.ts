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
 */
export const validateBuildRoad = (G: GameState, playerID: string, edgeId: string): ValidationResult => {
    if (!canAffordRoad(G, playerID)) {
        return { isValid: false, reason: "Not enough resources to build a road (requires Wood, Brick)" };
    }
    return isValidRoadPlacement(G, edgeId, playerID);
};

/**
 * Validates the "Build Settlement" move during the Gameplay Phase.
 */
export const validateBuildSettlement = (G: GameState, playerID: string, vertexId: string): ValidationResult => {
    if (!canAffordSettlement(G, playerID)) {
        return { isValid: false, reason: "Not enough resources to build a settlement (requires Wood, Brick, Wheat, Sheep)" };
    }
    return isValidSettlementPlacement(G, vertexId, playerID);
};

/**
 * Validates the "Build City" move during the Gameplay Phase.
 */
export const validateBuildCity = (G: GameState, playerID: string, vertexId: string): ValidationResult => {
    if (!canAffordCity(G, playerID)) {
        return { isValid: false, reason: "Not enough resources to build a city (requires 3 Ore, 2 Wheat)" };
    }
    return isValidCityPlacement(G, vertexId, playerID);
};

/**
 * Validates the "Trade Bank" move.
 */
export const validateTradeBank = (G: GameState, playerID: string): ValidationResult<TradeResult> => {
    if (!isValidPlayer(playerID, G)) {
        return { isValid: false, reason: "Invalid player" };
    }

    const player = G.players[playerID];
    const tradeResult = calculateTrade(player.resources);

    if (!tradeResult.canTrade) {
        return { isValid: false, reason: `You need at least ${BANK_TRADE_GIVE_AMOUNT} of a resource to trade.` };
    }

    return { isValid: true, data: tradeResult };
};

/**
 * Helper to identify valid victims on a target hex.
 */
export const getPotentialVictims = (G: GameState, hexID: string, playerID: string): Set<string> => {
    const potentialVictims = new Set<string>();
    const hex = G.board.hexes.get(hexID);
    if (!hex) return potentialVictims;

    const vertices = getVerticesForHex(hex.coords);

    vertices.forEach(vId => {
        const vertex = G.board.vertices.get(vId);
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
 * Validates the "Dismiss Robber" move (Move Robber + Steal).
 */
export const validateRobberMove = (G: GameState, playerID: string, hexID: string, victimID?: string): ValidationResult => {
    const spatialCheck = isValidRobberPlacement(G, hexID);
    if (!spatialCheck.isValid) {
        return spatialCheck;
    }

    const potentialVictims = getPotentialVictims(G, hexID, playerID);

    if (victimID) {
        if (!potentialVictims.has(victimID)) {
            const hex = G.board.hexes.get(hexID);
            if (!hex) return { isValid: false, reason: "Invalid hex." }; // Should be caught by spatial check

            const vertices = getVerticesForHex(hex.coords);
            const isOnHex = vertices.some(vId => G.board.vertices.get(vId)?.owner === victimID);

            if (!isOnHex) {
                 return { isValid: false, reason: "The chosen victim does not have a settlement on this hex." };
            }
            return { isValid: false, reason: "The chosen victim has no resources to steal." };
        }
    }

    return { isValid: true };
};
