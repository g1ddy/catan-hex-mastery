import { GameState } from '../types';
import { canAffordRoad, canAffordSettlement, canAffordCity } from './common';
import { isValidRoadPlacement, isValidCityPlacement, isValidSettlementPlacement, ValidationResult } from './spatial';
import { calculateTrade, TradeResult } from '../mechanics/trade';
import { isValidPlayer } from '../../utils/validation';
import { BANK_TRADE_GIVE_AMOUNT } from '../config';

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
